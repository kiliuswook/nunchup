import Peer from 'peerjs';
import { createHub } from '../../../server/src/hub.js';
import { realScheduler } from '../../../server/src/scheduler.js';

const ID_PREFIX = 'nunchup-v1-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// 시그널링 서버. 지정하지 않으면 PeerJS 공용 서버(0.peerjs.com)를 쓴다.
function peerOptions() {
  const env = import.meta.env;
  if (!env.VITE_PEER_HOST) return { debug: 0 };
  return {
    host: env.VITE_PEER_HOST,
    port: Number(env.VITE_PEER_PORT || 443),
    path: env.VITE_PEER_PATH || '/',
    secure: env.VITE_PEER_SECURE !== '0',
    debug: 0,
  };
}

const HEARTBEAT_MS = 2000;
const DEAD_MS = 7000; // 이 시간 동안 아무 메시지가 없으면 끊긴 것으로 본다 (원격 종료 이벤트가 안 오는 브라우저 대비)

// 양쪽이 주기적으로 ping을 보내고, 일정 시간 조용하면 연결을 닫는다.
function keepAlive(conn, onDead) {
  let last = Date.now();
  conn.on('data', () => (last = Date.now()));
  const h = setInterval(() => {
    if (!conn.open) return;
    if (Date.now() - last > DEAD_MS) {
      clearInterval(h);
      onDead();
      return;
    }
    try {
      conn.send({ t: 'ping' });
    } catch {}
  }, HEARTBEAT_MS);
  return () => clearInterval(h);
}

const randomCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

function openPeer(id) {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, peerOptions()) : new Peer(peerOptions());
    const timer = setTimeout(() => {
      peer.destroy();
      reject(new Error('연결 서버에 접속하지 못했어요. 네트워크를 확인해 주세요.'));
    }, 10000);
    peer.once('open', () => {
      clearTimeout(timer);
      resolve(peer);
    });
    peer.once('error', (err) => {
      clearTimeout(timer);
      peer.destroy();
      reject(err);
    });
  });
}

// 방장: 내 브라우저에서 허브(게임 서버)를 돌리고, 참가자의 데이터 채널을 받는다.
export async function startHost({ onPush }) {
  let peer;
  let code;
  for (let i = 0; i < 6 && !peer; i++) {
    code = randomCode();
    try {
      peer = await openPeer(ID_PREFIX + code);
    } catch (err) {
      if (err?.type !== 'unavailable-id' || i === 5) throw new Error('방을 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  const hub = createHub({ sched: realScheduler, minPlayers: 3, fixedCode: code });
  const local = hub.connect({ send: onPush });

  peer.on('connection', (conn) => {
    const remote = hub.connect({ send: (event, data) => conn.open && conn.send({ t: 'push', e: event, d: data }) });
    conn.on('data', (msg) => {
      if (msg?.t === 'req') conn.send({ t: 'res', id: msg.id, r: remote.request(msg.e, msg.p) });
    });
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      stop();
      remote.close();
      conn.close();
    };
    const stop = keepAlive(conn, close);
    conn.on('close', close);
    conn.on('error', close);
  });
  // 시그널링 서버와 끊겨도 이미 연결된 참가자는 유지된다. 새 참가자를 받으려면 다시 붙는다.
  peer.on('disconnected', () => setTimeout(() => !peer.destroyed && peer.reconnect(), 1000));

  return {
    code,
    request: async (event, payload) => local.request(event, payload),
    close: () => {
      local.close();
      peer.destroy();
    },
  };
}

// 참가자: 방장의 브라우저에 데이터 채널로 붙는다. 끊기면 몇 번 다시 시도한다.
export async function joinHost(code, { onPush, onStatus, onRejoin, onGone }) {
  if (!/^[A-Z0-9]{4}$/.test(code)) throw new Error('방 코드를 확인해 주세요.');
  const peer = await openPeer(null);
  peer.on('disconnected', () => setTimeout(() => !peer.destroyed && peer.reconnect(), 1000));

  let conn = null;
  let closed = false;
  let seq = 0;
  const pending = new Map();

  function dial() {
    return new Promise((resolve, reject) => {
      const c = peer.connect(ID_PREFIX + code, { reliable: true, serialization: 'json' });
      const fail = (msg) => {
        clearTimeout(timer);
        peer.off('error', onErr);
        try {
          c.close();
        } catch {}
        reject(new Error(msg));
      };
      const onErr = (err) => {
        if (err?.type === 'peer-unavailable') fail('방을 찾을 수 없어요. 코드를 확인해 주세요.');
      };
      const timer = setTimeout(() => fail('방장에게 연결하지 못했어요. 다시 시도해 주세요.'), 12000);
      peer.on('error', onErr);
      c.on('open', () => {
        clearTimeout(timer);
        peer.off('error', onErr);
        resolve(c);
      });
    });
  }

  let stopKeepAlive = () => {};

  function attach(c) {
    conn = c;
    stopKeepAlive();
    stopKeepAlive = keepAlive(c, () => {
      try {
        c.close();
      } catch {}
      if (!closed && conn === c) reconnect();
    });
    c.on('data', (msg) => {
      if (msg?.t === 'push') onPush(msg.e, msg.d);
      else if (msg?.t === 'res') {
        pending.get(msg.id)?.(msg.r);
        pending.delete(msg.id);
      }
    });
    c.on('close', () => !closed && conn === c && reconnect());
    c.on('error', () => {});
  }

  let reconnecting = false;
  async function reconnect() {
    if (reconnecting) return;
    reconnecting = true;
    conn = null;
    stopKeepAlive();
    onStatus(false);
    for (let i = 0; i < 4 && !closed; i++) {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      try {
        attach(await dial());
        reconnecting = false;
        onStatus(true);
        onRejoin();
        return;
      } catch {}
    }
    if (!closed) {
      closed = true;
      peer.destroy();
      onGone();
    }
  }

  try {
    attach(await dial());
  } catch (err) {
    peer.destroy();
    throw err;
  }

  return {
    code,
    request: (event, payload) =>
      new Promise((resolve) => {
        const id = ++seq;
        pending.set(id, resolve);
        try {
          conn?.send({ t: 'req', id, e: event, p: payload });
        } catch {}
        setTimeout(() => {
          if (pending.delete(id)) resolve({ ok: false, error: '방장 응답이 없어요. 연결을 확인해 주세요.' });
        }, 6000);
      }),
    close: () => {
      closed = true;
      stopKeepAlive();
      conn?.close();
      peer.destroy();
    },
  };
}

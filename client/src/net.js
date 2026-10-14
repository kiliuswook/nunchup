import { useEffect, useState } from 'react';
import { createSocketLink } from './links/socketLink.js';
import { startHost, joinHost } from './links/p2pLink.js';

// P2P 모드: 별도 서버 없이 방장의 브라우저가 게임 서버 역할을 한다 (GitHub Pages 배포용).
export const P2P = import.meta.env.VITE_P2P === '1';
export const features = { quickStart: !P2P };

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  return null;
}

function loadToken() {
  let t = store('nunchup.token');
  if (!t) {
    t = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    store('nunchup.token', t);
  }
  return t;
}

export const loadName = () => store('nunchup.name') ?? '';
export const saveName = (name) => store('nunchup.name', name);

const token = loadToken();
let offset = 0; // 서버(방장) 시계 - 내 시계
let current = { connected: !!P2P, me: null, room: null, notice: null };
const listeners = new Set();
const set = (patch) => {
  current = { ...current, ...patch };
  listeners.forEach((l) => l(current));
};

const onPush = (event, data) => {
  if (event !== 'state') return;
  offset = data.now - Date.now();
  set({ me: data.me, room: data.room });
};

let link = null;

async function hello() {
  return link.request('hello', { token });
}

if (!P2P) {
  link = createSocketLink({
    onPush,
    onStatus: (connected) => {
      set({ connected });
      if (connected) hello();
    },
  });
} else {
  // 새로고침한 참가자는 같은 방에 자동으로 다시 붙는다. 방장의 방은 새로고침하면 사라진다.
  const saved = store('nunchup.p2p');
  store('nunchup.p2p', null);
  const [role, code] = (saved ?? '').split(':');
  if (role === 'guest' && code) connectGuest(code).catch(() => set({ connected: true }));
  else if (role === 'host') set({ notice: '방장이 새로고침해서 이전 방이 종료됐어요.' });
}

async function connectGuest(code) {
  set({ connected: false });
  link = await joinHost(code, {
    onPush,
    onStatus: (connected) => set({ connected }),
    onRejoin: () => hello(),
    onGone: () => {
      link = null;
      store('nunchup.p2p', null);
      set({ connected: true, room: null, notice: '방장과의 연결이 끊겨서 방이 종료됐어요.' });
    },
  });
  store('nunchup.p2p', `guest:${code}`);
  set({ connected: true });
  return hello();
}

async function p2pSend(event, payload) {
  if (event === 'room:create') {
    link?.close();
    link = await startHost({ onPush });
    store('nunchup.p2p', `host:${link.code}`);
    await hello();
    return link.request(event, payload);
  }
  if (event === 'room:join') {
    link?.close();
    const code = String(payload.code ?? '').trim().toUpperCase();
    await connectGuest(code);
    return link.request(event, payload);
  }
  if (!link) return { ok: false, error: '방에 들어가 있지 않아요.' };
  const res = await link.request(event, payload);
  if (event === 'room:leave') {
    link.close();
    link = null;
    store('nunchup.p2p', null);
    set({ room: null });
  }
  return res;
}

export const serverNow = () => Date.now() + offset;

export function useStore() {
  const [state, setState] = useState(current);
  useEffect(() => {
    listeners.add(setState);
    setState(current);
    return () => listeners.delete(setState);
  }, []);
  return state;
}

export const clearNotice = () => set({ notice: null });

export async function send(event, payload = {}) {
  try {
    if (P2P) return await p2pSend(event, payload);
    return await link.request(event, payload);
  } catch (err) {
    set({ connected: true });
    return { ok: false, error: err?.message || '연결에 실패했어요.' };
  }
}

export const act = (type, payload) => send('game:action', { type, payload });

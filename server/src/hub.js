import { RoomManager, GameError } from './rooms.js';

// 전송 수단과 무관한 요청 처리기. Node(Socket.IO)와 브라우저 방장(P2P)이 함께 쓴다.
// client: { send(event, data) } — 상태 푸시를 받을 연결
export function createHub({ sched, minPlayers = 3, gameOptions, fixedCode } = {}) {
  const clients = new Map(); // playerId -> Set<client>

  const manager = new RoomManager({
    sched,
    minPlayers,
    gameOptions,
    onRoomChange: (room) => {
      const now = sched.now();
      for (const pid of room.players.keys()) {
        for (const c of clients.get(pid) ?? []) c.send('state', { me: pid, now, room: room.viewFor(pid) });
      }
    },
  });

  function connect(client) {
    let session = null;

    const emitSelf = () => {
      const room = session && manager.roomOf(session);
      client.send('state', { me: session?.playerId, now: sched.now(), room: room ? room.viewFor(session.playerId) : null });
    };

    const requireRoom = () => {
      const room = manager.roomOf(session);
      if (!room) throw new GameError('방에 들어가 있지 않아요.');
      return room;
    };

    const handlers = {
      hello: ({ token }) => {
        session = manager.session(token);
        if (!clients.has(session.playerId)) clients.set(session.playerId, new Set());
        clients.get(session.playerId).add(client);
        const room = manager.reconnect(session);
        emitSelf();
        return { playerId: session.playerId, roomCode: room?.code ?? null };
      },
      'room:create': ({ name }) => ({ code: manager.createRoom(session, name, { code: fixedCode }).code }),
      'room:join': ({ name, code }) => ({ code: manager.joinRoom(session, name, fixedCode ?? code).code }),
      'room:quick': ({ name }) => ({ code: manager.quickJoin(session, name).code }),
      'room:leave': () => {
        manager.leave(session);
        emitSelf();
      },
      'room:select': ({ gameId }) => requireRoom().selectGame(session.playerId, gameId),
      'room:start': () => requireRoom().startGame(session.playerId),
      'room:lobby': () => requireRoom().backToLobby(session.playerId),
      'game:action': ({ type, payload }) => requireRoom().gameAction(session.playerId, type, payload),
    };

    return {
      request(event, payload) {
        try {
          const fn = handlers[event];
          if (!fn) throw new GameError('알 수 없는 요청이에요.');
          if (event !== 'hello' && !session) throw new GameError('연결을 다시 시도해 주세요.');
          return { ok: true, ...(fn(payload ?? {}) ?? {}) };
        } catch (err) {
          if (!(err instanceof GameError)) console.error(err);
          return { ok: false, error: err instanceof GameError ? err.message : '문제가 발생했어요.' };
        }
      },
      close() {
        if (!session) return;
        const set = clients.get(session.playerId);
        set?.delete(client);
        if (!set?.size) {
          clients.delete(session.playerId);
          manager.disconnect(session);
        }
      },
    };
  }

  return { manager, connect };
}

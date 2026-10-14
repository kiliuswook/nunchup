import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { Server } from 'socket.io';
import { RoomManager, GameError } from './rooms.js';
import { realScheduler } from './scheduler.js';

export function createNunchupServer({ sched = realScheduler, minPlayers, gameOptions } = {}) {
  const app = express();
  const http = createServer(app);
  const io = new Server(http, { cors: { origin: '*' } });

  const sockets = new Map(); // playerId -> Set<socket>

  const manager = new RoomManager({
    sched,
    minPlayers: minPlayers ?? Number(process.env.MIN_PLAYERS ?? 3),
    gameOptions,
    onRoomChange: (room) => {
      const now = sched.now();
      for (const pid of room.players.keys()) {
        for (const s of sockets.get(pid) ?? []) s.emit('state', { me: pid, now, room: room.viewFor(pid) });
      }
    },
  });

  app.get('/health', (_req, res) => res.json({ ok: true, rooms: manager.rooms.size }));

  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  io.on('connection', (socket) => {
    let session = null;

    const emitSelf = () => {
      const room = session && manager.roomOf(session);
      socket.emit('state', { me: session?.playerId, now: sched.now(), room: room ? room.viewFor(session.playerId) : null });
    };

    // 모든 요청을 같은 방식으로 처리: 오류는 ack로 돌려준다.
    const handle = (event, fn) =>
      socket.on(event, (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        try {
          if (event !== 'hello' && !session) throw new GameError('연결을 다시 시도해 주세요.');
          const result = fn(payload ?? {});
          reply({ ok: true, ...(result ?? {}) });
        } catch (err) {
          if (!(err instanceof GameError)) console.error(err);
          reply({ ok: false, error: err instanceof GameError ? err.message : '문제가 발생했어요.' });
        }
      });

    const bind = (playerId) => {
      if (!sockets.has(playerId)) sockets.set(playerId, new Set());
      sockets.get(playerId).add(socket);
    };

    handle('hello', ({ token }) => {
      session = manager.session(token);
      bind(session.playerId);
      const room = manager.reconnect(session);
      emitSelf();
      return { playerId: session.playerId, roomCode: room?.code ?? null };
    });

    handle('room:create', ({ name }) => ({ code: manager.createRoom(session, name).code }));
    handle('room:join', ({ name, code }) => ({ code: manager.joinRoom(session, name, code).code }));
    handle('room:quick', ({ name }) => ({ code: manager.quickJoin(session, name).code }));
    handle('room:leave', () => {
      manager.leave(session);
      emitSelf();
    });
    handle('room:select', ({ gameId }) => requireRoom().selectGame(session.playerId, gameId));
    handle('room:start', () => requireRoom().startGame(session.playerId));
    handle('room:lobby', () => requireRoom().backToLobby(session.playerId));
    handle('game:action', ({ type, payload }) => requireRoom().gameAction(session.playerId, type, payload));

    function requireRoom() {
      const room = manager.roomOf(session);
      if (!room) throw new GameError('방에 들어가 있지 않아요.');
      return room;
    }

    socket.on('disconnect', () => {
      if (!session) return;
      const set = sockets.get(session.playerId);
      set?.delete(socket);
      if (!set?.size) {
        sockets.delete(session.playerId);
        manager.disconnect(session);
      }
    });
  });

  return { app, http, io, manager };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3001);
  createNunchupServer().http.listen(port, () => console.log(`NUNCHUP server on http://localhost:${port}`));
}

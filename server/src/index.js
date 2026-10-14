import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { Server } from 'socket.io';
import { createHub } from './hub.js';
import { realScheduler } from './scheduler.js';

export function createNunchupServer({ sched = realScheduler, minPlayers, gameOptions } = {}) {
  const app = express();
  const http = createServer(app);
  const io = new Server(http, { cors: { origin: '*' } });
  const hub = createHub({ sched, minPlayers: minPlayers ?? Number(process.env.MIN_PLAYERS ?? 3), gameOptions });

  app.get('/health', (_req, res) => res.json({ ok: true, rooms: hub.manager.rooms.size }));

  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  io.on('connection', (socket) => {
    const conn = hub.connect({ send: (event, data) => socket.emit(event, data) });
    socket.onAny((event, payload, ack) => {
      const res = conn.request(event, payload);
      if (typeof ack === 'function') ack(res);
    });
    socket.on('disconnect', () => conn.close());
  });

  return { app, http, io, manager: hub.manager };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3001);
  createNunchupServer().http.listen(port, () => console.log(`NUNCHUP server on http://localhost:${port}`));
}

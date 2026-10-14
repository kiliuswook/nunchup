import { RoomManager } from '../src/rooms.js';

// 수동으로 흘려보내는 가짜 시계
export class FakeClock {
  constructor() {
    this.t = 1_000_000;
    this.queue = [];
    this.seq = 0;
  }
  now = () => this.t;
  setTimeout = (fn, ms) => {
    const h = { at: this.t + ms, fn, id: this.seq++ };
    this.queue.push(h);
    return h;
  };
  clearTimeout = (h) => {
    this.queue = this.queue.filter((x) => x !== h);
  };
  advance(ms) {
    const end = this.t + ms;
    for (;;) {
      this.queue.sort((a, b) => a.at - b.at || a.id - b.id);
      const next = this.queue[0];
      if (!next || next.at > end) break;
      this.queue.shift();
      this.t = next.at;
      next.fn();
    }
    this.t = end;
  }
}

export function setupRoom(n, gameId, gameOptions = {}) {
  const clock = new FakeClock();
  const manager = new RoomManager({ sched: clock, minPlayers: 2, gameOptions: { [gameId]: gameOptions } });
  const sessions = [];
  let room;
  for (let i = 0; i < n; i++) {
    const s = manager.session(`token-${i}-xxxxxxxx`);
    sessions.push(s);
    room = i === 0 ? manager.createRoom(s, `P${i}`) : manager.joinRoom(s, `P${i}`, room.code);
  }
  const ids = sessions.map((s) => s.playerId);
  room.selectGame(ids[0], gameId);
  room.startGame(ids[0]);
  return { clock, manager, room, ids, sessions, game: room.game };
}

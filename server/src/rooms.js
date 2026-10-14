import { randomUUID } from 'node:crypto';
import { GAMES } from './games/index.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_NAME = 10;

export class GameError extends Error {}

function cleanName(name) {
  const n = String(name ?? '').trim().slice(0, MAX_NAME);
  if (!n) throw new GameError('닉네임을 입력해 주세요.');
  return n;
}

export class Room {
  constructor(manager, code, isPublic) {
    this.manager = manager;
    this.code = code;
    this.isPublic = isPublic;
    this.players = new Map(); // playerId -> { id, name, connected, score, joinedAt }
    this.hostId = null;
    this.phase = 'lobby'; // lobby | playing | result
    this.selectedGame = 'nunchi';
    this.game = null;
    this.result = null;
    this.history = [];
    this.createdAt = manager.sched.now();
  }

  connectedPlayerIds() {
    return [...this.players.values()].filter((p) => p.connected).map((p) => p.id);
  }

  changed() {
    this.manager.onRoomChange(this);
  }

  addPlayer(id, name) {
    if (this.players.has(id)) {
      const p = this.players.get(id);
      p.name = name;
      p.connected = true;
    } else {
      if (this.players.size >= this.manager.maxPlayers) throw new GameError('방이 가득 찼어요.');
      this.players.set(id, { id, name, connected: true, score: 0, joinedAt: this.manager.sched.now() });
    }
    if (!this.hostId || !this.players.get(this.hostId)?.connected) this.hostId = id;
    this.changed();
  }

  setConnected(id, connected) {
    const p = this.players.get(id);
    if (!p || p.connected === connected) return;
    p.connected = connected;
    if (!connected && this.hostId === id) this.reassignHost();
    if (connected && !this.players.get(this.hostId)?.connected) this.hostId = id;
    this.game?.onPlayerStatus(id);
    this.changed();
  }

  removePlayer(id) {
    if (!this.players.delete(id)) return;
    if (this.hostId === id) this.reassignHost();
    this.game?.onPlayerStatus(id);
    this.changed();
  }

  reassignHost() {
    const next = [...this.players.values()]
      .filter((p) => p.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];
    this.hostId = next?.id ?? null;
  }

  requireHost(id) {
    if (id !== this.hostId) throw new GameError('방장만 할 수 있어요.');
  }

  selectGame(id, gameId) {
    this.requireHost(id);
    if (!GAMES[gameId]) throw new GameError('알 수 없는 게임이에요.');
    if (this.phase === 'playing') throw new GameError('게임이 진행 중이에요.');
    this.selectedGame = gameId;
    this.changed();
  }

  startGame(id) {
    this.requireHost(id);
    if (this.phase === 'playing') throw new GameError('이미 게임이 진행 중이에요.');
    const online = this.connectedPlayerIds().length;
    const Game = GAMES[this.selectedGame];
    const min = Math.max(this.manager.minPlayers, Game.minPlayers ?? 0);
    if (online < min) throw new GameError(`최소 ${min}명이 필요해요. (현재 ${online}명)`);
    this.result = null;
    this.phase = 'playing';
    this.game = new Game(this, this.manager.sched, this.manager.gameOptions[this.selectedGame] ?? {});
    this.game.start();
    this.changed();
  }

  finishGame(result) {
    for (const [pid, d] of Object.entries(result.deltas)) {
      const p = this.players.get(pid);
      if (p) p.score += d;
    }
    this.result = result;
    this.history.push({ gameId: result.gameId, headline: result.headline });
    this.game = null;
    this.phase = 'result';
    this.changed();
  }

  backToLobby(id) {
    this.requireHost(id);
    if (this.phase === 'playing') {
      this.game?.dispose();
      this.game = null;
    }
    this.phase = 'lobby';
    this.result = null;
    this.changed();
  }

  gameAction(id, type, payload) {
    if (this.phase !== 'playing' || !this.game) throw new GameError('진행 중인 게임이 없어요.');
    if (!this.game.isPlayer(id)) throw new GameError('이번 게임은 관전 중이에요.');
    this.game.action(id, type, payload ?? {});
  }

  viewFor(playerId) {
    return {
      code: this.code,
      isPublic: this.isPublic,
      hostId: this.hostId,
      phase: this.phase,
      selectedGame: this.selectedGame,
      players: [...this.players.values()]
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map(({ id, name, connected, score }) => ({ id, name, connected, score })),
      result: this.result,
      history: this.history,
      game: this.game ? { id: this.game.constructor.id, ...this.game.view(playerId) } : null,
    };
  }
}

export class RoomManager {
  constructor({ sched, onRoomChange = () => {}, minPlayers = 3, maxPlayers = 8, gameOptions = {} }) {
    this.sched = sched;
    this.onRoomChange = onRoomChange;
    this.minPlayers = minPlayers;
    this.maxPlayers = maxPlayers;
    this.gameOptions = gameOptions;
    this.rooms = new Map(); // code -> Room
    this.sessions = new Map(); // token -> { playerId, roomCode }
  }

  // 토큰은 클라이언트만 아는 비밀값, playerId는 다른 사람에게 공개되는 값.
  session(token) {
    if (typeof token !== 'string' || token.length < 8) throw new GameError('잘못된 세션이에요.');
    let s = this.sessions.get(token);
    if (!s) {
      s = { playerId: randomUUID().slice(0, 8), roomCode: null };
      this.sessions.set(token, s);
    }
    return s;
  }

  roomOf(session) {
    return session.roomCode ? this.rooms.get(session.roomCode) ?? null : null;
  }

  newCode() {
    for (;;) {
      let code = '';
      for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      if (!this.rooms.has(code)) return code;
    }
  }

  createRoom(session, name, { isPublic = false } = {}) {
    const n = cleanName(name);
    this.leave(session);
    const room = new Room(this, this.newCode(), isPublic);
    this.rooms.set(room.code, room);
    session.roomCode = room.code;
    room.addPlayer(session.playerId, n);
    return room;
  }

  joinRoom(session, name, code) {
    const n = cleanName(name);
    const room = this.rooms.get(String(code ?? '').trim().toUpperCase());
    if (!room) throw new GameError('방을 찾을 수 없어요. 코드를 확인해 주세요.');
    if (session.roomCode !== room.code) this.leave(session);
    room.addPlayer(session.playerId, n);
    session.roomCode = room.code;
    return room;
  }

  quickJoin(session, name) {
    const open = [...this.rooms.values()]
      .filter((r) => r.isPublic && r.phase === 'lobby' && r.connectedPlayerIds().length < this.maxPlayers)
      .sort((a, b) => b.connectedPlayerIds().length - a.connectedPlayerIds().length)[0];
    return open ? this.joinRoom(session, name, open.code) : this.createRoom(session, name, { isPublic: true });
  }

  leave(session) {
    const room = this.roomOf(session);
    session.roomCode = null;
    if (!room) return;
    room.removePlayer(session.playerId);
    this.cleanup(room);
  }

  disconnect(session) {
    const room = this.roomOf(session);
    if (!room) return;
    room.setConnected(session.playerId, false);
    this.cleanup(room);
  }

  reconnect(session) {
    const room = this.roomOf(session);
    if (!room) {
      session.roomCode = null;
      return null;
    }
    if (!room.players.has(session.playerId)) {
      session.roomCode = null;
      return null;
    }
    room.setConnected(session.playerId, true);
    return room;
  }

  cleanup(room) {
    if (room.connectedPlayerIds().length === 0) {
      // 모두 나가면 잠시 유지했다가 정리 (재접속 대비)
      this.sched.setTimeout(() => {
        if (this.rooms.get(room.code) === room && room.connectedPlayerIds().length === 0) {
          room.game?.dispose();
          this.rooms.delete(room.code);
        }
      }, 5 * 60 * 1000);
    }
  }
}

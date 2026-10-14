import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager, GameError } from '../src/rooms.js';
import { FakeClock } from './helpers.js';

test('룸 생성, 참가, 방장 승계, 재접속', () => {
  const m = new RoomManager({ sched: new FakeClock(), minPlayers: 3 });
  const a = m.session('aaaaaaaaaa');
  const b = m.session('bbbbbbbbbb');
  const room = m.createRoom(a, '원더');
  assert.match(room.code, /^[A-Z2-9]{4}$/);
  m.joinRoom(b, '친구', room.code.toLowerCase());
  assert.equal(room.players.size, 2);
  assert.equal(room.hostId, a.playerId);

  assert.throws(() => room.startGame(a.playerId), GameError); // 3명 미만
  assert.throws(() => room.selectGame(b.playerId, 'bomb'), GameError); // 방장 아님

  m.disconnect(a);
  assert.equal(room.hostId, b.playerId);
  assert.equal(m.reconnect(a), room);
  assert.equal(room.players.get(a.playerId).connected, true);

  m.leave(b);
  assert.equal(room.players.size, 1);
  assert.equal(room.hostId, a.playerId);
});

test('빠른 시작은 공개 대기방에 합류한다', () => {
  const m = new RoomManager({ sched: new FakeClock() });
  const r1 = m.quickJoin(m.session('q1xxxxxxxx'), 'A');
  const r2 = m.quickJoin(m.session('q2xxxxxxxx'), 'B');
  assert.equal(r1, r2);
  const priv = m.createRoom(m.session('p1xxxxxxxx'), 'C');
  assert.notEqual(m.quickJoin(m.session('q3xxxxxxxx'), 'D'), priv);
});

test('최대 인원 8명', () => {
  const m = new RoomManager({ sched: new FakeClock() });
  const room = m.createRoom(m.session('host-xxxxx'), 'H');
  for (let i = 1; i < 8; i++) m.joinRoom(m.session(`p-${i}-xxxxxx`), `P${i}`, room.code);
  assert.throws(() => m.joinRoom(m.session('p-9-xxxxxx'), 'X', room.code), /가득/);
});

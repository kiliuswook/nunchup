import test from 'node:test';
import assert from 'node:assert/strict';
import { setupRoom } from './helpers.js';

test('눈치 카운트: 차례로 누르면 마지막 한 명이 탈락', () => {
  const { clock, room, ids, game } = setupRoom(3, 'nunchi', { rounds: 1 });
  clock.advance(3000);
  assert.equal(game.phase, 'play');
  room.gameAction(ids[0], 'tap');
  clock.advance(700);
  assert.equal(game.view(ids[0]).myNumber, 1);
  room.gameAction(ids[1], 'tap');
  clock.advance(700);
  assert.equal(game.phase, 'reveal');
  assert.equal(game.outcome.kind, 'last');
  assert.deepEqual(game.outcome.losers, [ids[2]]);
  clock.advance(5000);
  assert.equal(room.phase, 'result');
  assert.deepEqual(room.result.deltas, { [ids[0]]: 1, [ids[1]]: 1, [ids[2]]: -1 });
  assert.equal(room.players.get(ids[2]).score, -1);
});

test('눈치 카운트: 동시에 누르면 충돌', () => {
  const { clock, room, ids, game } = setupRoom(4, 'nunchi', { rounds: 1 });
  clock.advance(3000);
  room.gameAction(ids[0], 'tap');
  clock.advance(200);
  room.gameAction(ids[1], 'tap');
  clock.advance(700);
  assert.equal(game.outcome.kind, 'collision');
  assert.deepEqual(game.outcome.losers.sort(), [ids[0], ids[1]].sort());
});

test('눈치 카운트: 시간 초과 시 안 누른 사람 모두 탈락', () => {
  const { clock, room, ids, game } = setupRoom(4, 'nunchi', { rounds: 1 });
  clock.advance(3000);
  room.gameAction(ids[3], 'tap');
  clock.advance(16000);
  assert.equal(game.outcome.kind, 'timeout');
  assert.equal(game.outcome.losers.length, 3);
});

test('소수파 생존: 적은 쪽이 살아남고, 공개 전에는 선택을 숨긴다', () => {
  const { clock, room, ids, game } = setupRoom(3, 'minority', { rounds: 1 });
  room.gameAction(ids[0], 'choose', { choice: 'a' });
  room.gameAction(ids[1], 'choose', { choice: 'a' });
  assert.equal(game.view(ids[2]).outcome, null);
  room.gameAction(ids[2], 'choose', { choice: 'b' });
  assert.equal(game.phase, 'reveal'); // 모두 답하면 즉시 공개
  assert.deepEqual(game.outcome.survivors, [ids[2]]);
  clock.advance(6000);
  assert.equal(room.phase, 'result');
  assert.equal(room.result.deltas[ids[2]], 1);
});

test('라이어 키워드: 라이어만 제시어를 모르고, 검거 후 오답이면 시민 승리', () => {
  const { room, ids, game } = setupRoom(4, 'liar');
  const liar = game.liarId;
  const citizens = ids.filter((id) => id !== liar);
  assert.equal(game.view(liar).keyword, null);
  assert.equal(game.view(citizens[0]).keyword, game.keyword);

  for (const id of ids) room.gameAction(id, 'confirm');
  assert.equal(game.phase, 'discuss');
  room.gameAction(room.hostId, 'readyVote');
  assert.equal(game.phase, 'vote');
  for (const id of citizens) room.gameAction(id, 'vote', { target: liar });
  room.gameAction(liar, 'vote', { target: citizens[0] });
  assert.equal(game.phase, 'guess');
  const wrong = game.guessOptions.find((w) => w !== game.keyword);
  room.gameAction(liar, 'guess', { word: wrong });
  assert.equal(game.outcome.kind, 'liarCaught');
  room.gameAction(room.hostId, 'skip');
  assert.equal(room.phase, 'result');
  assert.equal(room.result.deltas[citizens[0]], 1);
  assert.equal(room.result.deltas[liar], 0);
});

test('라이어 키워드: 동률이면 라이어 생존', () => {
  const { room, ids, game } = setupRoom(4, 'liar');
  for (const id of ids) room.gameAction(id, 'confirm');
  room.gameAction(room.hostId, 'readyVote');
  room.gameAction(ids[0], 'vote', { target: ids[1] });
  room.gameAction(ids[1], 'vote', { target: ids[0] });
  room.gameAction(ids[2], 'vote', { target: ids[3] });
  room.gameAction(ids[3], 'vote', { target: ids[2] });
  assert.equal(game.outcome.kind, 'liarEscaped');
  assert.equal(game.deltas[game.liarId], 2);
});

test('시한폭탄: 바로 넘길 수 없고, 터질 때 든 사람이 -1', () => {
  const { clock, room, ids, game } = setupRoom(3, 'bomb', { rounds: 1, fuseMinMs: 10000, fuseMaxMs: 10000 });
  clock.advance(3000);
  const first = game.holderId;
  const other = ids.find((id) => id !== first);
  room.gameAction(first, 'pass', { target: other });
  assert.equal(game.holderId, first); // holdMs 이전
  clock.advance(1000);
  assert.equal(game.view(first).explodeAt, null); // 아직 숨김
  room.gameAction(first, 'pass', { target: other });
  assert.equal(game.holderId, other);
  clock.advance(5000);
  assert.ok(game.view(other).explodeAt); // 마지막 5초 공개
  clock.advance(4000);
  assert.equal(game.phase, 'reveal');
  assert.equal(game.outcome.loserId, other);
  clock.advance(4000);
  assert.equal(room.result.deltas[other], -1);
});

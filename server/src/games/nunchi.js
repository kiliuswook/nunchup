import { BaseGame } from './base.js';

// 눈치 카운트: 1부터 차례로 숫자를 외치듯 탭한다.
// 두 명 이상이 거의 동시에 탭하면 충돌(-1), 끝까지 못 누른 마지막 사람도 -1.
export class NunchiGame extends BaseGame {
  static id = 'nunchi';
  static minPlayers = 2;

  get rounds() { return this.options.rounds ?? 3; }
  get readyMs() { return this.options.readyMs ?? 3000; }
  get roundMs() { return this.options.roundMs ?? 15000; }
  get collideMs() { return this.options.collideMs ?? 600; }
  get revealMs() { return this.options.revealMs ?? 4000; }

  start() {
    this.round = 0;
    this.nextRound();
  }

  nextRound() {
    this.round += 1;
    this.phase = 'ready';
    this.count = 0;
    this.claims = {}; // playerId -> number
    this.pending = null; // { ids: [], at }
    this.outcome = null;
    this.deadline = this.now() + this.readyMs;
    this.after(this.readyMs, () => {
      this.phase = 'play';
      this.deadline = this.now() + this.roundMs;
      this.after(this.roundMs, () => this.timeUp());
      this.changed();
    });
    this.changed();
  }

  remaining() {
    return this.onlineIds().filter((id) => !(id in this.claims) && !this.pending?.ids.includes(id));
  }

  action(id, type) {
    if (type !== 'tap' || this.phase !== 'play') return;
    if (id in this.claims || this.pending?.ids.includes(id)) return;
    const t = this.now();
    if (this.pending && t - this.pending.at <= this.collideMs) {
      this.pending.ids.push(id);
      this.changed();
      return;
    }
    this.pending = { ids: [id], at: t };
    this.after(this.collideMs, () => this.settle());
    this.changed();
  }

  settle() {
    const { ids } = this.pending;
    this.pending = null;
    if (ids.length > 1) {
      return this.endRound({ kind: 'collision', number: this.count + 1, losers: ids });
    }
    this.count += 1;
    this.claims[ids[0]] = this.count;
    const left = this.remaining();
    if (left.length <= 1) {
      return this.endRound({ kind: left.length ? 'last' : 'clear', number: this.count, losers: left });
    }
    this.changed();
  }

  timeUp() {
    if (this.phase !== 'play') return;
    if (this.pending) this.settle();
    if (this.phase === 'play') this.endRound({ kind: 'timeout', number: this.count, losers: this.remaining() });
  }

  endRound(outcome) {
    this.clearTimers();
    this.phase = 'reveal';
    this.outcome = outcome;
    for (const id of outcome.losers) this.addScore(id, -1);
    for (const id of Object.keys(this.claims)) this.addScore(id, 1);
    this.deadline = this.now() + this.revealMs;
    this.after(this.revealMs, () => {
      if (this.round >= this.rounds) this.finishGame();
      else this.nextRound();
    });
    this.changed();
  }

  finishGame() {
    const sorted = Object.entries(this.deltas).sort((a, b) => b[1] - a[1]);
    const best = sorted[0];
    const name = this.room.players.get(best?.[0])?.name ?? '';
    this.finish({ headline: `눈치 왕은 ${name}!`, detail: `${this.rounds}라운드 동안 가장 눈치 있게 숫자를 지켰어요.` });
  }

  onPlayerStatus() {
    if (this.phase === 'play' && !this.pending && this.remaining().length <= 1 && Object.keys(this.claims).length > 0) {
      this.endRound({ kind: 'last', number: this.count, losers: this.remaining() });
    }
  }

  view(me) {
    return {
      round: this.round,
      rounds: this.rounds,
      phase: this.phase,
      deadline: this.deadline,
      count: this.count,
      claims: this.claims,
      myNumber: this.claims[me] ?? null,
      tapped: me in this.claims || !!this.pending?.ids.includes(me),
      players: this.playerIds,
      outcome: this.outcome,
      deltas: this.deltas,
    };
  }
}

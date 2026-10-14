import { BaseGame } from './base.js';
import { pick } from '../util.js';

// 시한폭탄: 폭탄이 언제 터질지는 아무도 모른다. 마지막 몇 초만 공개된다.
// 받은 폭탄은 잠깐(holdMs) 들고 있어야 넘길 수 있다. 터질 때 들고 있으면 -1.
export class BombGame extends BaseGame {
  static id = 'bomb';
  static minPlayers = 2;

  get rounds() { return this.options.rounds ?? 3; }
  get readyMs() { return this.options.readyMs ?? 3000; }
  get fuseMinMs() { return this.options.fuseMinMs ?? 12000; }
  get fuseMaxMs() { return this.options.fuseMaxMs ?? 28000; }
  get holdMs() { return this.options.holdMs ?? 1000; }
  get showMs() { return this.options.showMs ?? 5000; }
  get revealMs() { return this.options.revealMs ?? 4000; }

  start() {
    this.round = 0;
    this.nextRound();
  }

  nextRound() {
    this.round += 1;
    this.phase = 'ready';
    this.outcome = null;
    this.passes = 0;
    this.lastFrom = null;
    this.holderId = pick(this.onlineIds());
    this.deadline = this.now() + this.readyMs;
    this.after(this.readyMs, () => {
      this.phase = 'play';
      const fuse = this.fuseMinMs + Math.random() * (this.fuseMaxMs - this.fuseMinMs);
      this.explodeAt = this.now() + fuse;
      this.heldSince = this.now();
      this.after(fuse, () => this.explode());
      // 남은 시간이 공개되는 순간 화면을 갱신
      if (fuse > this.showMs) this.after(fuse - this.showMs, () => this.changed());
      this.changed();
    });
    this.changed();
  }

  action(id, type, { target } = {}) {
    if (type !== 'pass' || this.phase !== 'play' || id !== this.holderId) return;
    if (target === id || !this.isPlayer(target) || !this.isOnline(target)) return;
    if (this.now() - this.heldSince < this.holdMs) return;
    this.lastFrom = id;
    this.holderId = target;
    this.heldSince = this.now();
    this.passes += 1;
    this.changed();
  }

  explode() {
    this.phase = 'reveal';
    this.addScore(this.holderId, -1);
    this.outcome = { loserId: this.holderId, passes: this.passes };
    this.deadline = this.now() + this.revealMs;
    this.after(this.revealMs, () => (this.round >= this.rounds ? this.end() : this.nextRound()));
    this.changed();
  }

  end() {
    const losses = Object.entries(this.deltas).filter(([, d]) => d < 0);
    const worst = losses.sort((a, b) => a[1] - b[1])[0];
    const name = worst ? this.room.players.get(worst[0])?.name : null;
    this.finish({
      headline: name ? `폭탄 자석은 ${name}!` : '아무도 터지지 않았어요',
      detail: `${this.rounds}번의 폭탄이 터졌어요.`,
    });
  }

  onPlayerStatus(id) {
    // 폭탄을 든 사람이 나가면 다른 사람에게 자동 전달
    if (this.phase === 'play' && id === this.holderId && !this.isOnline(id)) {
      const others = this.onlineIds().filter((p) => p !== id);
      if (others.length) {
        this.holderId = pick(others);
        this.heldSince = this.now();
      }
    }
  }

  view(me) {
    const remaining = this.phase === 'play' ? this.explodeAt - this.now() : null;
    return {
      round: this.round,
      rounds: this.rounds,
      phase: this.phase,
      deadline: this.deadline,
      holderId: this.holderId,
      isHolder: me === this.holderId,
      canPassAt: this.phase === 'play' ? this.heldSince + this.holdMs : null,
      // 폭발 시각은 마지막 showMs 동안에만 알려 준다
      explodeAt: remaining !== null && remaining <= this.showMs ? this.explodeAt : null,
      lastFrom: this.lastFrom ?? null,
      passes: this.passes,
      outcome: this.outcome,
      deltas: this.deltas,
      players: this.playerIds,
    };
  }
}

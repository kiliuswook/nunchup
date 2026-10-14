// 모든 미니게임의 공통 기반. 게임은 서버 기준으로 판정하고,
// view(playerId)로 플레이어별 화면 상태를 만들어 준다.
export class BaseGame {
  constructor(room, sched, options = {}) {
    this.room = room;
    this.sched = sched;
    this.options = options;
    this.timers = new Set();
    // 게임 시작 시점의 참가자를 고정한다. 중간 입장자는 관전한다.
    this.playerIds = room.connectedPlayerIds();
    this.deltas = Object.fromEntries(this.playerIds.map((id) => [id, 0]));
    this.finished = false;
  }

  now() {
    return this.sched.now();
  }

  after(ms, fn) {
    const h = this.sched.setTimeout(() => {
      this.timers.delete(h);
      if (!this.finished) fn();
    }, ms);
    this.timers.add(h);
    return h;
  }

  clearTimers() {
    for (const h of this.timers) this.sched.clearTimeout(h);
    this.timers.clear();
  }

  isPlayer(id) {
    return this.playerIds.includes(id);
  }

  isOnline(id) {
    return this.room.players.get(id)?.connected ?? false;
  }

  onlineIds() {
    return this.playerIds.filter((id) => this.isOnline(id));
  }

  addScore(id, delta) {
    if (id in this.deltas) this.deltas[id] += delta;
  }

  changed() {
    this.room.changed();
  }

  finish({ headline, detail }) {
    if (this.finished) return;
    this.finished = true;
    this.clearTimers();
    this.room.finishGame({ gameId: this.constructor.id, headline, detail, deltas: { ...this.deltas } });
  }

  dispose() {
    this.finished = true;
    this.clearTimers();
  }

  // 하위 클래스에서 구현
  start() {}
  action(_playerId, _type, _payload) {}
  view(_playerId) {
    return {};
  }
  onPlayerStatus(_playerId) {}
}

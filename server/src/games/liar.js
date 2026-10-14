import { BaseGame } from './base.js';
import { KEYWORDS } from '../data/keywords.js';
import { pick, shuffle } from '../util.js';

// 라이어 키워드: 한 명만 제시어를 모른다. 역할 확인 → 토론 → 투표 → 정체 공개.
export class LiarGame extends BaseGame {
  static id = 'liar';
  static minPlayers = 3;

  get roleMs() { return this.options.roleMs ?? 10000; }
  get discussMs() { return this.options.discussMs ?? 90000; }
  get voteMs() { return this.options.voteMs ?? 25000; }
  get guessMs() { return this.options.guessMs ?? 20000; }
  get revealMs() { return this.options.revealMs ?? 10000; }

  start() {
    const category = pick(Object.keys(KEYWORDS));
    const words = KEYWORDS[category];
    this.category = category;
    this.keyword = pick(words);
    this.liarId = pick(this.playerIds);
    // 라이어가 정답을 맞힐 때 고를 보기 8개
    this.guessOptions = shuffle([this.keyword, ...shuffle(words.filter((w) => w !== this.keyword)).slice(0, 7)]);
    this.confirmed = new Set();
    this.readyVote = new Set();
    this.votes = {};
    this.guess = null;
    this.setPhase('role', this.roleMs, () => this.startDiscuss());
  }

  setPhase(phase, ms, next) {
    this.clearTimers();
    this.phase = phase;
    this.deadline = ms ? this.now() + ms : null;
    this.duration = ms;
    if (ms) this.after(ms, next);
    this.changed();
  }

  startDiscuss() {
    this.setPhase('discuss', this.discussMs, () => this.startVote());
  }

  startVote() {
    this.setPhase('vote', this.voteMs, () => this.tally());
  }

  action(id, type, payload) {
    switch (type) {
      case 'confirm':
        if (this.phase !== 'role') return;
        this.confirmed.add(id);
        if (this.onlineIds().every((p) => this.confirmed.has(p))) this.startDiscuss();
        else this.changed();
        return;
      case 'readyVote':
        if (this.phase !== 'discuss') return;
        this.readyVote.add(id);
        // 과반이 투표를 원하거나 방장이 누르면 바로 투표로
        if (id === this.room.hostId || this.readyVote.size * 2 > this.onlineIds().length) this.startVote();
        else this.changed();
        return;
      case 'vote': {
        if (this.phase !== 'vote') return;
        const target = payload.target;
        if (!this.isPlayer(target) || target === id) return;
        this.votes[id] = target;
        if (this.onlineIds().every((p) => p in this.votes)) this.tally();
        else this.changed();
        return;
      }
      case 'guess':
        if (this.phase !== 'guess' || id !== this.liarId) return;
        if (!this.guessOptions.includes(payload.word)) return;
        this.guess = payload.word;
        this.reveal();
        return;
      case 'skip':
        if (this.phase === 'reveal' && id === this.room.hostId) this.end();
        return;
    }
  }

  tally() {
    if (this.phase !== 'vote') return;
    const counts = {};
    for (const t of Object.values(this.votes)) counts[t] = (counts[t] ?? 0) + 1;
    const max = Math.max(0, ...Object.values(counts));
    const top = Object.keys(counts).filter((t) => counts[t] === max);
    this.voteCounts = counts;
    this.accusedId = max > 0 && top.length === 1 ? top[0] : null;
    if (this.accusedId === this.liarId && this.isOnline(this.liarId)) {
      this.setPhase('guess', this.guessMs, () => this.reveal());
    } else {
      this.reveal();
    }
  }

  reveal() {
    const caught = this.accusedId === this.liarId;
    const guessed = caught && this.guess === this.keyword;
    let kind;
    if (!caught) kind = 'liarEscaped';
    else if (guessed) kind = 'liarGuessed';
    else kind = 'liarCaught';
    if (kind === 'liarCaught') {
      for (const id of this.playerIds) if (id !== this.liarId) this.addScore(id, 1);
    } else {
      this.addScore(this.liarId, 2);
    }
    this.outcome = { kind, liarId: this.liarId, accusedId: this.accusedId, keyword: this.keyword, guess: this.guess };
    this.setPhase('reveal', this.revealMs, () => this.end());
  }

  end() {
    const liar = this.room.players.get(this.liarId)?.name ?? '라이어';
    const headline = {
      liarCaught: `라이어 ${liar}, 검거 성공!`,
      liarGuessed: `${liar}, 들켰지만 제시어를 맞혔어요!`,
      liarEscaped: `라이어 ${liar}의 완벽한 연기!`,
    }[this.outcome.kind];
    this.finish({ headline, detail: `제시어는 「${this.keyword}」 (${this.category})` });
  }

  onPlayerStatus(id) {
    if (id === this.liarId && !this.isOnline(id) && this.phase !== 'reveal') {
      // 라이어가 나가면 시민 승리로 정리
      this.accusedId = this.liarId;
      this.reveal();
    }
  }

  view(me) {
    const isLiar = me === this.liarId;
    const revealed = this.phase === 'reveal';
    return {
      phase: this.phase,
      deadline: this.deadline,
      duration: this.duration,
      category: this.category,
      role: isLiar ? 'liar' : 'citizen',
      keyword: isLiar && !revealed ? null : this.keyword,
      confirmed: [...this.confirmed],
      readyVote: [...this.readyVote],
      voted: Object.keys(this.votes),
      myVote: this.votes[me] ?? null,
      guessOptions: this.phase === 'guess' && isLiar ? this.guessOptions : null,
      accusedId: ['guess', 'reveal'].includes(this.phase) ? this.accusedId : null,
      votes: revealed ? this.votes : null,
      voteCounts: ['guess', 'reveal'].includes(this.phase) ? this.voteCounts : null,
      outcome: revealed ? this.outcome : null,
      players: this.playerIds,
    };
  }
}

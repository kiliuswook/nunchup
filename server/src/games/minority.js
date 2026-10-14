import { BaseGame } from './base.js';
import { QUESTIONS } from '../data/questions.js';
import { shuffle } from '../util.js';

// 소수파 생존: 양자택일 질문에서 더 적은 쪽을 고른 사람이 살아남는다.
export class MinorityGame extends BaseGame {
  static id = 'minority';
  static minPlayers = 3;

  get rounds() { return this.options.rounds ?? 5; }
  get answerMs() { return this.options.answerMs ?? 12000; }
  get revealMs() { return this.options.revealMs ?? 5000; }

  start() {
    this.questions = shuffle([...QUESTIONS]).slice(0, this.rounds);
    this.round = 0;
    this.survivals = Object.fromEntries(this.playerIds.map((id) => [id, 0]));
    this.nextRound();
  }

  nextRound() {
    this.round += 1;
    this.phase = 'question';
    this.choices = {};
    this.outcome = null;
    this.deadline = this.now() + this.answerMs;
    this.after(this.answerMs, () => this.reveal());
    this.changed();
  }

  get question() {
    return this.questions[this.round - 1];
  }

  action(id, type, { choice } = {}) {
    if (type !== 'choose' || this.phase !== 'question' || !['a', 'b'].includes(choice)) return;
    this.choices[id] = choice;
    if (this.onlineIds().every((pid) => pid in this.choices)) this.reveal();
    else this.changed();
  }

  reveal() {
    if (this.phase !== 'question') return;
    this.clearTimers();
    const a = this.playerIds.filter((id) => this.choices[id] === 'a');
    const b = this.playerIds.filter((id) => this.choices[id] === 'b');
    let minority = null;
    if (a.length && b.length && a.length !== b.length) minority = a.length < b.length ? 'a' : 'b';
    const survivors = minority ? (minority === 'a' ? a : b) : [];
    for (const id of survivors) {
      this.addScore(id, 1);
      this.survivals[id] += 1;
    }
    let kind = 'minority';
    if (!a.length || !b.length) kind = 'unanimous';
    else if (a.length === b.length) kind = 'tie';
    this.outcome = { kind, a, b, minority, survivors };
    this.phase = 'reveal';
    this.deadline = this.now() + this.revealMs;
    this.after(this.revealMs, () => (this.round >= this.rounds ? this.end() : this.nextRound()));
    this.changed();
  }

  end() {
    const top = Math.max(...Object.values(this.survivals));
    const names = this.playerIds.filter((id) => this.survivals[id] === top).map((id) => this.room.players.get(id)?.name);
    this.finish({
      headline: top > 0 ? `최후의 소수파: ${names.join(', ')}` : '아무도 소수파가 되지 못했어요',
      detail: `${this.rounds}개의 질문 중 최대 ${top}번 살아남았어요.`,
    });
  }

  onPlayerStatus() {
    if (this.phase === 'question' && this.onlineIds().length && this.onlineIds().every((pid) => pid in this.choices)) {
      this.reveal();
    }
  }

  view(me) {
    const q = this.question;
    return {
      round: this.round,
      rounds: this.rounds,
      phase: this.phase,
      deadline: this.deadline,
      duration: this.answerMs,
      question: q ? { text: q.text, a: q.a, b: q.b } : null,
      myChoice: this.choices[me] ?? null,
      answered: Object.keys(this.choices).length,
      total: this.onlineIds().length,
      // 공개 전에는 다른 사람의 선택을 숨긴다
      outcome: this.phase === 'reveal' ? this.outcome : null,
      survivals: this.survivals,
      players: this.playerIds,
    };
  }
}

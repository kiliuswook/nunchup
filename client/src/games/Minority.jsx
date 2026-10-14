import React from 'react';
import { act } from '../net.js';
import { useRemaining } from '../hooks.js';
import { Avatar } from '../components/ui.jsx';
import { GameHeader, SpectatorNote, playerOf } from './common.jsx';

function Ring({ ms, total }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, ms / total));
  return (
    <div className="ring">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} className="ring-bg" />
        <circle cx="50" cy="50" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <span>{Math.ceil(ms / 1000)}</span>
    </div>
  );
}

export default function Minority({ room, game, me, spectator }) {
  const remaining = useRemaining(game.deadline);
  const q = game.question;

  if (game.phase === 'reveal') {
    const o = game.outcome;
    const mine = o.a.includes(me) ? 'a' : o.b.includes(me) ? 'b' : null;
    const survived = o.survivors.includes(me);
    let title = survived ? '당신은 소수파입니다!' : mine ? '다수파였어요…' : '선택하지 않았어요';
    if (o.kind === 'tie') title = '정확히 반반! 무승부';
    if (o.kind === 'unanimous') title = '모두 같은 생각!';
    const total = o.a.length + o.b.length || 1;
    return (
      <main className="screen game reveal">
        <GameHeader game={game} />
        <section className="result-head">
          <span className="eyebrow">{q.text}</span>
          <h1 className={survived ? 'lime-mark' : ''}>{title}</h1>
          <p>{o.kind === 'minority' ? '더 적은 쪽을 고른 사람만 살아남아요.' : '이번 라운드는 생존자가 없어요.'}</p>
        </section>
        {['a', 'b'].map((k) => (
          <div key={k} className={`dist ${o.minority === k ? 'win' : ''}`}>
            <div className="dist-head">
              <strong>{q[k]}</strong>
              <span>{o[k].length}명 {o.minority === k ? '· 생존' : ''}</span>
            </div>
            <div className="bar"><i style={{ width: `${(o[k].length / total) * 100}%` }} /></div>
            <div className="dist-people">
              {o[k].map((id) => <Avatar key={id} player={playerOf(room, id)} size={26} />)}
            </div>
          </div>
        ))}
      </main>
    );
  }

  return (
    <main className="screen game">
      <GameHeader game={game} />
      <SpectatorNote spectator={spectator} />
      <section className="q-card">
        <span className="eyebrow">질문 {game.round}</span>
        <h2>{q.text}</h2>
        <p className="muted">더 적은 쪽을 고르면 살아남아요.</p>
      </section>
      <div className="choices">
        {['a', 'b'].map((k) => (
          <button
            key={k}
            className={`choice ${game.myChoice === k ? 'picked' : ''}`}
            disabled={spectator}
            onClick={() => act('choose', { choice: k })}
          >
            <span className="choice-key">{k.toUpperCase()}</span>
            {q[k]}
          </button>
        ))}
      </div>
      <div className="center grow">
        <Ring ms={remaining} total={game.duration} />
        <p className="muted">{game.answered} / {game.total}명 선택 완료 · 마감 전까지 바꿀 수 있어요</p>
      </div>
    </main>
  );
}

import React, { useEffect } from 'react';
import { act } from '../net.js';
import { useRemaining, fmtClock, buzz } from '../hooks.js';
import { Avatar, Burst, Countdown, DeltaList } from '../components/ui.jsx';
import { GameHeader, SpectatorNote, nameOf, playerOf } from './common.jsx';

const OUTCOME = {
  collision: { big: '충돌!', sub: '너무 빨랐어요!' },
  last: { big: '눈치 OUT', sub: '끝까지 못 누른 사람이 있어요.' },
  timeout: { big: '시간 초과', sub: '머뭇거리다 끝나버렸어요.' },
  clear: { big: '완벽!', sub: '아무도 겹치지 않았어요.' },
};

export default function Nunchi({ room, game, me, spectator }) {
  const remaining = useRemaining(game.deadline);
  const o = game.outcome;
  const iLost = o?.losers.includes(me);

  useEffect(() => {
    if (game.phase === 'reveal') buzz(iLost ? [80, 60, 80] : 30);
  }, [game.phase, iLost]);

  if (game.phase === 'ready') {
    return (
      <main className="screen game">
        <GameHeader game={game} />
        <div className="center grow">
          <p className="lead">숫자가 맞는 타이밍이라고<br />생각되면 눌러주세요.</p>
          <Countdown ms={remaining} label="준비" />
          <p className="muted">한 사람이 한 번만. 동시에 누르면 충돌!</p>
        </div>
      </main>
    );
  }

  if (game.phase === 'reveal') {
    const text = OUTCOME[o.kind];
    return (
      <main className="screen game reveal">
        <GameHeader game={game} />
        <div className="center">
          {o.kind === 'collision' || o.kind === 'clear' ? <Burst>{text.big}</Burst> : <h1 className="huge">{text.big}</h1>}
          <p className="lead strong">{iLost ? '이번엔 당신이에요!' : text.sub}</p>
          {o.losers.length > 0 && (
            <p className="muted">
              {o.kind === 'collision' ? `${o.number}번에서 충돌: ` : '탈락: '}
              {o.losers.map((id) => nameOf(room, id)).join(', ')}
            </p>
          )}
        </div>
        <div className="stat-row">
          <div><span>내 숫자</span><strong>{game.myNumber ?? '–'}</strong></div>
          <div><span>방의 숫자</span><strong>{game.count}</strong></div>
        </div>
        <DeltaList room={room} deltas={game.deltas} highlight={o.losers} />
      </main>
    );
  }

  const next = game.count + 1;
  const waiting = game.tapped && game.myNumber == null;
  return (
    <main className="screen game">
      <GameHeader game={game} />
      <SpectatorNote spectator={spectator} />
      <div className="center grow">
        <p className="lead">숫자가 맞는 타이밍이라고<br />생각되면 눌러주세요.</p>
        <div className="giant-num" key={next}>{next}</div>
        <div className="claims">
          {game.players.map((id) => (
            <span key={id} className={`claim ${game.claims[id] ? 'done' : ''}`}>
              <Avatar player={playerOf(room, id)} size={28} />
              <b>{game.claims[id] ?? ''}</b>
            </span>
          ))}
        </div>
      </div>
      <div className="tap-wrap">
        <button
          className={`tap-btn ${game.tapped ? 'tapped' : ''}`}
          disabled={game.tapped || spectator}
          onClick={() => {
            buzz(20);
            act('tap');
          }}
        >
          {game.myNumber ? `${game.myNumber}번 확보` : waiting ? '판정 중…' : '지금 탭'}
        </button>
      </div>
      <div className="foot-row">
        <span className="muted">직감을 믿으세요.<br />분위기를 읽으세요.</span>
        <span className="clock">{fmtClock(remaining)}</span>
      </div>
    </main>
  );
}

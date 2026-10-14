import React, { useState } from 'react';
import { act } from '../net.js';
import { useRemaining, fmtClock } from '../hooks.js';
import { Avatar, Button } from '../components/ui.jsx';
import { GameHeader, SpectatorNote, nameOf, playerOf } from './common.jsx';

const ROLE_STEPS = { role: 1, discuss: 2, vote: 3, guess: 3, reveal: 4 };

function RoleCard({ game, hidden }) {
  const isLiar = game.role === 'liar';
  return (
    <div className={`role-card ${hidden ? 'hidden' : ''}`}>
      <span className="lock">🔒</span>
      <span className="muted-inv">당신의 역할은</span>
      <strong className="role-name">{isLiar ? '라이어' : '시민'}</strong>
      <span className="muted-inv">카테고리 · {game.category}</span>
      {isLiar ? (
        <p className="role-tip">다른 사람들의 대화를 듣고<br />제시어를 추측하세요. 들키지 마세요!</p>
      ) : (
        <p className="role-kw">제시어 <b>{game.keyword}</b></p>
      )}
    </div>
  );
}

export default function Liar({ room, game, me, spectator }) {
  const remaining = useRemaining(game.deadline);
  const [peek, setPeek] = useState(false);
  const isHost = room.hostId === me;
  const step = ROLE_STEPS[game.phase];
  const header = <GameHeader game={game} extra={<span className="muted">{step} / 4 단계</span>} />;

  if (game.phase === 'role') {
    const done = game.confirmed.includes(me);
    return (
      <main className="screen game dark">
        {header}
        <p className="lead center-text">다른 사람에게 화면이 보이지 않게 확인하세요.</p>
        {spectator ? <SpectatorNote spectator /> : <RoleCard game={game} />}
        <div className="bottom">
          <Button disabled={done || spectator} onClick={() => act('confirm')}>
            {done ? `다른 사람 기다리는 중 (${game.confirmed.length}/${game.players.length})` : '확인했어요'}
          </Button>
        </div>
      </main>
    );
  }

  if (game.phase === 'discuss') {
    const ready = game.readyVote.includes(me);
    return (
      <main className="screen game">
        {header}
        <section className="q-card">
          <span className="eyebrow">💬 지금은 토론 시간!</span>
          <h2>한 사람씩 제시어를 설명해 보세요.</h2>
          <p className="muted">카테고리 · {game.category} · 남은 시간 {fmtClock(remaining)}</p>
          <div className="bar"><i style={{ width: `${(remaining / game.duration) * 100}%` }} /></div>
        </section>
        {!spectator && (
          <button
            className="peek"
            onPointerDown={() => setPeek(true)}
            onPointerUp={() => setPeek(false)}
            onPointerLeave={() => setPeek(false)}
          >
            {peek ? (game.role === 'liar' ? '당신은 라이어예요' : `제시어: ${game.keyword}`) : '꾹 눌러서 내 제시어 다시 보기'}
          </button>
        )}
        <ul className="plist">
          {game.players.map((id) => (
            <li key={id}>
              <Avatar player={playerOf(room, id)} size={34} dot />
              <span className="pname">{nameOf(room, id)}</span>
              {game.readyVote.includes(id) && <span className="tag">투표 준비</span>}
            </li>
          ))}
        </ul>
        <div className="bottom">
          <Button variant="dark" arrow disabled={ready || spectator} onClick={() => act('readyVote')}>
            {isHost ? '토론 끝내고 투표하기' : ready ? '다른 사람 기다리는 중' : '투표하러 가기'}
          </Button>
        </div>
      </main>
    );
  }

  if (game.phase === 'vote') {
    return (
      <main className="screen game">
        {header}
        <section className="q-card">
          <span className="eyebrow">투표</span>
          <h2>라이어는 누구일까요?</h2>
          <p className="muted">{game.voted.length} / {game.players.length}명 투표 · {Math.ceil(remaining / 1000)}초</p>
        </section>
        <div className="vote-grid">
          {game.players.filter((id) => id !== me).map((id) => (
            <button
              key={id}
              className={`vote-card ${game.myVote === id ? 'picked' : ''}`}
              disabled={spectator}
              onClick={() => act('vote', { target: id })}
            >
              <Avatar player={playerOf(room, id)} size={48} />
              <span>{nameOf(room, id)}</span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  if (game.phase === 'guess') {
    const iAmLiar = game.role === 'liar';
    return (
      <main className="screen game">
        {header}
        <section className="result-head">
          <span className="eyebrow">라이어 지목: {nameOf(room, game.accusedId)}</span>
          <h1>{iAmLiar ? '마지막 기회!' : '라이어 검거!'}</h1>
          <p>{iAmLiar ? '제시어를 맞히면 역전할 수 있어요.' : '라이어가 제시어를 추리하고 있어요…'}</p>
        </section>
        {iAmLiar ? (
          <div className="kw-grid">
            {game.guessOptions.map((w) => (
              <button key={w} className="choice small" onClick={() => act('guess', { word: w })}>{w}</button>
            ))}
          </div>
        ) : (
          <div className="center grow"><span className="clock big">{Math.ceil(remaining / 1000)}</span></div>
        )}
      </main>
    );
  }

  // reveal
  const o = game.outcome;
  const citizensWin = o.kind === 'liarCaught';
  return (
    <main className="screen game reveal">
      {header}
      <section className="result-head">
        <span className="eyebrow">라이어는 {nameOf(room, o.liarId)}!</span>
        <h1 className="huge-k">정체 공개!</h1>
        <p>
          {o.kind === 'liarCaught' && `시민 승리! 라이어가 「${o.guess ?? '무응답'}」을(를) 골랐어요.`}
          {o.kind === 'liarGuessed' && '들켰지만 제시어를 맞혀서 라이어 승리!'}
          {o.kind === 'liarEscaped' && (o.accusedId ? `엉뚱한 ${nameOf(room, o.accusedId)}을(를) 지목했어요. 라이어 승리!` : '표가 갈렸어요. 라이어 승리!')}
        </p>
      </section>
      <div className="stat-row">
        <div><span>시민 제시어</span><strong>{o.keyword}</strong></div>
        <div><span>승리</span><strong>{citizensWin ? '시민' : '라이어'}</strong></div>
      </div>
      <ul className="plist">
        {game.players.map((id) => (
          <li key={id} className={id === o.liarId ? 'hl' : ''}>
            <Avatar player={playerOf(room, id)} size={34} />
            <span className="pname">{nameOf(room, id)}</span>
            {id === o.liarId && <span className="tag dark">라이어</span>}
            <span className="pscore">{game.voteCounts?.[id] ?? 0}표</span>
          </li>
        ))}
      </ul>
      <div className="bottom">
        {isHost ? <Button variant="dark" arrow onClick={() => act('skip')}>결과 보기</Button> : <div className="waiting">잠시 후 결과로 넘어가요</div>}
      </div>
    </main>
  );
}

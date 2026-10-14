import React, { useEffect } from 'react';
import { act, serverNow } from '../net.js';
import { useRemaining, buzz } from '../hooks.js';
import { Avatar, Bomb as BombIcon, Burst, Countdown, DeltaList, Button, GameIcon } from '../components/ui.jsx';
import { GameHeader, SpectatorNote, nameOf, playerOf } from './common.jsx';

export default function Bomb({ room, game, me, spectator }) {
  const remaining = useRemaining(game.phase === 'play' ? game.explodeAt ?? game.canPassAt : game.deadline);
  const holder = game.holderId;

  useEffect(() => {
    if (game.phase === 'play' && game.isHolder) buzz([60, 40, 60]);
    if (game.phase === 'reveal') buzz(game.outcome?.loserId === me ? 400 : 60);
  }, [game.phase, holder, game.isHolder, game.outcome?.loserId, me]);

  if (game.phase === 'ready') {
    return (
      <main className="screen game">
        <GameHeader game={game} />
        <div className="center grow">
          <BombIcon size={128} lit={false} />
          <p className="lead strong">폭탄이 곧 등장합니다!</p>
          <Countdown ms={remaining} />
          <p className="muted">언제 터질지 아무도 몰라요. 마지막 5초만 공개돼요.</p>
        </div>
      </main>
    );
  }

  if (game.phase === 'reveal') {
    const lost = game.outcome.loserId === me;
    return (
      <main className="screen game reveal white">
        <GameHeader game={game} />
        <div className="center">
          <Burst>펑!</Burst>
          <p className="lead strong">폭탄이 터졌어요!</p>
          <p className="muted">{lost ? '하필 당신 손에서…' : `${nameOf(room, game.outcome.loserId)}의 손에서 터졌어요.`} (총 {game.outcome.passes}번 전달)</p>
        </div>
        <DeltaList room={room} deltas={game.deltas} highlight={[game.outcome.loserId]} />
      </main>
    );
  }

  const canPass = game.isHolder && serverNow() >= game.canPassAt;
  const secs = game.explodeAt ? Math.ceil(Math.max(0, game.explodeAt - serverNow()) / 1000) : null;
  const danger = secs !== null;

  return (
    <main className={`screen game ${game.isHolder ? 'holding' : ''}`}>
      <GameHeader game={game} />
      <SpectatorNote spectator={spectator} />
      <section className="bomb-stage">
        <p className="lead strong">
          {game.isHolder ? '지금 당신이 폭탄을 들고 있습니다!' : `폭탄은 지금 ${nameOf(room, holder)}에게!`}
        </p>
        <div className={`bomb-wrap ${danger ? 'danger' : ''} ${game.isHolder ? 'shake' : ''}`}>
          <BombIcon size={game.isHolder ? 192 : 128} />
          <span className="bomb-digits">{danger ? String(secs).padStart(2, '0') : '??'}</span>
        </div>
        <p className="muted">{danger ? `${secs}초` : '폭발 시간은 비밀'}{game.lastFrom && ` · ${nameOf(room, game.lastFrom)}에게서 넘어옴`}</p>
      </section>

      {game.isHolder ? (
        <>
          <p className="section-label">누구에게 넘길까요?</p>
          <div className="vote-grid">
            {game.players
              .filter((id) => id !== me && playerOf(room, id)?.connected)
              .map((id) => (
                <button key={id} className="vote-card" disabled={!canPass} onClick={() => act('pass', { target: id })}>
                  <Avatar player={playerOf(room, id)} size={44} />
                  <span>{nameOf(room, id)}</span>
                </button>
              ))}
          </div>
          {!canPass && <p className="muted center-text">잠깐! 받은 폭탄은 1초 동안 들고 있어야 해요.</p>}
        </>
      ) : (
        <div className="claims">
          {game.players.map((id) => (
            <span key={id} className={`claim ${id === holder ? 'done' : ''}`}>
              <Avatar player={playerOf(room, id)} size={34} />
              <b>{id === holder && <GameIcon id="bomb" size={16} />}</b>
            </span>
          ))}
        </div>
      )}
      {!game.isHolder && <div className="bottom"><Button variant="secondary" disabled>폭탄이 오면 바로 넘기세요</Button></div>}
    </main>
  );
}

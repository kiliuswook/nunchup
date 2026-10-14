import React from 'react';
import { TopBar } from '../components/ui.jsx';
import { GAME_META } from '../gamesMeta.js';

export const nameOf = (room, id) => room.players.find((p) => p.id === id)?.name ?? '???';
export const playerOf = (room, id) => room.players.find((p) => p.id === id);

export function GameHeader({ game, extra }) {
  const meta = GAME_META[game.id];
  return (
    <TopBar
      left={<span className="game-title">{meta.name}</span>}
      right={extra ?? (game.rounds ? <span className="muted">{game.round} / {game.rounds} 라운드</span> : null)}
    />
  );
}

export function SpectatorNote({ spectator }) {
  return spectator ? <div className="spectator">이번 게임은 관전 중이에요. 다음 게임부터 함께해요.</div> : null;
}

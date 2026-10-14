import React from 'react';
import { send } from '../net.js';
import { Avatar, Button, Crown, GameIcon, TopBar } from '../components/ui.jsx';
import { GAME_META } from '../gamesMeta.js';
import { toast } from '../toast.js';

export default function Lobby({ room, me }) {
  const isHost = room.hostId === me;
  const online = room.players.filter((p) => p.connected).length;

  async function call(event, payload) {
    const res = await send(event, payload);
    if (!res.ok) toast(res.error);
  }

  async function share() {
    const url = `${location.origin}${location.pathname}?code=${room.code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'NUNCHUP', text: `NUNCHUP 파티 룸 코드: ${room.code}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('초대 링크를 복사했어요.');
      }
    } catch {}
  }

  return (
    <main className="screen lobby">
      <TopBar
        left={<button className="icon-btn" onClick={() => call('room:leave')} aria-label="나가기">←</button>}
        title="내 파티 룸"
      />
      <section className="code-block">
        <span className="label">룸 코드</span>
        <div className="code-row">
          <span className="room-code">{room.code}</span>
          <button className="icon-btn" onClick={share} aria-label="공유">⧉</button>
        </div>
        <span className="hint">이 코드를 친구들에게 공유하세요.</span>
      </section>

      <section>
        <div className="section-head">
          <span>참가자 {online} / 8</span>
          <span className="legend"><i className="dot on" /> 접속 중</span>
        </div>
        <ul className="plist">
          {room.players.map((p) => (
            <li key={p.id} className={p.connected ? '' : 'away'}>
              <Avatar player={p} size={36} dot />
              <span className="pname">
                {p.name}
                {p.id === me && <em> (나)</em>}
              </span>
              <span className="pscore">{p.score}점</span>
              {p.id === room.hostId ? <Crown /> : <span style={{ width: 18 }} />}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="section-head"><span>게임 선택</span>{!isHost && <span className="muted">방장이 골라요</span>}</div>
        <div className="game-grid">
          {Object.entries(GAME_META).map(([id, g]) => (
            <button
              key={id}
              className={`game-card ${room.selectedGame === id ? 'selected' : ''}`}
              disabled={!isHost}
              onClick={() => call('room:select', { gameId: id })}
            >
              <GameIcon id={id} />
              <strong>{g.name}</strong>
              <span>{g.type}</span>
            </button>
          ))}
        </div>
        <p className="game-desc">{GAME_META[room.selectedGame].desc}</p>
      </section>

      <div className="bottom">
        {isHost ? (
          <Button arrow onClick={() => call('room:start')}>게임 시작</Button>
        ) : (
          <div className="waiting">방장이 게임을 시작하길 기다리는 중…</div>
        )}
      </div>
    </main>
  );
}

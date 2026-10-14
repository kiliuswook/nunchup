import React from 'react';
import { send } from '../net.js';
import { Avatar, Button, Crown, DeltaList, TopBar } from '../components/ui.jsx';
import { GAME_META } from '../gamesMeta.js';
import { toast } from '../toast.js';

export default function Result({ room, me }) {
  const { result } = room;
  const isHost = room.hostId === me;
  const ranking = [...room.players].sort((a, b) => b.score - a.score);

  async function next() {
    const res = await send('room:lobby');
    if (!res.ok) toast(res.error);
  }

  return (
    <main className="screen result">
      <TopBar title={GAME_META[result.gameId].name} right={<span className="muted">결과</span>} />
      <section className="result-head">
        <span className="eyebrow">이번 게임</span>
        <h1>{result.headline}</h1>
        <p>{result.detail}</p>
      </section>
      <section>
        <div className="section-head"><span>점수 변화</span></div>
        <DeltaList room={room} deltas={result.deltas} />
      </section>
      <section>
        <div className="section-head"><span>오늘의 누적 순위</span></div>
        <ol className="plist rank">
          {ranking.map((p, i) => (
            <li key={p.id}>
              <span className="rank-no">{i + 1}</span>
              <Avatar player={p} size={30} />
              <span className="pname">{p.name}</span>
              {p.id === room.hostId && <Crown />}
              <span className="pscore">{p.score}점</span>
            </li>
          ))}
        </ol>
      </section>
      <div className="bottom">
        {isHost ? (
          <Button variant="dark" arrow onClick={next}>다음 게임</Button>
        ) : (
          <div className="waiting">방장이 다음 게임을 고르는 중…</div>
        )}
      </div>
    </main>
  );
}

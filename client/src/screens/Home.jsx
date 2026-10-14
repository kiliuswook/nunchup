import React, { useState } from 'react';
import { send, loadName, saveName, features } from '../net.js';
import { Logo, Button } from '../components/ui.jsx';
import { toast } from '../toast.js';

export default function Home() {
  const urlCode = new URLSearchParams(location.search).get('code')?.toUpperCase() ?? '';
  const [name, setName] = useState(loadName());
  const [code, setCode] = useState(urlCode);
  const [joining, setJoining] = useState(!!urlCode);
  const [busy, setBusy] = useState(false);

  async function go(event, extra = {}) {
    const n = name.trim();
    if (!n) return toast('닉네임을 먼저 입력해 주세요.');
    saveName(n);
    setBusy(true);
    const res = await send(event, { name: n, ...extra });
    setBusy(false);
    if (!res.ok) return toast(res.error);
    if (urlCode) history.replaceState(null, '', location.pathname);
  }

  return (
    <main className="screen home">
      <div className="home-top">
        <span className="eyebrow">좋은 사람들,<br />좋은 게임</span>
      </div>
      <div className="home-hero">
        <Logo size={52} />
        <p className="tagline">분위기를 읽고, 타이밍을 즐겨라.</p>
      </div>

      <label className="field">
        <span>닉네임</span>
        <input value={name} maxLength={10} placeholder="이름을 알려주세요" onChange={(e) => setName(e.target.value)} />
      </label>

      {joining ? (
        <div className="stack">
          <label className="field">
            <span>룸 코드</span>
            <input
              className="code-input"
              value={code}
              maxLength={4}
              placeholder="K7UP"
              autoCapitalize="characters"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
          </label>
          <Button arrow disabled={busy || code.length !== 4} onClick={() => go('room:join', { code })}>
            {busy ? '연결 중…' : '입장하기'}
          </Button>
          <Button variant="ghost" onClick={() => setJoining(false)}>돌아가기</Button>
        </div>
      ) : (
        <div className="stack">
          <Button arrow disabled={busy} onClick={() => go('room:create')}>{busy ? '방 만드는 중…' : '파티 시작'}</Button>
          <div className={features.quickStart ? 'row2' : 'stack'}>
            <Button variant="secondary" disabled={busy} onClick={() => setJoining(true)}>방 참가</Button>
            {features.quickStart && (
              <Button variant="secondary" disabled={busy} onClick={() => go('room:quick')}>빠른 시작</Button>
            )}
          </div>
        </div>
      )}

      <p className="home-foot">같은 사람들.<br />다른 대화.<br />더 좋은 밤.</p>
    </main>
  );
}

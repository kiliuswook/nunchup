import React from 'react';

// 로고: U 위로 라임 화살표가 솟아오르는 NUNCHUP 워드마크
export function Logo({ size = 44, sub = false }) {
  return (
    <div className="logo" style={{ fontSize: size }}>
      <span className="logo-word">
        NUNCH
        <span className="logo-u">
          U
          <svg className="logo-arrow" viewBox="0 0 20 30" aria-hidden="true">
            <path d="M10 1 L19 12 H13.5 V29 H6.5 V12 H1 Z" fill="var(--lime)" stroke="var(--black)" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </span>
        P
      </span>
      {sub && <span className="logo-sub">MOBILE SOCIAL PARTY GAME</span>}
    </div>
  );
}

export function Button({ variant = 'primary', arrow, children, className = '', ...rest }) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...rest}>
      {children}
      {arrow && <span className="btn-arrow">→</span>}
    </button>
  );
}

const AVATAR_TONES = ['#111111', '#78FF3B', '#D9D9D9', '#2B2B2B', '#B9FF8F', '#EDEBE2'];

export function Avatar({ player, size = 40, dot }) {
  const idx = [...(player?.id ?? '')].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length;
  const bg = AVATAR_TONES[idx];
  const dark = bg === '#111111' || bg === '#2B2B2B';
  return (
    <span className="avatar" style={{ width: size, height: size, background: bg, color: dark ? '#FAF9F3' : '#111', fontSize: size * 0.42 }}>
      {(player?.name ?? '?').slice(0, 1)}
      {dot && <i className={`dot ${player?.connected ? 'on' : 'off'}`} />}
    </span>
  );
}

export function TopBar({ title, right, left }) {
  return (
    <header className="topbar">
      <div className="topbar-side">{left}</div>
      <div className="topbar-title">{title}</div>
      <div className="topbar-side right">{right}</div>
    </header>
  );
}

export function Crown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-label="방장">
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor" />
    </svg>
  );
}

export function Bomb({ size = 180, lit = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className="bomb-svg">
      <path d="M128 52 q18 -26 38 -18" stroke="var(--black)" strokeWidth="7" fill="none" strokeLinecap="round" />
      <rect x="110" y="44" width="30" height="22" rx="5" transform="rotate(35 125 55)" fill="var(--black)" />
      {lit && (
        <g className="spark">
          <circle cx="168" cy="33" r="10" fill="var(--lime)" />
          <path d="M168 12v8M168 46v8M147 33h8M181 33h8M153 18l5 5M178 43l5 5M183 18l-5 5M158 43l-5 5" stroke="var(--black)" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      <circle cx="96" cy="118" r="66" fill="var(--black)" />
      <path d="M58 98 a44 44 0 0 1 30 -26" stroke="#FAF9F3" strokeOpacity=".35" strokeWidth="8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Burst({ children }) {
  return (
    <div className="burst">
      <svg viewBox="0 0 200 200" className="burst-svg" aria-hidden="true">
        <polygon
          points="100,8 118,62 172,36 140,86 194,104 138,118 162,174 108,138 92,194 80,138 24,166 56,116 6,96 62,82 34,30 86,60"
          fill="var(--lime)"
          stroke="var(--black)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      <span className="burst-text">{children}</span>
    </div>
  );
}

export function Countdown({ ms, label }) {
  return (
    <div className="countdown">
      <span className="countdown-num">{Math.ceil(ms / 1000)}</span>
      {label && <span className="countdown-label">{label}</span>}
    </div>
  );
}

export function DeltaList({ room, deltas, highlight = [] }) {
  const players = room.players.filter((p) => p.id in deltas).sort((a, b) => deltas[b.id] - deltas[a.id]);
  return (
    <ul className="plist">
      {players.map((p) => (
        <li key={p.id} className={highlight.includes(p.id) ? 'hl' : ''}>
          <Avatar player={p} size={34} />
          <span className="pname">{p.name}</span>
          <span className={`delta ${deltas[p.id] > 0 ? 'up' : deltas[p.id] < 0 ? 'down' : ''}`}>
            {deltas[p.id] > 0 ? `+${deltas[p.id]}` : deltas[p.id]}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function GameIcon({ id, size = 26 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true };
  switch (id) {
    case 'nunchi':
      return <svg {...common}><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>;
    case 'minority':
      return (
        <svg {...common}>
          <circle cx="7" cy="8" r="3" /><circle cx="17" cy="8" r="3" /><circle cx="12" cy="5" r="2.4" />
          <path d="M1.5 19a5.5 5.5 0 0 1 11 0zM11.5 19a5.5 5.5 0 0 1 11 0z" />
        </svg>
      );
    case 'liar':
      return (
        <svg {...common}>
          <path d="M7 10V7a5 5 0 0 1 10 0v3h1.5a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.5 10zm2.5 0h5V7a2.5 2.5 0 0 0-5 0z" />
        </svg>
      );
    case 'bomb':
      return (
        <svg {...common}>
          <circle cx="10" cy="14" r="7.5" /><path d="M14 7l2-2 2 2-2 2z" /><path d="M17 5q2-3 4-2" stroke="currentColor" strokeWidth="1.6" fill="none" />
        </svg>
      );
    default:
      return null;
  }
}

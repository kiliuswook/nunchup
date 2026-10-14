import React from 'react';
import arrowPng from '../assets/pixel/arrow.png';
import bombPng from '../assets/pixel/bomb.png';
import sparkPng from '../assets/pixel/bomb-spark.png';
import burstPng from '../assets/pixel/burst.png';
import crownPng from '../assets/pixel/crown.png';
import iconNunchi from '../assets/pixel/icon-nunchi.png';
import iconMinority from '../assets/pixel/icon-minority.png';
import iconLiar from '../assets/pixel/icon-liar.png';
import iconBomb from '../assets/pixel/icon-bomb.png';

// 픽셀아트 이미지(PixelLab 생성, art-src/ 참고). 단색 아이콘은 CSS mask 로 글자색(currentColor)을 입힌다.
const ICONS = { nunchi: iconNunchi, minority: iconMinority, liar: iconLiar, bomb: iconBomb };

export function PixelIcon({ src, height = 24, label, className = '' }) {
  return (
    <i
      className={`pixel-icon ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ height, '--src': `url(${src})` }}
    >
      {/* 보이지 않는 원본으로 가로 크기(비율)를 잡는다 */}
      <img src={src} alt="" />
    </i>
  );
}

// 로고: U 위로 라임 화살표가 솟아오르는 NUNCHUP 워드마크
export function Logo({ size = 44, sub = false }) {
  return (
    <div className="logo" style={{ fontSize: size }}>
      <span className="logo-word">
        NUNCH
        <span className="logo-u">
          U
          <img className="logo-arrow pixel" src={arrowPng} alt="" aria-hidden="true" />
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
    <PixelIcon src={crownPng} height={15} label="방장" className="crown" />
  );
}

export function Bomb({ size = 192, lit = true }) {
  return (
    <span className="bomb-img" style={{ width: size, height: size }}>
      <img className="pixel" src={bombPng} alt="" />
      {lit && <img className="pixel spark" src={sparkPng} alt="" />}
    </span>
  );
}

export function Burst({ children }) {
  return (
    <div className="burst">
      <img className="burst-img pixel" src={burstPng} alt="" aria-hidden="true" />
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
  return ICONS[id] ? <PixelIcon src={ICONS[id]} height={size} /> : null;
}

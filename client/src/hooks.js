import { useEffect, useState } from 'react';
import { serverNow } from './net.js';

// deadline(서버 시각)까지 남은 ms. 100ms마다 갱신.
export function useRemaining(deadline) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const h = setInterval(() => tick((x) => x + 1), 100);
    return () => clearInterval(h);
  }, [deadline]);
  return deadline ? Math.max(0, deadline - serverNow()) : null;
}

export function fmtClock(ms) {
  const s = Math.ceil((ms ?? 0) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function buzz(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

function loadToken() {
  try {
    let t = localStorage.getItem('nunchup.token');
    if (!t) {
      t = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('nunchup.token', t);
    }
    return t;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function loadName() {
  try {
    return localStorage.getItem('nunchup.name') ?? '';
  } catch {
    return '';
  }
}

export function saveName(name) {
  try {
    localStorage.setItem('nunchup.name', name);
  } catch {}
}

const token = loadToken();
const socket = io(import.meta.env.VITE_SERVER_URL || undefined, { transports: ['websocket', 'polling'] });

let offset = 0; // 서버 시계 - 내 시계
let current = { connected: false, me: null, room: null };
const listeners = new Set();
const set = (patch) => {
  current = { ...current, ...patch };
  listeners.forEach((l) => l(current));
};

socket.on('connect', () => {
  socket.emit('hello', { token }, () => set({ connected: true }));
});
socket.on('disconnect', () => set({ connected: false }));
socket.on('state', ({ me, now, room }) => {
  offset = now - Date.now();
  set({ me, room });
});

export const serverNow = () => Date.now() + offset;

export function useStore() {
  const [state, setState] = useState(current);
  useEffect(() => {
    listeners.add(setState);
    setState(current);
    return () => listeners.delete(setState);
  }, []);
  return state;
}

export function send(event, payload = {}) {
  return new Promise((resolve) => {
    socket.timeout(5000).emit(event, payload, (err, res) => {
      if (err) resolve({ ok: false, error: '서버 응답이 없어요. 연결을 확인해 주세요.' });
      else resolve(res);
    });
  });
}

export const act = (type, payload) => send('game:action', { type, payload });

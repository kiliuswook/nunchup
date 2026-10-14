import { io } from 'socket.io-client';

// 별도 Node 서버(Socket.IO)에 붙는 연결
export function createSocketLink({ onPush, onStatus }) {
  const socket = io(import.meta.env.VITE_SERVER_URL || undefined, { transports: ['websocket', 'polling'] });
  socket.on('connect', () => onStatus(true));
  socket.on('disconnect', () => onStatus(false));
  socket.on('state', (data) => onPush('state', data));
  return {
    request: (event, payload) =>
      new Promise((resolve) => {
        socket.timeout(5000).emit(event, payload, (err, res) =>
          resolve(err ? { ok: false, error: '서버 응답이 없어요. 연결을 확인해 주세요.' } : res),
        );
      }),
    close: () => socket.close(),
  };
}

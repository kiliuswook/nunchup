import React, { useEffect, useState } from 'react';
import { useStore } from './net.js';
import { setToastHandler } from './toast.js';
import Home from './screens/Home.jsx';
import Lobby from './screens/Lobby.jsx';
import Result from './screens/Result.jsx';
import Nunchi from './games/Nunchi.jsx';
import Minority from './games/Minority.jsx';
import Liar from './games/Liar.jsx';
import Bomb from './games/Bomb.jsx';

const GAME_VIEWS = { nunchi: Nunchi, minority: Minority, liar: Liar, bomb: Bomb };


export default function App() {
  const { connected, me, room } = useStore();
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let h;
    setToastHandler((m) => {
      setMsg(m);
      clearTimeout(h);
      h = setTimeout(() => setMsg(null), 2600);
    });
  }, []);

  let screen;
  if (!room) screen = <Home />;
  else if (room.phase === 'playing' && room.game) {
    const View = GAME_VIEWS[room.game.id];
    const spectator = !room.game.players.includes(me);
    screen = <View room={room} game={room.game} me={me} spectator={spectator} />;
  } else if (room.phase === 'result') screen = <Result room={room} me={me} />;
  else screen = <Lobby room={room} me={me} />;

  return (
    <div className="app">
      {!connected && <div className="offline">연결 중… 잠시만 기다려 주세요</div>}
      {screen}
      {msg && <div className="toast">{msg}</div>}
    </div>
  );
}

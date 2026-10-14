import { NunchiGame } from './nunchi.js';
import { MinorityGame } from './minority.js';
import { LiarGame } from './liar.js';
import { BombGame } from './bomb.js';

export const GAMES = {
  [NunchiGame.id]: NunchiGame,
  [MinorityGame.id]: MinorityGame,
  [LiarGame.id]: LiarGame,
  [BombGame.id]: BombGame,
};

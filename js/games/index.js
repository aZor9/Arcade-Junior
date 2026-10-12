import g2048 from './g2048.js';
import mastermind from './mastermind.js';
import nombre from './nombre.js';
import lights from './lights.js';
import taquin from './taquin.js';
import memory from './memory.js';
import demineur from './demineur.js';
import sudoku from './sudoku.js';
import untangle from './untangle.js';
import pipes from './pipes.js';
import takuzu from './takuzu.js';
import hanoi from './hanoi.js';

export const GAMES = [g2048, mastermind, sudoku, nombre, lights, taquin, memory, demineur, untangle, pipes, takuzu, hanoi];

export const getGame = (id) => GAMES.find((g) => g.id === id) || null;

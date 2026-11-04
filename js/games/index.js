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
import flow from './flow.js';
import compte from './compte.js';
import nonogram from './nonogram.js';
import connect4 from './connect4.js';
import nummatch from './numbermatch.js';
import watersort from './watersort.js';
import rushhour from './rushhour.js';
import helix from './helix.js';
import stack from './stack.js';
import futoshiki from './futoshiki.js';
import skyscrapers from './skyscrapers.js';
import reversi from './reversi.js';
import cages from './cages.js';
import hitori from './hitori.js';
import billes from './billes.js';
import blocs from './blocs.js';
import snake from './snake.js';
import breakout from './breakout.js';
import simon from './simon.js';
import schulte from './schulte.js';

// Jeux publiés : visibles par tout le monde.
export const GAMES = [g2048, mastermind, sudoku, nombre, lights, taquin, memory, demineur, untangle, pipes, takuzu, hanoi, flow, compte, nonogram, connect4, nummatch, helix, stack, watersort, rushhour, futoshiki, skyscrapers, cages, hitori, reversi, billes, blocs, snake, breakout, simon, schulte];

// Jeux en test (« Laboratoire ») : visibles seulement quand le laboratoire est activé
// (6 appuis rapides sur l'onglet Profil). Une partie déjà commencée reste jouable même s'il est désactivé.
export const LAB_GAMES = [];
LAB_GAMES.forEach((g) => { g.lab = true; });

export const ALL_GAMES = [...GAMES, ...LAB_GAMES];

// Catégories (affichées sur l'accueil quand le laboratoire est activé).
export const CATEGORIES = [
  { id: 'logique', emoji: '🧩', label: 'Logique', desc: 'Casse-têtes à solution unique' },
  { id: 'arcade', emoji: '🕹️', label: 'Arcade', desc: 'Réflexes et rapidité' },
  { id: 'moderne', emoji: '📱', label: 'Modernes', desc: 'Les succès des téléphones' },
  { id: 'classique', emoji: '♟️', label: 'Classiques', desc: 'Jeux de plateau et grands classiques' },
  { id: 'memoire', emoji: '🧠', label: 'Mémoire et calcul', desc: 'Retenir, compter, deviner' },
];
const CATEGORY_OF = {
  logique: ['sudoku', 'takuzu', 'nonogram', 'flow', 'pipes', 'untangle', 'lights', 'rushhour', 'futoshiki', 'skyscrapers', 'cages', 'hitori'],
  arcade: ['helix', 'stack', 'snake', 'breakout'],
  moderne: ['2048', 'watersort', 'nummatch', 'blocs'],
  classique: ['connect4', 'reversi', 'demineur', 'mastermind', 'taquin', 'hanoi', 'billes'],
  memoire: ['memory', 'simon', 'schulte', 'nombre', 'compte'],
};
for (const [cat, ids] of Object.entries(CATEGORY_OF)) ids.forEach((id) => { const g = ALL_GAMES.find((x) => x.id === id); if (g) g.category = cat; });
export const getGame = (id) => ALL_GAMES.find((g) => g.id === id) || null;

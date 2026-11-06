import { createRng } from '../rng.js';
import { h } from '../ui.js';

// Reversi (Othello) contre l'ordinateur. On pose un pion qui encadre des pions adverses (ligne, colonne ou
// diagonale) : ils changent de couleur. Sans coup possible, on passe son tour. À la fin, le plus de pions gagne.
// L'ordinateur cherche le meilleur coup (negamax avec élagage alpha-bêta) selon une table de valeurs des cases.

export const N = 8;
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
// Coins précieux, cases voisines des coins dangereuses, bords plutôt bons.
const WEIGHTS = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, 1, 1, 1, 1, -2, 10,
  5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5,
  10, -2, 1, 1, 1, 1, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100,
];

export function startBoard() {
  const b = Array(N * N).fill(0);
  b[27] = 2; b[28] = 1; b[35] = 1; b[36] = 2;
  return b;
}

// Pions retournés si `who` joue en i (liste vide : coup illégal).
export function flips(board, i, who) {
  if (board[i]) return [];
  const r = Math.floor(i / N);
  const c = i % N;
  const out = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let rr = r + dr;
    let cc = c + dc;
    while (rr >= 0 && rr < N && cc >= 0 && cc < N && board[rr * N + cc] === 3 - who) { line.push(rr * N + cc); rr += dr; cc += dc; }
    if (line.length && rr >= 0 && rr < N && cc >= 0 && cc < N && board[rr * N + cc] === who) out.push(...line);
  }
  return out;
}

export const legalMoves = (board, who) => board.map((_, i) => i).filter((i) => flips(board, i, who).length);

export function play(board, i, who) {
  const f = flips(board, i, who);
  board[i] = who;
  f.forEach((j) => { board[j] = who; });
  return f;
}

export const count = (board, who) => board.filter((v) => v === who).length;

function evaluate(board, who) {
  let s = 0;
  for (let i = 0; i < board.length; i++) if (board[i] === who) s += WEIGHTS[i]; else if (board[i]) s -= WEIGHTS[i];
  return s + 3 * (legalMoves(board, who).length - legalMoves(board, 3 - who).length);
}

function negamax(board, depth, alpha, beta, who, passed) {
  const moves = legalMoves(board, who);
  if (!moves.length) {
    if (passed) { const d = count(board, who) - count(board, 3 - who); return d > 0 ? 10000 + d : d < 0 ? -10000 + d : 0; }
    return -negamax(board, depth, -beta, -alpha, 3 - who, true);
  }
  if (depth === 0) return evaluate(board, who);
  let best = -Infinity;
  for (const i of moves) {
    const b = board.slice();
    play(b, i, who);
    const s = -negamax(b, depth - 1, -beta, -alpha, 3 - who, false);
    if (s > best) best = s;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function bestMove(board, who, depth, rng) {
  const moves = legalMoves(board, who);
  if (!moves.length) return -1;
  const scored = moves.map((i) => { const b = board.slice(); play(b, i, who); return [i, -negamax(b, depth - 1, -Infinity, Infinity, 3 - who, false)]; });
  const top = Math.max(...scored.map((s) => s[1]));
  return rng.pick(scored.filter((s) => s[1] === top))[0];
}

const LEVELS = { easy: { depth: 1, slip: 0.35 }, normal: { depth: 2, slip: 0 }, hard: { depth: 3, slip: 0 }, expert: { depth: 4, slip: 0 } };

export default {
  id: 'reversi',
  name: 'Reversi',
  emoji: '⚫',
  color: '#3ddc97',
  tagline: 'Encadre et retourne les pions',
  howto: 'Tu joues les noirs. Pose un pion pour encadrer des pions blancs en ligne, en colonne ou en diagonale : ils deviennent noirs.\nLes points indiquent où tu peux jouer. Sans coup possible, ton tour passe.\nQuand plus personne ne peut jouer, celui qui a le plus de pions gagne.',
  keys: ['Tab puis Entrée : poser un pion'],
  score: { label: 'Meilleur score', better: 'high', fmt: (v) => `${v} pion${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: "L'ordinateur se trompe souvent" },
    { id: 'normal', label: 'Normal', desc: "Il voit 2 coups à l'avance" },
    { id: 'hard', label: 'Difficile', desc: "Il voit 3 coups à l'avance" },
    { id: 'expert', label: 'Expert', desc: "Il voit 4 coups à l'avance" },
  ],

  create(rng, diff) {
    return { level: diff, board: startBoard(), turn: 1, rng: rng.state, last: -1, flipped: [], over: false };
  },

  mount(root, state, ctx) {
    const rng = createRng(0);
    rng.state = state.rng;
    let timer = null;
    const meEl = h('strong', { text: '' });
    const aiEl = h('strong', { text: '' });
    const turnEl = h('strong', { text: '' });
    const cells = state.board.map((_, i) => h('button', { type: 'button', class: 'rv-cell', onclick: () => tap(i) }, h('span', { class: 'rv-disc' })));
    root.append(h('div', { class: 'rv' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: '⚫ Toi' }), meEl),
        h('div', { class: 'hud-item' }, h('span', { text: '⚪ Ordinateur' }), aiEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Au tour de' }), turnEl)),
      h('div', { class: 'rv-board' }, cells)));

    function paint() {
      const legal = new Set(!state.over && state.turn === 1 ? legalMoves(state.board, 1) : []);
      cells.forEach((b, i) => {
        const v = state.board[i];
        b.className = ['rv-cell', legal.has(i) ? 'hint' : '', i === state.last ? 'last' : ''].filter(Boolean).join(' ');
        b.firstChild.className = `rv-disc${v ? ` p${v}` : ''}${state.flipped.includes(i) ? ' flip' : ''}`;
        b.disabled = !legal.has(i);
        b.setAttribute('aria-label', `Ligne ${Math.floor(i / N) + 1}, colonne ${(i % N) + 1}, ${v === 1 ? 'pion noir' : v === 2 ? 'pion blanc' : legal.has(i) ? 'coup possible' : 'vide'}`);
      });
      meEl.textContent = count(state.board, 1);
      aiEl.textContent = count(state.board, 2);
      turnEl.textContent = state.over ? 'Fini' : state.turn === 1 ? 'Toi' : 'Ordi…';
    }

    // Passe au joueur suivant ; gère les tours passés et la fin de partie.
    function next() {
      const other = 3 - state.turn;
      if (legalMoves(state.board, other).length) state.turn = other;
      else if (!legalMoves(state.board, state.turn).length) state.over = true;
      else ctx.toast(other === 1 ? 'Aucun coup possible : tu passes ton tour.' : "L'ordinateur ne peut pas jouer : à toi.");
      state.rng = rng.state;
      paint();
      ctx.save(state);
      if (state.over) {
        const me = count(state.board, 1);
        const ai = count(state.board, 2);
        if (me === ai) ctx.toast('Égalité !');
        ctx.finish(me > ai ? { won: true, score: me } : { won: false });
      } else if (state.turn === 2) timer = setTimeout(ai, 500);
    }

    function move(i, who) {
      state.flipped = play(state.board, i, who);
      state.last = i;
      next();
    }

    function ai() {
      timer = null;
      if (state.over || state.turn !== 2) return;
      const { depth, slip } = LEVELS[state.level] || LEVELS.normal;
      const moves = legalMoves(state.board, 2);
      move(rng.next() < slip ? rng.pick(moves) : bestMove(state.board, 2, depth, rng), 2);
    }

    function tap(i) {
      if (state.over || state.turn !== 1 || !flips(state.board, i, 1).length) return;
      move(i, 1);
    }

    paint();
    if (!state.over && state.turn === 2) timer = setTimeout(ai, 350);
    return () => clearTimeout(timer);
  },
};

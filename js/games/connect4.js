import { createRng } from '../rng.js';
import { h } from '../ui.js';

// Puissance 4 contre l'ordinateur. Le joueur (1) affronte une IA (2) de force réglable :
// recherche « negamax » avec élagage alpha-bêta, plus ou moins profonde selon le niveau.

export const W = 7;
export const H = 6;
const ORDER = [3, 2, 4, 1, 5, 0, 6]; // on explore le centre d'abord : meilleur élagage

// Case (ligne 0 = bas) ; le plateau est un tableau plat de W*H éléments (0 vide, 1 joueur, 2 ordinateur).
export function dropIn(board, col, who) {
  for (let r = 0; r < H; r++) {
    if (!board[r * W + col]) { board[r * W + col] = who; return r; }
  }
  return -1;
}

// Quatre cases alignées passant par (r, c) pour `who`, ou null.
export function lineAt(board, r, c, who) {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [r * W + c];
    for (const s of [1, -1]) {
      let rr = r + dr * s;
      let cc = c + dc * s;
      while (rr >= 0 && rr < H && cc >= 0 && cc < W && board[rr * W + cc] === who) {
        cells.push(rr * W + cc);
        rr += dr * s;
        cc += dc * s;
      }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

const full = (board) => board.every(Boolean);

// Évaluation statique : on compte les « fenêtres » de 4 cases où un seul camp peut encore gagner.
function evaluate(board, who) {
  const opp = 3 - who;
  let score = 0;
  for (let r = 0; r < H; r++) if (board[r * W + 3] === who) score += 3; else if (board[r * W + 3] === opp) score -= 3;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const er = r + dr * 3;
        const ec = c + dc * 3;
        if (er < 0 || er >= H || ec < 0 || ec >= W) continue;
        let mine = 0;
        let theirs = 0;
        for (let k = 0; k < 4; k++) {
          const v = board[(r + dr * k) * W + c + dc * k];
          if (v === who) mine++; else if (v === opp) theirs++;
        }
        if (mine && theirs) continue;
        if (mine === 3) score += 5; else if (mine === 2) score += 2;
        if (theirs === 3) score -= 5; else if (theirs === 2) score -= 2;
      }
    }
  }
  return score;
}

// Score de la position du point de vue de `who`, qui joue (negamax avec élagage alpha-bêta).
function negamax(board, depth, alpha, beta, who) {
  if (full(board)) return 0;
  if (depth === 0) return evaluate(board, who);
  let best = -Infinity;
  for (const col of ORDER) {
    const r = dropIn(board, col, who);
    if (r < 0) continue;
    let score;
    if (lineAt(board, r, col, who)) score = 100000 + depth;       // victoire d'autant plus rapide que depth est grand
    else score = -negamax(board, depth - 1, -beta, -alpha, 3 - who);
    board[r * W + col] = 0;
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

// Meilleur coup pour `who`. À score égal, le choix se fait au hasard (via rng) pour varier les parties.
export function bestMove(board, who, depth, rng) {
  const scores = [];
  for (const col of ORDER) {
    const b = board.slice();
    const r = dropIn(b, col, who);
    if (r < 0) continue;
    const score = lineAt(b, r, col, who) ? 100000 + depth : -negamax(b, depth - 1, -Infinity, Infinity, 3 - who);
    scores.push([col, score]);
  }
  const top = Math.max(...scores.map((s) => s[1]));
  return rng.pick(scores.filter((s) => s[1] === top))[0];
}

const LEVELS = { easy: { depth: 1, slip: 0.3 }, normal: { depth: 3, slip: 0 }, hard: { depth: 5, slip: 0 }, expert: { depth: 7, slip: 0 } };

export default {
  id: 'connect4',
  name: 'Puissance 4',
  emoji: '🔴',
  color: '#ff6f91',
  tagline: 'Aligne quatre jetons',
  howto: 'Chacun son tour, laisse tomber un jeton dans une colonne.\nAligne quatre jetons de ta couleur (ligne, colonne ou diagonale) avant l’ordinateur.\nLe premier joueur est tiré au sort.',
  keys: ['1 à 7 : choisir la colonne'],
  score: { label: 'Moins de coups', better: 'low', fmt: (v) => `${v} coup${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: 'L’ordinateur se trompe parfois' },
    { id: 'normal', label: 'Normal', desc: 'Il voit 3 coups à l’avance' },
    { id: 'hard', label: 'Difficile', desc: 'Il voit 5 coups à l’avance' },
    { id: 'expert', label: 'Expert', desc: 'Il voit 7 coups à l’avance' },
  ],

  create(rng, diff) {
    return { level: diff, board: Array(W * H).fill(0), turn: rng.int(2) + 1, moves: 0, winner: 0, line: [], rng: rng.state, last: -1 };
  },

  mount(root, state, ctx) {
    const rng = createRng(0);
    rng.state = state.rng;
    let timer = null;
    let over = state.winner !== 0;

    const statusEl = h('strong', { text: '' });
    const movesEl = h('strong', { text: '' });
    const cols = Array.from({ length: W }, (_, c) => {
      const col = h('button', { type: 'button', class: 'c4-col', 'aria-label': `Colonne ${c + 1}`, onclick: () => play(c) },
        Array.from({ length: H }, () => h('span', { class: 'c4-slot' })));
      return col;
    });
    root.append(h('div', { class: 'c4g' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Tes coups' }), movesEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Au tour de' }), statusEl)),
      h('div', { class: 'c4-board' }, cols)));

    function paint() {
      cols.forEach((col, c) => {
        // La ligne 0 est le bas : les emplacements sont dessinés du haut vers le bas.
        col.querySelectorAll('.c4-slot').forEach((slot, k) => {
          const r = H - 1 - k;
          const i = r * W + c;
          const v = state.board[i];
          const cls = ['c4-slot'];
          if (v) cls.push(`p${v}`);
          if (state.line.includes(i)) cls.push('win');
          if (i === state.last) cls.push('drop');
          slot.className = cls.join(' ');
          slot.style.setProperty('--from', String(H - r));
        });
        col.disabled = over || state.turn !== 1 || state.board[(H - 1) * W + c] !== 0;
      });
      movesEl.textContent = state.moves;
      statusEl.textContent = over ? (state.winner === 1 ? 'Toi, bravo !' : state.winner === 2 ? 'L’ordinateur' : 'Match nul') : state.turn === 1 ? 'Toi' : 'L’ordinateur…';
    }

    function place(col, who) {
      const r = dropIn(state.board, col, who);
      if (r < 0) return false;
      state.last = r * W + col;
      const line = lineAt(state.board, r, col, who);
      if (line) { state.winner = who; state.line = line; over = true; }
      else if (full(state.board)) { state.winner = 3; over = true; }
      else state.turn = 3 - who;
      state.rng = rng.state;
      paint();
      ctx.save(state);
      if (over) {
        if (state.winner === 3) ctx.toast('Match nul : la grille est pleine.');
        ctx.finish(state.winner === 1 ? { won: true, score: state.moves } : { won: false });
      }
      return true;
    }

    function ai() {
      timer = null;
      if (over || state.turn !== 2) return;
      const { depth, slip } = LEVELS[state.level] || LEVELS.normal;
      const legal = ORDER.filter((c) => state.board[(H - 1) * W + c] === 0);
      const col = rng.next() < slip ? rng.pick(legal) : bestMove(state.board, 2, depth, rng);
      place(col, 2);
    }

    function play(col) {
      if (over || state.turn !== 1) return;
      if (state.board[(H - 1) * W + col] !== 0) return;
      state.moves++;
      place(col, 1);
      if (!over) timer = setTimeout(ai, 450);
    }

    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-7]$/.test(e.key)) play(Number(e.key) - 1);
    };
    document.addEventListener('keydown', onKey);
    paint();
    // Reprise d'une partie où c'était à l'ordinateur de jouer.
    if (!over && state.turn === 2) timer = setTimeout(ai, 350);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', onKey); };
  },
};

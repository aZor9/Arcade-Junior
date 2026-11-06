import { createRng } from '../rng.js';
import { h } from '../ui.js';

// Blocs : on pose sur la grille des pièces proposées trois par trois. Une ligne ou une colonne pleine s'efface
// et rapporte des points. Quand aucune des pièces restantes ne rentre, la partie est finie.

// Pièces : liste de [ligne, colonne] à partir du coin haut gauche.
const line = (k, vertical) => Array.from({ length: k }, (_, j) => (vertical ? [j, 0] : [0, j]));
const square = (k) => Array.from({ length: k * k }, (_, j) => [Math.floor(j / k), j % k]);
export const SHAPES = [
  [[0, 0]],
  line(2), line(2, true), line(3), line(3, true), line(4), line(4, true), line(5), line(5, true),
  square(2), square(3),
  [[0, 0], [1, 0], [1, 1]], [[0, 1], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 0]], [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
];
const COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac', '#3bc9db'];
// Poids par niveau : plus de petites pièces en facile, plus de grandes en difficile.
const WEIGHT = {
  easy: (s) => (s.length <= 3 ? 3 : s.length === 4 ? 2 : 1),
  normal: () => 1,
  hard: (s) => (s.length >= 4 ? 2 : 1),
};

export function fits(grid, n, shape, r, c) {
  return shape.every(([dr, dc]) => r + dr >= 0 && r + dr < n && c + dc >= 0 && c + dc < n && !grid[(r + dr) * n + c + dc]);
}

export const fitsAnywhere = (grid, n, shape) => grid.some((_, i) => fits(grid, n, shape, Math.floor(i / n), i % n));

// Pose la pièce et efface les lignes et colonnes pleines ; renvoie les points gagnés et les cases effacées.
export function placePiece(grid, n, shape, r, c, color) {
  shape.forEach(([dr, dc]) => { grid[(r + dr) * n + c + dc] = color; });
  const cleared = new Set();
  let lines = 0;
  for (let k = 0; k < n; k++) {
    const row = Array.from({ length: n }, (_, j) => k * n + j);
    const col = Array.from({ length: n }, (_, j) => j * n + k);
    if (row.every((i) => grid[i])) { row.forEach((i) => cleared.add(i)); lines++; }
    if (col.every((i) => grid[i])) { col.forEach((i) => cleared.add(i)); lines++; }
  }
  cleared.forEach((i) => { grid[i] = 0; });
  return { points: shape.length + (lines * (lines + 1) / 2) * 10, lines, cleared: [...cleared] };
}

function deal(rng, diff) {
  const w = SHAPES.map(WEIGHT[diff] || WEIGHT.normal);
  const total = w.reduce((a, b) => a + b, 0);
  return Array.from({ length: 3 }, () => {
    let x = rng.next() * total;
    let k = 0;
    while (x >= w[k]) { x -= w[k]; k++; }
    return { shape: k, color: 1 + rng.int(COLORS.length) };
  });
}

export default {
  id: 'blocs',
  name: 'Blocs',
  emoji: '🟪',
  color: '#9775fa',
  endless: true,
  tagline: 'Remplis les lignes',
  howto: "Choisis une des trois pièces, puis touche la case de la grille où poser son coin haut gauche.\nUne ligne ou une colonne pleine s'efface et rapporte des points (encore plus si plusieurs s'effacent ensemble).\nTrois nouvelles pièces arrivent quand les trois sont posées. La partie s'arrête quand plus aucune pièce ne rentre.",
  keys: ['1, 2, 3 : choisir une pièce', 'Flèches et Entrée : viser et poser'],
  score: { label: 'Meilleur score', better: 'high', always: true, fmt: (v) => `${v} point${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: 'Plus de petites pièces' },
    { id: 'normal', label: 'Normal', desc: 'Grille 10×10' },
    { id: 'hard', label: 'Difficile', desc: 'Grille 8×8, grandes pièces' },
  ],

  create(rng, diff) {
    const n = diff === 'hard' ? 8 : 10;
    return { n, diff, grid: Array(n * n).fill(0), tray: deal(rng, diff), score: 0, rng: rng.state };
  },

  mount(root, state, ctx) {
    const { n } = state;
    const rng = createRng(0);
    rng.state = state.rng;
    let pick = state.tray.findIndex(Boolean);
    let aim = null; // case visée (survol ou clavier)
    let over = false;
    let flash = [];
    const scoreEl = h('strong', { text: '' });
    const cells = state.grid.map((_, i) => {
      const b = h('button', { type: 'button', class: 'bl-cell', onclick: () => drop(i) });
      b.addEventListener('pointerenter', () => { aim = i; paint(); });
      return b;
    });
    const board = h('div', { class: 'bl-board', vars: { '--n': n } }, cells);
    board.addEventListener('pointerleave', () => { aim = null; paint(); });
    const tray = h('div', { class: 'bl-tray' });
    root.append(h('div', { class: 'bl' },
      h('div', { class: 'hud' }, h('div', { class: 'hud-item' }, h('span', { text: 'Score' }), scoreEl)),
      board, tray));

    const shapeOf = (k) => SHAPES[state.tray[k].shape];

    function paint() {
      const ghost = new Set();
      let ok = false;
      if (pick >= 0 && aim !== null && state.tray[pick]) {
        const shape = shapeOf(pick);
        const r = Math.floor(aim / n);
        const c = aim % n;
        ok = fits(state.grid, n, shape, r, c);
        shape.forEach(([dr, dc]) => { if (r + dr < n && c + dc < n) ghost.add((r + dr) * n + c + dc); });
      }
      cells.forEach((b, i) => {
        const v = state.grid[i];
        b.className = ['bl-cell', v ? 'on' : '', ghost.has(i) ? (ok ? 'ghost' : 'ghost no') : '', flash.includes(i) ? 'clear' : ''].filter(Boolean).join(' ');
        b.style.setProperty('--k', v ? COLORS[v - 1] : ghost.has(i) && pick >= 0 ? COLORS[state.tray[pick].color - 1] : '');
        b.setAttribute('aria-label', `Ligne ${Math.floor(i / n) + 1}, colonne ${(i % n) + 1}, ${v ? 'pleine' : 'vide'}`);
      });
      tray.replaceChildren(...state.tray.map((p, k) => {
        if (!p) return h('span', { class: 'bl-slot empty' });
        const shape = SHAPES[p.shape];
        const hgt = Math.max(...shape.map((s) => s[0])) + 1;
        const wid = Math.max(...shape.map((s) => s[1])) + 1;
        const playable = fitsAnywhere(state.grid, n, shape);
        return h('button', {
          type: 'button', class: `bl-slot${k === pick ? ' sel' : ''}${playable ? '' : ' stuck'}`, 'aria-pressed': String(k === pick),
          'aria-label': `Pièce ${k + 1} : ${shape.length} case${shape.length > 1 ? 's' : ''}, ${hgt} sur ${wid}${playable ? '' : ', ne rentre pas'}`,
          onclick: () => { pick = k; paint(); },
        }, h('span', { class: 'bl-piece', vars: { '--ph': hgt, '--pw': wid, '--k': COLORS[p.color - 1] } },
          shape.map(([r, c]) => h('span', { vars: { '--r': r + 1, '--c': c + 1 } }))));
      }));
      scoreEl.textContent = state.score;
    }

    function drop(i) {
      if (over) return;
      if (pick < 0 || !state.tray[pick]) { ctx.toast("Choisis d'abord une pièce sous la grille."); return; }
      const shape = shapeOf(pick);
      const r = Math.floor(i / n);
      const c = i % n;
      if (!fits(state.grid, n, shape, r, c)) { aim = i; paint(); ctx.toast('La pièce ne rentre pas ici.'); return; }
      const res = placePiece(state.grid, n, shape, r, c, state.tray[pick].color);
      state.score += res.points;
      flash = res.cleared;
      state.tray[pick] = null;
      if (state.tray.every((p) => !p)) state.tray = deal(rng, state.diff);
      state.rng = rng.state;
      pick = state.tray.findIndex(Boolean);
      aim = null;
      paint();
      flash = [];
      ctx.save(state);
      if (!state.tray.some((p) => p && fitsAnywhere(state.grid, n, SHAPES[p.shape]))) {
        over = true;
        ctx.toast('Plus aucune pièce ne rentre !');
        ctx.finish({ won: true, score: state.score });
      }
    }

    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || over) return;
      if (/^[1-3]$/.test(e.key) && state.tray[Number(e.key) - 1]) { pick = Number(e.key) - 1; paint(); }
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const a = aim ?? 0;
        const r = Math.min(n - 1, Math.max(0, Math.floor(a / n) + (e.key === 'ArrowDown') - (e.key === 'ArrowUp')));
        const c = Math.min(n - 1, Math.max(0, (a % n) + (e.key === 'ArrowRight') - (e.key === 'ArrowLeft')));
        aim = aim === null ? 0 : r * n + c;
        paint();
      } else if ((e.key === 'Enter' || e.key === ' ') && aim !== null && !e.target.closest?.('button')) { e.preventDefault(); drop(aim); }
    };
    document.addEventListener('keydown', onKey);
    paint();
    return () => document.removeEventListener('keydown', onKey);
  },
};

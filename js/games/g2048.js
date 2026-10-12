import { createRng } from '../rng.js';
import { h } from '../ui.js';

const DIRS = ['left', 'right', 'up', 'down'];

// Coordonnées de la ligne i dans le sens du déplacement.
function lineCoords(dir, i, n) {
  return Array.from({ length: n }, (_, j) => {
    if (dir === 'left') return [i, j];
    if (dir === 'right') return [i, n - 1 - j];
    if (dir === 'up') return [j, i];
    return [n - 1 - j, i];
  });
}

function slide(values) {
  const n = values.length;
  const tiles = values.filter(Boolean);
  const out = [];
  const merged = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === tiles[i + 1]) {
      out.push(tiles[i] * 2);
      gained += tiles[i] * 2;
      merged.push(out.length - 1);
      i++;
    } else {
      out.push(tiles[i]);
    }
  }
  while (out.length < n) out.push(0);
  return { out, gained, merged };
}

function move(state, dir) {
  const n = state.size;
  let moved = false;
  let gained = 0;
  const mergedCells = [];
  for (let i = 0; i < n; i++) {
    const coords = lineCoords(dir, i, n);
    const before = coords.map(([r, c]) => state.grid[r][c]);
    const res = slide(before);
    res.out.forEach((v, j) => {
      const [r, c] = coords[j];
      if (state.grid[r][c] !== v) moved = true;
      state.grid[r][c] = v;
    });
    res.merged.forEach((j) => mergedCells.push(coords[j].join(',')));
    gained += res.gained;
  }
  return { moved, gained, mergedCells };
}

function spawn(state, rng) {
  const empty = [];
  state.grid.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (!empty.length) return null;
  const [r, c] = rng.pick(empty);
  state.grid[r][c] = rng.next() < 0.1 ? 4 : 2;
  state.rng = rng.state;
  return `${r},${c}`;
}

function canMove(state) {
  const { grid, size: n } = state;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!grid[r][c]) return true;
      if (c + 1 < n && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < n && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

export default {
  id: '2048',
  name: '2048',
  emoji: '🔢',
  color: '#ff8a3d',
  tagline: 'Fusionne les tuiles identiques',
  howto: 'Glisse le doigt (ou utilise les flèches du clavier) pour déplacer toutes les tuiles.\nDeux tuiles identiques qui se touchent fusionnent et s’additionnent.\nAtteins la tuile cible avant que la grille soit pleine.',
  keys: ['Flèches : déplacer les tuiles'],
  score: { label: 'Meilleur score', better: 'high', fmt: (v) => v.toLocaleString('fr-FR') },
  difficulties: [
    { id: 'mini', label: 'Mini 3×3', desc: 'Atteins 256' },
    { id: 'classic', label: 'Classique 4×4', desc: 'Atteins 2048' },
    { id: 'grand', label: 'Grand 5×5', desc: 'Atteins 4096' },
  ],

  create(rng, diff) {
    const cfg = { mini: [3, 256], classic: [4, 2048], grand: [5, 4096] }[diff];
    const state = { size: cfg[0], target: cfg[1], grid: Array.from({ length: cfg[0] }, () => Array(cfg[0]).fill(0)), score: 0, rng: rng.state };
    spawn(state, rng);
    spawn(state, rng);
    return state;
  },

  mount(root, state, ctx) {
    const rng = createRng(0);
    rng.state = state.rng;
    let fresh = null;
    let mergedCells = [];
    let over = false;

    const scoreEl = h('strong', { text: '0' });
    const board = h('div', { class: 'g2048-board', vars: { '--n': state.size } });
    const wrap = h('div', { class: 'g2048' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Score' }), scoreEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Objectif' }), h('strong', { text: String(state.target) }))),
      board);
    root.append(wrap);

    function paint() {
      scoreEl.textContent = state.score.toLocaleString('fr-FR');
      board.replaceChildren();
      state.grid.forEach((row, r) => row.forEach((v, c) => {
        const key = `${r},${c}`;
        const cls = ['cell2048'];
        if (v) cls.push('has');
        if (key === fresh) cls.push('new');
        if (mergedCells.includes(key)) cls.push('merged');
        board.append(h('div', { class: cls.join(' '), 'data-len': String(String(v).length), 'data-hi': v >= 256, vars: v ? { '--lvl': Math.log2(v) } : {}, text: v || '' }));
      }));
    }

    function play(dir) {
      if (over) return;
      const res = move(state, dir);
      if (!res.moved) return;
      state.score += res.gained;
      mergedCells = res.mergedCells;
      fresh = spawn(state, rng);
      paint();
      ctx.save(state);
      const max = Math.max(...state.grid.flat());
      if (max >= state.target) {
        over = true;
        ctx.finish({ won: true, score: state.score });
      } else if (!canMove(state)) {
        over = true;
        ctx.finish({ won: false, score: state.score });
      }
    }

    let start = null;
    const onDown = (e) => { start = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };
    const onKey = (e) => {
      const d = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key];
      if (d && DIRS.includes(d)) { e.preventDefault(); play(d); }
    };
    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointerup', onUp);
    wrap.addEventListener('pointercancel', () => { start = null; });
    document.addEventListener('keydown', onKey);
    paint();

    return () => document.removeEventListener('keydown', onKey);
  },
};

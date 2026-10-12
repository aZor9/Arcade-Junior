import { h } from '../ui.js';

// Takuzu (Binairo) : remplir la grille de 0 et de 1.
//  - jamais trois mêmes chiffres de suite, en ligne comme en colonne ;
//  - autant de 0 que de 1 dans chaque ligne et chaque colonne ;
//  - pas deux lignes identiques, pas deux colonnes identiques.
// Valeurs stockées : 0 = case vide, 1 = chiffre 0, 2 = chiffre 1 (3 - v donne l'autre).

// Lignes et colonnes en alternance : les indices pairs sont des lignes, les impairs des colonnes.
function linesOf(n) {
  const lines = [];
  for (let k = 0; k < n; k++) {
    lines.push(Array.from({ length: n }, (_, j) => k * n + j));
    lines.push(Array.from({ length: n }, (_, j) => j * n + k));
  }
  return lines;
}

// Complète ce qui est déduisible. Retourne false si la grille est contradictoire.
export function propagate(g, n, lines = linesOf(n)) {
  const half = n / 2;
  let changed = true;
  while (changed) {
    changed = false;
    for (const L of lines) {
      for (let k = 0; k + 2 < n; k++) {
        const ia = L[k];
        const ib = L[k + 1];
        const ic = L[k + 2];
        const a = g[ia];
        const b = g[ib];
        const c = g[ic];
        if (a && a === b) {
          if (c === a) return false;
          if (!c) { g[ic] = 3 - a; changed = true; }
        } else if (b && b === c) {
          if (!a) { g[ia] = 3 - b; changed = true; }
        } else if (a && a === c && !b) { g[ib] = 3 - a; changed = true; }
      }
      let c1 = 0;
      let c2 = 0;
      for (const i of L) { if (g[i] === 1) c1++; else if (g[i] === 2) c2++; }
      if (c1 > half || c2 > half) return false;
      if (c1 === half && c2 < half) { for (const i of L) if (!g[i]) { g[i] = 2; changed = true; } }
      else if (c2 === half && c1 < half) { for (const i of L) if (!g[i]) { g[i] = 1; changed = true; } }
    }
  }
  // Deux lignes (ou deux colonnes) complètes identiques : interdit.
  const seen = new Set();
  for (let li = 0; li < lines.length; li++) {
    const L = lines[li];
    if (L.some((i) => !g[i])) continue;
    const key = `${li % 2}:${L.map((i) => g[i]).join('')}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

// Compte les solutions (jusqu'à `limit`) ; avec `rng`, l'ordre des essais est aléatoire.
export function solve(start, n, limit, rng) {
  const lines = linesOf(n);
  let count = 0;
  let first = null;
  let nodes = 0;
  let aborted = false;
  const rec = (g) => {
    if (++nodes > 40000) { aborted = true; return; }
    if (!propagate(g, n, lines)) return;
    const idx = g.indexOf(0);
    if (idx === -1) { count++; if (!first) first = Array.from(g); return; }
    const order = rng && rng.next() < 0.5 ? [2, 1] : [1, 2];
    for (const v of order) {
      const c = g.slice();
      c[idx] = v;
      rec(c);
      if (count >= limit || aborted) return;
    }
  };
  rec(Int8Array.from(start));
  return { count, solution: first, aborted };
}

// Cases en faute, à mettre en rouge.
export function errors(cur, n) {
  const bad = new Set();
  const half = n / 2;
  const lines = linesOf(n);
  const complete = new Map();
  for (let li = 0; li < lines.length; li++) {
    const L = lines[li];
    for (let k = 0; k + 2 < n; k++) {
      const a = cur[L[k]];
      if (a && a === cur[L[k + 1]] && a === cur[L[k + 2]]) { bad.add(L[k]); bad.add(L[k + 1]); bad.add(L[k + 2]); }
    }
    for (const v of [1, 2]) {
      const cells = L.filter((i) => cur[i] === v);
      if (cells.length > half) cells.forEach((i) => bad.add(i));
    }
    if (L.every((i) => cur[i])) {
      const key = `${li % 2}:${L.map((i) => cur[i]).join('')}`;
      if (complete.has(key)) { complete.get(key).forEach((i) => bad.add(i)); L.forEach((i) => bad.add(i)); } else complete.set(key, L);
    }
  }
  return bad;
}

const CONFIGS = {
  mini: { n: 6, keep: 0.5 },
  easy: { n: 8, keep: 0.5 },
  normal: { n: 10, keep: 0.42 },
  hard: { n: 12, keep: 0.36 },
};

export function generate(rng, diff) {
  const { n, keep } = CONFIGS[diff];
  let solution = null;
  for (let tries = 0; tries < 20 && !solution; tries++) {
    const r = solve(Array(n * n).fill(0), n, 1, rng);
    if (!r.aborted && r.solution) solution = r.solution;
  }
  const puzzle = solution.slice();
  const target = Math.round(n * n * keep);
  let given = n * n;
  for (const i of rng.shuffle(Array.from({ length: n * n }, (_, k) => k))) {
    if (given <= target) break;
    const v = puzzle[i];
    puzzle[i] = 0;
    const r = solve(puzzle, n, 2);
    if (r.aborted || r.count !== 1) puzzle[i] = v; else given--;
  }
  return { n, puzzle, solution };
}

export default {
  id: 'takuzu',
  name: 'Takuzu',
  emoji: '⚫',
  color: '#c77dff',
  tagline: 'Des 0 et des 1, sans triplé',
  howto: 'Remplis la grille avec des 0 et des 1.\nJamais trois chiffres identiques à la suite, en ligne comme en colonne.\nChaque ligne et chaque colonne contient autant de 0 que de 1.\nDeux lignes (ou deux colonnes) ne peuvent pas être identiques.\nTouche une case pour passer de vide à 0, puis à 1, puis de nouveau vide.',
  keys: ['Clic : vide → 0 → 1 → vide', 'Clic droit : sens inverse'],
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'mini', label: 'Mini 6×6', desc: 'Pour comprendre les règles' },
    { id: 'easy', label: 'Facile 8×8', desc: 'Beaucoup d’indices' },
    { id: 'normal', label: 'Normal 10×10', desc: 'Le format classique' },
    { id: 'hard', label: 'Difficile 12×12', desc: 'Peu d’indices' },
  ],

  create(rng, diff) {
    const { n, puzzle, solution } = generate(rng, diff);
    return { n, puzzle, solution, cur: puzzle.slice() };
  },

  mount(root, state, ctx) {
    const { n } = state;
    let over = false;
    const emptyEl = h('strong', { text: '' });
    const board = h('div', { class: 'tk-board', vars: { '--n': n } });
    const cells = state.cur.map((_, i) => {
      const b = h('button', { type: 'button', class: 'tk-cell', 'aria-label': `Ligne ${Math.floor(i / n) + 1}, colonne ${(i % n) + 1}` });
      b.addEventListener('click', () => cycle(i, 1));
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); cycle(i, -1); });
      board.append(b);
      return b;
    });
    root.append(h('div', { class: 'tk' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Cases vides' }), emptyEl),
        h('div', { class: 'hud-item tk-legend' }, h('span', { text: 'Règle' }), h('strong', { text: 'Pas de triplé' }))),
      board));

    function paint() {
      const bad = errors(state.cur, n);
      cells.forEach((b, i) => {
        const v = state.cur[i];
        const cls = ['tk-cell'];
        if (v) cls.push(`v${v}`);
        if (state.puzzle[i]) cls.push('given');
        if (bad.has(i)) cls.push('bad');
        b.className = cls.join(' ');
        b.textContent = v ? String(v - 1) : '';
      });
      emptyEl.textContent = state.cur.filter((v) => !v).length;
    }

    function cycle(i, dir) {
      if (over || state.puzzle[i]) return;
      state.cur[i] = (state.cur[i] + (dir > 0 ? 1 : 2)) % 3;
      paint();
      ctx.save(state);
      if (state.cur.every((v, k) => v === state.solution[k])) {
        over = true;
        ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 1000)) });
      }
    }

    paint();
    return () => {};
  },
};

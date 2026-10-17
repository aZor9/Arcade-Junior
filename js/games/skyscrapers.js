import { h } from '../ui.js';
import { solve as latin } from './futoshiki.js';

// Gratte-ciel (Skyscrapers) : chaque case est un immeuble de hauteur 1 à n, chaque hauteur une seule fois par
// ligne et par colonne. Un indice au bord indique combien d'immeubles on voit depuis ce côté : un immeuble
// plus haut cache ceux, plus petits, qui sont derrière lui.
// Génération : carré latin au hasard, tous les indices, puis on en retire tant que la solution reste unique.

// Nombre d'immeubles visibles dans une rangée vue depuis son début.
export const visible = (vals) => { let max = 0; let c = 0; for (const v of vals) if (v > max) { max = v; c++; } return c; };

// Rangées vues depuis chaque côté : haut, bas (colonnes), gauche, droite (lignes).
export function sightLines(n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const col = Array.from({ length: n }, (_, j) => j * n + k);
    const row = Array.from({ length: n }, (_, j) => k * n + j);
    out.push({ side: 'top', k, cells: col }, { side: 'bottom', k, cells: col.slice().reverse() });
    out.push({ side: 'left', k, cells: row }, { side: 'right', k, cells: row.slice().reverse() });
  }
  return out;
}

// Une rangée (même incomplète) peut-elle encore respecter son indice ? On regarde le début déjà rempli.
function lineOk(g, cells, clue, n) {
  let max = 0;
  let count = 0;
  let full = true;
  for (const i of cells) {
    const v = g[i];
    if (!v) { full = false; break; }
    if (v > max) { max = v; count++; }
  }
  if (full || max === n) return count === clue;   // plus rien ne pourra apparaître derrière le plus haut
  return count < clue;                            // l'immeuble le plus haut, encore à venir, sera vu en plus
}

// Compte les solutions (jusqu'à `limit`) avec indices `clues` (tableau aligné sur sightLines, 0 = pas d'indice).
export function solve(grid, n, clues, limit) {
  const g = grid.slice();
  const full = (1 << n) - 1;
  const rows = Array(n).fill(0);
  const cols = Array(n).fill(0);
  const lines = sightLines(n).map((l, k) => ({ ...l, clue: clues[k] })).filter((l) => l.clue);
  const through = Array.from({ length: n * n }, () => []);
  lines.forEach((l) => l.cells.forEach((i) => through[i].push(l)));
  g.forEach((v, i) => { if (v) { rows[Math.floor(i / n)] |= 1 << (v - 1); cols[i % n] |= 1 << (v - 1); } });
  if (lines.some((l) => !lineOk(g, l.cells, l.clue, n))) return { count: 0, solution: null };
  let found = 0;
  let first = null;
  const rec = () => {
    let best = -1;
    let bestMask = 0;
    let bestCount = 99;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const m = full & ~(rows[Math.floor(i / n)] | cols[i % n]);
      const c = popcount(m);
      if (c < bestCount) { best = i; bestMask = m; bestCount = c; if (!c) return; }
    }
    if (best === -1) { found++; if (!first) first = g.slice(); return; }
    const r = Math.floor(best / n);
    const c = best % n;
    for (let v = 1; v <= n; v++) {
      const bit = 1 << (v - 1);
      if (!(bestMask & bit)) continue;
      g[best] = v; rows[r] |= bit; cols[c] |= bit;
      if (through[best].every((l) => lineOk(g, l.cells, l.clue, n))) rec();
      g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit;
      if (found >= limit) return;
    }
  };
  rec();
  return { count: found, solution: first };
}
const popcount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

const CONFIGS = {
  easy: { n: 4, keepClues: 0.75 },
  normal: { n: 5, keepClues: 0.6 },
  hard: { n: 6, keepClues: 0.5 },
  expert: { n: 6, keepClues: 0 },
};

export function generate(rng, diff) {
  const { n, keepClues } = CONFIGS[diff];
  const { solution } = latin(Array(n * n).fill(0), n, [], 1, rng);
  const lines = sightLines(n);
  const clues = lines.map((l) => visible(l.cells.map((i) => solution[i])));
  // Avec tous les indices, il arrive que plusieurs grilles conviennent : on ajoute alors des chiffres donnés.
  const puzzle = Array(n * n).fill(0);
  for (const i of rng.shuffle(Array.from({ length: n * n }, (_, k) => k))) {
    if (solve(puzzle, n, clues, 2).count === 1) break;
    puzzle[i] = solution[i];
  }
  // Puis on retire des indices tant que la solution reste unique (jusqu'à la proportion voulue).
  const target = Math.round(clues.length * keepClues);
  let kept = clues.length;
  for (const k of rng.shuffle(clues.map((_, j) => j))) {
    if (kept <= target) break;
    const v = clues[k];
    clues[k] = 0;
    if (solve(puzzle, n, clues, 2).count !== 1) clues[k] = v; else kept--;
  }
  return { n, solution, puzzle, clues };
}

export default {
  id: 'skyscrapers',
  name: 'Gratte-ciel',
  emoji: '🏙️',
  color: '#5aa9e6',
  tagline: 'Combien d’immeubles vois-tu ?',
  howto: 'Chaque case est un immeuble de hauteur 1 à N : chaque hauteur apparaît une seule fois par ligne et par colonne.\nLes nombres au bord indiquent combien d’immeubles on voit depuis ce côté : un immeuble plus haut cache ceux qui sont plus petits derrière lui.\nTouche une case puis une hauteur. Un indice devient clair quand sa rangée est juste, rouge quand elle est fausse.',
  keys: ['Chiffres : hauteur de la case choisie', 'Flèches : changer de case', 'Retour arrière ou 0 : effacer'],
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'easy', label: 'Facile 4×4', desc: 'Beaucoup d’indices' },
    { id: 'normal', label: 'Normal 5×5', desc: 'Le classique' },
    { id: 'hard', label: 'Difficile 6×6', desc: 'Moins d’indices' },
    { id: 'expert', label: 'Expert 6×6', desc: 'Le strict minimum d’indices' },
  ],

  create(rng, diff) {
    const { n, solution, puzzle, clues } = generate(rng, diff);
    return { n, solution, puzzle, clues, cur: puzzle.slice(), sel: null };
  },

  mount(root, state, ctx) {
    const { n, clues } = state;
    let over = false;
    const lines = sightLines(n);
    // Grille (n + 2) × (n + 2) : indices sur le pourtour, immeubles au centre.
    const board = h('div', { class: 'sk-board', vars: { '--n': n } });
    const clueEls = lines.map((l, k) => {
      const pos = { top: [1, l.k + 2], bottom: [n + 2, l.k + 2], left: [l.k + 2, 1], right: [l.k + 2, n + 2] }[l.side];
      const el = h('span', { class: `sk-clue ${l.side}`, vars: { '--gr': pos[0], '--gc': pos[1] }, text: clues[k] ? String(clues[k]) : '' });
      if (clues[k]) el.setAttribute('aria-label', `${clues[k]} immeuble${clues[k] > 1 ? 's' : ''} visible${clues[k] > 1 ? 's' : ''} depuis ${{ top: 'le haut', bottom: 'le bas', left: 'la gauche', right: 'la droite' }[l.side]}`);
      board.append(el);
      return el;
    });
    const cells = state.cur.map((_, i) => {
      const b = h('button', { type: 'button', class: 'sk-cell', vars: { '--gr': Math.floor(i / n) + 2, '--gc': (i % n) + 2 } });
      b.addEventListener('click', () => { state.sel = i; paint(); ctx.save(state); });
      board.append(b);
      return b;
    });
    const pad = h('div', { class: 'sd-pad sk-pad', vars: { '--k': n + 1 } });
    for (let v = 1; v <= n; v++) pad.append(h('button', { type: 'button', class: 'key', text: String(v), onclick: () => put(v) }));
    pad.append(h('button', { type: 'button', class: 'key', 'aria-label': 'Effacer', text: '⌫', onclick: () => put(0) }));
    root.append(h('div', { class: 'sk' }, board, pad));

    function paint() {
      const sel = state.sel;
      const dup = new Set();
      for (let k = 0; k < n; k++) {
        for (const line of [Array.from({ length: n }, (_, j) => k * n + j), Array.from({ length: n }, (_, j) => j * n + k)]) {
          const seen = {};
          for (const i of line) if (state.cur[i]) (seen[state.cur[i]] = seen[state.cur[i]] || []).push(i);
          for (const list of Object.values(seen)) if (list.length > 1) list.forEach((i) => dup.add(i));
        }
      }
      cells.forEach((b, i) => {
        const v = state.cur[i];
        b.className = ['sk-cell', state.puzzle[i] ? 'given' : '', dup.has(i) ? 'bad' : '', i === sel ? 'sel' : '',
          sel !== null && i !== sel && (Math.floor(i / n) === Math.floor(sel / n) || i % n === sel % n) ? 'peer' : ''].filter(Boolean).join(' ');
        b.textContent = v || '';
        b.style.setProperty('--v', v / n); // plus l'immeuble est haut, plus la case est teintée
        b.setAttribute('aria-label', `Ligne ${Math.floor(i / n) + 1}, colonne ${(i % n) + 1}, ${v ? `hauteur ${v}` : 'vide'}${state.puzzle[i] ? ' (donnée)' : ''}`);
      });
      lines.forEach((l, k) => {
        const vals = l.cells.map((i) => state.cur[i]);
        const complete = vals.every(Boolean);
        clueEls[k].classList.toggle('ok', Boolean(clues[k]) && complete && visible(vals) === clues[k]);
        clueEls[k].classList.toggle('bad', Boolean(clues[k]) && complete && visible(vals) !== clues[k]);
      });
    }

    function put(v) {
      const i = state.sel;
      if (over || i === null || state.puzzle[i]) return;
      state.cur[i] = v;
      paint();
      ctx.save(state);
      if (state.cur.every((x, k) => x === state.solution[k])) {
        over = true;
        ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 1000)) });
      }
    }

    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) put(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') put(0);
      else if (state.sel !== null && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const r = Math.floor(state.sel / n);
        const c = state.sel % n;
        const nr = Math.min(n - 1, Math.max(0, r + (e.key === 'ArrowDown') - (e.key === 'ArrowUp')));
        const nc = Math.min(n - 1, Math.max(0, c + (e.key === 'ArrowRight') - (e.key === 'ArrowLeft')));
        state.sel = nr * n + nc;
        paint();
      }
    };
    document.addEventListener('keydown', onKey);
    paint();
    return () => document.removeEventListener('keydown', onKey);
  },
};

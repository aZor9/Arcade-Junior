import { h } from '../ui.js';

// Futoshiki : remplir la grille pour que chaque chiffre apparaisse une seule fois par ligne et par colonne,
// en respectant les signes < et > placés entre certaines cases voisines.
// Génération : un carré latin au hasard, quelques signes tirés de la solution, puis on retire des chiffres
// tant que le solveur trouve une solution unique.

const popcount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

// Contraintes indexées par case : pour chaque case, la liste des [voisine, signe] où signe = -1 (plus petite) ou 1 (plus grande).
export function constraintsByCell(n, ineq) {
  const by = Array.from({ length: n * n }, () => []);
  for (const { a, b, lt } of ineq) {
    by[a].push([b, lt ? -1 : 1]);
    by[b].push([a, lt ? 1 : -1]);
  }
  return by;
}

// Compte les solutions (jusqu'à `limit`) ; avec `rng`, l'ordre des essais est aléatoire.
export function solve(grid, n, ineq, limit, rng) {
  const g = grid.slice();
  const full = (1 << n) - 1;
  const rows = Array(n).fill(0);
  const cols = Array(n).fill(0);
  const by = constraintsByCell(n, ineq);
  g.forEach((v, i) => { if (v) { rows[Math.floor(i / n)] |= 1 << (v - 1); cols[i % n] |= 1 << (v - 1); } });
  let found = 0;
  let first = null;
  const candidates = (i) => {
    let mask = full & ~(rows[Math.floor(i / n)] | cols[i % n]);
    for (const [j, sign] of by[i]) {
      const w = g[j];
      if (!w) {
        if (sign < 0) mask &= ~(1 << (n - 1)); // plus petite qu'une voisine : ne peut pas valoir n
        else mask &= ~1;                       // plus grande : ne peut pas valoir 1
        continue;
      }
      // plus petite que w : valeurs 1..w-1 ; plus grande : w+1..n
      mask &= sign < 0 ? (1 << (w - 1)) - 1 : full & ~((1 << w) - 1);
    }
    return mask;
  };
  const rec = () => {
    let best = -1;
    let bestMask = 0;
    let bestCount = 99;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const m = candidates(i);
      const c = popcount(m);
      if (c < bestCount) { best = i; bestMask = m; bestCount = c; if (!c) return; }
    }
    if (best === -1) { found++; if (!first) first = g.slice(); return; }
    let vals = [];
    for (let v = 1; v <= n; v++) if (bestMask & (1 << (v - 1))) vals.push(v);
    if (rng) vals = rng.shuffle(vals);
    const r = Math.floor(best / n);
    const c = best % n;
    for (const v of vals) {
      const bit = 1 << (v - 1);
      g[best] = v; rows[r] |= bit; cols[c] |= bit;
      rec();
      g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit;
      if (found >= limit) return;
    }
  };
  rec();
  return { count: found, solution: first };
}

// Paires de cases voisines (horizontales puis verticales), a < b.
export function adjacentPairs(n) {
  const out = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const i = r * n + c;
    if (c < n - 1) out.push([i, i + 1]);
    if (r < n - 1) out.push([i, i + n]);
  }
  return out;
}

const CONFIGS = {
  easy: { n: 4, ineq: 0.4, givens: 0.25 },
  normal: { n: 5, ineq: 0.35, givens: 0.16 },
  hard: { n: 6, ineq: 0.32, givens: 0.1 },
  expert: { n: 7, ineq: 0.3, givens: 0.06 },
};

export function generate(rng, diff) {
  const { n, ineq: share, givens } = CONFIGS[diff];
  const { solution } = solve(Array(n * n).fill(0), n, [], 1, rng);
  const pairs = rng.shuffle(adjacentPairs(n));
  const ineq = pairs.slice(0, Math.round(pairs.length * share)).map(([a, b]) => ({ a, b, lt: solution[a] < solution[b] }));
  const puzzle = solution.slice();
  let left = n * n;
  const target = Math.round(n * n * givens);
  for (const i of rng.shuffle(Array.from({ length: n * n }, (_, k) => k))) {
    if (left <= target) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (solve(puzzle, n, ineq, 2).count !== 1) puzzle[i] = keep; else left--;
  }
  return { n, solution, puzzle, ineq };
}

// Cases en faute : doublons dans une ligne ou une colonne, ou signe non respecté entre deux cases remplies.
export function faults(cur, n, ineq) {
  const bad = new Set();
  const badSigns = new Set();
  for (let k = 0; k < n; k++) {
    for (const line of [Array.from({ length: n }, (_, j) => k * n + j), Array.from({ length: n }, (_, j) => j * n + k)]) {
      const seen = {};
      for (const i of line) if (cur[i]) (seen[cur[i]] = seen[cur[i]] || []).push(i);
      for (const list of Object.values(seen)) if (list.length > 1) list.forEach((i) => bad.add(i));
    }
  }
  ineq.forEach(({ a, b, lt }, k) => {
    if (cur[a] && cur[b] && (lt ? cur[a] >= cur[b] : cur[a] <= cur[b])) { bad.add(a); bad.add(b); badSigns.add(k); }
  });
  return { bad, badSigns };
}

export default {
  id: 'futoshiki',
  name: 'Futoshiki',
  emoji: '⋚',
  color: '#f4845f',
  tagline: 'Chiffres et signes < >',
  howto: 'Remplis la grille : chaque chiffre apparaît une seule fois par ligne et par colonne.\nRespecte les signes entre les cases : « < » et « > » à l’horizontale, « ∧ » et « ∨ » à la verticale (la pointe désigne la plus petite case).\nTouche une case puis un chiffre. Les fautes s’affichent en rouge. Chaque grille a une solution unique.',
  keys: ['Chiffres : remplir la case choisie', 'Flèches : changer de case', 'Retour arrière ou 0 : effacer'],
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'easy', label: 'Facile 4×4', desc: 'Pour découvrir' },
    { id: 'normal', label: 'Normal 5×5', desc: 'Le classique' },
    { id: 'hard', label: 'Difficile 6×6', desc: 'Peu de chiffres donnés' },
    { id: 'expert', label: 'Expert 7×7', desc: 'Presque que des signes' },
  ],

  create(rng, diff) {
    const { n, solution, puzzle, ineq } = generate(rng, diff);
    return { n, solution, puzzle, ineq, cur: puzzle.slice(), sel: null };
  },

  mount(root, state, ctx) {
    const { n, ineq } = state;
    let over = false;
    // Grille à 2n − 1 pistes : les cases sur les pistes paires, les signes entre elles.
    const board = h('div', { class: 'fu-board', vars: { '--n': n, '--m': n - 1 } });
    const cells = state.cur.map((_, i) => {
      const r = Math.floor(i / n);
      const c = i % n;
      const b = h('button', { type: 'button', class: 'fu-cell', vars: { '--gr': 2 * r + 1, '--gc': 2 * c + 1 } });
      b.addEventListener('click', () => { state.sel = i; paint(); ctx.save(state); });
      board.append(b);
      return b;
    });
    const signs = ineq.map(({ a, b, lt }) => {
      const r = Math.floor(a / n);
      const c = a % n;
      const horizontal = b === a + 1;
      const sym = horizontal ? (lt ? '<' : '>') : (lt ? '∧' : '∨');
      const el = h('span', {
        class: `fu-sign ${horizontal ? 'hz' : 'vt'}`, 'aria-hidden': 'true', text: sym,
        vars: horizontal ? { '--gr': 2 * r + 1, '--gc': 2 * c + 2 } : { '--gr': 2 * r + 2, '--gc': 2 * c + 1 },
      });
      board.append(el);
      return el;
    });
    const pad = h('div', { class: 'sd-pad fu-pad', vars: { '--k': n + 1 } });
    for (let v = 1; v <= n; v++) pad.append(h('button', { type: 'button', class: 'key', text: String(v), onclick: () => put(v) }));
    pad.append(h('button', { type: 'button', class: 'key', 'aria-label': 'Effacer', text: '⌫', onclick: () => put(0) }));
    root.append(h('div', { class: 'fu' }, board, pad));

    // Pour les lecteurs d'écran : chaque case annonce sa valeur et les signes qui la concernent.
    const by = constraintsByCell(n, ineq);
    const describe = (i) => {
      const v = state.cur[i];
      const rel = by[i].map(([j, sign]) => `${sign < 0 ? 'plus petite que' : 'plus grande que'} la case ligne ${Math.floor(j / n) + 1} colonne ${(j % n) + 1}`);
      return `Ligne ${Math.floor(i / n) + 1}, colonne ${(i % n) + 1}, ${v ? `valeur ${v}` : 'vide'}${state.puzzle[i] ? ' (donnée)' : ''}${rel.length ? `, ${rel.join(', ')}` : ''}`;
    };

    function paint() {
      const { bad, badSigns } = faults(state.cur, n, ineq);
      const sel = state.sel;
      cells.forEach((b, i) => {
        const v = state.cur[i];
        b.className = ['fu-cell', state.puzzle[i] ? 'given' : '', bad.has(i) ? 'bad' : '', i === sel ? 'sel' : '',
          sel !== null && i !== sel && (Math.floor(i / n) === Math.floor(sel / n) || i % n === sel % n) ? 'peer' : ''].filter(Boolean).join(' ');
        b.textContent = v || '';
        b.setAttribute('aria-label', describe(i));
      });
      signs.forEach((el, k) => el.classList.toggle('bad', badSigns.has(k)));
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

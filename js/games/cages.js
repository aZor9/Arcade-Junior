import { h } from '../ui.js';
import { solve as latin } from './futoshiki.js';

// Cages (casse-tête de calcul dans l'esprit du KenKen) : chaque chiffre de 1 à N une seule fois par ligne et
// par colonne ; les cases sont groupées en cages, et les chiffres d'une cage doivent donner le résultat indiqué
// avec l'opération indiquée (pour − et ÷, dans l'ordre qu'on veut).
// Génération : carré latin au hasard, découpage en cages, opérations tirées de la solution ; tant que le
// solveur trouve deux solutions, on découpe une cage où elles diffèrent.

export const OPS = { '+': 'plus', '−': 'moins', '×': 'fois', '÷': 'divisé par', '=': '' };

// Résultat d'une cage remplie (null si les valeurs ne vont pas avec l'opération).
export function cageValue(op, vals) {
  if (op === '=') return vals[0];
  if (op === '+') return vals.reduce((a, b) => a + b, 0);
  if (op === '×') return vals.reduce((a, b) => a * b, 1);
  const [a, b] = vals.length === 2 ? [Math.max(...vals), Math.min(...vals)] : [0, 1];
  if (op === '−') return a - b;
  return a % b === 0 ? a / b : null;
}

// Une cage (même incomplète) peut-elle encore atteindre son résultat ?
function cageOk(cage, g, n) {
  const vals = cage.cells.map((i) => g[i]).filter(Boolean);
  if (vals.length === cage.cells.length) return cageValue(cage.op, vals) === cage.target;
  if (cage.op === '+') return vals.reduce((a, b) => a + b, 0) + (cage.cells.length - vals.length) <= cage.target;
  if (cage.op === '×') return cage.target % vals.reduce((a, b) => a * b, 1) === 0;
  if (cage.op === '−' && vals.length === 1) return vals[0] + cage.target <= n || vals[0] - cage.target >= 1;
  return true;
}

// Compte les solutions (jusqu'à `limit`) ; renvoie aussi les deux premières trouvées.
export function solve(grid, n, cages, limit) {
  const g = grid.slice();
  const full = (1 << n) - 1;
  const rows = Array(n).fill(0);
  const cols = Array(n).fill(0);
  const cageOf = [];
  cages.forEach((cg) => cg.cells.forEach((i) => { cageOf[i] = cg; }));
  g.forEach((v, i) => { if (v) { rows[Math.floor(i / n)] |= 1 << (v - 1); cols[i % n] |= 1 << (v - 1); } });
  const found = [];
  const rec = () => {
    let best = -1;
    let bestMask = 0;
    let bestCount = 99;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      let m = full & ~(rows[Math.floor(i / n)] | cols[i % n]);
      const cg = cageOf[i];
      if (cg.op === '=') m &= 1 << (cg.target - 1);
      let c = 0;
      for (let k = m; k; k &= k - 1) c++;
      if (c < bestCount) { best = i; bestMask = m; bestCount = c; if (!c) return; }
    }
    if (best === -1) { found.push(g.slice()); return; }
    const r = Math.floor(best / n);
    const c = best % n;
    for (let v = 1; v <= n; v++) {
      const bit = 1 << (v - 1);
      if (!(bestMask & bit)) continue;
      g[best] = v; rows[r] |= bit; cols[c] |= bit;
      if (cageOk(cageOf[best], g, n)) rec();
      g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit;
      if (found.length >= limit) return;
    }
  };
  rec();
  return { count: found.length, solutions: found };
}

// Opération et résultat d'une cage, tirés de la solution.
function labelCage(cells, solution, rng) {
  const vals = cells.map((i) => solution[i]);
  if (cells.length === 1) return { cells, op: '=', target: vals[0] };
  const choices = cells.length === 2 ? ['−', '−', '+', '×'] : ['+', '×'];
  if (cells.length === 2 && cageValue('÷', vals) !== null) choices.push('÷', '÷', '÷');
  const op = rng.pick(choices);
  const target = cageValue(op, vals);
  if (op === '×' && target > 300) return { cells, op: '+', target: cageValue('+', vals) };
  return { cells, op, target };
}

const CONFIGS = { easy: { n: 4, max: 2 }, normal: { n: 5, max: 3 }, hard: { n: 6, max: 3 }, expert: { n: 6, max: 4 } };

// Découpage : on fait pousser chaque cage depuis une case libre, vers des voisines libres au hasard.
function partition(rng, n, max) {
  const owner = Array(n * n).fill(-1);
  const groups = [];
  for (const start of rng.shuffle(Array.from({ length: n * n }, (_, k) => k))) {
    if (owner[start] >= 0) continue;
    const size = rng.next() < 0.15 ? 1 : 2 + rng.int(max - 1);
    const cells = [start];
    owner[start] = groups.length;
    while (cells.length < size) {
      const opts = [];
      for (const i of cells) {
        const r = Math.floor(i / n);
        const c = i % n;
        for (const [rr, cc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
          if (rr >= 0 && rr < n && cc >= 0 && cc < n && owner[rr * n + cc] < 0) opts.push(rr * n + cc);
        }
      }
      if (!opts.length) break;
      const nb = rng.pick(opts);
      owner[nb] = groups.length;
      cells.push(nb);
    }
    groups.push(cells.sort((x, y) => x - y));
  }
  return groups;
}

export function generate(rng, diff) {
  const { n, max } = CONFIGS[diff];
  const { solution } = latin(Array(n * n).fill(0), n, [], 1, rng);
  let cages = null;
  // Plusieurs découpages au hasard : on garde le premier qui n'a qu'une solution.
  for (let attempt = 0; attempt < 40 && !cages; attempt++) {
    const c = partition(rng, n, max).map((cells) => labelCage(cells, solution, rng));
    if (solve(Array(n * n).fill(0), n, c, 2).count === 1) cages = c;
  }
  // Sinon, tant qu'il y a deux solutions, une case où elles diffèrent est détachée de sa cage.
  if (!cages) cages = partition(rng, n, max).map((cells) => labelCage(cells, solution, rng));
  for (;;) {
    const res = solve(Array(n * n).fill(0), n, cages, 2);
    if (res.count === 1) break;
    const [a, b] = res.solutions;
    const diffs = a.map((v, i) => (v !== b[i] ? i : -1)).filter((i) => i >= 0 && cages.find((cg) => cg.cells.includes(i)).cells.length > 1);
    const i = rng.pick(diffs);
    const cut = cages.find((cg) => cg.cells.includes(i));
    const rest = cut.cells.filter((j) => j !== i);
    // Le reste de la cage peut être coupé en deux : on le sépare en morceaux d'un seul tenant.
    const parts = [];
    const left = new Set(rest);
    while (left.size) {
      const first = left.values().next().value;
      const part = [first];
      left.delete(first);
      for (let k = 0; k < part.length; k++) {
        for (const j of [...left]) {
          if (Math.abs(j - part[k]) === n || (Math.abs(j - part[k]) === 1 && Math.floor(j / n) === Math.floor(part[k] / n))) { part.push(j); left.delete(j); }
        }
      }
      parts.push(part.sort((x, y) => x - y));
    }
    cages = cages.filter((cg) => cg !== cut).concat([[i], ...parts].map((cells) => labelCage(cells, solution, rng)));
  }
  cages.sort((x, y) => x.cells[0] - y.cells[0]);
  return { n, solution, cages };
}

export default {
  id: 'cages',
  name: 'Cages',
  emoji: '➗',
  color: '#c77dff',
  tagline: 'Retrouve les chiffres de chaque cage',
  howto: "Remplis la grille : chaque chiffre apparaît une seule fois par ligne et par colonne.\nLes traits épais délimitent des cages. Avec ses chiffres, chaque cage doit donner le résultat indiqué dans son coin : « 6× » veut dire que ses chiffres multipliés font 6 (pour − et ÷, on part du plus grand).\nUne cage d'une seule case donne directement son chiffre. Chaque grille a une solution unique.",
  keys: ['Chiffres : remplir la case choisie', 'Flèches : changer de case', 'Retour arrière ou 0 : effacer'],
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'easy', label: 'Facile 4×4', desc: 'Cages de 2 cases au plus' },
    { id: 'normal', label: 'Normal 5×5', desc: 'Cages de 3 cases au plus' },
    { id: 'hard', label: 'Difficile 6×6', desc: 'Cages de 3 cases au plus' },
    { id: 'expert', label: 'Expert 6×6', desc: 'Grandes cages' },
  ],

  create(rng, diff) {
    const { n, solution, cages } = generate(rng, diff);
    const cur = Array(n * n).fill(0);
    cages.forEach((cg) => { if (cg.op === '=') cur[cg.cells[0]] = cg.target; });
    return { n, solution, cages, given: cur.map(Boolean), cur, sel: null };
  },

  mount(root, state, ctx) {
    const { n, cages } = state;
    let over = false;
    const cageIdx = [];
    cages.forEach((cg, k) => cg.cells.forEach((i) => { cageIdx[i] = k; }));
    const label = (cg) => (cg.op === '=' ? String(cg.target) : `${cg.target}${cg.op}`);
    const cells = state.cur.map((_, i) => {
      const r = Math.floor(i / n);
      const c = i % n;
      const k = cageIdx[i];
      // Bord épais entre deux cages différentes.
      const cls = ['cg-cell'];
      if (c < n - 1 && cageIdx[i + 1] !== k) cls.push('bx-r');
      if (r < n - 1 && cageIdx[i + n] !== k) cls.push('bx-b');
      const b = h('button', { type: 'button', class: cls.join(' '), 'data-base': cls.join(' ') },
        cages[k].cells[0] === i ? h('span', { class: 'cg-label', 'aria-hidden': 'true', text: label(cages[k]) }) : null,
        h('span', { class: 'cg-val' }));
      b.addEventListener('click', () => { state.sel = i; paint(); ctx.save(state); });
      return b;
    });
    const board = h('div', { class: 'cg-board', vars: { '--n': n } }, cells);
    const pad = h('div', { class: 'sd-pad cg-pad', vars: { '--k': n + 1 } });
    for (let v = 1; v <= n; v++) pad.append(h('button', { type: 'button', class: 'key', text: String(v), onclick: () => put(v) }));
    pad.append(h('button', { type: 'button', class: 'key', 'aria-label': 'Effacer', text: '⌫', onclick: () => put(0) }));
    root.append(h('div', { class: 'cg' }, board, pad));

    function paint() {
      const bad = new Set();
      for (let k = 0; k < n; k++) {
        for (const line of [Array.from({ length: n }, (_, j) => k * n + j), Array.from({ length: n }, (_, j) => j * n + k)]) {
          const seen = {};
          for (const i of line) if (state.cur[i]) (seen[state.cur[i]] = seen[state.cur[i]] || []).push(i);
          for (const list of Object.values(seen)) if (list.length > 1) list.forEach((i) => bad.add(i));
        }
      }
      cages.forEach((cg) => {
        const vals = cg.cells.map((i) => state.cur[i]);
        if (vals.every(Boolean) && cageValue(cg.op, vals) !== cg.target) cg.cells.forEach((i) => bad.add(i));
      });
      const sel = state.sel;
      cells.forEach((b, i) => {
        const v = state.cur[i];
        b.className = [b.dataset.base, state.given[i] ? 'given' : '', bad.has(i) ? 'bad' : '', i === sel ? 'sel' : '',
          sel !== null && i !== sel && cageIdx[i] === cageIdx[sel] ? 'peer' : ''].filter(Boolean).join(' ');
        b.lastChild.textContent = v || '';
        const cg = cages[cageIdx[i]];
        b.setAttribute('aria-label', `Ligne ${Math.floor(i / n) + 1}, colonne ${(i % n) + 1}, ${v ? `valeur ${v}` : 'vide'}, cage de ${cg.cells.length} case${cg.cells.length > 1 ? 's' : ''}${cg.op === '=' ? '' : ` : ${cg.target} ${OPS[cg.op]}`}`);
      });
    }

    function put(v) {
      const i = state.sel;
      if (over || i === null || state.given[i]) return;
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

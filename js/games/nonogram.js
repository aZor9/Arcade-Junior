import { h } from '../ui.js';

// Nonogram (Picross) : noircir des cases pour que chaque ligne et chaque colonne contienne les blocs indiqués.
// Génération : on tire une image au hasard puis on ne la garde que si un solveur « par logique » (sans aucun
// essai au hasard) la résout entièrement : la grille a donc une solution unique, déductible sans deviner.

// Longueurs des blocs de cases pleines d'une ligne (vide pour une ligne sans case pleine).
export function cluesOf(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v === 1) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out;
}

// Parcourt toutes les façons de placer les blocs compatibles avec ce qu'on sait (known : -1 inconnu, 0 vide, 1 plein).
function arrangements(clue, n, known, visit) {
  const arr = Array(n).fill(0);
  const rec = (ci, pos) => {
    if (ci === clue.length) {
      for (let k = pos; k < n; k++) if (known[k] === 1) return;
      for (let k = pos; k < n; k++) arr[k] = 0;
      visit(arr);
      return;
    }
    const len = clue[ci];
    let need = -1;
    for (let k = ci; k < clue.length; k++) need += clue[k] + 1;
    for (let start = pos; start + need <= n; start++) {
      if (start > pos && known[start - 1] === 1) break; // une case pleine ne peut pas rester dans l'espace laissé vide
      let ok = true;
      for (let k = start; k < start + len; k++) if (known[k] === 0) { ok = false; break; }
      if (!ok) continue;
      if (start + len < n && known[start + len] === 1) continue;
      for (let k = pos; k < start; k++) arr[k] = 0;
      for (let k = start; k < start + len; k++) arr[k] = 1;
      if (start + len < n) arr[start + len] = 0;
      rec(ci + 1, start + len + 1);
    }
  };
  rec(0, 0);
}

// Déduit toutes les cases forcées d'une ligne ; null si l'état connu est contradictoire.
export function solveLine(clue, known) {
  const n = known.length;
  const always1 = Array(n).fill(true);
  const always0 = Array(n).fill(true);
  let any = false;
  arrangements(clue, n, known, (arr) => {
    any = true;
    for (let k = 0; k < n; k++) { if (arr[k]) always0[k] = false; else always1[k] = false; }
  });
  if (!any) return null;
  return known.map((v, k) => (v !== -1 ? v : always1[k] ? 1 : always0[k] ? 0 : -1));
}

// Résout par logique pure. Retourne la grille (0/1) si elle est entièrement déduite, sinon null.
export function solveGrid(n, rowClues, colClues) {
  let known = Array(n * n).fill(-1);
  for (let changed = true; changed;) {
    changed = false;
    for (let r = 0; r < n; r++) {
      const idx = Array.from({ length: n }, (_, c) => r * n + c);
      const res = solveLine(rowClues[r], idx.map((i) => known[i]));
      if (!res) return null;
      res.forEach((v, k) => { if (known[idx[k]] !== v) { known[idx[k]] = v; changed = true; } });
    }
    for (let c = 0; c < n; c++) {
      const idx = Array.from({ length: n }, (_, r) => r * n + c);
      const res = solveLine(colClues[c], idx.map((i) => known[i]));
      if (!res) return null;
      res.forEach((v, k) => { if (known[idx[k]] !== v) { known[idx[k]] = v; changed = true; } });
    }
  }
  return known.every((v) => v !== -1) ? known : null;
}

export function generate(rng, n, density) {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const grid = Array.from({ length: n * n }, () => (rng.next() < density ? 1 : 0));
    const rowClues = Array.from({ length: n }, (_, r) => cluesOf(grid.slice(r * n, r * n + n)));
    const colClues = Array.from({ length: n }, (_, c) => cluesOf(Array.from({ length: n }, (_, r) => grid[r * n + c])));
    // Évite les images quasi vides ou quasi pleines.
    const filled = grid.reduce((a, v) => a + v, 0);
    if (filled < n * n * 0.35 || filled > n * n * 0.8) continue;
    const solved = solveGrid(n, rowClues, colClues);
    if (solved) return { solution: solved, rowClues, colClues };
  }
  throw new Error('génération impossible');
}

export default {
  id: 'nonogram',
  name: 'Nonogram',
  emoji: '🖼️',
  color: '#5ee2b4',
  tagline: 'Dessine grâce aux indices',
  howto: 'Les chiffres indiquent la longueur des blocs de cases pleines, dans l’ordre, pour chaque ligne et chaque colonne.\nTouche (ou glisse) pour noircir. Le bouton ✖ passe en mode « case vide » pour marquer ce que tu sais.\nUn indice devient clair quand sa ligne est correcte.\nChaque grille se résout par logique, sans deviner.',
  keys: ['Clic ou glisser : noircir', 'Clic droit : marquer une case vide', 'X : changer de mode'],
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'easy', label: 'Facile 5×5', desc: 'Pour comprendre le principe' },
    { id: 'normal', label: 'Normal 8×8', desc: 'Un bon échauffement' },
    { id: 'hard', label: 'Difficile 10×10', desc: 'Le format classique' },
  ],

  create(rng, diff) {
    const [n, density] = { easy: [5, 0.6], normal: [8, 0.58], hard: [10, 0.55] }[diff];
    const { solution, rowClues, colClues } = generate(rng, n, density);
    return { n, solution, rowClues, colClues, cur: Array(n * n).fill(0), markMode: false };
  },

  mount(root, state, ctx) {
    const { n, rowClues, colClues } = state;
    let over = false;
    const gutter = Math.max(1, ...rowClues.map((c) => c.length), ...colClues.map((c) => c.length));
    const tot = n + gutter;

    const modeBtn = h('button', { type: 'button', class: 'btn btn-ghost mode-btn', 'aria-pressed': 'false' });
    const leftEl = h('strong', { text: '' });
    const board = h('div', { class: 'ng-board', vars: { '--n': n, '--tot': tot } });
    board.append(h('div', { class: 'ng-corner', vars: { '--g': gutter } }));
    const colEls = colClues.map((clue, c) => {
      const el = h('div', { class: 'ng-clue by-col', vars: { '--col': c + gutter + 1, '--g': gutter } }, (clue.length ? clue : [0]).map((v) => h('span', { text: String(v) })));
      board.append(el);
      return el;
    });
    const rowEls = rowClues.map((clue, r) => {
      const el = h('div', { class: 'ng-clue by-row', vars: { '--row': r + gutter + 1, '--g': gutter } }, (clue.length ? clue : [0]).map((v) => h('span', { text: String(v) })));
      board.append(el);
      return el;
    });
    const cells = state.cur.map((_, i) => {
      const r = Math.floor(i / n);
      const c = i % n;
      const cls = ['ng-cell'];
      if (c % 5 === 4 && c < n - 1) cls.push('k5c');
      if (r % 5 === 4 && r < n - 1) cls.push('k5r');
      const b = h('button', { type: 'button', class: cls.join(' '), 'data-i': String(i), 'aria-label': `Ligne ${r + 1}, colonne ${c + 1}`, vars: { '--col': c + gutter + 1, '--row': r + gutter + 1 } });
      board.append(b);
      return b;
    });
    root.append(h('div', { class: 'ng' },
      h('div', { class: 'hud' }, h('div', { class: 'hud-item' }, h('span', { text: 'Cases à noircir' }), leftEl), modeBtn),
      board));

    const lineOf = (r, c, k) => (k === 'row' ? Array.from({ length: n }, (_, j) => state.cur[r * n + j]) : Array.from({ length: n }, (_, j) => state.cur[j * n + c]));
    const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

    function paint() {
      cells.forEach((b, i) => {
        const v = state.cur[i];
        b.classList.toggle('on', v === 1);
        b.classList.toggle('x', v === 2);
        b.textContent = v === 2 ? '×' : '';
      });
      rowEls.forEach((el, r) => el.classList.toggle('ok', same(cluesOf(lineOf(r, 0, 'row').map((v) => (v === 1 ? 1 : 0))), rowClues[r])));
      colEls.forEach((el, c) => el.classList.toggle('ok', same(cluesOf(lineOf(0, c, 'col').map((v) => (v === 1 ? 1 : 0))), colClues[c])));
      const need = state.solution.reduce((a, v) => a + v, 0);
      leftEl.textContent = need - state.cur.filter((v) => v === 1).length;
      modeBtn.textContent = state.markMode ? '✖ Marquer' : '⬛ Noircir';
      modeBtn.setAttribute('aria-pressed', String(state.markMode));
    }

    function solved() {
      return state.cur.every((v, i) => (v === 1) === (state.solution[i] === 1));
    }

    // Peinture : la valeur appliquée est décidée sur la première case touchée, puis étendue en glissant.
    let paintValue = null;
    let dragging = false;
    const apply = (i) => {
      if (state.cur[i] === paintValue) return;
      state.cur[i] = paintValue;
      paint();
    };
    const cellFrom = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const c = el && el.closest ? el.closest('.ng-cell') : null;
      return c && board.contains(c) ? Number(c.dataset.i) : -1;
    };
    board.addEventListener('pointerdown', (e) => {
      if (over || e.button === 2) return;
      const i = cellFrom(e);
      if (i < 0) return;
      const target = state.markMode ? 2 : 1;
      paintValue = state.cur[i] === target ? 0 : target;
      dragging = true;
      board.setPointerCapture(e.pointerId);
      e.preventDefault();
      apply(i);
    });
    board.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const i = cellFrom(e);
      if (i >= 0) apply(i);
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      ctx.save(state);
      if (solved()) {
        over = true;
        ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 1000)) });
      }
    };
    board.addEventListener('pointerup', end);
    board.addEventListener('pointercancel', end);
    // Clic droit : marquer / démarquer une case vide.
    board.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (over) return;
      const i = cellFrom(e);
      if (i < 0) return;
      state.cur[i] = state.cur[i] === 2 ? 0 : 2;
      paint();
      ctx.save(state);
      if (solved()) { over = true; ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 1000)) }); }
    });
    modeBtn.addEventListener('click', () => { state.markMode = !state.markMode; paint(); ctx.save(state); });
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'x' || e.key === 'X') { state.markMode = !state.markMode; paint(); ctx.save(state); }
    };
    document.addEventListener('keydown', onKey);

    paint();
    return () => document.removeEventListener('keydown', onKey);
  },
};

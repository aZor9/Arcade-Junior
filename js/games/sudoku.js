import { h } from '../ui.js';

const popcount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

// Compte les solutions (jusqu'à `limit`) par retour sur trace avec choix de la case la plus contrainte.
// Avec `rng`, l'ordre des essais est aléatoire : sert aussi à fabriquer une grille complète.
export function solve(grid, n, bw, bh, limit, rng) {
  const g = grid.slice();
  const full = (1 << n) - 1;
  const rows = Array(n).fill(0);
  const colsM = Array(n).fill(0);
  const boxes = Array(n).fill(0);
  const boxOf = (i) => Math.floor(Math.floor(i / n) / bh) * (n / bw) + Math.floor((i % n) / bw);
  g.forEach((v, i) => {
    if (!v) return;
    const bit = 1 << (v - 1);
    rows[Math.floor(i / n)] |= bit;
    colsM[i % n] |= bit;
    boxes[boxOf(i)] |= bit;
  });
  let found = 0;
  let first = null;

  function rec() {
    let best = -1;
    let bestMask = 0;
    let bestCount = 99;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const mask = full & ~(rows[Math.floor(i / n)] | colsM[i % n] | boxes[boxOf(i)]);
      const cnt = popcount(mask);
      if (cnt < bestCount) {
        best = i; bestMask = mask; bestCount = cnt;
        if (cnt === 0) return;
      }
    }
    if (best === -1) {
      found++;
      if (!first) first = g.slice();
      return;
    }
    let vals = [];
    for (let v = 1; v <= n; v++) if (bestMask & (1 << (v - 1))) vals.push(v);
    if (rng) vals = rng.shuffle(vals);
    const r = Math.floor(best / n);
    const c = best % n;
    const b = boxOf(best);
    for (const v of vals) {
      const bit = 1 << (v - 1);
      g[best] = v; rows[r] |= bit; colsM[c] |= bit; boxes[b] |= bit;
      rec();
      g[best] = 0; rows[r] &= ~bit; colsM[c] &= ~bit; boxes[b] &= ~bit;
      if (found >= limit) return;
    }
  }
  rec();
  return { count: found, solution: first };
}

const CONFIGS = {
  mini: { n: 4, bw: 2, bh: 2, clues: 7 },
  junior: { n: 6, bw: 3, bh: 2, clues: 14 },
  easy: { n: 9, bw: 3, bh: 3, clues: 42 },
  normal: { n: 9, bw: 3, bh: 3, clues: 34 },
  hard: { n: 9, bw: 3, bh: 3, clues: 28 },
};

export default {
  id: 'sudoku',
  name: 'Sudoku',
  emoji: '🔟',
  color: '#2f7bff',
  tagline: 'Chaque chiffre une seule fois',
  howto: 'Remplis la grille pour que chaque ligne, chaque colonne et chaque bloc contienne une seule fois chaque chiffre.\nTouche une case vide puis un chiffre. Les doublons s’affichent en rouge.\nMode notes ✏️ : note au crayon les chiffres possibles. Un chiffre posé s’efface des notes voisines.\nChaque grille a une solution unique.',
  keys: ['Chiffres : remplir ou noter', 'N : mode notes', 'Flèches : changer de case', 'Retour arrière : effacer'],
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'mini', label: 'Mini 4×4', desc: 'Pour découvrir' },
    { id: 'junior', label: 'Junior 6×6', desc: 'Blocs de 3×2' },
    { id: 'easy', label: 'Facile 9×9', desc: 'Beaucoup d’indices' },
    { id: 'normal', label: 'Moyen 9×9', desc: 'Le classique' },
    { id: 'hard', label: 'Difficile 9×9', desc: 'Peu d’indices' },
  ],

  create(rng, diff) {
    const { n, bw, bh, clues } = CONFIGS[diff];
    const { solution } = solve(Array(n * n).fill(0), n, bw, bh, 1, rng);
    const puzzle = solution.slice();
    let left = n * n;
    // On retire des cases au hasard tant que la solution reste unique.
    for (const i of rng.shuffle(Array.from({ length: n * n }, (_, k) => k))) {
      if (left <= clues) break;
      const keep = puzzle[i];
      puzzle[i] = 0;
      if (solve(puzzle, n, bw, bh, 2).count !== 1) puzzle[i] = keep;
      else left--;
    }
    return { n, bw, bh, puzzle, solution, cur: puzzle.slice(), sel: null, notes: Array(n * n).fill(0), noteMode: false };
  },

  mount(root, state, ctx) {
    const { n, bw, bh } = state;
    let over = false;
    // Parties enregistrées avant l'ajout des notes : on les initialise.
    if (!Array.isArray(state.notes) || state.notes.length !== n * n) state.notes = Array(n * n).fill(0);
    state.noteMode = state.noteMode === true;
    const board = h('div', { class: 'sd-board', vars: { '--n': n, '--bw': bw } });
    const cells = state.cur.map((_, i) => {
      const r = Math.floor(i / n);
      const c = i % n;
      const cls = ['sd-cell'];
      if ((c + 1) % bw === 0 && c < n - 1) cls.push('bx-r');
      if ((r + 1) % bh === 0 && r < n - 1) cls.push('bx-b');
      const b = h('button', { type: 'button', class: cls.join(' '), 'aria-label': `Ligne ${r + 1}, colonne ${c + 1}` });
      b.addEventListener('click', () => { state.sel = i; paint(); ctx.save(state); });
      board.append(b);
      return b;
    });
    const pad = h('div', { class: 'sd-pad', vars: { '--n': n } });
    const padKeys = [];
    for (let v = 1; v <= n; v++) {
      const k = h('button', { type: 'button', class: 'key', text: String(v), onclick: () => put(v) });
      padKeys.push(k);
      pad.append(k);
    }
    const noteBtn = h('button', { type: 'button', class: 'key key-tool', 'aria-label': 'Mode notes (touche N)', onclick: () => { state.noteMode = !state.noteMode; paint(); ctx.save(state); } }, '✏️ Notes');
    const eraseBtn = h('button', { type: 'button', class: 'key key-tool', 'aria-label': 'Effacer', onclick: () => put(0) }, '⌫ Effacer');
    root.append(h('div', { class: 'sd' }, board, pad, h('div', { class: 'sd-tools' }, noteBtn, eraseBtn)));

    function conflicts() {
      const bad = new Set();
      const groups = [];
      for (let k = 0; k < n; k++) {
        groups.push(Array.from({ length: n }, (_, j) => k * n + j));
        groups.push(Array.from({ length: n }, (_, j) => j * n + k));
      }
      for (let br = 0; br < n; br += bh) {
        for (let bc = 0; bc < n; bc += bw) {
          const g = [];
          for (let r = br; r < br + bh; r++) for (let c = bc; c < bc + bw; c++) g.push(r * n + c);
          groups.push(g);
        }
      }
      for (const g of groups) {
        const seen = {};
        for (const i of g) {
          const v = state.cur[i];
          if (!v) continue;
          (seen[v] = seen[v] || []).push(i);
        }
        for (const list of Object.values(seen)) if (list.length > 1) list.forEach((i) => bad.add(i));
      }
      return bad;
    }

    function paint() {
      const bad = conflicts();
      const sel = state.sel;
      const selV = sel !== null ? state.cur[sel] : 0;
      cells.forEach((b, i) => {
        const v = state.cur[i];
        const cls = b.className.split(' ').filter((c) => c === 'sd-cell' || c === 'bx-r' || c === 'bx-b');
        if (state.puzzle[i]) cls.push('given');
        if (bad.has(i)) cls.push('bad');
        if (i === sel) cls.push('sel');
        else if (sel !== null && (Math.floor(i / n) === Math.floor(sel / n) || i % n === sel % n)) cls.push('peer');
        if (selV && v === selV && i !== sel) cls.push('same');
        b.className = cls.join(' ');
        if (v) b.textContent = v;
        else if (state.notes[i]) b.replaceChildren(notesView(state.notes[i]));
        else b.textContent = '';
      });
      noteBtn.classList.toggle('on', state.noteMode);
      noteBtn.setAttribute('aria-pressed', String(state.noteMode));
      const mask = sel !== null && !state.cur[sel] ? state.notes[sel] : 0;
      const done = doneDigits(bad);
      padKeys.forEach((k, idx) => {
        const on = state.noteMode && (mask & (1 << idx)) !== 0;
        k.classList.toggle('on', on);
        k.classList.toggle('done', done[idx + 1]);
        k.disabled = done[idx + 1];
        k.setAttribute('aria-pressed', String(on));
      });
    }

    // Un chiffre est « terminé » quand toutes ses cases sont posées sans aucune faute : on le grise.
    function doneDigits(bad) {
      const count = Array(n + 1).fill(0);
      state.cur.forEach((v, i) => { if (v && !bad.has(i)) count[v]++; });
      return count.map((c) => c >= n);
    }

    // Petite grille des chiffres notés : chaque chiffre garde toujours la même place dans la case.
    function notesView(mask) {
      return h('span', { class: 'sd-notes' }, Array.from({ length: n }, (_, k) => h('span', { text: mask & (1 << k) ? String(k + 1) : '' })));
    }

    const peers = (i) => {
      const r = Math.floor(i / n);
      const c = i % n;
      const out = [];
      for (let j = 0; j < n * n; j++) {
        const rr = Math.floor(j / n);
        const cc = j % n;
        if (j !== i && (rr === r || cc === c || (Math.floor(rr / bh) === Math.floor(r / bh) && Math.floor(cc / bw) === Math.floor(c / bw)))) out.push(j);
      }
      return out;
    };

    function put(v) {
      const i = state.sel;
      if (over || i === null || state.puzzle[i]) return;
      if (v && state.cur[i] !== v && doneDigits(conflicts())[v]) return; // chiffre déjà terminé
      if (v === 0) {
        // Effacer : d'abord le chiffre, puis, s'il n'y en a pas, les notes de la case.
        if (state.cur[i]) state.cur[i] = 0; else state.notes[i] = 0;
      } else if (state.noteMode) {
        if (state.cur[i]) return; // les notes se posent dans les cases vides
        state.notes[i] ^= 1 << (v - 1);
      } else {
        state.cur[i] = v;
        state.notes[i] = 0;
        // Le chiffre posé n'est plus possible chez les voisines : on le retire de leurs notes.
        for (const j of peers(i)) state.notes[j] &= ~(1 << (v - 1));
      }
      paint();
      ctx.save(state);
      if (state.cur.every((x, i) => x === state.solution[i])) {
        over = true;
        ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 1000)) });
      }
    }

    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) put(Number(e.key));
      else if (e.key === 'n' || e.key === 'N') { state.noteMode = !state.noteMode; paint(); ctx.save(state); }
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

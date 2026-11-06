import { h } from '../ui.js';
import { solve as latin } from './futoshiki.js';

// Hitori : noircir des cases pour qu'aucun chiffre ne se répète dans une ligne ou une colonne parmi les cases
// restées blanches. Deux cases noires ne se touchent jamais par un côté, et toutes les cases blanches restent
// reliées entre elles.
// Génération : carré latin au hasard (aucun doublon), choix de cases noires valides, puis chaque case noire
// reçoit le chiffre d'une case blanche de sa ligne ou de sa colonne. On garde la grille si le solveur ne
// trouve qu'une solution (en ne noircissant que des cases qui ont un doublon).

const nbrs = (i, n) => {
  const r = Math.floor(i / n);
  const c = i % n;
  const out = [];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
};

// Les cases non noires (blanches ou indécises) forment-elles un seul bloc ?
export function connected(black, n) {
  const start = black.findIndex((b) => !b);
  if (start < 0) return false;
  const seen = new Uint8Array(n * n);
  const stack = [start];
  seen[start] = 1;
  let count = 1;
  while (stack.length) {
    const i = stack.pop();
    for (const j of nbrs(i, n)) if (!black[j] && !seen[j]) { seen[j] = 1; count++; stack.push(j); }
  }
  return count === black.filter((b) => !b).length;
}

// La grille est-elle résolue avec ces cases noires ? (règles seules, pas de comparaison avec la solution)
export function isSolved(nums, black, n) {
  for (let i = 0; i < n * n; i++) if (black[i] && nbrs(i, n).some((j) => black[j])) return false;
  for (let k = 0; k < n; k++) {
    const row = new Set();
    const col = new Set();
    for (let j = 0; j < n; j++) {
      const a = k * n + j;
      const b = j * n + k;
      if (!black[a]) { if (row.has(nums[a])) return false; row.add(nums[a]); }
      if (!black[b]) { if (col.has(nums[b])) return false; col.add(nums[b]); }
    }
  }
  return connected(black, n);
}

// Compte les solutions (jusqu'à `limit`). Seules les cases ayant un doublon dans leur ligne ou colonne peuvent être noires.
export function solve(nums, n, limit) {
  const dup = nums.map((v, i) => {
    const r = Math.floor(i / n);
    const c = i % n;
    for (let j = 0; j < n; j++) if ((j !== c && nums[r * n + j] === v) || (j !== r && nums[j * n + c] === v)) return true;
    return false;
  });
  const black = Array(n * n).fill(0);
  const white = Array(n * n).fill(0);
  const found = [];
  const rec = (i) => {
    if (found.length >= limit) return;
    if (i === n * n) { if (connected(black, n)) found.push(black.slice()); return; }
    const r = Math.floor(i / n);
    const c = i % n;
    // Blanche : aucun chiffre égal déjà blanc avant elle dans sa ligne ou sa colonne.
    let clash = false;
    for (let j = 0; j < c && !clash; j++) if (white[r * n + j] && nums[r * n + j] === nums[i]) clash = true;
    for (let j = 0; j < r && !clash; j++) if (white[j * n + c] && nums[j * n + c] === nums[i]) clash = true;
    if (!clash) { white[i] = 1; rec(i + 1); white[i] = 0; }
    // Noire : seulement si elle a un doublon et ne touche pas une noire déjà posée (au-dessus ou à gauche).
    if (dup[i] && !(r > 0 && black[i - n]) && !(c > 0 && black[i - 1])) {
      black[i] = 1;
      if (connected(black, n)) rec(i + 1);
      black[i] = 0;
    }
  };
  rec(0);
  return { count: found.length, solutions: found };
}

const CONFIGS = { easy: { n: 5, density: 0.22 }, normal: { n: 6, density: 0.26 }, hard: { n: 7, density: 0.28 }, expert: { n: 8, density: 0.3 } };

export function generate(rng, diff) {
  const { n, density } = CONFIGS[diff];
  for (;;) {
    const { solution } = latin(Array(n * n).fill(0), n, [], 1, rng);
    const black = Array(n * n).fill(0);
    let left = Math.round(n * n * density);
    for (const i of rng.shuffle(Array.from({ length: n * n }, (_, k) => k))) {
      if (!left) break;
      if (nbrs(i, n).some((j) => black[j])) continue;
      black[i] = 1;
      if (connected(black, n)) left--; else black[i] = 0;
    }
    // Chaque case noire prend le chiffre d'une case blanche de sa ligne ou de sa colonne.
    const nums = solution.slice();
    black.forEach((b, i) => {
      if (!b) return;
      const r = Math.floor(i / n);
      const c = i % n;
      const opts = [];
      for (let j = 0; j < n; j++) {
        if (!black[r * n + j]) opts.push(solution[r * n + j]);
        if (!black[j * n + c]) opts.push(solution[j * n + c]);
      }
      nums[i] = rng.pick(opts);
    });
    const res = solve(nums, n, 2);
    if (res.count === 1) return { n, nums, black: res.solutions[0] };
  }
}

export default {
  id: 'hitori',
  name: 'Hitori',
  emoji: '⬛',
  color: '#ef476f',
  tagline: 'Noircis les doublons',
  howto: "Noircis des cases pour qu'aucun chiffre ne se répète dans une ligne ou une colonne parmi les cases blanches.\nDeux cases noires ne doivent jamais se toucher par un côté, et toutes les cases blanches doivent rester reliées.\nTouche une case pour la noircir, encore une fois pour l'entourer (elle restera blanche), une troisième pour l'effacer.",
  keys: ["Tab puis Entrée : changer l'état d'une case"],
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'easy', label: 'Facile 5×5', desc: 'Pour découvrir' },
    { id: 'normal', label: 'Normal 6×6', desc: 'Le classique' },
    { id: 'hard', label: 'Difficile 7×7', desc: 'Plus de doublons' },
    { id: 'expert', label: 'Expert 8×8', desc: 'Grande grille' },
  ],

  create(rng, diff) {
    const { n, nums, black } = generate(rng, diff);
    return { n, nums, solution: black, marks: Array(n * n).fill(0) }; // marque : 0 rien, 1 noire, 2 entourée
  },

  mount(root, state, ctx) {
    const { n, nums } = state;
    let over = false;
    const cells = nums.map((v, i) => h('button', { type: 'button', class: 'hi-cell', text: String(v), onclick: () => tap(i) }));
    const left = h('strong', { text: '' });
    root.append(h('div', { class: 'hi' },
      h('div', { class: 'hud' }, h('div', { class: 'hud-item' }, h('span', { text: 'Doublons restants' }), left)),
      h('div', { class: 'hi-board', vars: { '--n': n } }, cells)));

    function paint() {
      const black = state.marks.map((m) => m === 1);
      const bad = new Set();
      black.forEach((b, i) => { if (b) nbrs(i, n).forEach((j) => { if (black[j]) { bad.add(i); bad.add(j); } }); });
      // Doublons encore visibles parmi les cases non noires.
      let dups = 0;
      for (let k = 0; k < n; k++) {
        for (const line of [Array.from({ length: n }, (_, j) => k * n + j), Array.from({ length: n }, (_, j) => j * n + k)]) {
          const seen = {};
          for (const i of line) if (!black[i]) (seen[nums[i]] = seen[nums[i]] || []).push(i);
          for (const list of Object.values(seen)) {
            if (list.length < 2) continue;
            dups += list.length - 1;
            // Deux cases entourées avec le même chiffre : faute certaine.
            const circled = list.filter((i) => state.marks[i] === 2);
            if (circled.length > 1) circled.forEach((i) => bad.add(i));
          }
        }
      }
      cells.forEach((b, i) => {
        const m = state.marks[i];
        b.className = ['hi-cell', m === 1 ? 'black' : '', m === 2 ? 'circle' : '', bad.has(i) ? 'bad' : ''].filter(Boolean).join(' ');
        b.setAttribute('aria-label', `Ligne ${Math.floor(i / n) + 1}, colonne ${(i % n) + 1}, ${nums[i]}, ${m === 1 ? 'noircie' : m === 2 ? 'entourée' : 'blanche'}`);
      });
      left.textContent = dups;
    }

    function tap(i) {
      if (over) return;
      state.marks[i] = (state.marks[i] + 1) % 3;
      paint();
      ctx.save(state);
      if (isSolved(nums, state.marks.map((m) => m === 1), n)) {
        over = true;
        ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 1000)) });
      }
    }

    paint();
    return () => {};
  },
};

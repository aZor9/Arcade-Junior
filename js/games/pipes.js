import { h } from '../ui.js';

// Pipes : un réseau de tuyaux (un arbre couvrant la grille) dont chaque tuile a été tournée au hasard.
// On fait pivoter les tuiles pour que l'eau, partie de l'ampoule centrale, atteigne toute la grille
// sans aucun tuyau qui débouche dans le vide.

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

const N = 1;
const E = 2;
const S = 4;
const W = 8;
// [décalage ligne, décalage colonne, bit, bit opposé]
const DIRS = [[-1, 0, N, S], [0, 1, E, W], [1, 0, S, N], [0, -1, W, E]];

// Tourne un masque de 90° dans le sens des aiguilles d'une montre : N→E→S→W→N.
export const rotate = (m) => ((m << 1) | (m >> 3)) & 15;
export const rotated = (m, times) => { let r = m; for (let i = 0; i < times; i++) r = rotate(r); return r; };

// Arbre couvrant aléatoire (« growing tree » : un mélange de couloirs longs et d'embranchements).
export function makeTree(rng, rows, cols) {
  const masks = Array(rows * cols).fill(0);
  const seen = Array(rows * cols).fill(false);
  const start = rng.int(rows * cols);
  seen[start] = true;
  const open = [start];
  while (open.length) {
    const k = rng.next() < 0.5 ? open.length - 1 : rng.int(open.length);
    const cell = open[k];
    const r = Math.floor(cell / cols);
    const c = cell % cols;
    const free = DIRS.filter(([dr, dc]) => r + dr >= 0 && r + dr < rows && c + dc >= 0 && c + dc < cols && !seen[(r + dr) * cols + c + dc]);
    if (!free.length) { open.splice(k, 1); continue; }
    const [dr, dc, bit, opp] = rng.pick(free);
    const next = (r + dr) * cols + c + dc;
    masks[cell] |= bit;
    masks[next] |= opp;
    seen[next] = true;
    open.push(next);
  }
  return masks;
}

// Cases alimentées (parcours depuis la source via les liaisons réciproques) et nombre de tuyaux ouverts.
export function analyse(masks, rows, cols, source) {
  const lit = Array(rows * cols).fill(false);
  let openEnds = 0;
  for (let i = 0; i < masks.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    for (const [dr, dc, bit, opp] of DIRS) {
      if (!(masks[i] & bit)) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols || !(masks[rr * cols + cc] & opp)) openEnds++;
    }
  }
  const stack = [source];
  lit[source] = true;
  while (stack.length) {
    const i = stack.pop();
    const r = Math.floor(i / cols);
    const c = i % cols;
    for (const [dr, dc, bit, opp] of DIRS) {
      if (!(masks[i] & bit)) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
      const j = rr * cols + cc;
      if (!lit[j] && (masks[j] & opp)) { lit[j] = true; stack.push(j); }
    }
  }
  return { lit, openEnds, litCount: lit.filter(Boolean).length, solved: openEnds === 0 && lit.every(Boolean) };
}

const currentMasks = (state) => state.base.map((m, i) => rotated(m, state.rot[i]));

export default {
  id: 'pipes',
  name: 'Pipes',
  emoji: '🔧',
  color: '#7ed957',
  tagline: 'Fais circuler l’eau partout',
  howto: 'Touche une tuile pour la faire pivoter d’un quart de tour.\nL’eau part de l’ampoule jaune au centre et colore les tuyaux qu’elle atteint.\nRelie toute la grille, sans tuyau qui débouche dans le vide.',
  keys: ['Clic : tourner dans le sens horaire', 'Clic droit : tourner dans l’autre sens', 'Tab puis Entrée : tourner une tuile'],
  score: { label: 'Moins de rotations', better: 'low', fmt: (v) => `${v} rotation${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile 5×5', desc: '25 tuiles' },
    { id: 'normal', label: 'Normal 7×7', desc: '49 tuiles' },
    { id: 'hard', label: 'Difficile 9×9', desc: '81 tuiles' },
    { id: 'expert', label: 'Expert 11×11', desc: '121 tuiles' },
  ],

  create(rng, diff) {
    const size = { easy: 5, normal: 7, hard: 9, expert: 11 }[diff];
    const rows = size;
    const cols = size;
    const base = makeTree(rng, rows, cols);
    const source = Math.floor(rows / 2) * cols + Math.floor(cols / 2);
    const rot = base.map(() => rng.int(4));
    // Jamais résolue au départ.
    while (analyse(base.map((m, i) => rotated(m, rot[i])), rows, cols, source).solved) {
      const i = rng.int(rot.length);
      rot[i] = (rot[i] + 1) % 4;
    }
    return { rows, cols, base, rot, source, moves: 0 };
  },

  mount(root, state, ctx) {
    const { rows, cols, base, source } = state;
    let over = false;
    const angle = state.rot.map((r) => r * 90);

    const movesEl = h('strong', { text: '0' });
    const litEl = h('strong', { text: '' });
    const board = h('div', { class: 'pp-board', vars: { '--cols': cols, '--rows': rows } });

    // Dessin d'une tuile dans sa position « résolue » ; la rotation est appliquée en CSS.
    const centre = [5, 5];
    const tip = { [N]: [5, 0], [E]: [10, 5], [S]: [5, 10], [W]: [0, 5] };
    const tiles = base.map((mask, i) => {
      const svg = svgEl('svg', { viewBox: '0 0 10 10', 'aria-hidden': 'true' });
      for (const bit of [N, E, S, W]) {
        if (mask & bit) svg.append(svgEl('line', { class: 'outline', x1: centre[0], y1: centre[1], x2: tip[bit][0], y2: tip[bit][1] }));
      }
      svg.append(svgEl('circle', { class: 'outline', cx: 5, cy: 5, r: 2.5 }));
      for (const bit of [N, E, S, W]) {
        if (mask & bit) svg.append(svgEl('line', { class: 'core', x1: centre[0], y1: centre[1], x2: tip[bit][0], y2: tip[bit][1] }));
      }
      svg.append(svgEl('circle', { class: 'core hub', cx: 5, cy: 5, r: 1.6 }));
      const b = h('button', { type: 'button', class: `pp-tile${i === source ? ' src' : ''}`, 'aria-label': `Tuile ${Math.floor(i / cols) + 1}-${(i % cols) + 1}` }, svg);
      if (i === source) b.append(h('span', { class: 'bulb-dot', 'aria-hidden': 'true' }));
      b.addEventListener('click', () => turn(i, 1));
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); turn(i, -1); });
      board.append(b);
      return b;
    });
    root.append(h('div', { class: 'pp' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Rotations' }), movesEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Alimentées' }), litEl)),
      board));

    function paint() {
      const res = analyse(currentMasks(state), rows, cols, source);
      tiles.forEach((b, i) => {
        b.style.setProperty('--rot', `${angle[i]}deg`);
        b.classList.toggle('lit', res.lit[i]);
      });
      movesEl.textContent = state.moves;
      litEl.textContent = `${res.litCount}/${rows * cols}`;
      return res;
    }

    function turn(i, dir) {
      if (over) return;
      angle[i] += 90 * dir;
      state.rot[i] = (state.rot[i] + (dir > 0 ? 1 : 3)) % 4;
      state.moves++;
      const res = paint();
      ctx.save(state);
      if (res.solved) {
        over = true;
        ctx.finish({ won: true, score: state.moves });
      }
    }

    paint();
    return () => {};
  },
};

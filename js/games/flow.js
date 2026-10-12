import { h } from '../ui.js';

// Liaisons (type « Flow / Numberlink ») : relier chaque paire de points de même couleur par un chemin,
// sans que deux chemins se croisent, en remplissant toute la grille.
// Génération : on trace un chemin qui passe par toutes les cases (marche « backbite » à partir d'un
// serpentin), puis on le découpe en tronçons ; les deux bouts de chaque tronçon sont les points d'une paire.
// Une solution existe donc toujours. La victoire se vérifie sur les règles, pas sur une solution précise.

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

const neighbours = (i, rows, cols) => {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out = [];
  if (r > 0) out.push(i - cols);
  if (r < rows - 1) out.push(i + cols);
  if (c > 0) out.push(i - 1);
  if (c < cols - 1) out.push(i + 1);
  return out;
};
export const adjacent = (a, b, cols) => Math.abs(a - b) === cols || (Math.abs(a - b) === 1 && Math.floor(a / cols) === Math.floor(b / cols));

// Chemin passant une fois par chaque case, mélangé par « backbite » (on relie un bout à une case voisine
// et on retourne la fin du chemin) : le résultat reste toujours un chemin valide.
export function hamiltonianPath(rng, rows, cols) {
  let path = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) path.push(r * cols + (r % 2 ? cols - 1 - c : c));
  }
  for (let s = 0; s < rows * cols * 30; s++) {
    if (rng.next() < 0.5) path.reverse();
    const end = path[path.length - 1];
    const prev = path[path.length - 2];
    const target = rng.pick(neighbours(end, rows, cols).filter((x) => x !== prev));
    const k = path.indexOf(target);
    path = path.slice(0, k + 1).concat(path.slice(k + 1).reverse());
  }
  return path;
}

// Découpe le chemin en `count` tronçons d'au moins `minLen` cases.
export function cut(rng, path, count, minLen = 3) {
  const lens = Array(count).fill(minLen);
  for (let rest = path.length - count * minLen; rest > 0; rest--) lens[rng.int(count)]++;
  const out = [];
  let at = 0;
  for (const len of lens) { out.push(path.slice(at, at + len)); at += len; }
  return out;
}

const ownerOf = (paths, cell) => paths.findIndex((p) => p.includes(cell));
const isComplete = (state, k) => {
  const p = state.paths[k];
  const [a, b] = state.dots[k];
  return p.length >= 2 && ((p[0] === a && p[p.length - 1] === b) || (p[0] === b && p[p.length - 1] === a));
};
export function summary(state) {
  const total = state.rows * state.cols;
  const filled = new Set(state.paths.flat()).size;
  const done = state.dots.filter((_, k) => isComplete(state, k)).length;
  return { filled, total, done, solved: done === state.dots.length && filled === total };
}

export default {
  id: 'flow',
  name: 'Liaisons',
  emoji: '🔗',
  color: '#ff9f68',
  tagline: 'Relie les paires sans croiser',
  howto: 'Relie chaque paire de points de même couleur par un chemin.\nGlisse le doigt depuis un point. Les chemins ne peuvent ni se croiser ni se chevaucher.\nToute la grille doit être remplie.\nTrace sur un autre chemin pour le raccourcir, ou reviens en arrière pour effacer.',
  keys: ['Glisser (souris ou doigt) depuis un point'],
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'easy', label: 'Facile 5×5', desc: '4 paires' },
    { id: 'normal', label: 'Normal 7×7', desc: '6 paires' },
    { id: 'hard', label: 'Difficile 9×9', desc: '8 paires' },
    { id: 'expert', label: 'Expert 11×11', desc: '10 paires' },
  ],

  create(rng, diff) {
    const [size, pairs] = { easy: [5, 4], normal: [7, 6], hard: [9, 8], expert: [11, 10] }[diff];
    const path = hamiltonianPath(rng, size, size);
    const solution = cut(rng, path, pairs);
    return {
      rows: size, cols: size,
      dots: solution.map((p) => [p[0], p[p.length - 1]]),
      solution,
      paths: solution.map(() => []),
    };
  },

  mount(root, state, ctx) {
    const { rows, cols, dots } = state;
    let over = false;

    const doneEl = h('strong', { text: '' });
    const fillEl = h('strong', { text: '' });
    const svg = svgEl('svg', { class: 'fl-svg', viewBox: `0 0 ${cols} ${rows}`, role: 'group', 'aria-label': 'Grille de liaisons' });
    const tints = Array.from({ length: rows * cols }, (_, i) => {
      const r = svgEl('rect', { class: 'fl-cell', x: i % cols, y: Math.floor(i / cols), width: 1, height: 1 });
      svg.append(r);
      return r;
    });
    let grid = '';
    for (let k = 1; k < cols; k++) grid += `M${k} 0V${rows}`;
    for (let k = 1; k < rows; k++) grid += `M0 ${k}H${cols}`;
    svg.append(svgEl('path', { class: 'fl-grid', d: grid }));
    const lines = dots.map((_, k) => { const l = svgEl('polyline', { class: `fl-line fl-k${k % 12}`, fill: 'none' }); svg.append(l); return l; });
    dots.forEach(([a, b], k) => {
      for (const cell of [a, b]) svg.append(svgEl('circle', { class: `fl-dot fl-k${k % 12}`, cx: (cell % cols) + 0.5, cy: Math.floor(cell / cols) + 0.5, r: 0.33 }));
    });
    root.append(h('div', { class: 'fl' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Paires reliées' }), doneEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Cases remplies' }), fillEl)),
      svg));

    const centre = (cell) => `${(cell % cols) + 0.5},${Math.floor(cell / cols) + 0.5}`;
    function paint() {
      const owner = new Map();
      state.paths.forEach((p, k) => p.forEach((c) => owner.set(c, k)));
      lines.forEach((l, k) => l.setAttribute('points', state.paths[k].length > 1 ? state.paths[k].map(centre).join(' ') : ''));
      tints.forEach((r, i) => {
        const k = owner.get(i);
        r.setAttribute('class', k === undefined ? 'fl-cell' : `fl-cell on fl-k${k % 12}`);
      });
      const s = summary(state);
      doneEl.textContent = `${s.done}/${dots.length}`;
      fillEl.textContent = `${Math.round((s.filled / s.total) * 100)} %`;
      return s;
    }

    // Une case touchée : prolonge, raccourcit ou coupe selon la situation.
    function step(k, cell) {
      const p = state.paths[k];
      const head = p[p.length - 1];
      if (cell === head || !adjacent(head, cell, cols)) return;
      const back = p.indexOf(cell);
      if (back >= 0) { state.paths[k] = p.slice(0, back + 1); return; }
      if (isComplete(state, k)) return;
      const dotOf = dots.findIndex(([a, b]) => a === cell || b === cell);
      if (dotOf >= 0 && dotOf !== k) return; // le point d'une autre couleur est infranchissable
      const other = ownerOf(state.paths, cell);
      if (other >= 0 && other !== k) state.paths[other] = state.paths[other].slice(0, state.paths[other].indexOf(cell));
      p.push(cell);
    }

    const cellAt = (x, y) => {
      const r = svg.getBoundingClientRect();
      const c = Math.floor(((x - r.left) / r.width) * cols);
      const rr = Math.floor(((y - r.top) / r.height) * rows);
      return c < 0 || c >= cols || rr < 0 || rr >= rows ? -1 : rr * cols + c;
    };

    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      if (over) return;
      const cell = cellAt(e.clientX, e.clientY);
      if (cell < 0) return;
      const dot = dots.findIndex(([a, b]) => a === cell || b === cell);
      if (dot >= 0) {
        state.paths[dot] = [cell];
        drag = { k: dot, id: e.pointerId, x: e.clientX, y: e.clientY };
      } else {
        const own = ownerOf(state.paths, cell);
        if (own < 0) return;
        state.paths[own] = state.paths[own].slice(0, state.paths[own].indexOf(cell) + 1);
        drag = { k: own, id: e.pointerId, x: e.clientX, y: e.clientY };
      }
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
      paint();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      // On échantillonne le trajet entre deux événements pour ne sauter aucune case.
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      const r = svg.getBoundingClientRect();
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (r.width / cols / 4)));
      for (let s = 1; s <= steps; s++) {
        const cell = cellAt(drag.x + (dx * s) / steps, drag.y + (dy * s) / steps);
        if (cell >= 0) step(drag.k, cell);
      }
      drag.x = e.clientX;
      drag.y = e.clientY;
      paint();
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      const s = paint();
      ctx.save(state);
      if (s.solved) {
        over = true;
        ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 1000)) });
      }
    };
    svg.addEventListener('pointerup', release);
    svg.addEventListener('pointercancel', release);

    paint();
    return () => {};
  },
};

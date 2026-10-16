import { h } from '../ui.js';
import { LEVELS } from './rushhour-levels.js';

// Embouteillage (type « Rush Hour ») : faire glisser les véhicules dans leur sens pour libérer la sortie
// de la voiture rouge. Un coup = déplacer un véhicule (de une ou plusieurs cases).
// Génération (hors ligne, tools/gen-rushhour.mjs) : on part d'une position gagnée, on explore les positions
// atteignables, puis le solveur mesure le vrai minimum de coups. Les grilles retenues sont rangées par niveau
// dans rushhour-levels.js : le jeu y pioche instantanément (générer une grille difficile sur un téléphone
// prendrait plusieurs secondes).

export const N = 6;
const EXIT = N - 2; // colonne de l'avant de la voiture rouge quand elle peut sortir (elle mesure 2 cases)

// Position « mobile » de chaque véhicule : colonne s'il est horizontal, ligne s'il est vertical.
const posOf = (car) => (car.h ? car.c : car.r);
const place = (car, p) => (car.h ? { ...car, c: p } : { ...car, r: p });

function grid(cars, skip = -1) {
  const g = new Int8Array(N * N).fill(-1);
  cars.forEach((car, i) => {
    if (i === skip) return;
    for (let k = 0; k < car.len; k++) g[(car.h ? car.r : car.r + k) * N + (car.h ? car.c + k : car.c)] = i;
  });
  return g;
}

// Positions possibles pour le véhicule i (toutes celles atteignables en un glissement), sans la sienne.
export function range(cars, i) {
  const g = grid(cars, i);
  const car = cars[i];
  const free = (p) => {
    for (let k = 0; k < car.len; k++) {
      const r = car.h ? car.r : p + k;
      const c = car.h ? p + k : car.c;
      if (r < 0 || c < 0 || r >= N || c >= N || g[r * N + c] !== -1) return false;
    }
    return true;
  };
  let lo = posOf(car);
  let hi = posOf(car);
  while (free(lo - 1)) lo--;
  while (free(hi + 1)) hi++;
  return { lo, hi };
}

const key = (cars) => cars.map(posOf).join('');
// Tous les coups possibles depuis une position (la grille d'occupation n'est calculée qu'une fois).
function* neighbours(cars) {
  const g = grid(cars);
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    const empty = (k) => (car.h ? k >= 0 && k < N && g[car.r * N + k] === -1 : k >= 0 && k < N && g[k * N + car.c] === -1);
    const p0 = posOf(car);
    for (let p = p0 - 1; empty(p); p--) { const next = cars.slice(); next[i] = place(car, p); yield [i, p, next]; }
    for (let p = p0 + 1; empty(p + car.len - 1); p++) { const next = cars.slice(); next[i] = place(car, p); yield [i, p, next]; }
  }
}
export const isWon = (cars) => cars[0].c === EXIT;

// Plus courte solution (liste de [véhicule, nouvelle position]) depuis `cars`, ou null.
export function solve(cars, maxStates = 200000) {
  const prev = new Map([[key(cars), null]]);
  const queue = [cars];
  for (let head = 0; head < queue.length && prev.size < maxStates; head++) {
    const cur = queue[head];
    if (isWon(cur)) {
      const path = [];
      for (let k = key(cur); prev.get(k); k = prev.get(k).from) path.unshift(prev.get(k).move);
      return path;
    }
    for (const [i, p, next] of neighbours(cur)) {
      const k = key(next);
      if (!prev.has(k)) { prev.set(k, { from: key(cur), move: [i, p] }); queue.push(next); }
    }
  }
  return null;
}

function randomLayout(rng, count) {
  const cars = [{ r: 2, c: EXIT, len: 2, h: true }];
  for (let tries = 0; cars.length < count && tries < 400; tries++) {
    const len = rng.next() < 0.75 ? 2 : 3;
    const hz = rng.next() < 0.5;
    const r = rng.int(hz ? N : N - len + 1);
    const c = rng.int(hz ? N - len + 1 : N);
    if (hz && r === 2) continue; // pas d'autre véhicule horizontal sur la ligne de sortie
    const car = { r, c, len, h: hz };
    const g = grid(cars);
    let ok = true;
    for (let k = 0; k < len && ok; k++) if (g[(hz ? r : r + k) * N + (hz ? c + k : c)] !== -1) ok = false;
    if (ok) cars.push(car);
  }
  return cars;
}

// Exploration bornée depuis une position gagnée : les positions les plus éloignées sont de bonnes candidates ;
// leur vrai minimum de coups (qui peut être plus court, par une autre position gagnée) est mesuré par le solveur.
export function generate(rng, count, lo, hi, attempts = 120) {
  let best = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const s0 = randomLayout(rng, count);
    const depth = new Map([[key(s0), 0]]);
    const queue = [s0];
    let far = [];
    let maxD = 0;
    for (let head = 0; head < queue.length && queue.length < 15000; head++) {
      const d = depth.get(key(queue[head]));
      if (d >= hi) continue;
      for (const [, , next] of neighbours(queue[head])) {
        const k = key(next);
        if (depth.has(k)) continue;
        depth.set(k, d + 1);
        queue.push(next);
        if (d + 1 > maxD) { maxD = d + 1; far = []; }
        if (d + 1 === maxD) far.push(next);
      }
    }
    if (!far.length || (best && maxD <= best.par)) continue; // ne peut pas faire mieux que la meilleure déjà trouvée
    for (const cand of rng.shuffle(far).slice(0, 5)) {
      if (isWon(cand)) continue;
      const sol = solve(cand, 40000);
      if (!sol) continue;
      const par = sol.length;
      if (par >= lo && par <= hi) return { cars: cand, par };
      if (par <= hi && (!best || par > best.par)) best = { cars: cand, par };
    }
  }
  return best;
}

const COLORS = ['#ffb938', '#3ad67c', '#3aa4ff', '#b66bff', '#ff7fc0', '#2fdbdb', '#b8916a', '#8fa3ff', '#9be15d', '#f2e24d', '#ff8a3d', '#4fc3f7'];

export default {
  id: 'rushhour',
  name: 'Embouteillage',
  emoji: '🚗',
  color: '#ff7043',
  tagline: 'Libère la sortie de la voiture rouge',
  howto: 'Fais glisser les véhicules dans leur sens (en long, jamais en travers).\nLibère le passage pour que la voiture rouge atteigne la sortie, à droite.\nUn coup = un véhicule déplacé, de une ou plusieurs cases. Le minimum possible est indiqué.',
  keys: ['Glisser : déplacer un véhicule', 'Tab puis flèches : déplacer au clavier', 'U : annuler'],
  score: { label: 'Moins de coups', better: 'low', fmt: (v) => `${v} coup${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: '3 à 5 coups minimum' },
    { id: 'normal', label: 'Normal', desc: '7 à 10 coups minimum' },
    { id: 'hard', label: 'Difficile', desc: '12 à 15 coups minimum' },
    { id: 'expert', label: 'Expert', desc: '18 à 36 coups minimum' },
  ],

  create(rng, diff) {
    const level = rng.pick(LEVELS[diff]);
    const cars = level.cars.map(([r, c, len, hz]) => ({ r, c, len, h: hz === 1 }));
    const par = level.par;
    return { cars, start: cars.map((c) => ({ ...c })), par, moves: 0, history: [] };
  },

  mount(root, state, ctx) {
    let over = false;
    const movesEl = h('strong', { text: '' });
    const board = h('div', { class: 'rh-board', role: 'group', 'aria-label': 'Parking' });
    const undoBtn = h('button', { type: 'button', class: 'btn btn-ghost', text: '↶ Annuler' });
    const resetBtn = h('button', { type: 'button', class: 'btn btn-ghost', text: '↻ Recommencer' });
    root.append(h('div', { class: 'rh' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Coups' }), movesEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Minimum possible' }), h('strong', { text: String(state.par) }))),
      board,
      h('div', { class: 'rh-actions' }, undoBtn, resetBtn)));

    let els = [];
    function paint() {
      els = state.cars.map((car, i) => {
        const el = h('button', {
          type: 'button', class: `rh-car${i === 0 ? ' red' : ''}${car.h ? ' hz' : ' vt'}`,
          'aria-label': `${i === 0 ? 'Voiture rouge' : `Véhicule ${i}`}, ${car.h ? 'horizontal' : 'vertical'}, ${car.len} cases, ligne ${car.r + 1}, colonne ${car.c + 1}`,
          vars: { '--r': car.r, '--c': car.c, '--w': car.h ? car.len : 1, '--hgt': car.h ? 1 : car.len, '--k': i === 0 ? '#ff4d4d' : COLORS[i % COLORS.length] },
        }, i === 0 ? h('span', { class: 'rh-arrow', 'aria-hidden': 'true', text: '➜' }) : null);
        el.dataset.i = String(i);
        return el;
      });
      board.replaceChildren(h('span', { class: 'rh-exit', 'aria-hidden': 'true' }), ...els);
      movesEl.textContent = state.moves;
      undoBtn.disabled = over || !state.history.length;
      resetBtn.disabled = over || !state.history.length;
    }

    function commit(i, p) {
      const car = state.cars[i];
      if (p === posOf(car)) return;
      state.history.push(state.cars.map((c) => ({ ...c })));
      if (state.history.length > 100) state.history.shift();
      state.cars[i] = place(car, p);
      state.moves++;
      paint();
      ctx.save(state);
      if (isWon(state.cars)) {
        over = true;
        paint();
        els[0].classList.add('leave');
        ctx.finish({ won: true, score: state.moves });
      }
    }

    // Glisser : le véhicule suit le doigt dans son axe, borné par les obstacles, puis se cale sur la case la plus proche.
    let drag = null;
    board.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.rh-car');
      if (!el || over) return;
      const i = Number(el.dataset.i);
      const car = state.cars[i];
      const cell = board.getBoundingClientRect().width / N;
      drag = { i, id: e.pointerId, x: e.clientX, y: e.clientY, cell, ...range(state.cars, i), p0: posOf(car), el, delta: 0 };
      board.setPointerCapture(e.pointerId);
      el.classList.add('drag');
      e.preventDefault();
    });
    board.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const car = state.cars[drag.i];
      const raw = (car.h ? e.clientX - drag.x : e.clientY - drag.y) / drag.cell;
      drag.delta = Math.max(drag.lo - drag.p0, Math.min(drag.hi - drag.p0, raw));
      drag.el.style.setProperty('--shift', `${drag.delta * drag.cell}px`);
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { i, p0, delta, el } = drag;
      drag = null;
      el.classList.remove('drag');
      el.style.setProperty('--shift', '0px');
      commit(i, p0 + Math.round(delta));
    };
    board.addEventListener('pointerup', release);
    board.addEventListener('pointercancel', release);

    // Clavier : flèches dans l'axe du véhicule qui a le focus.
    board.addEventListener('keydown', (e) => {
      const el = e.target.closest('.rh-car');
      if (!el || over) return;
      const i = Number(el.dataset.i);
      const car = state.cars[i];
      const d = car.h ? { ArrowLeft: -1, ArrowRight: 1 }[e.key] : { ArrowUp: -1, ArrowDown: 1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const { lo, hi } = range(state.cars, i);
      const p = posOf(car) + d;
      if (p < lo || p > hi) return;
      commit(i, p);
      if (!over) els[i].focus();
    });

    function undo() {
      if (over || !state.history.length) return;
      state.cars = state.history.pop();
      paint();
      ctx.save(state);
    }
    undoBtn.addEventListener('click', undo);
    resetBtn.addEventListener('click', () => {
      if (over || !state.history.length) return;
      state.cars = state.start.map((c) => ({ ...c }));
      state.history = [];
      paint();
      ctx.save(state);
    });
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'u' || e.key === 'U') undo();
    };
    document.addEventListener('keydown', onKey);
    paint();
    return () => document.removeEventListener('keydown', onKey);
  },
};

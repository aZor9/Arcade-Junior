import { createRng } from '../rng.js';
import { h } from '../ui.js';
import { startLoop } from './loop.js';

// Serpent : il avance tout seul ; on le dirige pour manger les pommes, et il grandit à chaque pomme.
// La partie s'arrête s'il touche un mur ou son propre corps. Le serpent accélère un peu à chaque pomme.

export const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function placeFood(state, rng) {
  const n = state.n;
  const body = new Set(state.snake);
  const free = Array.from({ length: n * n }, (_, i) => i).filter((i) => !body.has(i));
  state.food = free.length ? rng.pick(free) : -1;
}

// Change de direction (ignoré pour un demi-tour). Les appuis rapides sont mis en file d'attente.
export function turn(state, dir) {
  const last = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
  if (dir === last || dir === OPPOSITE[last] || state.queue.length >= 3) return;
  state.queue.push(dir);
}

// Un pas : renvoie 'dead', 'eat' ou 'move'.
export function advance(state, rng) {
  if (state.queue.length) state.dir = state.queue.shift();
  const n = state.n;
  const head = state.snake[0];
  const [dr, dc] = DIRS[state.dir];
  const r = Math.floor(head / n) + dr;
  const c = (head % n) + dc;
  if (r < 0 || r >= n || c < 0 || c >= n) return 'dead';
  const next = r * n + c;
  const eats = next === state.food;
  // La queue avance en même temps : on peut entrer dans la case qu'elle quitte (sauf si on mange).
  const body = eats ? state.snake : state.snake.slice(0, -1);
  if (body.includes(next)) return 'dead';
  state.snake.unshift(next);
  if (eats) { state.score++; placeFood(state, rng); return 'eat'; }
  state.snake.pop();
  return 'move';
}

export const stepMs = (state) => Math.max(state.fastest, state.base - state.score * 4);

export default {
  id: 'snake',
  name: 'Serpent',
  emoji: '🐍',
  color: '#8ce99a',
  endless: true,
  tagline: 'Mange et grandis',
  howto: "Dirige le serpent avec les flèches, en glissant le doigt sur le plateau ou avec les boutons.\nChaque pomme le fait grandir et accélérer un peu.\nLa partie s'arrête s'il touche un mur ou sa propre queue.",
  keys: ['Flèches ou Z Q S D : diriger', 'Espace : pause'],
  score: { label: 'Plus long serpent', better: 'high', always: true, fmt: (v) => `${v} pomme${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Tranquille', desc: 'Lent, grand plateau' },
    { id: 'normal', label: 'Normal', desc: 'Vitesse moyenne' },
    { id: 'hard', label: 'Rapide', desc: 'Petit plateau, très rapide' },
  ],

  create(rng, diff) {
    const { n, base, fastest } = { easy: { n: 15, base: 220, fastest: 120 }, normal: { n: 15, base: 160, fastest: 80 }, hard: { n: 13, base: 115, fastest: 60 } }[diff];
    const mid = Math.floor(n / 2) * n + Math.floor(n / 2);
    const state = { n, base, fastest, snake: [mid, mid - 1, mid - 2], dir: 'right', queue: [], food: -1, score: 0, started: false, rng: 0 };
    placeFood(state, rng);
    state.rng = rng.state;
    return state;
  },

  mount(root, state, ctx) {
    const rng = createRng(0);
    rng.state = state.rng;
    let over = false;
    let paused = true; // au montage (ou à la reprise), on attend une direction
    let acc = 0;
    let last = 0;
    const scoreEl = h('strong', { text: '0' });
    const canvas = h('canvas', { class: 'arc-canvas sq-canvas', tabindex: '0', 'aria-label': 'Plateau du serpent : flèches pour diriger' });
    const btn = (dir, label, text) => h('button', { type: 'button', class: `key sn-${dir}`, 'aria-label': label, text, onclick: () => go(dir) });
    root.append(h('div', { class: 'arc' },
      h('div', { class: 'hud' }, h('div', { class: 'hud-item' }, h('span', { text: 'Pommes' }), scoreEl)),
      canvas,
      h('div', { class: 'sn-pad' }, btn('up', 'Haut', '▲'), btn('left', 'Gauche', '◀'), btn('down', 'Bas', '▼'), btn('right', 'Droite', '▶'))));
    const g = canvas.getContext('2d');
    let W = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      W = Math.min(r.width, r.height);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      g.setTransform(dpr, 0, 0, dpr, (r.width - W) / 2 * dpr, (r.height - W) / 2 * dpr);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw() {
      if (!W) return;
      const n = state.n;
      const s = W / n;
      g.fillStyle = '#1e2a4a';
      g.fillRect(0, 0, W, W);
      g.fillStyle = 'rgba(255,255,255,0.04)';
      for (let i = 0; i < n * n; i++) if ((Math.floor(i / n) + (i % n)) % 2) g.fillRect((i % n) * s, Math.floor(i / n) * s, s, s);
      if (state.food >= 0) {
        g.fillStyle = '#ff5c5c';
        g.beginPath();
        g.arc((state.food % n + 0.5) * s, (Math.floor(state.food / n) + 0.5) * s, s * 0.38, 0, Math.PI * 2);
        g.fill();
      }
      state.snake.forEach((i, k) => {
        g.fillStyle = k === 0 ? '#b2f2bb' : `hsl(135 60% ${Math.max(38, 58 - k)}%)`;
        const pad = k === 0 ? 1 : 2;
        g.fillRect((i % n) * s + pad, Math.floor(i / n) * s + pad, s - pad * 2, s - pad * 2);
      });
      if (paused && !over) {
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.fillRect(0, 0, W, W);
        g.fillStyle = '#fff';
        g.font = `800 ${Math.round(W / 22)}px system-ui, sans-serif`;
        g.textAlign = 'center';
        g.fillText(state.started ? 'Pause : une direction pour reprendre' : 'Choisis une direction', W / 2, W * 0.25);
      }
    }

    function tick() {
      const res = advance(state, rng);
      state.rng = rng.state;
      scoreEl.textContent = state.score;
      if (res === 'dead') {
        over = true;
        draw();
        ctx.save(state);
        ctx.finish({ won: true, score: state.score });
      } else if (res === 'eat') ctx.save(state);
    }

    function frame(t) {
      const dt = last ? Math.min(100, Math.max(0, t - last)) : 0;
      last = t;
      if (!over && !paused) {
        acc += dt;
        const ms = stepMs(state);
        while (acc >= ms && !over) { acc -= ms; tick(); }
      }
      draw();
    }

    function go(dir) {
      if (over) return;
      turn(state, dir);
      if (paused) { paused = false; state.started = true; acc = 0; }
    }

    let touch = null;
    canvas.addEventListener('pointerdown', (e) => { touch = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointermove', (e) => {
      if (!touch) return;
      const dx = e.clientX - touch.x;
      const dy = e.clientY - touch.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      touch = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointerup', () => { touch = null; });
    const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', z: 'up', s: 'down', q: 'left', d: 'right', w: 'up', a: 'left' };
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const dir = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (dir) { e.preventDefault(); go(dir); }
      else if (e.key === ' ' && state.started && !over) { e.preventDefault(); paused = !paused; ctx.save(state); }
    };
    document.addEventListener('keydown', onKey);
    const onHide = () => { if (document.hidden && !over && state.started) paused = true; };
    document.addEventListener('visibilitychange', onHide);
    scoreEl.textContent = state.score;
    const stop = startLoop(frame);
    return () => { stop(); ro.disconnect(); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onHide); };
  },
};

import { h } from '../ui.js';
import { startLoop } from './loop.js';

// Casse-briques : la raquette renvoie la balle vers un mur de briques ; chaque brique touchée disparaît.
// Le mur vidé, on passe au niveau suivant (plus de rangées, balle plus rapide). Trois balles par partie.
// Coordonnées : largeur du terrain 1, hauteur ASPECT ; la raquette glisse en bas.

export const ASPECT = 1.3;
export const COLS = 8;
const BRICK_TOP = 0.12;
const BRICK_H = 0.045;
const PADDLE_Y = ASPECT - 0.08;
const R = 0.016;

export function makeLevel(level) {
  const rows = Math.min(8, 3 + level);
  return Array.from({ length: rows * COLS }, (_, i) => 1 + (Math.floor(i / COLS) < Math.floor(level / 2) ? 1 : 0)); // solidité 1 ou 2
}

export const brickRect = (i) => ({ x: (i % COLS) / COLS, y: BRICK_TOP + Math.floor(i / COLS) * BRICK_H, w: 1 / COLS, h: BRICK_H });

export function resetBall(world) {
  world.ball = { x: world.paddle.x, y: PADDLE_Y - R - 0.002, vx: 0, vy: 0 };
  world.stuck = true;
}

export function launch(world, speed) {
  if (!world.stuck) return;
  world.stuck = false;
  world.ball.vx = speed * 0.45;
  world.ball.vy = -speed * 0.9;
}

// Avance la balle de dt secondes. Renvoie la liste des événements ('brick', 'lost', 'clear').
export function step(world, state, dt) {
  const ev = [];
  const b = world.ball;
  if (world.stuck) { b.x = world.paddle.x; return ev; }
  // Petits sous-pas : la balle ne traverse jamais une brique, même rapide.
  const sub = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / (R * 0.8)));
  for (let k = 0; k < sub; k++) {
    const hs = dt / sub;
    b.x += b.vx * hs;
    b.y += b.vy * hs;
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); }
    if (b.x > 1 - R) { b.x = 1 - R; b.vx = -Math.abs(b.vx); }
    if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); }
    // Raquette : l'angle de renvoi dépend de l'endroit touché.
    const p = world.paddle;
    if (b.vy > 0 && b.y + R >= PADDLE_Y && b.y + R <= PADDLE_Y + 0.03 && Math.abs(b.x - p.x) <= p.w / 2 + R) {
      const speed = Math.hypot(b.vx, b.vy);
      const off = Math.max(-1, Math.min(1, (b.x - p.x) / (p.w / 2)));
      const angle = off * 1.05; // jusqu'à environ 60° de la verticale
      b.vx = speed * Math.sin(angle);
      b.vy = -speed * Math.cos(angle);
      b.y = PADDLE_Y - R;
    }
    // Briques : on cherche la brique touchée et on renvoie selon le côté le moins enfoncé.
    for (let i = 0; i < state.bricks.length; i++) {
      if (!state.bricks[i]) continue;
      const r = brickRect(i);
      const cx = Math.max(r.x, Math.min(b.x, r.x + r.w));
      const cy = Math.max(r.y, Math.min(b.y, r.y + r.h));
      if ((b.x - cx) ** 2 + (b.y - cy) ** 2 > R * R) continue;
      const overX = Math.min(b.x + R - r.x, r.x + r.w - (b.x - R));
      const overY = Math.min(b.y + R - r.y, r.y + r.h - (b.y - R));
      if (overX < overY) b.vx = b.x < r.x + r.w / 2 ? -Math.abs(b.vx) : Math.abs(b.vx);
      else b.vy = b.y < r.y + r.h / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
      state.bricks[i]--;
      if (!state.bricks[i]) state.score += 10;
      ev.push('brick');
      break;
    }
    if (b.y > ASPECT + R) { ev.push('lost'); break; }
    if (state.bricks.every((v) => !v)) { ev.push('clear'); break; }
  }
  return ev;
}

export const speedOf = (state) => state.speed * (1 + 0.08 * (state.level - 1));

export default {
  id: 'breakout',
  name: 'Casse-briques',
  emoji: '🏓',
  color: '#ff922b',
  endless: true,
  tagline: 'Casse tout le mur',
  howto: 'Fais glisser le doigt (ou la souris) pour déplacer la raquette, touche pour lancer la balle.\nChaque brique cassée rapporte 10 points ; les briques foncées demandent deux coups.\nMur vidé : niveau suivant, un peu plus rapide. Trois balles par partie.',
  keys: ['Flèches gauche et droite : déplacer la raquette', 'Espace : lancer la balle'],
  score: { label: 'Meilleur score', better: 'high', always: true, fmt: (v) => `${v} point${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Tranquille', desc: 'Grande raquette, balle lente' },
    { id: 'normal', label: 'Normal', desc: 'Le classique' },
    { id: 'hard', label: 'Rapide', desc: 'Petite raquette, balle rapide' },
  ],

  create(rng, diff) {
    const { paddle, speed } = { easy: { paddle: 0.26, speed: 0.75 }, normal: { paddle: 0.2, speed: 0.95 }, hard: { paddle: 0.15, speed: 1.15 } }[diff];
    return { paddle, speed, level: 1, lives: 3, score: 0, bricks: makeLevel(1) };
  },

  mount(root, state, ctx) {
    let over = false;
    let last = 0;
    const world = { paddle: { x: 0.5, w: state.paddle } };
    resetBall(world);
    const keys = { left: false, right: false };
    const scoreEl = h('strong', { text: '' });
    const livesEl = h('strong', { text: '' });
    const levelEl = h('strong', { text: '' });
    const canvas = h('canvas', { class: 'arc-canvas', tabindex: '0', role: 'button', 'aria-label': 'Terrain : glisser pour déplacer la raquette, toucher pour lancer' });
    root.append(h('div', { class: 'arc' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Score' }), scoreEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Balles' }), livesEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Niveau' }), levelEl)),
      canvas));
    const g = canvas.getContext('2d');
    let W = 0;
    let ox = 0;
    let oy = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      W = Math.min(r.width, r.height / ASPECT);
      ox = (r.width - W) / 2;
      oy = (r.height - W * ASPECT) / 2;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      g.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const hud = () => { scoreEl.textContent = state.score; livesEl.textContent = '●'.repeat(state.lives) || '0'; levelEl.textContent = state.level; };

    function draw() {
      if (!W) return;
      g.clearRect(-ox, -oy, W + ox * 2, W * ASPECT + oy * 2);
      g.fillStyle = '#1e2a4a';
      g.fillRect(0, 0, W, W * ASPECT);
      state.bricks.forEach((v, i) => {
        if (!v) return;
        const r = brickRect(i);
        const row = Math.floor(i / COLS);
        g.fillStyle = v > 1 ? `hsl(${(row * 40) % 360} 70% 40%)` : `hsl(${(row * 40) % 360} 85% 62%)`;
        g.fillRect(r.x * W + 1.5, r.y * W + 1.5, r.w * W - 3, r.h * W - 3);
      });
      const p = world.paddle;
      g.fillStyle = '#ffd43b';
      g.beginPath();
      g.roundRect((p.x - p.w / 2) * W, PADDLE_Y * W, p.w * W, 0.025 * W, 0.0125 * W);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(world.ball.x * W, world.ball.y * W, R * W, 0, Math.PI * 2);
      g.fill();
      if (world.stuck && !over) {
        g.fillStyle = 'rgba(255,255,255,0.8)';
        g.font = `700 ${Math.round(W / 22)}px system-ui, sans-serif`;
        g.textAlign = 'center';
        g.fillText('Touche pour lancer', W / 2, W * (ASPECT - 0.2));
      }
    }

    function frame(t) {
      const dt = last ? Math.min(0.033, Math.max(0, (t - last) / 1000)) : 0;
      last = t;
      if (over || !dt) { draw(); return; }
      const p = world.paddle;
      if (keys.left || keys.right) p.x = Math.max(p.w / 2, Math.min(1 - p.w / 2, p.x + (keys.right - keys.left) * 1.1 * dt));
      const ev = step(world, state, dt);
      if (ev.includes('brick')) hud();
      if (ev.includes('clear')) {
        state.level++;
        state.score += 50;
        state.bricks = makeLevel(state.level);
        resetBall(world);
        hud();
        ctx.save(state);
        ctx.toast(`Niveau ${state.level} !`);
      } else if (ev.includes('lost')) {
        state.lives--;
        hud();
        ctx.save(state);
        if (state.lives <= 0) { over = true; ctx.finish({ won: true, score: state.score }); } else resetBall(world);
      }
      draw();
    }

    const toPaddle = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left - ox) / W;
      world.paddle.x = Math.max(world.paddle.w / 2, Math.min(1 - world.paddle.w / 2, x));
    };
    let down = null;
    canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); down = e.clientX; canvas.setPointerCapture?.(e.pointerId); toPaddle(e); });
    canvas.addEventListener('pointermove', (e) => { if (down !== null || e.pointerType === 'mouse') toPaddle(e); });
    canvas.addEventListener('pointerup', () => { if (!over) launch(world, speedOf(state)); down = null; });
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); keys[e.key === 'ArrowLeft' ? 'left' : 'right'] = e.type === 'keydown'; }
      else if (e.type === 'keydown' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); if (!over) launch(world, speedOf(state)); }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);
    hud();
    const stop = startLoop(frame);
    return () => { stop(); ro.disconnect(); document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey); };
  },
};

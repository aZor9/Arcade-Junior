import { h } from '../ui.js';
import { startLoop } from './loop.js';

// Pile (type « Stack ») : un bloc va et vient au-dessus de la tour ; on le pose au bon moment.
// Ce qui dépasse est coupé et tombe, le bloc suivant est donc plus étroit. Un placement parfait garde la
// largeur ; trois parfaits d'affilée l'agrandissent un peu. Rater complètement le bloc termine la partie.
// Positions et largeurs sont exprimées en fraction de la largeur du plateau (0 à 1).

export const BASE = { x: 0.2, w: 0.6 };
export const PERFECT = 0.012;

// Pose `cur` sur `prev` : nouveau bloc, éventuel morceau coupé, ou raté.
export function drop(prev, cur, tolerance = PERFECT) {
  const left = Math.max(prev.x, cur.x);
  const right = Math.min(prev.x + prev.w, cur.x + cur.w);
  if (right - left <= 0.002) return { miss: true };
  if (Math.abs(cur.x - prev.x) <= tolerance) return { block: { x: prev.x, w: prev.w }, perfect: true, cut: null };
  const cut = cur.x < prev.x ? { x: cur.x, w: prev.x - cur.x } : { x: right, w: cur.x + cur.w - right };
  return { block: { x: left, w: right - left }, perfect: false, cut };
}

// Déplacement du bloc mobile : aller-retour entre les bords.
export function move(cur, speed, dt) {
  cur.x += cur.dir * speed * dt;
  if (cur.x <= 0) { cur.x = -cur.x; cur.dir = 1; }
  if (cur.x + cur.w >= 1) { cur.x = 2 * (1 - cur.w) - cur.x; cur.dir = -1; }
  return cur;
}

// Applique une pose à l'état complet (score, série de parfaits, prochain bloc). Renvoie le résultat de drop.
export function place(state) {
  const prev = state.blocks[state.blocks.length - 1];
  const res = drop(prev, state.cur);
  if (res.miss) return res;
  let block = res.block;
  state.combo = res.perfect ? state.combo + 1 : 0;
  if (res.perfect && state.combo >= 3 && block.w < BASE.w) {
    const grow = Math.min(0.04, BASE.w - block.w);
    block = { x: Math.max(0, Math.min(1 - block.w - grow, block.x - grow / 2)), w: block.w + grow };
  }
  state.blocks.push(block);
  state.score++;
  const fromRight = state.blocks.length % 2 === 0;
  state.cur = { x: fromRight ? 1 - block.w : 0, w: block.w, dir: fromRight ? -1 : 1 };
  return res;
}

export const speedOf = (state) => Math.min(1.3, state.speed + state.score * 0.008);

export default {
  id: 'stack',
  name: 'Pile',
  emoji: '🧱',
  color: '#ffb84d',
  endless: true,
  tagline: 'Empile le plus haut possible',
  howto: 'Un bloc va et vient au-dessus de la tour : touche l’écran (ou Espace) pour le poser.\nCe qui dépasse est coupé : le bloc suivant sera plus étroit.\nUn placement parfait garde la largeur ; trois d’affilée l’agrandissent.\nLa partie s’arrête quand tu rates complètement la pile.',
  keys: ['Clic, Espace ou Entrée : poser le bloc'],
  score: { label: 'Plus haute tour', better: 'high', always: true, fmt: (v) => `${v} étage${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Tranquille', desc: 'Le bloc va lentement' },
    { id: 'normal', label: 'Normal', desc: 'Vitesse moyenne' },
    { id: 'hard', label: 'Rapide', desc: 'Pour les réflexes' },
  ],

  create(rng, diff) {
    const speed = { easy: 0.32, normal: 0.45, hard: 0.62 }[diff];
    return { speed, blocks: [{ ...BASE }], cur: { x: 0, w: BASE.w, dir: 1 }, score: 0, combo: 0 };
  },

  mount(root, state, ctx) {
    let over = false;
    let last = 0;
    const falling = []; // morceaux coupés (purement visuels, non sauvegardés)
    let flash = 0;

    const scoreEl = h('strong', { text: '0' });
    const comboEl = h('strong', { text: '0' });
    const canvas = h('canvas', { class: 'arc-canvas', tabindex: '0', role: 'button', 'aria-label': 'Poser le bloc' });
    root.append(h('div', { class: 'arc' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Hauteur' }), scoreEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Parfaits d’affilée' }), comboEl)),
      canvas));
    const g = canvas.getContext('2d');
    let W = 0;
    let H = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let camY = 0;
    const hud = () => { scoreEl.textContent = state.score; comboEl.textContent = state.combo; };

    function block(x, w, level, y, bh, alpha = 1) {
      const hue = (190 + level * 11) % 360;
      const depth = bh * 0.45;
      g.globalAlpha = alpha;
      g.fillStyle = `hsl(${hue} 75% 70%)`;               // dessus
      g.beginPath();
      g.moveTo(x * W, y);
      g.lineTo(x * W + depth, y - depth);
      g.lineTo((x + w) * W + depth, y - depth);
      g.lineTo((x + w) * W, y);
      g.closePath();
      g.fill();
      g.fillStyle = `hsl(${hue} 70% 55%)`;               // face
      g.fillRect(x * W, y, w * W, bh);
      g.fillStyle = `hsl(${hue} 65% 42%)`;               // côté
      g.beginPath();
      g.moveTo((x + w) * W, y);
      g.lineTo((x + w) * W + depth, y - depth);
      g.lineTo((x + w) * W + depth, y + bh - depth);
      g.lineTo((x + w) * W, y + bh);
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
    }

    function draw() {
      if (!W) return;
      const bh = Math.max(16, H / 18);
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#20194a');
      bg.addColorStop(1, '#3a2f7a');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      const baseY = H * 0.85;
      const yOf = (level) => baseY - level * bh + camY * bh;
      state.blocks.forEach((b, i) => { const y = yOf(i); if (y < H + bh && y > -bh * 2) block(b.x, b.w, i, y, bh); });
      if (!over) block(state.cur.x, state.cur.w, state.blocks.length, yOf(state.blocks.length), bh);
      falling.forEach((p) => block(p.x, p.w, p.level, p.y, bh, Math.max(0, p.alpha)));
      if (flash > 0) {
        g.globalAlpha = Math.min(1, flash * 2);
        g.fillStyle = '#ffcf3f';
        g.font = `800 ${Math.round(bh * 1.1)}px system-ui, sans-serif`;
        g.textAlign = 'center';
        g.fillText(state.combo >= 3 ? `Parfait ×${state.combo} !` : 'Parfait !', W / 2, H * 0.18);
        g.globalAlpha = 1;
      }
    }

    function frame(t) {
      const dt = last ? Math.min(0.033, Math.max(0, (t - last) / 1000)) : 0; // jamais négatif ni trop grand
      last = t;
      if (!over && dt) move(state.cur, speedOf(state), dt);
      const target = Math.max(0, state.blocks.length - 8);
      camY += (target - camY) * Math.min(1, dt * 5);
      for (const p of falling) { p.vy += 900 * dt; p.y += p.vy * dt; p.alpha -= dt * 0.8; }
      while (falling.length && falling[0].alpha <= 0) falling.shift();
      flash = Math.max(0, flash - dt);
      draw();
    }

    function act() {
      if (over) return;
      const level = state.blocks.length;
      const bh = Math.max(16, H / 18);
      const y = H * 0.85 - level * bh + camY * bh;
      const before = { ...state.cur };
      const res = place(state);
      if (res.miss) {
        over = true;
        falling.push({ x: before.x, w: before.w, level, y, vy: 0, alpha: 1 });
        hud();
        ctx.save(state);
        ctx.finish({ won: true, score: state.score });
        return;
      }
      if (res.cut) falling.push({ ...res.cut, level, y, vy: 0, alpha: 1 });
      if (res.perfect) flash = 0.7;
      hud();
      ctx.save(state);
    }

    canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); act(); });
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); act(); }
    };
    document.addEventListener('keydown', onKey);

    hud();
    const stopLoop = startLoop(frame);
    return () => {
      stopLoop();
      ro.disconnect();
      document.removeEventListener('keydown', onKey);
    };
  },
};

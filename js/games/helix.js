import { h } from '../ui.js';
import { startLoop } from './loop.js';

// Hélice (type « Helix Jump ») : une balle rebondit sur les étages d'une tour. On fait tourner la tour pour
// amener un trou sous la balle et la faire descendre. Toucher une zone rouge fait perdre ; traverser trois
// étages d'affilée sans rebondir transforme la balle en « boule de feu » qui brise l'étage suivant.
// La physique (step) est pure et testée hors navigateur ; le rendu est un canvas en pseudo-3D.

export const TAU = Math.PI * 2;
export const FRONT = Math.PI / 2; // la balle est toujours face au joueur (angle π/2 à l'écran)
export const PHYS = { g: 14, bounce: 5.2, maxFall: 14 };
const norm = (a) => ((a % TAU) + TAU) % TAU;

// Nature de l'étage à l'angle φ (repère de la tour) : 'gap' (trou), 'red' (danger) ou 'solid'.
export function segmentAt(floor, phi) {
  const inArc = ([start, size]) => norm(phi - start) < size;
  if (inArc(floor.gap)) return 'gap';
  if (floor.reds.some(inArc)) return 'red';
  return 'solid';
}
export const phiUnderBall = (rot) => norm(FRONT - rot);

export function generateTower(rng, count, cfg) {
  const floors = [];
  for (let i = 0; i < count; i++) {
    const gapStart = rng.next() * TAU;
    const gapSize = cfg.gap * (0.85 + 0.3 * rng.next());
    const reds = [];
    const n = i === 0 ? 0 : cfg.reds[0] + rng.int(cfg.reds[1] - cfg.reds[0] + 1);
    // Les zones rouges sont réparties dans la partie pleine, avec une marge autour du trou.
    const free = TAU - gapSize - 0.5;
    for (let k = 0; k < n; k++) {
      const size = cfg.red * (0.8 + 0.4 * rng.next());
      const slot = free / n;
      const start = gapStart + gapSize + 0.25 + k * slot + rng.next() * Math.max(0, slot - size);
      reds.push([norm(start), Math.min(size, slot - 0.05)]);
    }
    floors.push({ gap: [gapStart, gapSize], reds });
  }
  return floors;
}

// Avance la balle de dt secondes. La surface de l'étage i est à la hauteur i + 1 (la balle descend : y croît).
// Renvoie la liste des événements : 'bounce', 'pass', 'smash', 'lose', 'win'.
export function step(st, dt) {
  const events = [];
  const prevY = st.y;
  if (!(dt > 0)) return events;
  st.vy = Math.min(PHYS.maxFall, st.vy + PHYS.g * dt);
  st.y += st.vy * dt;
  while (st.floor < st.floors.length && st.vy > 0) {
    const surface = st.floor + 1;
    if (!(prevY <= surface && st.y >= surface)) break;
    const seg = segmentAt(st.floors[st.floor], phiUnderBall(st.rot));
    if (seg === 'gap' || st.streak >= 3) {
      const smashed = seg !== 'gap';
      st.streak = smashed ? 0 : st.streak + 1;
      st.score += smashed ? 3 : st.streak;
      st.floor++;
      events.push(smashed ? 'smash' : 'pass');
      if (st.floor >= st.floors.length) { events.push('win'); break; }
      continue;
    }
    if (seg === 'red') { st.y = surface; st.vy = 0; events.push('lose'); break; }
    st.y = surface;
    st.vy = -PHYS.bounce;
    st.streak = 0;
    events.push('bounce');
    break;
  }
  return events;
}

const LEVELS = {
  easy: { floors: 12, gap: 1.35, red: 0.7, reds: [0, 1] },
  normal: { floors: 20, gap: 1.1, red: 0.85, reds: [1, 1] },
  hard: { floors: 30, gap: 0.95, red: 1, reds: [1, 2] },
};

export default {
  id: 'helix',
  name: 'Hélice',
  emoji: '🌀',
  color: '#7c5cff',
  tagline: 'Fais descendre la balle',
  howto: 'Glisse le doigt vers la gauche ou la droite pour faire tourner la tour.\nAmène un trou sous la balle pour descendre. Évite les zones rouges !\nTraverse trois étages d’affilée sans rebondir : la balle devient une boule de feu et brise l’étage suivant.\nAtteins le bas de la tour pour gagner.',
  keys: ['Glisser : tourner la tour', 'Flèches gauche / droite : tourner'],
  score: { label: 'Meilleur score', better: 'high', always: true, fmt: (v) => `${v} pt${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: '12 étages, peu de rouge' },
    { id: 'normal', label: 'Normal', desc: '20 étages' },
    { id: 'hard', label: 'Difficile', desc: '30 étages, beaucoup de rouge' },
  ],

  create(rng, diff) {
    const cfg = LEVELS[diff];
    return { floors: generateTower(rng, cfg.floors, cfg), floor: 0, y: 0.4, vy: 0, rot: 0, streak: 0, score: 0 };
  },

  mount(root, state, ctx) {
    // Reprise : la balle repart juste au-dessus du prochain étage, immobile.
    state.y = state.floor + 0.4;
    state.vy = 0;
    let over = false;
    let last = 0;

    const scoreEl = h('strong', { text: '0' });
    const floorEl = h('strong', { text: '' });
    const canvas = h('canvas', { class: 'arc-canvas', tabindex: '0', role: 'img', 'aria-label': 'Tour de l’hélice : glisse ou utilise les flèches pour la faire tourner' });
    root.append(h('div', { class: 'arc' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Score' }), scoreEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Étage' }), floorEl)),
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

    let camY = state.y - 0.9;
    function hud() {
      scoreEl.textContent = state.score;
      floorEl.textContent = `${Math.min(state.floor + 1, state.floors.length)}/${state.floors.length}`;
    }

    function draw() {
      if (!W) return;
      const cx = W / 2;
      const Rx = Math.min(W * 0.38, 170);
      const Ry = Rx * 0.32;
      const S = Math.max(90, H * 0.24);
      const top = H * 0.3;
      const sy = (y) => (y - camY) * S + top;
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1b1640');
      bg.addColorStop(1, '#2d2470');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      const visible = [];
      for (let i = state.floor; i < state.floors.length; i++) {
        const y = sy(i + 1);
        if (y > H + Ry * 2) break;
        if (y > -Ry * 2) visible.push([i, y]);
      }
      // Un anneau = des arcs continus par type (plein ou rouge), d'un seul tenant : dessiner chaque petit
      // morceau séparément laissait des stries dues à l'anticrénelage.
      const ring = (i, y, front) => {
        const f = state.floors[i];
        const steps = 120;
        const runs = [];
        for (let k = 0; k < steps; k++) {
          const tm = ((k + 0.5) / steps) * TAU;
          const type = (Math.sin(tm) >= 0) !== front ? null : segmentAt(f, norm(tm - state.rot));
          const kind = type === 'gap' ? null : type;
          const lastRun = runs[runs.length - 1];
          if (kind && lastRun && lastRun.kind === kind && lastRun.end === k) lastRun.end = k + 1;
          else if (kind) runs.push({ kind, start: k, end: k + 1 });
        }
        for (const [dy, dark] of [[7, true], [0, false]]) {
          for (const run of runs) {
            g.beginPath();
            g.ellipse(cx, y + dy, Rx, Ry, 0, (run.start / steps) * TAU, (run.end / steps) * TAU);
            g.strokeStyle = run.kind === 'red' ? (dark ? '#9e1534' : '#ff3b5c') : (dark ? '#3b2a8c' : '#9d87ff');
            g.lineWidth = Ry * 0.75;
            g.stroke();
          }
        }
      };
      visible.forEach(([i, y]) => ring(i, y, false));
      g.fillStyle = '#e8e2ff';
      g.fillRect(cx - Rx * 0.18, 0, Rx * 0.36, H);
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(cx + Rx * 0.06, 0, Rx * 0.12, H);
      visible.forEach(([i, y]) => ring(i, y, true));
      // Balle, posée sur le bord avant de l'anneau
      const br = Rx * 0.12;
      const by = sy(state.y) + Ry - br - Ry * 0.35;
      g.beginPath();
      g.arc(cx, by, br, 0, TAU);
      g.fillStyle = state.streak >= 3 ? '#ff8a3d' : '#ffcf3f';
      g.shadowColor = state.streak >= 3 ? 'rgba(255,120,40,0.9)' : 'transparent';
      g.shadowBlur = state.streak >= 3 ? 18 : 0;
      g.fill();
      g.shadowBlur = 0;
      g.lineWidth = 2;
      g.strokeStyle = '#1c1740';
      g.stroke();
    }

    function frame(t) {
      const dt = last ? Math.min(0.033, Math.max(0, (t - last) / 1000)) : 0; // jamais négatif ni trop grand
      last = t;
      if (!over && dt) {
        for (const ev of step(state, dt)) {
          if (ev === 'pass' || ev === 'smash') { hud(); ctx.save(state); }
          if (ev === 'win' || ev === 'lose') {
            over = true;
            hud();
            ctx.save(state);
            ctx.finish({ won: ev === 'win', score: state.score });
          }
        }
      }
      camY += (state.y - 0.9 - camY) * Math.min(1, dt * 6);
      draw();
    }

    // Commandes : glisser horizontalement (ou flèches) fait tourner la tour.
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX }; canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id || over) return;
      state.rot = norm(state.rot - ((e.clientX - drag.x) / Math.max(1, W)) * TAU * 0.9);
      drag.x = e.clientX;
    });
    const release = () => { if (drag) { drag = null; ctx.save(state); } };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    const onKey = (e) => {
      if (over || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowLeft') { state.rot = norm(state.rot + 0.2); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { state.rot = norm(state.rot - 0.2); e.preventDefault(); }
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

import { h } from '../ui.js';

// Démêle : un graphe planaire dont les points ont été éparpillés. On les déplace jusqu'à ce que
// plus aucun trait n'en croise un autre. Une solution existe toujours : le graphe est construit
// planaire (traits ajoutés un par un sans jamais en croiser un existant), puis seulement mélangé.

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

// Croisement strict de deux segments (les extrémités communes ne comptent pas : voir l'appelant).
export function segmentsCross(p1, p2, p3, p4) {
  const d1 = orient(p3, p4, p1);
  const d2 = orient(p3, p4, p2);
  const d3 = orient(p1, p2, p3);
  const d4 = orient(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// Indices des traits qui en croisent au moins un autre.
export function crossingEdges(pts, edges) {
  const bad = new Set();
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const [a, b] = edges[i];
      const [c, d] = edges[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (segmentsCross(pts[a], pts[b], pts[c], pts[d])) { bad.add(i); bad.add(j); }
    }
  }
  return bad;
}

function connected(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  edges.forEach(([a, b]) => { parent[find(a)] = find(b); });
  const root = find(0);
  return parent.every((_, i) => find(i) === root);
}

// Points sur une grille légèrement bousculée, puis traits les plus courts d'abord s'ils n'en croisent aucun :
// on obtient un graphe planaire maximal (une triangulation).
export function buildGraph(rng, n) {
  const side = Math.ceil(Math.sqrt(n * 1.3));
  const slots = rng.shuffle(Array.from({ length: side * side }, (_, i) => i)).slice(0, n);
  const layout = slots.map((s) => {
    const cx = s % side;
    const cy = Math.floor(s / side);
    return [
      Math.round((8 + 84 * ((cx + 0.15 + 0.7 * rng.next()) / side)) * 10) / 10,
      Math.round((8 + 84 * ((cy + 0.15 + 0.7 * rng.next()) / side)) * 10) / 10,
    ];
  });
  const pairs = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) pairs.push([a, b, Math.hypot(layout[a][0] - layout[b][0], layout[a][1] - layout[b][1])]);
  pairs.sort((p, q) => p[2] - q[2]);
  const edges = [];
  for (const [a, b] of pairs) {
    let ok = true;
    for (const [c, d] of edges) {
      if (a === c || a === d || b === c || b === d) continue;
      if (segmentsCross(layout[a], layout[b], layout[c], layout[d])) { ok = false; break; }
    }
    if (ok) edges.push([a, b]);
  }
  return { layout, edges };
}

// On retire des traits au hasard, sans jamais déconnecter le graphe, jusqu'à la densité voulue.
function thin(rng, n, edges, target) {
  const list = edges.slice();
  for (const e of rng.shuffle(list.slice())) {
    if (list.length <= target) break;
    const rest = list.filter((x) => x !== e);
    if (connected(n, rest)) list.splice(list.indexOf(e), 1);
  }
  return list;
}

export function generate(rng, n, density) {
  const { layout, edges: full } = buildGraph(rng, n);
  const target = Math.max(n - 1, Math.min(full.length, Math.round(n * density)));
  const edges = thin(rng, n, full, target);
  return { layout, edges };
}

export default {
  id: 'untangle',
  name: 'Démêle',
  emoji: '🕸️',
  color: '#ff6b6b',
  tagline: 'Relie sans jamais croiser',
  howto: 'Les points sont reliés par des traits qui se croisent.\nFais glisser les points pour démêler le graphe.\nUn trait rouge en croise un autre. Il n’y a plus qu’à tout rendre vert : aucun croisement !\nUne solution existe toujours.',
  keys: ['Glisser : déplacer un point', 'Tab puis flèches : déplacer au clavier (Maj : plus loin)'],
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: '7 points' },
    { id: 'normal', label: 'Normal', desc: '12 points' },
    { id: 'hard', label: 'Difficile', desc: '18 points' },
    { id: 'expert', label: 'Expert', desc: '25 points' },
  ],

  create(rng, diff) {
    const [n, density] = { easy: [7, 1.4], normal: [12, 1.6], hard: [18, 1.75], expert: [25, 1.85] }[diff];
    const { layout, edges } = generate(rng, n, density);
    // Départ : les points sont placés sur un cercle dans le désordre (on retire les départs déjà démêlés).
    let pts;
    let tries = 0;
    do {
      const order = rng.shuffle(Array.from({ length: n }, (_, i) => i));
      pts = Array(n);
      order.forEach((node, k) => {
        const a = (k / n) * Math.PI * 2;
        pts[node] = [Math.round((50 + 40 * Math.cos(a)) * 10) / 10, Math.round((50 + 40 * Math.sin(a)) * 10) / 10];
      });
      tries++;
    } while (crossingEdges(pts, edges).size === 0 && tries < 100);
    return { n, pts, edges, moves: 0, layout };
  },

  mount(root, state, ctx) {
    const { pts, edges } = state;
    let over = false;

    const crossEl = h('strong', { text: '0' });
    const movesEl = h('strong', { text: '0' });
    const svg = svgEl('svg', { class: 'ud-svg', viewBox: '0 0 100 100', role: 'group', 'aria-label': 'Graphe à démêler' });
    const lines = edges.map(() => { const l = svgEl('line', { class: 'ud-edge' }); svg.append(l); return l; });
    const nodes = pts.map((_, i) => {
      const g = svgEl('g', { class: 'ud-node', tabindex: '0', role: 'button', 'aria-label': `Point ${i + 1}` });
      g.append(svgEl('circle', { class: 'hit', r: 7 }), svgEl('circle', { class: 'dot', r: 3.4 }));
      svg.append(g);
      return g;
    });
    root.append(h('div', { class: 'ud' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Croisements' }), crossEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Déplacements' }), movesEl)),
      svg));

    function paint() {
      const bad = crossingEdges(pts, edges);
      edges.forEach(([a, b], i) => {
        const l = lines[i];
        l.setAttribute('x1', pts[a][0]); l.setAttribute('y1', pts[a][1]);
        l.setAttribute('x2', pts[b][0]); l.setAttribute('y2', pts[b][1]);
        l.classList.toggle('bad', bad.has(i));
      });
      nodes.forEach((g, i) => g.setAttribute('transform', `translate(${pts[i][0]} ${pts[i][1]})`));
      crossEl.textContent = bad.size ? String(countPairs()) : '0';
      movesEl.textContent = state.moves;
      return bad.size;
    }
    // Nombre de paires de traits qui se croisent (plus parlant que le nombre de traits en cause).
    function countPairs() {
      let c = 0;
      for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
          const [a, b] = edges[i];
          const [p, q] = edges[j];
          if (a === p || a === q || b === p || b === q) continue;
          if (segmentsCross(pts[a], pts[b], pts[p], pts[q])) c++;
        }
      }
      return c;
    }

    function settle() {
      state.moves++;
      const left = paint();
      ctx.save(state);
      if (!left) {
        over = true;
        ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 1000)) });
      }
    }

    const clamp = (v) => Math.min(96, Math.max(4, Math.round(v * 10) / 10));
    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      const g = e.target.closest('.ud-node');
      if (!g || over) return;
      const i = nodes.indexOf(g);
      const r = svg.getBoundingClientRect();
      drag = { i, id: e.pointerId, moved: false, dx: pts[i][0] - ((e.clientX - r.left) / r.width) * 100, dy: pts[i][1] - ((e.clientY - r.top) / r.height) * 100 };
      svg.setPointerCapture(e.pointerId);
      g.classList.add('drag');
      e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const r = svg.getBoundingClientRect();
      pts[drag.i] = [clamp(((e.clientX - r.left) / r.width) * 100 + drag.dx), clamp(((e.clientY - r.top) / r.height) * 100 + drag.dy)];
      drag.moved = true;
      paint();
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      nodes[drag.i].classList.remove('drag');
      const moved = drag.moved;
      drag = null;
      if (moved) settle();
    };
    svg.addEventListener('pointerup', release);
    svg.addEventListener('pointercancel', release);

    // Clavier : on déplace le point qui a le focus.
    svg.addEventListener('keydown', (e) => {
      const g = e.target.closest && e.target.closest('.ud-node');
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!g || !d || over) return;
      e.preventDefault();
      const i = nodes.indexOf(g);
      const step = e.shiftKey ? 6 : 2;
      pts[i] = [clamp(pts[i][0] + d[0] * step), clamp(pts[i][1] + d[1] * step)];
      settle();
    });

    paint();
    return () => {};
  },
};

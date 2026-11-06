// Dessins des jeux : chaque jeu est un petit croquis de son plateau, tracé « à la main ».
// Les traits tremblent un peu (graine tirée du nom du jeu, donc toujours le même dessin) et les aplats de
// couleur débordent légèrement du trait, comme un coloriage. Aucune image : tout tient dans ce fichier.
import { svg } from './ui.js';

const K = { r: '#ef5350', y: '#ffc933', b: '#4a90e2', g: '#43b581', p: '#ab7be0', n: 'currentColor', k: '#2b3350' };

function pencil(seed) {
  let s = seed;
  const j = (a) => {
    s = (s * 16807) % 2147483647;
    return +((s / 2147483647 - 0.5) * a).toFixed(1);
  };
  const stroke = (x1, y1, x2, y2) => `M${x1 + j(1.2)} ${y1 + j(1.2)}Q${(x1 + x2) / 2 + j(1.8)} ${(y1 + y2) / 2 + j(1.8)} ${x2 + j(1.2)} ${y2 + j(1.2)}`;
  const ink = (d) => `<path class="dd-ink" d="${d}"/>`;
  const color = (d, k) => `<path class="dd-fill" fill="${k === true ? 'var(--c)' : K[k] || k}" d="${d}"/>`;
  const line = (...p) => ink(stroke(...p));
  const band = (d) => `<path class="dd-band" d="${d}"/>`;
  const poly = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0] + j(1)} ${p[1] + j(1)}`).join('') + 'Z';
  const boxPath = (x, y, w, h) => stroke(x, y, x + w, y) + stroke(x + w, y, x + w, y + h) + stroke(x + w, y + h, x, y + h) + stroke(x, y + h, x, y);
  const circlePath = (cx, cy, r) => {
    const n = 8;
    const a0 = j(6);
    const pt = (i) => { const a = a0 + (i / n) * Math.PI * 2; const q = r + j(r * 0.14); return [cx + q * Math.cos(a), cy + q * Math.sin(a)]; };
    let d = `M${pt(0).map((v) => v.toFixed(1)).join(' ')}`;
    for (let i = 1; i <= n + 0.5; i++) {
      const a = a0 + ((i - 0.5) / n) * Math.PI * 2;
      const q = r * 1.08;
      d += `Q${(cx + q * Math.cos(a)).toFixed(1)} ${(cy + q * Math.sin(a)).toFixed(1)} ${pt(i).map((v) => v.toFixed(1)).join(' ')}`;
    }
    return d;
  };
  const box = (x, y, w, h, k) => (k ? color(poly([[x + 1, y + 1.5], [x + w + 1.5, y + 1], [x + w + 1, y + h + 1.5], [x + 0.5, y + h + 1]]), k) : '') + ink(boxPath(x, y, w, h));
  const dot = (cx, cy, r, k) => (k ? color(circlePath(cx + 0.8, cy + 0.8, r), k) : '') + ink(circlePath(cx, cy, r));
  const txt = (x, y, t, size = 11) => `<text class="dd-txt" x="${x}" y="${y}" font-size="${size}" text-anchor="middle">${t}</text>`;
  const grid = (x, y, w, n) => {
    let d = ink(boxPath(x, y, w, w));
    for (let i = 1; i < n; i++) d += line(x + (w * i) / n, y, x + (w * i) / n, y + w) + line(x, y + (w * i) / n, x + w, y + (w * i) / n);
    return d;
  };
  return { ink, color, line, band, box, dot, txt, grid, poly };
}

const DRAW = {
  surprise: (p) => p.box(10, 12, 42, 40, '#fff') + p.dot(22, 24, 3.4, 'k') + p.dot(40, 24, 3.4, 'k') + p.dot(31, 32, 3.4, 'k') + p.dot(22, 41, 3.4, 'k') + p.dot(40, 41, 3.4, 'k'),
  2048: (p) => p.box(8, 8, 23, 23, true) + p.box(33, 8, 23, 23) + p.box(8, 33, 23, 23) + p.box(33, 33, 23, 23, 'y') + p.txt(19.5, 25, '2', 15) + p.txt(44.5, 25, '4', 15) + p.txt(44.5, 50, '8', 15),
  mastermind: (p) => p.dot(11, 24, 6.5, 'r') + p.dot(25, 24, 6.5, 'b') + p.dot(39, 24, 6.5, 'y') + p.dot(53, 24, 6.5, 'g') + p.dot(11, 44, 3, 'n') + p.dot(21, 44, 3, 'n') + p.dot(31, 44, 3) + p.dot(41, 44, 3) + p.line(5, 34, 59, 34),
  sudoku: (p) => p.grid(8, 8, 48, 3) + p.box(24, 8, 16, 16, true) + p.txt(16, 21, '5') + p.txt(32, 21, '3') + p.txt(48, 53, '9') + p.txt(32, 37, '7') + p.txt(16, 53, '1'),
  nombre: (p) => p.dot(32, 32, 24, true) + p.txt(32, 44, '?', 34),
  lights: (p) => p.dot(32, 26, 15, true) + p.line(26, 41, 28, 49) + p.line(38, 41, 36, 49) + p.box(27, 49, 10, 7) + p.line(8, 26, 13, 26) + p.line(51, 26, 56, 26) + p.line(14, 9, 18, 13) + p.line(50, 9, 46, 13) + p.line(32, 3, 32, 7),
  taquin: (p) => [[0, 0, '1'], [1, 0, '2'], [2, 0, '3'], [0, 1, '4'], [2, 1, '5'], [0, 2, '7'], [1, 2, '8']].map(([c, r, t]) => p.box(8 + c * 16.5, 8 + r * 16.5, 15, 15, (c + r) % 2 ? null : true) + p.txt(15.5 + c * 16.5, 20 + r * 16.5, t, 10)).join(''),
  memory: (p) => p.box(8, 12, 24, 36, true) + p.line(12, 18, 28, 42) + p.line(28, 18, 12, 42) + p.box(35, 16, 22, 36) + p.color(p.poly([[46, 28], [52, 34], [46, 42], [40, 34]]), 'r'),
  demineur: (p) => p.line(32, 8, 32, 56) + p.line(8, 32, 56, 32) + p.line(15, 15, 49, 49) + p.line(49, 15, 15, 49) + p.dot(32, 32, 15, 'k') + p.dot(27, 27, 2.6, '#fff'),
  untangle: (p) => p.line(12, 14, 52, 50) + p.line(52, 14, 12, 50) + p.line(12, 14, 52, 14) + p.line(12, 50, 52, 50) + p.dot(12, 14, 5, true) + p.dot(52, 14, 5, true) + p.dot(12, 50, 5, true) + p.dot(52, 50, 5, true),
  pipes: (p) => p.color(p.poly([[6, 26], [38, 26], [38, 58], [28, 58], [28, 36], [6, 36]]), true) + p.line(6, 24, 40, 24) + p.line(40, 24, 40, 58) + p.line(6, 38, 26, 38) + p.line(26, 38, 26, 58) + p.box(20, 18, 6, 26),
  takuzu: (p) => p.grid(8, 8, 48, 3) + [[0, 0, '1'], [1, 0, '0'], [2, 1, '1'], [0, 1, '0'], [1, 2, '1'], [2, 2, '0']].map(([c, r, t]) => p.txt(16 + c * 16, 21 + r * 16, t)).join(''),
  hanoi: (p) => p.line(32, 6, 32, 54) + p.box(24, 16, 16, 9, 'r') + p.box(17, 26, 30, 10, true) + p.box(10, 37, 44, 11, 'y') + p.line(4, 55, 60, 55),
  flow: (p) => p.ink('M12 14C30 14 16 34 34 34S46 48 52 50') + p.ink('M12 50C22 42 28 46 34 50') + p.dot(12, 14, 6, 'r') + p.dot(52, 50, 6, 'r') + p.dot(12, 50, 5, 'b') + p.dot(35, 50, 5, 'b'),
  compte: (p) => p.grid(8, 8, 48, 2) + p.txt(20, 28, '+', 22) + p.txt(44, 28, '−', 22) + p.txt(20, 52, '×', 22) + p.txt(44, 52, '÷', 22),
  nonogram: (p) => p.grid(8, 8, 48, 4) + [[1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2], [2, 2]].map(([c, r]) => p.box(8 + c * 12, 8 + r * 12, 12, 12, 'n')).join(''),
  connect4: (p) => p.box(6, 10, 52, 44, 'b') + [[0, 0, 0], [1, 0, 0], [2, 0, 'y'], [3, 0, 0], [0, 1, 0], [1, 1, 'r'], [2, 1, 'y'], [3, 1, 'r'], [0, 2, 'y'], [1, 2, 'r'], [2, 2, 'r'], [3, 2, 'y']].map(([c, r, k]) => p.dot(14 + c * 12, 19 + r * 13, 4.6, k || '#fff')).join(''),
  nummatch: (p) => p.grid(8, 8, 48, 3) + p.txt(16, 21, '4') + p.txt(32, 21, '6') + p.txt(48, 21, '2') + p.txt(16, 37, '9') + p.txt(32, 37, '3') + p.txt(48, 37, '7') + p.txt(16, 53, '5') + p.txt(32, 53, '8') + p.txt(48, 53, '1') + p.ink('M9 16C7 6 38 6 39 14C40 24 9 26 9 16'),
  helix: (p) => p.box(27, 4, 10, 56) + p.color(p.poly([[6, 18], [58, 12], [58, 20], [6, 26]]), true) + p.line(6, 18, 58, 12) + p.line(6, 26, 58, 20) + p.color(p.poly([[6, 44], [58, 38], [58, 46], [6, 52]]), 'r') + p.line(6, 44, 58, 38) + p.line(6, 52, 58, 46) + p.dot(46, 31, 4.6, 'y'),
  stack: (p) => p.box(12, 44, 40, 10, true) + p.box(16, 33, 40, 10, 'y') + p.box(11, 22, 40, 10, 'r') + p.box(17, 11, 36, 10, 'b'),
  watersort: (p) => p.color(p.poly([[24, 34], [40, 34], [40, 48], [24, 48]]), 'b') + p.color(p.poly([[24, 48], [40, 48], [39, 56], [32, 60], [25, 56]]), 'r') + p.color(p.poly([[24, 22], [40, 22], [40, 34], [24, 34]]), 'y') + p.line(23, 8, 23, 54) + p.line(41, 8, 41, 54) + p.ink('M23 54C24 62 40 62 41 54') + p.line(19, 7, 45, 7),
  rushhour: (p) => p.color(p.poly([[6, 34], [18, 34], [24, 22], [42, 22], [50, 34], [58, 36], [58, 46], [6, 46]]), 'r') + p.ink('M6 34L18 34L24 22L42 22L50 34L58 36L58 46L6 46Z') + p.line(26, 33, 44, 33) + p.dot(18, 47, 6, 'k') + p.dot(46, 47, 6, 'k'),
  futoshiki: (p) => p.box(7, 20, 20, 24, true) + p.box(37, 20, 20, 24) + p.txt(17, 38, '2', 15) + p.txt(47, 38, '5', 15) + p.line(35, 26, 29, 32) + p.line(29, 32, 35, 38),
  skyscrapers: (p) => p.box(6, 30, 15, 26, 'y') + p.box(23, 8, 17, 48, true) + p.box(42, 20, 15, 36, 'r') + p.line(27, 18, 36, 18) + p.line(27, 28, 36, 28) + p.line(27, 38, 36, 38) + p.line(2, 56, 62, 56),
  cages: (p) => p.grid(8, 8, 48, 3) + p.color(p.poly([[8, 8], [40, 8], [40, 24], [24, 24], [24, 40], [8, 40]]), true) + p.grid(8, 8, 48, 3) + p.txt(17, 18, '6+', 8) + p.txt(40, 37, '4', 10),
  hitori: (p) => p.grid(8, 8, 48, 3) + p.box(24, 8, 16, 16, 'n') + p.box(40, 24, 16, 16, 'n') + p.box(8, 40, 16, 16, 'n') + p.txt(16, 21, '3') + p.txt(32, 37, '1') + p.txt(48, 53, '2'),
  reversi: (p) => p.grid(8, 8, 48, 2) + p.dot(20, 20, 8.5, 'k') + p.dot(44, 20, 8.5, '#fff') + p.dot(20, 44, 8.5, '#fff') + p.dot(44, 44, 8.5, 'k'),
  billes: (p) => [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]].map(([c, r]) => p.dot(14 + c * 18, 14 + r * 18, 7, c === 1 && r === 1 ? null : true)).join(''),
  blocs: (p) => p.box(10, 10, 15, 15, true) + p.box(10, 25, 15, 15, true) + p.box(10, 40, 15, 15, true) + p.box(25, 40, 15, 15, true) + p.box(40, 40, 15, 15, true) + p.box(40, 10, 15, 15, 'y'),
  snake: (p) => p.band('M8 50C16 58 24 42 32 44S50 52 50 38S38 24 28 26') + p.dot(26, 26, 6, true) + p.dot(24.5, 24.5, 1.2, 'k') + p.dot(50, 13, 5.5, 'r') + p.line(50, 8, 53, 4),
  breakout: (p) => [0, 1, 2].map((c) => p.box(6 + c * 18, 8, 16, 8, ['r', 'y', 'b'][c])).join('') + [0, 1].map((c) => p.box(15 + c * 18, 18, 16, 8, ['g', 'p'][c])).join('') + p.dot(38, 38, 3.6, 'n') + p.box(16, 52, 28, 5, true),
  simon: (p) => p.color('M32 32L32 8C20 8 8 20 8 32Z', 'g') + p.color('M32 32L56 32C56 20 44 8 32 8Z', 'r') + p.color('M32 32L32 56C44 56 56 44 56 32Z', 'b') + p.color('M32 32L8 32C8 44 20 56 32 56Z', 'y') + p.dot(32, 32, 24) + p.line(8, 32, 56, 32) + p.line(32, 8, 32, 56) + p.dot(32, 32, 6, '#fff'),
  schulte: (p) => p.grid(8, 8, 48, 3) + [[0, 0, '7'], [1, 0, '2'], [2, 0, '5'], [0, 1, '4'], [1, 1, '9'], [2, 1, '1'], [0, 2, '3'], [1, 2, '8'], [2, 2, '6']].map(([c, r, t]) => p.txt(16 + c * 16, 21 + r * 16, t)).join('') + p.dot(48, 33, 7),
};

const seedOf = (id) => [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 2147483646, 7) + 1;
const cache = new Map();

// Renvoie le dessin d'un jeu, ou null si le jeu n'en a pas encore (l'emoji du jeu sert alors de repli).
export function doodle(id) {
  if (!DRAW[id]) return null;
  if (!cache.has(id)) {
    const el = svg(DRAW[id](pencil(seedOf(id))), 64);
    el.classList.add('doodle');
    cache.set(id, el);
  }
  return cache.get(id).cloneNode(true);
}

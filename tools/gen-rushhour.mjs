// Génère la bibliothèque de grilles de l'Embouteillage : node tools/gen-rushhour.mjs
// Chaque grille est vérifiée par le solveur (minimum de coups exact) puis écrite dans js/games/rushhour-levels.js.
import fs from 'node:fs';
import { generate, solve } from '../js/games/rushhour.js';
import { createRng } from '../js/rng.js';

const PER_LEVEL = 30;
const LEVELS = { easy: [7, 3, 6], normal: [9, 7, 11], hard: [12, 12, 17], expert: [12, 18, 60] };
const out = {};
const rng = createRng(20261016);
for (const [diff, [count, lo, hi]] of Object.entries(LEVELS)) {
  const seen = new Set();
  out[diff] = [];
  const t0 = Date.now();
  while (out[diff].length < PER_LEVEL) {
    const r = generate(rng, count + rng.int(2), lo, hi, 40);
    if (!r || r.par < lo || r.par > hi) continue;
    const key = r.cars.map((c) => `${c.r}${c.c}${c.len}${c.h ? 1 : 0}`).join('');
    if (seen.has(key)) continue;
    const sol = solve(r.cars);
    if (!sol || sol.length !== r.par) throw new Error('minimum incohérent');
    seen.add(key);
    out[diff].push({ par: r.par, cars: r.cars.map((c) => [c.r, c.c, c.len, c.h ? 1 : 0]) });
    process.stdout.write(`${diff} ${out[diff].length}/${PER_LEVEL} (minimum ${r.par})\n`);
  }
  out[diff].sort((a, b) => a.par - b.par);
  console.log(`${diff} : ${PER_LEVEL} grilles en ${((Date.now() - t0) / 1000).toFixed(0)} s, minimum de ${out[diff][0].par} à ${out[diff].at(-1).par} coups`);
}
const body = Object.entries(out).map(([d, list]) => `  ${d}: [\n${list.map((l) => `    { par: ${l.par}, cars: ${JSON.stringify(l.cars)} },`).join('\n')}\n  ],`).join('\n');
fs.writeFileSync(new URL('../js/games/rushhour-levels.js', import.meta.url),
  `// Fichier généré par tools/gen-rushhour.mjs : ne pas modifier à la main.\n// Chaque grille : minimum de coups (vérifié par le solveur) et véhicules [ligne, colonne, longueur, horizontal].\nexport const LEVELS = {\n${body}\n};\n`);
console.log('écrit : js/games/rushhour-levels.js');

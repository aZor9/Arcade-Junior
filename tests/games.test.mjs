// Tests de logique pure (sans navigateur) : node tests/games.test.mjs
import assert from 'node:assert/strict';
import { GAMES } from '../js/games/index.js';
import { createRng } from '../js/rng.js';
import { solve } from '../js/games/sudoku.js';
import { evaluate } from '../js/games/mastermind.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok -', name); };

ok('chaque jeu se crée dans chaque difficulté et survit à un aller-retour JSON', () => {
  for (const g of GAMES) {
    for (const d of g.difficulties) {
      for (let seed = 1; seed <= 5; seed++) {
        const state = g.create(createRng(seed * 7919), d.id);
        assert.deepEqual(JSON.parse(JSON.stringify(state)), state, `${g.id}/${d.id}`);
      }
    }
  }
});

ok('la graine rend la génération reproductible', () => {
  for (const g of GAMES) {
    const d = g.difficulties[0].id;
    assert.deepEqual(g.create(createRng(42), d), g.create(createRng(42), d), g.id);
  }
});

ok('sudoku : solution unique et grille valide pour chaque niveau', () => {
  const sd = GAMES.find((g) => g.id === 'sudoku');
  for (const d of sd.difficulties) {
    const t = Date.now();
    const s = sd.create(createRng(12345), d.id);
    const r = solve(s.puzzle, s.n, s.bw, s.bh, 2);
    assert.equal(r.count, 1, d.id);
    assert.deepEqual(r.solution, s.solution, d.id);
    const clues = s.puzzle.filter(Boolean).length;
    console.log(`   ${d.id}: ${clues} indices, ${Date.now() - t} ms`);
  }
});

ok('mastermind : évaluation noir/blanc', () => {
  assert.deepEqual(evaluate([0, 1, 2, 3], [0, 1, 2, 3]), { black: 4, white: 0 });
  assert.deepEqual(evaluate([0, 1, 2, 3], [3, 2, 1, 0]), { black: 0, white: 4 });
  assert.deepEqual(evaluate([0, 0, 1, 1], [0, 1, 0, 1]), { black: 2, white: 2 });
  assert.deepEqual(evaluate([0, 0, 0, 1], [0, 0, 1, 1]), { black: 3, white: 0 });
  assert.deepEqual(evaluate([1, 2, 3, 4], [1, 1, 1, 1]), { black: 1, white: 0 });
});

ok('taquin : jamais déjà résolu au départ', () => {
  const tq = GAMES.find((g) => g.id === 'taquin');
  for (let seed = 0; seed < 50; seed++) {
    const { tiles } = tq.create(createRng(seed), 'easy');
    assert.ok(!tiles.every((v, i) => v === (i === 8 ? 0 : i + 1)));
  }
});

ok('lumières : jamais éteintes au départ', () => {
  const lo = GAMES.find((g) => g.id === 'lights');
  for (let seed = 0; seed < 50; seed++) assert.ok(lo.create(createRng(seed), 'easy').cells.some(Boolean));
});

ok('2048 : deux tuiles au départ', () => {
  const g = GAMES.find((x) => x.id === '2048');
  assert.equal(g.create(createRng(1), 'classic').grid.flat().filter(Boolean).length, 2);
});

console.log(`\n${n} groupes de tests réussis`);

// Tests de logique pure (sans navigateur) : node tests/games.test.mjs
import assert from 'node:assert/strict';
import { GAMES } from '../js/games/index.js';
import { createRng } from '../js/rng.js';
import { solve } from '../js/games/sudoku.js';
import { evaluate } from '../js/games/mastermind.js';
import { buildGraph, crossingEdges, generate as genUntangle } from '../js/games/untangle.js';
import { analyse, rotated, makeTree } from '../js/games/pipes.js';
import { solve as solveTakuzu, errors as takuzuErrors, propagate } from '../js/games/takuzu.js';
import { canMove, minMoves } from '../js/games/hanoi.js';

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

ok('démêle : le graphe de départ est planaire (solution), connexe, et le départ mélangé se croise', () => {
  const ud = GAMES.find((g) => g.id === 'untangle');
  for (const d of ud.difficulties) {
    for (let seed = 1; seed <= 8; seed++) {
      const st = ud.create(createRng(seed * 101), d.id);
      assert.equal(crossingEdges(st.layout, st.edges).size, 0, `${d.id}/${seed} layout planaire`);
      assert.ok(crossingEdges(st.pts, st.edges).size > 0, `${d.id}/${seed} départ mélangé`);
      assert.ok(st.edges.length >= st.n - 1);
      const seen = new Set([0]);
      for (let k = 0; k < st.n; k++) for (const [a, b] of st.edges) { if (seen.has(a)) seen.add(b); if (seen.has(b)) seen.add(a); }
      assert.equal(seen.size, st.n, `${d.id}/${seed} connexe`);
      assert.ok(st.pts.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100));
    }
  }
});

ok('pipes : arbre couvrant résoluble, jamais résolu au départ', () => {
  const pp = GAMES.find((g) => g.id === 'pipes');
  for (const d of pp.difficulties) {
    for (let seed = 1; seed <= 6; seed++) {
      const st = pp.create(createRng(seed * 37), d.id);
      assert.ok(analyse(st.base, st.rows, st.cols, st.source).solved, `${d.id}/${seed} la grille de base est une solution`);
      const start = st.base.map((m, i) => rotated(m, st.rot[i]));
      assert.ok(!analyse(start, st.rows, st.cols, st.source).solved, `${d.id}/${seed} mélangée`);
      const links = st.base.reduce((a, m) => a + [1, 2, 4, 8].filter((b) => m & b).length, 0) / 2;
      assert.equal(links, st.rows * st.cols - 1, 'un arbre : n-1 liaisons');
    }
  }
});

ok('takuzu : solution unique, valide, et fautes détectées', () => {
  const tk = GAMES.find((g) => g.id === 'takuzu');
  for (const d of tk.difficulties) {
    const t = Date.now();
    const st = tk.create(createRng(2024), d.id);
    const r = solveTakuzu(st.puzzle, st.n, 2);
    assert.equal(r.count, 1, `${d.id} unique`);
    assert.deepEqual(r.solution, st.solution, `${d.id} même solution`);
    assert.equal(takuzuErrors(st.solution, st.n).size, 0, `${d.id} la solution n'a aucune faute`);
    assert.ok(st.puzzle.every((v, i) => v === 0 || v === st.solution[i]));
    console.log(`   ${d.id}: ${st.puzzle.filter(Boolean).length}/${st.n * st.n} indices, ${Date.now() - t} ms`);
  }
  const triple = Array(36).fill(0);
  triple[0] = triple[1] = triple[2] = 1;
  assert.ok(takuzuErrors(triple, 6).has(0), 'un triplé est une faute');
  const duo = Int8Array.from(Array(36).fill(0));
  duo[0] = duo[1] = 1;
  assert.ok(propagate(duo, 6) && duo[2] === 2, 'deux identiques de suite : le suivant est l’autre chiffre');
});

ok('hanoï : règles de déplacement et minimum', () => {
  assert.equal(minMoves(3), 7);
  assert.equal(minMoves(7), 127);
  const hn = GAMES.find((g) => g.id === 'hanoi');
  for (const d of hn.difficulties) {
    const st = hn.create(createRng(5), d.id);
    assert.notEqual(st.from, st.to);
    assert.deepEqual(st.pegs[st.from], Array.from({ length: st.disks }, (_, i) => st.disks - i));
  }
  assert.ok(canMove([[3, 2, 1], [], []], 0, 1));
  assert.ok(!canMove([[3, 2], [1], []], 0, 1));
  assert.ok(!canMove([[], [1], []], 0, 1));
  assert.ok(canMove([[3], [1], []], 1, 0));
});

console.log(`\n${n} groupes de tests réussis`);

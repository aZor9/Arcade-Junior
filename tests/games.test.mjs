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
import { adjacent as flowAdjacent, summary as flowSummary } from '../js/games/flow.js';
import { applyOp } from '../js/games/compte.js';
import { solveGrid as solveNonogram, cluesOf as nonoClues } from '../js/games/nonogram.js';
import { dropIn as c4Drop, lineAt as c4Line, bestMove as c4Best, W as c4W, H as c4H } from '../js/games/connect4.js';

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

ok('liaisons : chemin passant par toutes les cases, tronçons valides, grille à résoudre vide au départ', () => {
  const fl = GAMES.find((g) => g.id === 'flow');
  for (const d of fl.difficulties) {
    for (let seed = 1; seed <= 10; seed++) {
      const st = fl.create(createRng(seed * 17), d.id);
      assert.equal(st.solution.flat().length, st.rows * st.cols);
      assert.equal(new Set(st.solution.flat()).size, st.rows * st.cols, `${d.id}: chaque case une seule fois`);
      st.solution.forEach((p) => {
        assert.ok(p.length >= 3);
        for (let i = 1; i < p.length; i++) assert.ok(flowAdjacent(p[i - 1], p[i], st.cols), 'cases voisines');
      });
      assert.ok(st.paths.every((p) => p.length === 0));
      assert.equal(flowSummary(st).solved, false);
      // la solution, posée sur la grille, vérifie les règles
      const solved = { ...st, paths: st.solution.map((p) => p.slice()) };
      assert.equal(flowSummary(solved).solved, true, `${d.id}/${seed} la solution résout la grille`);
    }
  }
});

ok('le compte est bon : opérations permises et cible atteignable', () => {
  assert.equal(applyOp(10, 4, '−'), 6);
  assert.equal(applyOp(4, 10, '−'), null);
  assert.equal(applyOp(10, 4, '÷'), null);
  assert.equal(applyOp(12, 4, '÷'), 3);
  assert.equal(applyOp(6, 7, '×'), 42);
  const reachable = (vals, target) => {
    if (vals.includes(target)) return true;
    for (let i = 0; i < vals.length; i++) {
      for (let j = 0; j < vals.length; j++) {
        if (i === j) continue;
        for (const op of ['+', '−', '×', '÷']) {
          const r = applyOp(vals[i], vals[j], op);
          if (r === null) continue;
          if (reachable([...vals.filter((_, k) => k !== i && k !== j), r], target)) return true;
        }
      }
    }
    return false;
  };
  const cp = GAMES.find((g) => g.id === 'compte');
  for (const d of cp.difficulties) {
    for (let seed = 1; seed <= 4; seed++) {
      const st = cp.create(createRng(seed * 71), d.id);
      assert.ok(st.target > 0 && !st.numbers.includes(st.target), `${d.id}: la cible n'est pas déjà donnée`);
      assert.ok(reachable(st.numbers, st.target), `${d.id}/${seed}: ${st.numbers} -> ${st.target}`);
    }
  }
});

ok('nonogram : solution unique (vérifiée par force brute en 5×5) et résolue par logique', () => {
  const ng = GAMES.find((g) => g.id === 'nonogram');
  for (const d of ng.difficulties) {
    const st = ng.create(createRng(99), d.id);
    const again = solveNonogram(st.n, st.rowClues, st.colClues);
    assert.deepEqual(again, st.solution, `${d.id}: le solveur retrouve la solution`);
    st.rowClues.forEach((c, r) => assert.deepEqual(nonoClues(st.solution.slice(r * st.n, r * st.n + st.n)), c));
  }
  // 5×5 : on énumère toutes les images possibles ligne par ligne et on compte celles qui respectent les indices.
  for (const seed of [1, 2, 3]) {
    const st = ng.create(createRng(seed), 'easy');
    const n = st.n;
    const rowsOpts = Array.from({ length: n }, (_, r) => {
      const opts = [];
      for (let m = 0; m < 1 << n; m++) {
        const line = Array.from({ length: n }, (_, k) => (m >> k) & 1);
        if (JSON.stringify(nonoClues(line)) === JSON.stringify(st.rowClues[r])) opts.push(line);
      }
      return opts;
    });
    let count = 0;
    const rec = (r, grid) => {
      if (r === n) {
        for (let c = 0; c < n; c++) if (JSON.stringify(nonoClues(grid.map((row) => row[c]))) !== JSON.stringify(st.colClues[c])) return;
        count++;
        return;
      }
      for (const line of rowsOpts[r]) rec(r + 1, [...grid, line]);
    };
    rec(0, []);
    assert.equal(count, 1, `5×5 seed ${seed} : une seule image possible`);
  }
});

ok('puissance 4 : alignements, victoire immédiate, blocage, force de l’IA', () => {
  const b = Array(c4W * c4H).fill(0);
  [0, 1, 2].forEach((c) => c4Drop(b, c, 1));
  const r = c4Drop(b, 3, 1);
  assert.ok(c4Line(b, r, 3, 1), 'quatre en ligne détectés');
  const v = Array(c4W * c4H).fill(0);
  [0, 0, 0].forEach((c) => c4Drop(v, c, 2));
  assert.equal(c4Best(v, 2, 3, createRng(1)), 0, 'gagne tout de suite');
  const t = Array(c4W * c4H).fill(0);
  [0, 0, 0].forEach((c) => c4Drop(t, c, 1));
  assert.equal(c4Best(t, 2, 3, createRng(1)), 0, 'bloque la colonne');
  // L'IA (profondeur 4) doit battre un joueur qui joue au hasard.
  let wins = 0;
  for (let g = 0; g < 20; g++) {
    const rng = createRng(g * 7 + 1);
    const bd = Array(c4W * c4H).fill(0);
    let who = g % 2 ? 2 : 1;
    let res = 0;
    for (let k = 0; k < 42; k++) {
      const legal = [0, 1, 2, 3, 4, 5, 6].filter((c) => !bd[(c4H - 1) * c4W + c]);
      const col = who === 2 ? c4Best(bd, 2, 4, rng) : rng.pick(legal);
      const row = c4Drop(bd, col, who);
      if (c4Line(bd, row, col, who)) { res = who; break; }
      who = 3 - who;
    }
    if (res === 2) wins++;
  }
  assert.ok(wins >= 18, `l'IA gagne ${wins}/20`);
});

console.log(`\n${n} groupes de tests réussis`);

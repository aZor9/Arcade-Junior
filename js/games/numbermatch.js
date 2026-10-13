import { createRng } from '../rng.js';
import { h } from '../ui.js';

// Number Match : une grille de chiffres de 1 à 9. On efface deux chiffres identiques ou dont la somme fait 10,
// à condition qu'ils se « voient » : côte à côte, ou séparés uniquement de cases déjà vides, dans la même
// ligne, la même colonne ou la même diagonale ; la fin d'une ligne rejoint le début de la suivante.
// Quand il n'y a plus de paire, « + » recopie les chiffres restants à la fin de la grille (nombre limité).
// Une ligne entièrement vide disparaît. Il faut tout effacer. Le générateur ne propose que des grilles
// dont il a lui-même trouvé une façon de gagner.

export const W = 9;
const compat = (a, b) => a === b || a + b === 10;

// Les chiffres que `cells[i]` voit « vers l'avant » : le prochain dans l'ordre de lecture, puis le premier
// dans chacune des directions bas, bas-droite et bas-gauche. Toute paire apparaît ainsi depuis son plus petit indice.
export function partners(cells, i) {
  const out = [];
  for (let j = i + 1; j < cells.length; j++) if (cells[j]) { out.push(j); break; }
  const r = Math.floor(i / W);
  const c = i % W;
  for (const [dr, dc] of [[1, 0], [1, 1], [1, -1]]) {
    let rr = r + dr;
    let cc = c + dc;
    while (cc >= 0 && cc < W && rr * W + cc < cells.length) {
      const j = rr * W + cc;
      if (cells[j]) { out.push(j); break; }
      rr += dr;
      cc += dc;
    }
  }
  return out;
}

export function validPair(cells, i, j) {
  if (i === j || !cells[i] || !cells[j] || !compat(cells[i], cells[j])) return false;
  const [a, b] = i < j ? [i, j] : [j, i];
  return partners(cells, a).includes(b);
}

export function allPairs(cells) {
  const seen = new Set();
  const out = [];
  for (let i = 0; i < cells.length; i++) {
    if (!cells[i]) continue;
    for (const j of partners(cells, i)) {
      const key = i * 10000 + j;
      if (compat(cells[i], cells[j]) && !seen.has(key)) { seen.add(key); out.push([i, j]); }
    }
  }
  return out;
}

// Supprime les lignes entièrement vides (y compris une dernière ligne incomplète).
export function normalize(cells) {
  for (let r = Math.ceil(cells.length / W) - 1; r >= 0; r--) {
    if (cells.slice(r * W, r * W + W).every((v) => !v)) cells.splice(r * W, W);
  }
  return cells;
}

export const addNumbers = (cells) => { cells.push(...cells.filter(Boolean)); return cells; };

// Cherche une façon de vider la grille (essais « gloutons » au hasard) ; retourne la suite de coups ou null.
export function findSolution(start, adds, rng, attempts = 40) {
  for (let t = 0; t < attempts; t++) {
    const cells = start.slice();
    let left = adds;
    const steps = [];
    for (let guard = 0; guard < 2000; guard++) {
      const pairs = allPairs(cells);
      if (pairs.length) {
        const [i, j] = rng.pick(pairs);
        cells[i] = 0;
        cells[j] = 0;
        normalize(cells);
        steps.push([i, j]);
      } else if (left > 0 && cells.length) {
        addNumbers(cells);
        left--;
        steps.push('add');
      } else break;
      if (!cells.length) return steps;
    }
  }
  return null;
}

export default {
  id: 'nummatch',
  name: 'Number Match',
  emoji: '🧠',
  color: '#c3e34a',
  tagline: 'Efface les paires qui font 10',
  howto: 'Efface deux chiffres identiques, ou dont la somme fait 10.\nIls doivent se voir : côte à côte, ou séparés de cases vides, en ligne, colonne ou diagonale. La fin d’une ligne rejoint le début de la suivante.\nPlus de paire ? Le bouton + recopie les chiffres restants à la fin de la grille (nombre limité).\nEfface tout pour gagner. Une ligne vide disparaît.',
  keys: ['Clic : choisir un chiffre', 'H : indice', 'A : ajouter les chiffres'],
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: '26 chiffres, 6 ajouts, 5 indices' },
    { id: 'normal', label: 'Normal', desc: '36 chiffres, 5 ajouts, 3 indices' },
    { id: 'hard', label: 'Difficile', desc: '44 chiffres, 4 ajouts, 1 indice' },
    { id: 'expert', label: 'Expert', desc: '54 chiffres, 3 ajouts, sans indice' },
  ],

  create(rng, diff) {
    const [count, adds, hints] = { easy: [26, 6, 5], normal: [36, 5, 3], hard: [44, 4, 1], expert: [54, 3, 0] }[diff];
    let cells = null;
    for (let tries = 0; tries < 80; tries++) {
      // On tire des paires (identiques ou complémentaires) : chaque chiffre a au moins un partenaire.
      const list = [];
      for (let k = 0; k < count / 2; k++) {
        const a = 1 + rng.int(9);
        list.push(a, rng.next() < 0.5 ? a : 10 - a);
      }
      const candidate = rng.shuffle(list);
      if (!allPairs(candidate).length) continue;
      cells = candidate;
      if (findSolution(candidate, adds, createRng(rng.int(1e9)), 30)) break;
    }
    return { cells, adds, hints, moves: 0 };
  },

  mount(root, state, ctx) {
    let sel = null;
    let hint = [];
    let hintTimer = null;
    let over = false;

    const leftEl = h('strong', { text: '' });
    const movesEl = h('strong', { text: '' });
    const grid = h('div', { class: 'nm-board' });
    const wrap = h('div', { class: 'nm-wrap' }, grid);
    const hintBtn = h('button', { type: 'button', class: 'btn btn-ghost' });
    const addBtn = h('button', { type: 'button', class: 'btn btn-primary' });
    root.append(h('div', { class: 'nm' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Chiffres restants' }), leftEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Paires effacées' }), movesEl)),
      wrap,
      h('div', { class: 'nm-actions' }, hintBtn, addBtn)));

    function paint() {
      grid.replaceChildren(...state.cells.map((v, i) => {
        const cls = ['nm-cell'];
        if (!v) cls.push('gone');
        if (i === sel) cls.push('sel');
        if (hint.includes(i)) cls.push('hint');
        const b = h('button', {
          type: 'button', class: cls.join(' '), disabled: !v || over,
          'aria-label': v ? `Chiffre ${v}, ligne ${Math.floor(i / W) + 1}, colonne ${(i % W) + 1}` : 'Case vide',
          vars: { '--hue': String((v - 1) * 40) }, text: v ? String(v) : '',
        });
        b.addEventListener('click', () => tap(i));
        return b;
      }));
      leftEl.textContent = state.cells.filter(Boolean).length;
      movesEl.textContent = state.moves;
      hintBtn.textContent = `💡 Indice (${state.hints})`;
      addBtn.textContent = `+ Ajouter (${state.adds})`;
      hintBtn.disabled = over || state.hints <= 0;
      addBtn.disabled = over || state.adds <= 0;
    }

    // Après chaque changement : victoire, défaite (plus de paire et plus d'ajout), ou simple information.
    function settle() {
      ctx.save(state);
      if (!state.cells.length) {
        over = true;
        paint();
        ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 1000)) });
      } else if (!allPairs(state.cells).length) {
        if (state.adds <= 0) {
          over = true;
          paint();
          ctx.finish({ won: false });
        } else ctx.toast('Plus aucune paire : ajoute des chiffres avec +.');
      }
    }

    function tap(i) {
      if (over || !state.cells[i]) return;
      if (sel === null) { sel = i; hint = []; paint(); return; }
      if (sel === i) { sel = null; paint(); return; }
      if (validPair(state.cells, sel, i)) {
        state.cells[sel] = 0;
        state.cells[i] = 0;
        normalize(state.cells);
        state.moves++;
        sel = null;
        hint = [];
        paint();
        settle();
        return;
      }
      const a = state.cells[sel];
      const b = state.cells[i];
      if (compat(a, b)) ctx.toast('Un autre chiffre se trouve entre eux.');
      sel = i;
      paint();
    }

    function useHint() {
      if (over || state.hints <= 0) return;
      const pairs = allPairs(state.cells);
      if (!pairs.length) { ctx.toast('Aucune paire possible : utilise +.'); return; }
      state.hints--;
      hint = rng.pick(pairs);
      sel = null;
      paint();
      ctx.save(state);
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => { hint = []; paint(); }, 2200);
    }

    function addMore() {
      if (over || state.adds <= 0) return;
      addNumbers(state.cells);
      state.adds--;
      sel = null;
      hint = [];
      paint();
      settle();
      wrap.scrollTop = wrap.scrollHeight;
    }

    const rng = createRng(state.cells.length * 7919 + state.moves);
    hintBtn.addEventListener('click', useHint);
    addBtn.addEventListener('click', addMore);
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'h' || e.key === 'H') useHint();
      else if (e.key === 'a' || e.key === 'A') addMore();
    };
    document.addEventListener('keydown', onKey);
    paint();
    if (!over && state.cells.length && !allPairs(state.cells).length && state.adds <= 0) settle(); // reprise d'une partie bloquée
    return () => { clearTimeout(hintTimer); document.removeEventListener('keydown', onKey); };
  },
};

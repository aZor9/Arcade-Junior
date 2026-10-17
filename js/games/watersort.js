import { h } from '../ui.js';

// Tri de liquides : verser d'un tube à l'autre jusqu'à ce que chaque tube ne contienne qu'une seule couleur.
// On ne verse que sur la même couleur (ou dans un tube vide), et seulement s'il reste de la place ; toutes les
// couches identiques du dessus partent ensemble. Chaque grille proposée a été résolue par le solveur avant.

export const CAP = 4;
// Teintes franches et bien séparées (le jeu n'affiche que des blocs de couleur). Les noms servent aux lecteurs d'écran.
const COLORS = ['#ff3b3b', '#ff9f1a', '#ffd60a', '#34c759', '#1e90ff', '#a259ff', '#ff6fb1', '#00c2c7', '#8d5524', '#7d8597', '#1d3557', '#b9f18c'];
const NAMES = ['rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet', 'rose', 'turquoise', 'marron', 'gris', 'bleu nuit', 'vert clair'];

const top = (t) => t[t.length - 1];
const uniform = (t) => t.every((v) => v === t[0]);

export function canPour(tubes, a, b, cap = CAP) {
  if (a === b) return false;
  const A = tubes[a];
  const B = tubes[b];
  if (!A.length || B.length >= cap) return false;
  return !B.length || top(B) === top(A);
}

// Verse et retourne le nombre de couches déplacées.
export function pour(tubes, a, b, cap = CAP) {
  const A = tubes[a];
  const B = tubes[b];
  const c = top(A);
  let n = 0;
  while (A.length && top(A) === c && B.length < cap) { B.push(A.pop()); n++; }
  return n;
}

export const isSolved = (tubes, cap = CAP) => tubes.every((t) => !t.length || (t.length === cap && uniform(t)));
export const hasMove = (tubes, cap = CAP) => tubes.some((_, a) => tubes.some((__, b) => canPour(tubes, a, b, cap)));

// Recherche en profondeur avec mémoire des positions déjà vues ; renvoie une suite de versements ou null.
export function solve(start, cap = CAP, maxNodes = 250000) {
  const tubes = start.map((t) => t.slice());
  const seen = new Set();
  const path = [];
  let nodes = 0;
  const key = () => tubes.map((t) => t.join(',')).sort().join('|');
  const rec = () => {
    if (isSolved(tubes, cap)) return true;
    if (++nodes > maxNodes) return false;
    const k = key();
    if (seen.has(k)) return false;
    seen.add(k);
    const firstEmpty = tubes.findIndex((t) => !t.length);
    const moves = [];
    tubes.forEach((A, a) => {
      if (!A.length || (A.length === cap && uniform(A))) return;
      tubes.forEach((B, b) => {
        if (!canPour(tubes, a, b, cap)) return;
        if (!B.length && (b !== firstEmpty || uniform(A))) return; // un seul tube vide suffit, et vider un tube déjà uni ne sert à rien
        moves.push([a, b, B.length ? 0 : 1]);
      });
    });
    moves.sort((x, y) => x[2] - y[2]);
    for (const [a, b] of moves) {
      const n = pour(tubes, a, b, cap);
      path.push([a, b]);
      if (rec()) return true;
      path.pop();
      for (let i = 0; i < n; i++) tubes[a].push(tubes[b].pop());
    }
    return false;
  };
  return rec() ? path.slice() : null;
}

export function generate(rng, colors, empties = 2, cap = CAP) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const units = rng.shuffle(Array.from({ length: colors * cap }, (_, i) => Math.floor(i / cap)));
    const tubes = Array.from({ length: colors }, (_, i) => units.slice(i * cap, i * cap + cap));
    if (tubes.some((t) => uniform(t))) continue; // pas de tube déjà fini au départ
    for (let e = 0; e < empties; e++) tubes.push([]);
    if (solve(tubes, cap)) return tubes;
  }
  throw new Error('génération impossible');
}

export default {
  id: 'watersort',
  name: 'Tri de liquides',
  emoji: '🧪',
  color: '#4fc3f7',
  tagline: 'Une seule couleur par tube',
  howto: 'Touche un tube, puis un autre pour y verser le liquide du dessus.\nOn ne verse que sur la même couleur ou dans un tube vide, et seulement s’il reste de la place.\nGagne quand chaque tube ne contient plus qu’une couleur : il reçoit alors son bouchon.',
  keys: ['Tab puis Entrée : choisir un tube', 'U : annuler'],
  score: { label: 'Moins de versements', better: 'low', fmt: (v) => `${v} versement${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: '4 couleurs, 6 tubes' },
    { id: 'normal', label: 'Normal', desc: '6 couleurs, 8 tubes' },
    { id: 'hard', label: 'Difficile', desc: '8 couleurs, 10 tubes' },
    { id: 'expert', label: 'Expert', desc: '10 couleurs, 12 tubes' },
  ],

  create(rng, diff) {
    const colors = { easy: 4, normal: 6, hard: 8, expert: 10 }[diff];
    const tubes = generate(rng, colors);
    return { cap: CAP, colors, tubes, start: tubes.map((t) => t.slice()), history: [], moves: 0 };
  },

  mount(root, state, ctx) {
    const cap = state.cap;
    let sel = null;
    let over = false;
    const movesEl = h('strong', { text: '' });
    const doneEl = h('strong', { text: '' });
    const board = h('div', { class: 'ws-tubes' });
    const undoBtn = h('button', { type: 'button', class: 'btn btn-ghost', text: '↶ Annuler' });
    const resetBtn = h('button', { type: 'button', class: 'btn btn-ghost', text: '↻ Recommencer' });
    root.append(h('div', { class: 'ws' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Versements' }), movesEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Tubes terminés' }), doneEl)),
      board,
      h('div', { class: 'ws-actions' }, undoBtn, resetBtn)));

    function paint() {
      board.replaceChildren(...state.tubes.map((t, i) => {
        const full = t.length === cap && uniform(t);
        // Tube en verre : un bouchon (tube terminé), puis le verre qui contient les couches, du fond vers le haut.
        const b = h('button', {
          type: 'button', class: `ws-tube${sel === i ? ' sel' : ''}${full ? ' full' : ''}`, vars: { '--cap': cap },
          'aria-label': `Tube ${i + 1}${t.length ? `, du bas vers le haut : ${t.map((c) => NAMES[c % NAMES.length]).join(', ')}` : ', vide'}${full ? ', terminé' : ''}${sel === i ? ', sélectionné' : ''}`,
        },
        h('span', { class: 'ws-cork', 'aria-hidden': 'true' }),
        h('span', { class: 'ws-glass', 'aria-hidden': 'true' }, t.map((c) => h('span', { class: 'ws-unit', vars: { '--k': COLORS[c % COLORS.length] } }))));
        b.addEventListener('click', () => tap(i));
        return b;
      }));
      movesEl.textContent = state.moves;
      doneEl.textContent = `${state.tubes.filter((t) => t.length === cap && uniform(t)).length}/${state.colors}`;
      undoBtn.disabled = over || !state.history.length;
      resetBtn.disabled = over || !state.history.length;
    }

    function tap(i) {
      if (over) return;
      if (sel === null) { if (state.tubes[i].length) { sel = i; paint(); } return; }
      if (sel === i) { sel = null; paint(); return; }
      if (!canPour(state.tubes, sel, i, cap)) {
        ctx.toast('Impossible : il faut la même couleur en haut, ou un tube vide, et de la place.');
        sel = state.tubes[i].length ? i : null;
        paint();
        return;
      }
      state.history.push(state.tubes.map((t) => t.slice()));
      if (state.history.length > 60) state.history.shift();
      pour(state.tubes, sel, i, cap);
      state.moves++;
      sel = null;
      paint();
      ctx.save(state);
      if (isSolved(state.tubes, cap)) {
        over = true;
        paint();
        ctx.finish({ won: true, score: state.moves });
      } else if (!hasMove(state.tubes, cap)) {
        ctx.toast('Plus aucun versement possible : annule ou recommence.');
      }
    }

    function undo() {
      if (over || !state.history.length) return;
      state.tubes = state.history.pop();
      sel = null;
      paint();
      ctx.save(state);
    }
    undoBtn.addEventListener('click', undo);
    resetBtn.addEventListener('click', () => {
      if (over || !state.history.length) return;
      state.tubes = state.start.map((t) => t.slice());
      state.history = [];
      sel = null;
      paint();
      ctx.save(state);
    });
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'u' || e.key === 'U') undo();
    };
    document.addEventListener('keydown', onKey);
    paint();
    return () => document.removeEventListener('keydown', onKey);
  },
};

import { h } from '../ui.js';

// Solitaire à billes : une bille saute par-dessus une voisine (horizontalement ou verticalement) vers un trou
// libre juste derrière ; la bille sautée est retirée. Il faut finir avec une seule bille.
// Plateau anglais en croix (33 trous). Les positions sont obtenues en jouant à l'envers depuis une bille seule :
// chaque partie proposée est donc forcément résoluble. Le niveau Expert est la position classique complète.

export const N = 7;
export const HOLES = Array.from({ length: N * N }, (_, i) => {
  const r = Math.floor(i / N);
  const c = i % N;
  return (r >= 2 && r <= 4) || (c >= 2 && c <= 4);
});
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const at = (r, c) => (r >= 0 && r < N && c >= 0 && c < N && HOLES[r * N + c] ? r * N + c : -1);

// Sauts possibles depuis une bille : [arrivée, bille sautée].
export function jumpsFrom(pegs, i) {
  if (!pegs[i]) return [];
  const r = Math.floor(i / N);
  const c = i % N;
  const out = [];
  for (const [dr, dc] of DIRS) {
    const over = at(r + dr, c + dc);
    const to = at(r + 2 * dr, c + 2 * dc);
    if (over >= 0 && to >= 0 && pegs[over] && !pegs[to]) out.push([to, over]);
  }
  return out;
}

export const anyMove = (pegs) => pegs.some((_, i) => jumpsFrom(pegs, i).length);
export const pegCount = (pegs) => pegs.filter(Boolean).length;

// Joue à l'envers `steps` sauts depuis une bille seule (au centre ou ailleurs) : la position obtenue se résout
// en refaisant ces sauts dans l'autre sens.
export function generate(rng, steps) {
  for (;;) {
    const pegs = Array(N * N).fill(0);
    const cells = HOLES.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    pegs[rng.pick(cells)] = 1;
    let done = 0;
    for (let guard = 0; done < steps && guard < steps * 40; guard++) {
      const opts = [];
      for (const to of cells) {
        if (!pegs[to]) continue;
        const r = Math.floor(to / N);
        const c = to % N;
        for (const [dr, dc] of DIRS) {
          const over = at(r + dr, c + dc);
          const from = at(r + 2 * dr, c + 2 * dc);
          if (over >= 0 && from >= 0 && !pegs[over] && !pegs[from]) opts.push([from, over, to]);
        }
      }
      if (!opts.length) break;
      const [from, over, to] = rng.pick(opts);
      pegs[to] = 0; pegs[over] = 1; pegs[from] = 1;
      done++;
    }
    if (done === steps) return pegs;
  }
}

// Recherche d'une solution (suite de sauts [départ, arrivée]) jusqu'à une seule bille ; null si aucune.
export function solve(start, maxNodes = 200000) {
  const pegs = start.slice();
  const seen = new Set();
  const path = [];
  let nodes = 0;
  const rec = () => {
    if (pegCount(pegs) === 1) return true;
    if (++nodes > maxNodes) return false;
    const key = pegs.join('');
    if (seen.has(key)) return false;
    seen.add(key);
    for (let i = 0; i < pegs.length; i++) {
      for (const [to, over] of jumpsFrom(pegs, i)) {
        pegs[i] = 0; pegs[over] = 0; pegs[to] = 1;
        path.push([i, to]);
        if (rec()) return true;
        path.pop();
        pegs[i] = 1; pegs[over] = 1; pegs[to] = 0;
      }
    }
    return false;
  };
  return rec() ? path.slice() : null;
}

export function classic() {
  const pegs = HOLES.map((v) => (v ? 1 : 0));
  pegs[24] = 0;
  return pegs;
}

export default {
  id: 'billes',
  name: 'Solitaire à billes',
  emoji: '🔵',
  color: '#4cc9f0',
  tagline: 'Saute et ne garde qu’une bille',
  howto: 'Touche une bille, puis le trou où elle doit sauter : elle passe par-dessus une bille voisine, qui est retirée.\nOn saute en ligne ou en colonne, jamais en diagonale, et seulement vers un trou libre juste derrière.\nGagne en ne laissant qu’une seule bille. Chaque position proposée a une solution.',
  keys: ['Tab puis Entrée : choisir une bille puis un trou', 'U : annuler'],
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: '6 billes' },
    { id: 'normal', label: 'Normal', desc: '11 billes' },
    { id: 'hard', label: 'Difficile', desc: '18 billes' },
    { id: 'expert', label: 'Expert', desc: 'Le plateau classique : 32 billes' },
  ],

  create(rng, diff) {
    const pegs = diff === 'expert' ? classic() : generate(rng, { easy: 5, normal: 10, hard: 17 }[diff]);
    return { pegs, start: pegs.slice(), history: [], moves: 0 };
  },

  mount(root, state, ctx) {
    let sel = null;
    let over = false;
    const leftEl = h('strong', { text: '' });
    const undoBtn = h('button', { type: 'button', class: 'btn btn-ghost', text: '↶ Annuler' });
    const resetBtn = h('button', { type: 'button', class: 'btn btn-ghost', text: '↻ Recommencer' });
    const cells = HOLES.map((v, i) => (v ? h('button', { type: 'button', class: 'pg-hole', onclick: () => tap(i) }, h('span', { class: 'pg-peg' })) : h('span', { class: 'pg-void' })));
    root.append(h('div', { class: 'pg' },
      h('div', { class: 'hud' }, h('div', { class: 'hud-item' }, h('span', { text: 'Billes restantes' }), leftEl)),
      h('div', { class: 'pg-board' }, cells),
      h('div', { class: 'ws-actions' }, undoBtn, resetBtn)));

    function paint() {
      const targets = new Map(sel === null ? [] : jumpsFrom(state.pegs, sel));
      cells.forEach((b, i) => {
        if (!HOLES[i]) return;
        const peg = state.pegs[i];
        b.className = ['pg-hole', peg ? 'on' : '', sel === i ? 'sel' : '', targets.has(i) ? 'target' : ''].filter(Boolean).join(' ');
        b.setAttribute('aria-label', `Ligne ${Math.floor(i / N) + 1}, colonne ${(i % N) + 1}, ${peg ? 'bille' : 'trou'}${sel === i ? ', choisie' : ''}${targets.has(i) ? ', arrivée possible' : ''}`);
      });
      leftEl.textContent = pegCount(state.pegs);
      undoBtn.disabled = over || !state.history.length;
      resetBtn.disabled = over || !state.history.length;
    }

    function tap(i) {
      if (over) return;
      if (state.pegs[i]) { sel = sel === i ? null : i; paint(); return; }
      if (sel === null) return;
      const jump = jumpsFrom(state.pegs, sel).find(([to]) => to === i);
      if (!jump) { ctx.toast('Impossible : saute par-dessus une bille voisine, vers un trou juste derrière.'); return; }
      state.history.push(state.pegs.slice());
      state.pegs[sel] = 0;
      state.pegs[jump[1]] = 0;
      state.pegs[i] = 1;
      state.moves++;
      sel = null;
      paint();
      ctx.save(state);
      if (pegCount(state.pegs) === 1) {
        over = true;
        paint();
        ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 1000)) });
      } else if (!anyMove(state.pegs)) {
        ctx.toast('Plus aucun saut possible : annule ou recommence.');
      }
    }

    function undo() {
      if (over || !state.history.length) return;
      state.pegs = state.history.pop();
      sel = null;
      paint();
      ctx.save(state);
    }
    undoBtn.addEventListener('click', undo);
    resetBtn.addEventListener('click', () => {
      if (over || !state.history.length) return;
      state.pegs = state.start.slice();
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

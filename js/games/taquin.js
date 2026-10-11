import { h } from '../ui.js';

const solved = (tiles) => tiles.every((v, i) => v === (i === tiles.length - 1 ? 0 : i + 1));

// Neighbours du vide : indices des cases adjacentes.
function neighbours(i, n) {
  const r = Math.floor(i / n);
  const c = i % n;
  const out = [];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
}

export default {
  id: 'taquin',
  name: 'Taquin',
  emoji: '🧩',
  color: '#ff5c8a',
  tagline: 'Remets les tuiles dans l’ordre',
  howto: 'Touche une tuile alignée avec la case vide : elle glisse vers elle, avec celles qui la séparent du vide.\nRange les tuiles dans l’ordre, de 1 à la dernière.\nLa case vide termine en bas à droite.',
  score: { label: 'Moins de coups', better: 'low', fmt: (v) => `${v} coup${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile 3×3', desc: '8 tuiles' },
    { id: 'normal', label: 'Classique 4×4', desc: '15 tuiles' },
    { id: 'hard', label: 'Difficile 5×5', desc: '24 tuiles' },
  ],

  create(rng, diff) {
    const n = { easy: 3, normal: 4, hard: 5 }[diff];
    const tiles = Array.from({ length: n * n }, (_, i) => (i === n * n - 1 ? 0 : i + 1));
    // Mélange par déplacements légaux depuis la grille résolue : toujours résoluble.
    let blank = n * n - 1;
    let prev = -1;
    for (let k = 0; k < n * n * 40; k++) {
      const opts = neighbours(blank, n).filter((x) => x !== prev);
      const t = rng.pick(opts);
      tiles[blank] = tiles[t];
      tiles[t] = 0;
      prev = blank;
      blank = t;
    }
    if (solved(tiles)) { tiles[blank] = tiles[blank - 1]; tiles[blank - 1] = 0; }
    return { n, tiles, moves: 0 };
  },

  mount(root, state, ctx) {
    const n = state.n;
    const movesEl = h('strong', { text: '0' });
    const board = h('div', { class: 'tq-board', vars: { '--n': n } });
    const els = new Map();
    for (let v = 1; v < n * n; v++) {
      const hue = Math.round(((v - 1) / (n * n - 1)) * 300);
      const el = h('button', { type: 'button', class: 'tq-tile', vars: { '--hue': hue }, 'aria-label': `Tuile ${v}`, text: String(v) });
      el.addEventListener('click', () => tap(state.tiles.indexOf(v)));
      els.set(v, el);
      board.append(el);
    }
    root.append(h('div', { class: 'tq' }, h('div', { class: 'hud' }, h('div', { class: 'hud-item' }, h('span', { text: 'Coups' }), movesEl)), board));

    let over = false;
    function paint() {
      state.tiles.forEach((v, i) => {
        if (!v) return;
        const el = els.get(v);
        el.style.setProperty('--x', i % n);
        el.style.setProperty('--y', Math.floor(i / n));
      });
      movesEl.textContent = state.moves;
    }
    function tap(i) {
      if (over || i < 0) return;
      const blank = state.tiles.indexOf(0);
      const r = Math.floor(i / n);
      const c = i % n;
      const br = Math.floor(blank / n);
      const bc = blank % n;
      if (r !== br && c !== bc) return;
      // Décale tout le segment entre la tuile touchée et le vide.
      const step = r === br ? (c < bc ? 1 : -1) : (r < br ? n : -n);
      let j = blank;
      while (j !== i) {
        state.tiles[j] = state.tiles[j - step];
        j -= step;
      }
      state.tiles[i] = 0;
      state.moves++;
      paint();
      ctx.save(state);
      ctx.vibrate(6);
      if (solved(state.tiles)) {
        over = true;
        ctx.finish({ won: true, score: state.moves });
      }
    }
    paint();
    return () => {};
  },
};

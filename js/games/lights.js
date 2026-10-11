import { h } from '../ui.js';

function press(cells, n, i) {
  const r = Math.floor(i / n);
  const c = i % n;
  cells[i] = !cells[i];
  if (r > 0) cells[i - n] = !cells[i - n];
  if (r < n - 1) cells[i + n] = !cells[i + n];
  if (c > 0) cells[i - 1] = !cells[i - 1];
  if (c < n - 1) cells[i + 1] = !cells[i + 1];
}

export default {
  id: 'lights',
  name: 'Lumières',
  emoji: '💡',
  color: '#ffcf3f',
  tagline: 'Éteins toutes les ampoules',
  howto: 'Toucher une ampoule change son état et celui de ses 4 voisines (haut, bas, gauche, droite).\nÉteins-les toutes en un minimum de coups.\nChaque grille est garantie résoluble.',
  score: { label: 'Moins de coups', better: 'low', fmt: (v) => `${v} coup${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile 3×3', desc: 'Pour s’échauffer' },
    { id: 'normal', label: 'Classique 5×5', desc: 'Le format d’origine' },
    { id: 'hard', label: 'Difficile 7×7', desc: 'Prévois du temps' },
  ],

  create(rng, diff) {
    const n = { easy: 3, normal: 5, hard: 7 }[diff];
    const cells = Array(n * n).fill(false);
    // On part de la grille éteinte et on applique des appuis au hasard : elle est donc résoluble.
    do {
      cells.fill(false);
      for (let i = 0; i < n * n; i++) if (rng.next() < 0.5) press(cells, n, i);
    } while (!cells.some(Boolean));
    return { n, cells, moves: 0 };
  },

  mount(root, state, ctx) {
    const n = state.n;
    const movesEl = h('strong', { text: '0' });
    const litEl = h('strong', { text: '0' });
    const board = h('div', { class: 'lo-board', vars: { '--n': n } });
    const btns = state.cells.map((_, i) => {
      const b = h('button', { type: 'button', class: 'bulb', 'aria-label': `Ampoule ${Math.floor(i / n) + 1}-${(i % n) + 1}` });
      b.addEventListener('click', () => tap(i));
      board.append(b);
      return b;
    });
    root.append(h('div', { class: 'lo' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Coups' }), movesEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Allumées' }), litEl)),
      board));

    let over = false;
    function paint() {
      state.cells.forEach((on, i) => {
        btns[i].classList.toggle('on', on);
        btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      movesEl.textContent = state.moves;
      litEl.textContent = state.cells.filter(Boolean).length;
    }
    function tap(i) {
      if (over) return;
      press(state.cells, n, i);
      state.moves++;
      paint();
      ctx.save(state);
      ctx.vibrate(6);
      if (!state.cells.some(Boolean)) {
        over = true;
        ctx.finish({ won: true, score: state.moves });
      }
    }
    paint();
    return () => {};
  },
};

import { createRng } from '../rng.js';
import { h } from '../ui.js';

// Table de Schulte : les nombres de 1 à N² sont mélangés dans une grille ; il faut les toucher dans l'ordre,
// le plus vite possible. En Expert, la grille se mélange après chaque bonne réponse.

export default {
  id: 'schulte',
  name: 'Table de Schulte',
  emoji: '🔢',
  color: '#20c997',
  tagline: 'Touche les nombres dans l’ordre',
  howto: 'Touche les nombres dans l’ordre, de 1 jusqu’au dernier, le plus vite possible.\nLe prochain nombre à trouver est indiqué en haut. Une erreur ne coûte rien, à part du temps.\nEn Expert, la grille se mélange à chaque bonne réponse.',
  keys: ['Tab puis Entrée : toucher un nombre'],
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${(v / 10).toFixed(1).replace('.', ',')} s` },
  difficulties: [
    { id: 'easy', label: 'Facile 4×4', desc: '16 nombres' },
    { id: 'normal', label: 'Normal 5×5', desc: '25 nombres' },
    { id: 'hard', label: 'Difficile 6×6', desc: '36 nombres' },
    { id: 'expert', label: 'Expert 5×5', desc: 'La grille se mélange à chaque fois' },
  ],

  create(rng, diff) {
    const n = { easy: 4, normal: 5, hard: 6, expert: 5 }[diff];
    return { n, shuffle: diff === 'expert', grid: rng.shuffle(Array.from({ length: n * n }, (_, i) => i + 1)), next: 1, misses: 0, rng: rng.state };
  },

  mount(root, state, ctx) {
    const { n } = state;
    const rng = createRng(0);
    rng.state = state.rng;
    let over = false;
    const nextEl = h('strong', { text: '' });
    const missEl = h('strong', { text: '' });
    // Les boutons restent en place (le focus clavier aussi) : seuls leurs nombres changent quand la grille se mélange.
    const cells = state.grid.map((_, i) => h('button', { type: 'button', class: 'sc-cell', onclick: () => tap(i) }));
    const board = h('div', { class: 'sc-board', vars: { '--n': n } }, cells);
    root.append(h('div', { class: 'sc' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Cherche' }), nextEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Erreurs' }), missEl)),
      board));

    function paint() {
      cells.forEach((b, i) => {
        const v = state.grid[i];
        b.textContent = v;
        b.classList.toggle('done', v < state.next);
        b.setAttribute('aria-label', `${v}${v < state.next ? ', déjà trouvé' : ''}`);
      });
      nextEl.textContent = over ? '✓' : state.next;
      missEl.textContent = state.misses;
    }

    function tap(i) {
      const v = state.grid[i];
      const el = cells[i];
      if (over || v < state.next) return;
      if (v !== state.next) {
        state.misses++;
        el.classList.remove('miss');
        void el.offsetWidth;
        el.classList.add('miss');
        missEl.textContent = state.misses;
        return;
      }
      state.next++;
      if (state.shuffle) { state.grid = rng.shuffle(state.grid); state.rng = rng.state; }
      if (state.next > n * n) {
        over = true;
        paint();
        ctx.save(state);
        ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 100)) });
        return;
      }
      paint();
      ctx.save(state);
    }

    paint();
    return () => {};
  },
};

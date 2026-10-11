import { h } from '../ui.js';

const EMOJIS = ['🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐨', '🐙', '🦄', '🐢', '🦋', '🐞', '🍎', '🍌', '🍇', '🍓', '🍕', '🍩', '🚀', '⚽', '🎸', '🌵', '🌈', '⭐', '🍄', '🐳', '🦉', '🍒'];

export default {
  id: 'memory',
  name: 'Mémoire',
  emoji: '🃏',
  color: '#3aa0ff',
  tagline: 'Retrouve toutes les paires',
  howto: 'Retourne deux cartes à la fois.\nSi elles sont identiques, elles restent visibles. Sinon elles se retournent : retiens leur place !\nTrouve toutes les paires en un minimum d’essais.',
  score: { label: 'Moins d’essais', better: 'low', fmt: (v) => `${v} essai${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: '6 paires (3×4)' },
    { id: 'normal', label: 'Normal', desc: '8 paires (4×4)' },
    { id: 'hard', label: 'Difficile', desc: '10 paires (4×5)' },
    { id: 'expert', label: 'Expert', desc: '15 paires (5×6)' },
  ],

  create(rng, diff) {
    const [cols, rows] = { easy: [3, 4], normal: [4, 4], hard: [4, 5], expert: [5, 6] }[diff];
    const pairs = (cols * rows) / 2;
    const picked = rng.shuffle(EMOJIS).slice(0, pairs);
    const cards = rng.shuffle([...picked, ...picked]);
    return { cols, rows, cards, matched: Array(cards.length).fill(false), flipped: [], attempts: 0 };
  },

  mount(root, state, ctx) {
    // Deux cartes non assorties laissées face visible lors d'une reprise : on les retourne.
    if (state.flipped.length >= 2) state.flipped = [];
    let locked = false;
    let timer = null;
    let over = false;

    const attemptsEl = h('strong', { text: '0' });
    const pairsEl = h('strong', { text: '' });
    const total = state.cards.length / 2;
    const board = h('div', { class: 'mem-board', vars: { '--cols': state.cols, '--rows': state.rows } });
    const btns = state.cards.map((emoji, i) => {
      const b = h('button', { type: 'button', class: 'mem-card' },
        h('span', { class: 'face front', text: '?' }),
        h('span', { class: 'face back', text: emoji }));
      b.addEventListener('click', () => flip(i));
      board.append(b);
      return b;
    });
    root.append(h('div', { class: 'mem' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Essais' }), attemptsEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Paires' }), pairsEl)),
      board));

    function paint() {
      btns.forEach((b, i) => {
        const up = state.matched[i] || state.flipped.includes(i);
        b.classList.toggle('up', up);
        b.classList.toggle('matched', state.matched[i]);
        b.setAttribute('aria-label', up ? state.cards[i] : 'Carte face cachée');
      });
      attemptsEl.textContent = state.attempts;
      pairsEl.textContent = `${state.matched.filter(Boolean).length / 2}/${total}`;
    }

    function flip(i) {
      if (over || locked || state.matched[i] || state.flipped.includes(i)) return;
      state.flipped.push(i);
      if (state.flipped.length === 2) {
        state.attempts++;
        const [a, b] = state.flipped;
        if (state.cards[a] === state.cards[b]) {
          state.matched[a] = state.matched[b] = true;
          state.flipped = [];
          ctx.vibrate(12);
          if (state.matched.every(Boolean)) {
            over = true;
            paint();
            ctx.save(state);
            ctx.finish({ won: true, score: state.attempts });
            return;
          }
        } else {
          locked = true;
          // Si la partie est quittée pendant ce délai, la reprise retourne ces deux cartes (voir le début de mount).
          timer = setTimeout(() => { state.flipped = []; locked = false; paint(); ctx.save(state); }, 850);
        }
      }
      paint();
      ctx.save(state);
    }
    paint();
    return () => clearTimeout(timer);
  },
};

import { h } from '../ui.js';

// Symboles en plus des couleurs : le jeu reste jouable en cas de daltonisme.
const SYMBOLS = ['●', '▲', '■', '◆', '★', '♥', '✚', '☾'];

export function evaluate(secret, guess) {
  let black = 0;
  const sCount = {};
  const gCount = {};
  secret.forEach((s, i) => {
    if (s === guess[i]) black++;
    else {
      sCount[s] = (sCount[s] || 0) + 1;
      gCount[guess[i]] = (gCount[guess[i]] || 0) + 1;
    }
  });
  let white = 0;
  for (const k of Object.keys(gCount)) white += Math.min(gCount[k], sCount[k] || 0);
  return { black, white };
}

export default {
  id: 'mastermind',
  name: 'Mastermind',
  emoji: '🎯',
  color: '#6a4cff',
  tagline: 'Devine le code secret',
  howto: 'Un code de couleurs est caché (une couleur peut apparaître plusieurs fois). Compose une combinaison puis valide. Pastille noire : bonne couleur au bon endroit. Pastille blanche : bonne couleur au mauvais endroit.',
  score: { label: 'Moins d’essais', better: 'low', fmt: (v) => `${v} essai${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: '4 pions, 5 couleurs, 12 essais' },
    { id: 'normal', label: 'Normal', desc: '4 pions, 6 couleurs, 10 essais' },
    { id: 'hard', label: 'Difficile', desc: '5 pions, 8 couleurs, 10 essais' },
  ],

  create(rng, diff) {
    const [len, colors, tries] = { easy: [4, 5, 12], normal: [4, 6, 10], hard: [5, 8, 10] }[diff];
    return {
      len, colors, tries,
      secret: Array.from({ length: len }, () => rng.int(colors)),
      guesses: [],
      current: Array(len).fill(null),
      over: false,
    };
  },

  mount(root, state, ctx) {
    const board = h('div', { class: 'mm-board' });
    const palette = h('div', { class: 'mm-palette' });
    const okBtn = h('button', { class: 'btn btn-primary', type: 'button', text: 'Valider' });
    const delBtn = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': 'Effacer le dernier pion', text: '⌫' });
    root.append(h('div', { class: 'mm' }, board, h('div', { class: 'mm-controls' }, palette, h('div', { class: 'mm-actions' }, delBtn, okBtn))));

    const peg = (v, extra = '') => h('span', { class: `peg ${v === null ? 'empty' : 'c' + v} ${extra}`, text: v === null ? '' : SYMBOLS[v] });

    function feedback(f) {
      const total = state.len;
      const dots = [];
      for (let i = 0; i < total; i++) dots.push(h('i', { class: i < f.black ? 'b' : i < f.black + f.white ? 'w' : '' }));
      return h('div', { class: 'mm-fb', vars: { '--cols': Math.ceil(total / 2) } }, dots);
    }

    function paint() {
      board.replaceChildren();
      // Ligne du code secret : cachée jusqu'à la fin.
      board.append(h('div', { class: 'mm-row mm-secret' },
        h('div', { class: 'mm-pegs' }, state.secret.map((s) => (state.over ? peg(s) : h('span', { class: 'peg hidden', text: '?' })))),
        h('div', { class: 'mm-fb-spacer' })));
      for (let i = 0; i < state.tries; i++) {
        const g = state.guesses[i];
        if (g) {
          board.append(h('div', { class: 'mm-row done' }, h('div', { class: 'mm-pegs' }, g.g.map((v) => peg(v))), feedback(g)));
        } else if (i === state.guesses.length && !state.over) {
          board.append(h('div', { class: 'mm-row current' },
            h('div', { class: 'mm-pegs' }, state.current.map((v, idx) => {
              const b = h('button', { type: 'button', class: `peg-btn ${v === null ? 'empty' : 'c' + v}`, 'aria-label': `Pion ${idx + 1}`, text: v === null ? '' : SYMBOLS[v] });
              b.addEventListener('click', () => { state.current[idx] = null; update(); });
              return b;
            })),
            h('div', { class: 'mm-fb-spacer' })));
        } else {
          board.append(h('div', { class: 'mm-row' }, h('div', { class: 'mm-pegs' }, Array.from({ length: state.len }, () => peg(null))), h('div', { class: 'mm-fb-spacer' })));
        }
      }
      okBtn.disabled = state.over || state.current.includes(null);
      delBtn.disabled = state.over || state.current.every((v) => v === null);
      const cur = board.querySelector('.current');
      if (cur) cur.scrollIntoView({ block: 'nearest' });
    }

    function update() {
      paint();
      ctx.save(state);
    }

    for (let c = 0; c < state.colors; c++) {
      palette.append(h('button', {
        type: 'button', class: `peg-btn c${c}`, 'aria-label': `Couleur ${c + 1}`, text: SYMBOLS[c],
        onclick: () => {
          if (state.over) return;
          const i = state.current.indexOf(null);
          if (i === -1) return;
          state.current[i] = c;
          update();
        },
      }));
    }

    delBtn.addEventListener('click', () => {
      for (let i = state.len - 1; i >= 0; i--) if (state.current[i] !== null) { state.current[i] = null; break; }
      update();
    });

    okBtn.addEventListener('click', () => {
      if (state.over || state.current.includes(null)) return;
      const g = state.current.slice();
      const f = evaluate(state.secret, g);
      state.guesses.push({ g, ...f });
      state.current = Array(state.len).fill(null);
      const won = f.black === state.len;
      const lost = !won && state.guesses.length >= state.tries;
      if (won || lost) state.over = true;
      update();
      ctx.vibrate(10);
      if (won) ctx.finish({ won: true, score: state.guesses.length });
      else if (lost) ctx.finish({ won: false });
    });

    paint();
    return () => {};
  },
};

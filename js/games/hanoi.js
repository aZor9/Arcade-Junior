import { h } from '../ui.js';

// Tours de Hanoï : déplacer toute la pile de disques d'un piquet à un autre, un disque à la fois,
// sans jamais poser un disque sur un plus petit. Le piquet de départ et celui d'arrivée sont tirés au sort.

export const minMoves = (disks) => 2 ** disks - 1;

export function canMove(pegs, from, to) {
  if (from === to || !pegs[from].length) return false;
  const disk = pegs[from][pegs[from].length - 1];
  const top = pegs[to][pegs[to].length - 1];
  return top === undefined || disk < top;
}

export default {
  id: 'hanoi',
  name: 'Hanoï',
  emoji: '🗼',
  color: '#26c6da',
  tagline: 'Déplace la tour disque par disque',
  howto: 'Déplace tous les disques sur le piquet marqué ⭐.\nTouche un piquet pour lever son disque du dessus, puis touche le piquet de destination.\nUn disque ne peut jamais être posé sur un plus petit.',
  keys: ['1, 2, 3 : choisir un piquet'],
  score: { label: 'Moins de coups', better: 'low', fmt: (v) => `${v} coup${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: '3 disques, 7 coups minimum' },
    { id: 'normal', label: 'Normal', desc: '4 disques, 15 coups minimum' },
    { id: 'hard', label: 'Difficile', desc: '5 disques, 31 coups minimum' },
    { id: 'expert', label: 'Expert', desc: '7 disques, 127 coups minimum' },
  ],

  create(rng, diff) {
    const disks = { easy: 3, normal: 4, hard: 5, expert: 7 }[diff];
    const from = rng.int(3);
    const to = (from + 1 + rng.int(2)) % 3;
    const pegs = [[], [], []];
    for (let d = disks; d >= 1; d--) pegs[from].push(d); // du plus grand (en bas) au plus petit
    return { disks, from, to, pegs, moves: 0 };
  },

  mount(root, state, ctx) {
    const { disks } = state;
    let over = false;
    let sel = null;
    const movesEl = h('strong', { text: '0' });
    const columns = [0, 1, 2].map((i) => {
      const col = h('button', {
        type: 'button', class: `hn-peg${i === state.to ? ' goal' : ''}`,
        'aria-label': `Piquet ${i + 1}${i === state.to ? ', arrivée' : ''}`,
        onclick: () => tap(i),
      });
      col.append(h('span', { class: 'hn-stack' }), h('span', { class: 'hn-label', text: i === state.to ? '⭐' : String(i + 1) }));
      return col;
    });
    root.append(h('div', { class: 'hn' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Coups' }), movesEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'Minimum possible' }), h('strong', { text: String(minMoves(disks)) }))),
      h('div', { class: 'hn-board', vars: { '--disks': disks } }, columns)));

    function paint() {
      columns.forEach((col, i) => {
        const stack = col.querySelector('.hn-stack');
        stack.replaceChildren(...state.pegs[i].map((d, k) => {
          const top = k === state.pegs[i].length - 1;
          return h('span', { class: `hn-disk${top && sel === i ? ' lift' : ''}`, vars: { '--p': 24 + (76 * d) / disks, '--hue': Math.round((d / disks) * 280) } });
        }));
        col.classList.toggle('sel', sel === i);
      });
      movesEl.textContent = state.moves;
    }

    function tap(i) {
      if (over) return;
      if (sel === null) {
        if (state.pegs[i].length) { sel = i; paint(); }
        return;
      }
      if (sel === i) { sel = null; paint(); return; }
      if (!canMove(state.pegs, sel, i)) {
        ctx.toast('Un disque ne peut pas être posé sur un plus petit.');
        sel = null;
        paint();
        return;
      }
      state.pegs[i].push(state.pegs[sel].pop());
      sel = null;
      state.moves++;
      paint();
      ctx.save(state);
      if (state.pegs[state.to].length === disks) {
        over = true;
        ctx.finish({ won: true, score: state.moves });
      }
    }

    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '1' || e.key === '2' || e.key === '3') tap(Number(e.key) - 1);
    };
    document.addEventListener('keydown', onKey);
    paint();
    return () => document.removeEventListener('keydown', onKey);
  },
};

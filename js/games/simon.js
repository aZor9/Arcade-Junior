import { createRng } from '../rng.js';
import { h } from '../ui.js';

// Simon : les touches s'allument dans un ordre ; on le refait. À chaque manche, la suite s'allonge d'une
// touche. Une erreur termine la partie. Chaque touche a une couleur, un chiffre et une forme (daltonisme).

const PADS = [
  { color: '#2ecc71', label: '1', shape: '▲' },
  { color: '#e74c3c', label: '2', shape: '●' },
  { color: '#f1c40f', label: '3', shape: '■' },
  { color: '#3498db', label: '4', shape: '◆' },
  { color: '#9b59b6', label: '5', shape: '★' },
  { color: '#e67e22', label: '6', shape: '✚' },
];

// Vérifie un appui : 'wrong', 'next' (bonne touche, la suite continue) ou 'round' (suite complète).
export function press(state, k) {
  if (state.seq[state.pos] !== k) return 'wrong';
  state.pos++;
  if (state.pos < state.seq.length) return 'next';
  state.score = state.seq.length;
  return 'round';
}

export function extend(state, rng) {
  state.seq.push(rng.int(state.pads));
  state.pos = 0;
}

export default {
  id: 'simon',
  name: 'Simon',
  emoji: '🔆',
  color: '#ffd43b',
  endless: true,
  tagline: 'Retiens la suite',
  howto: "Regarde les touches s'allumer, puis touche-les dans le même ordre.\nÀ chaque manche réussie, la suite s'allonge d'une touche.\nUne erreur, et la partie s'arrête.",
  keys: ['1 à 6 : appuyer sur une touche'],
  score: { label: 'Plus longue suite', better: 'high', always: true, fmt: (v) => `${v} touche${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: '4 touches, lent' },
    { id: 'normal', label: 'Normal', desc: '4 touches' },
    { id: 'hard', label: 'Difficile', desc: '6 touches, rapide' },
  ],

  create(rng, diff) {
    const { pads, ms } = { easy: { pads: 4, ms: 650 }, normal: { pads: 4, ms: 480 }, hard: { pads: 6, ms: 360 } }[diff];
    const state = { pads, ms, seq: [], pos: 0, score: 0, rng: 0 };
    extend(state, rng);
    state.rng = rng.state;
    return state;
  },

  mount(root, state, ctx) {
    const rng = createRng(0);
    rng.state = state.rng;
    let showing = false;
    let over = false;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const roundEl = h('strong', { text: '' });
    const statusEl = h('strong', { text: '' });
    const pads = PADS.slice(0, state.pads).map((p, k) => h('button', {
      type: 'button', class: 'si-pad', vars: { '--k': p.color }, 'aria-label': `Touche ${p.label}`, onclick: () => tap(k),
    }, h('span', { 'aria-hidden': 'true', text: p.shape }), h('small', { 'aria-hidden': 'true', text: p.label })));
    const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
    root.append(h('div', { class: 'si' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Manche' }), roundEl),
        h('div', { class: 'hud-item' }, h('span', { text: 'État' }), statusEl)),
      h('div', { class: `si-board n${state.pads}` }, pads), live));

    const hud = () => {
      roundEl.textContent = state.seq.length;
      statusEl.textContent = over ? 'Fini' : showing ? 'Regarde…' : 'À toi !';
      pads.forEach((b) => { b.disabled = showing || over; });
    };
    const flash = (k, ms) => { pads[k].classList.add('lit'); later(() => pads[k].classList.remove('lit'), ms); };

    function show() {
      showing = true;
      hud();
      live.textContent = `Manche ${state.seq.length} : ${state.seq.map((k) => PADS[k].label).join(', ')}`;
      state.seq.forEach((k, j) => later(() => flash(k, state.ms * 0.7), 600 + j * state.ms));
      later(() => { showing = false; hud(); }, 600 + state.seq.length * state.ms);
    }

    function tap(k) {
      if (showing || over) return;
      flash(k, 180);
      const res = press(state, k);
      if (res === 'wrong') {
        over = true;
        pads[state.seq[state.pos]].classList.add('hint');
        hud();
        ctx.save(state);
        ctx.finish({ won: true, score: state.score });
      } else if (res === 'round') {
        extend(state, rng);
        state.rng = rng.state;
        ctx.save(state);
        later(show, 350);
      }
    }

    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = Number(e.key) - 1;
      if (k >= 0 && k < state.pads) tap(k);
    };
    document.addEventListener('keydown', onKey);
    // À la reprise d'une partie, on rejoue la suite depuis le début de la manche.
    state.pos = 0;
    show();
    return () => { timers.forEach(clearTimeout); document.removeEventListener('keydown', onKey); };
  },
};

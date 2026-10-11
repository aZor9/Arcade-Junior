import { h } from '../ui.js';

export default {
  id: 'nombre',
  name: 'Nombre mystère',
  emoji: '🔮',
  color: '#19c29a',
  tagline: 'Plus grand ou plus petit ?',
  howto: 'Un nombre est caché dans l’intervalle indiqué.\nPropose un nombre : on te dit s’il faut viser plus grand ou plus petit.\nTrouve-le avant d’avoir épuisé tes essais.\nAstuce : coupe l’intervalle en deux à chaque fois.',
  score: { label: 'Moins d’essais', better: 'low', fmt: (v) => `${v} essai${v > 1 ? 's' : ''}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: 'De 1 à 50, 8 essais' },
    { id: 'normal', label: 'Normal', desc: 'De 1 à 100, 7 essais' },
    { id: 'hard', label: 'Difficile', desc: 'De 1 à 1000, 10 essais' },
  ],

  create(rng, diff) {
    const [max, tries] = { easy: [50, 8], normal: [100, 7], hard: [1000, 10] }[diff];
    return { min: 1, max, tries, secret: 1 + rng.int(max), guesses: [], input: '', over: false };
  },

  mount(root, state, ctx) {
    const range = h('div', { class: 'nb-range' });
    const display = h('div', { class: 'nb-display', 'aria-live': 'polite' });
    const dots = h('div', { class: 'nb-tries' });
    const history = h('ul', { class: 'nb-history' });
    const pad = h('div', { class: 'nb-pad' });
    root.append(h('div', { class: 'nb' }, range, dots, display, history, pad));

    function bounds() {
      let lo = state.min;
      let hi = state.max;
      for (const g of state.guesses) {
        if (g.r === '>' ) lo = Math.max(lo, g.n + 1);
        if (g.r === '<') hi = Math.min(hi, g.n - 1);
      }
      return [lo, hi];
    }

    function paint() {
      const [lo, hi] = bounds();
      range.replaceChildren(h('span', { text: 'Le nombre est entre' }), h('strong', { text: `${lo} et ${hi}` }));
      dots.replaceChildren(...Array.from({ length: state.tries }, (_, i) => h('i', { class: i < state.guesses.length ? 'used' : '' })));
      display.textContent = state.over ? String(state.secret) : (state.input || '?');
      display.classList.toggle('empty', !state.input && !state.over);
      history.replaceChildren(...state.guesses.slice().reverse().map((g) => h('li', { class: g.r === '=' ? 'hit' : '' },
        h('strong', { text: String(g.n) }),
        h('span', { text: g.r === '=' ? 'Trouvé !' : g.r === '>' ? '↑ Plus grand' : '↓ Plus petit' }))));
    }

    function submit() {
      if (state.over || !state.input) return;
      const n = Number(state.input);
      if (n < state.min || n > state.max) { ctx.toast(`Choisis un nombre entre ${state.min} et ${state.max}.`); state.input = ''; paint(); return; }
      const r = n === state.secret ? '=' : n < state.secret ? '>' : '<';
      state.guesses.push({ n, r });
      state.input = '';
      const won = r === '=';
      const lost = !won && state.guesses.length >= state.tries;
      if (won || lost) state.over = true;
      paint();
      ctx.save(state);
      ctx.vibrate(10);
      if (won) ctx.finish({ won: true, score: state.guesses.length });
      else if (lost) ctx.finish({ won: false });
    }

    const press = (k) => {
      if (state.over) return;
      if (k === 'del') state.input = state.input.slice(0, -1);
      else if (k === 'ok') return submit();
      else if (state.input.length < String(state.max).length) state.input = (state.input + k).replace(/^0+/, '');
      paint();
      ctx.save(state);
    };

    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].forEach((k) => {
      pad.append(h('button', {
        type: 'button', class: `key ${k === 'ok' ? 'key-ok' : ''}`, onclick: () => press(k),
        'aria-label': k === 'del' ? 'Effacer' : k === 'ok' ? 'Valider' : k,
        text: k === 'del' ? '⌫' : k === 'ok' ? 'OK' : k,
      }));
    });

    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter') press('ok');
    };
    document.addEventListener('keydown', onKey);
    paint();
    return () => document.removeEventListener('keydown', onKey);
  },
};

import { h } from '../ui.js';

// Le compte est bon : à partir de quelques nombres, former exactement le nombre cible en combinant
// deux nombres à la fois avec + − × ÷ (résultat entier et positif). Chaque nombre ne sert qu'une fois.
// La cible est toujours atteignable : on la déduit d'une vraie suite d'opérations tirée au hasard.

const BIG = [25, 50, 75, 100];
const OPS = ['+', '−', '×', '÷'];

// Résultat de « a op b », ou null si l'opération n'est pas permise (négatif, nul, non entier).
export function applyOp(a, b, op) {
  if (op === '+') return a + b;
  if (op === '×') return a * b;
  if (op === '−') return a > b ? a - b : null;
  if (op === '÷') return b > 0 && a % b === 0 ? a / b : null;
  return null;
}

export function pickNumbers(rng, count, bigCount) {
  const small = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  return [...rng.shuffle(BIG).slice(0, bigCount), ...small.slice(0, count - bigCount)];
}

// Joue des opérations au hasard et retient un résultat intermédiaire dans [lo, hi] obtenu en au moins `minSteps` opérations.
export function findTarget(rng, numbers, lo, hi, minSteps) {
  for (let attempt = 0; attempt < 800; attempt++) {
    let items = numbers.slice();
    const found = [];
    let steps = 0;
    while (items.length > 1) {
      const i = rng.int(items.length);
      let j = rng.int(items.length - 1);
      if (j >= i) j++;
      const [a, b] = items[i] >= items[j] ? [items[i], items[j]] : [items[j], items[i]];
      const ops = rng.shuffle(OPS).filter((op) => applyOp(a, b, op) !== null);
      if (!ops.length) break;
      const res = applyOp(a, b, ops[0]);
      items = items.filter((_, k) => k !== i && k !== j);
      items.push(res);
      steps++;
      if (res >= lo && res <= hi && steps >= minSteps && !numbers.includes(res)) found.push(res);
    }
    if (found.length) return found[found.length - 1];
  }
  return null;
}

export default {
  id: 'compte',
  name: 'Le compte est bon',
  emoji: '🧮',
  color: '#ffd166',
  tagline: 'Atteins la cible exacte',
  howto: 'Forme exactement le nombre cible.\nTouche un nombre, une opération, puis un deuxième nombre : ils sont remplacés par le résultat.\nLe résultat doit rester entier et positif.\nChaque nombre ne sert qu’une fois. Tu peux annuler ou recommencer.',
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: '4 nombres, cible jusqu’à 150' },
    { id: 'normal', label: 'Normal', desc: '5 nombres, cible jusqu’à 500' },
    { id: 'hard', label: 'Difficile', desc: '6 nombres, cible jusqu’à 999' },
    { id: 'expert', label: 'Expert', desc: '6 nombres, grosses cibles' },
  ],

  create(rng, diff) {
    const cfg = { easy: [4, 1, 20, 150, 2], normal: [5, 1, 50, 500, 3], hard: [6, 2, 100, 999, 4], expert: [6, 3, 400, 999, 4] }[diff];
    const [count, big, lo, hi, minSteps] = cfg;
    let numbers;
    let target = null;
    for (let tries = 0; tries < 50 && target === null; tries++) {
      numbers = pickNumbers(rng, count, big);
      target = findTarget(rng, numbers, lo, hi, minSteps);
    }
    if (target === null) target = numbers.reduce((a, b) => a + b, 0);
    return {
      numbers,
      target,
      tiles: numbers.map((v, i) => ({ id: i, v })),
      nextId: numbers.length,
      history: [],
    };
  },

  mount(root, state, ctx) {
    let over = false;
    let selA = null;
    let selOp = null;

    const targetEl = h('div', { class: 'cb-target', 'aria-live': 'polite' });
    const tilesEl = h('div', { class: 'cb-tiles' });
    const opsEl = h('div', { class: 'cb-ops' });
    const logEl = h('ul', { class: 'cb-log' });
    const undoBtn = h('button', { type: 'button', class: 'btn btn-ghost', text: '↶ Annuler' });
    const resetBtn = h('button', { type: 'button', class: 'btn btn-ghost', text: '↻ Recommencer' });
    const opBtns = OPS.map((op) => {
      const b = h('button', { type: 'button', class: 'key cb-op', 'aria-label': `Opération ${op}`, text: op });
      b.addEventListener('click', () => { if (!over && selA !== null) { selOp = selOp === op ? null : op; paint(); } });
      opsEl.append(b);
      return b;
    });
    root.append(h('div', { class: 'cb' }, targetEl, tilesEl, opsEl, h('div', { class: 'cb-actions' }, undoBtn, resetBtn), logEl));

    function paint() {
      targetEl.replaceChildren(h('span', { text: 'Cible' }), h('strong', { text: String(state.target) }));
      tilesEl.replaceChildren(...state.tiles.map((t) => {
        const b = h('button', {
          type: 'button',
          class: `cb-tile${selA === t.id ? ' sel' : ''}${t.v === state.target ? ' hit' : ''}`,
          'aria-pressed': String(selA === t.id), text: String(t.v),
        });
        b.addEventListener('click', () => tap(t.id));
        return b;
      }));
      opBtns.forEach((b, i) => {
        b.classList.toggle('on', selOp === OPS[i]);
        b.disabled = selA === null || over;
      });
      undoBtn.disabled = over || !state.history.length;
      resetBtn.disabled = over || !state.history.length;
      logEl.replaceChildren(...state.history.map((e) => h('li', { text: e.line })));
    }

    function tap(id) {
      if (over) return;
      if (selA === null || selOp === null) {
        selA = selA === id ? null : id;   // choisir (ou changer) le premier nombre
        if (selA === null) selOp = null;
        paint();
        return;
      }
      if (id === selA) { selA = null; selOp = null; paint(); return; }
      const a = state.tiles.find((t) => t.id === selA);
      const b = state.tiles.find((t) => t.id === id);
      const res = applyOp(a.v, b.v, selOp);
      if (res === null) {
        ctx.toast('Impossible : le résultat doit être un entier positif.');
        return;
      }
      state.history.push({ tiles: state.tiles.map((t) => ({ ...t })), line: `${a.v} ${selOp} ${b.v} = ${res}` });
      const at = state.tiles.findIndex((t) => t.id === a.id);
      state.tiles = state.tiles.filter((t) => t.id !== a.id && t.id !== b.id);
      state.tiles.splice(Math.min(at, state.tiles.length), 0, { id: state.nextId++, v: res });
      selA = null;
      selOp = null;
      paint();
      ctx.save(state);
      if (res === state.target) {
        over = true;
        paint();
        ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 1000)) });
      }
    }

    undoBtn.addEventListener('click', () => {
      if (over || !state.history.length) return;
      state.tiles = state.history.pop().tiles;
      selA = null;
      selOp = null;
      paint();
      ctx.save(state);
    });
    resetBtn.addEventListener('click', () => {
      if (over || !state.history.length) return;
      state.tiles = state.history[0].tiles;
      state.history = [];
      selA = null;
      selOp = null;
      paint();
      ctx.save(state);
    });

    paint();
    return () => {};
  },
};

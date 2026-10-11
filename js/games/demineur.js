import { createRng } from '../rng.js';
import { h } from '../ui.js';

function around(i, rows, cols) {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
    }
  }
  return out;
}

export default {
  id: 'demineur',
  name: 'Démineur',
  emoji: '💣',
  color: '#8a8fa8',
  tagline: 'Évite toutes les mines',
  howto: 'Touche une case pour la révéler.\nUn chiffre indique le nombre de mines dans les 8 cases voisines.\nAppui long (ou bouton Drapeau) pour poser un drapeau sur une case suspecte.\nToucher un chiffre déjà entouré du bon nombre de drapeaux révèle ses voisines.\nLe premier coup est toujours sans danger.',
  score: { label: 'Meilleur temps', better: 'low', fmt: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  difficulties: [
    { id: 'easy', label: 'Facile', desc: '8×8, 8 mines' },
    { id: 'normal', label: 'Normal', desc: '9×12, 20 mines' },
    { id: 'hard', label: 'Difficile', desc: '10×16, 36 mines' },
  ],

  create(rng, diff) {
    const [cols, rows, mines] = { easy: [8, 8, 8], normal: [9, 12, 20], hard: [10, 16, 36] }[diff];
    // Les mines sont placées au premier coup, pour qu'il soit toujours sûr.
    return { cols, rows, mineCount: mines, mines: null, open: Array(cols * rows).fill(false), flags: Array(cols * rows).fill(false), rng: rng.state };
  },

  mount(root, state, ctx) {
    const { cols, rows } = state;
    const total = cols * rows;
    let over = false;
    let flagMode = false;
    let exploded = -1;

    const countAround = (i) => around(i, rows, cols).filter((j) => state.mines[j]).length;

    const flagsEl = h('strong', { text: '' });
    const modeBtn = h('button', { type: 'button', class: 'btn btn-ghost mode-btn', 'aria-pressed': 'false' });
    const board = h('div', { class: 'ms-board', vars: { '--cols': cols } });
    const cells = Array.from({ length: total }, (_, i) => {
      const b = h('button', { type: 'button', class: 'ms-cell', 'data-i': String(i) });
      board.append(b);
      return b;
    });
    root.append(h('div', { class: 'ms' },
      h('div', { class: 'hud' },
        h('div', { class: 'hud-item' }, h('span', { text: 'Mines' }), flagsEl),
        modeBtn),
      board));

    function paint() {
      cells.forEach((b, i) => {
        const open = state.open[i];
        const mine = state.mines && state.mines[i];
        let txt = '';
        const cls = ['ms-cell'];
        if (open && !mine) {
          const n = countAround(i);
          cls.push('open');
          if (n) { txt = String(n); cls.push('n' + n); }
        } else if (over && mine) {
          cls.push(i === exploded ? 'boom' : 'mine');
          txt = state.flags[i] ? '🚩' : '💣';
        } else if (state.flags[i]) {
          cls.push('flag');
          txt = '🚩';
        }
        b.className = cls.join(' ');
        b.textContent = txt;
      });
      flagsEl.textContent = state.mineCount - state.flags.filter(Boolean).length;
      modeBtn.textContent = flagMode ? '🚩 Drapeau' : '⛏️ Creuser';
      modeBtn.setAttribute('aria-pressed', String(flagMode));
    }

    function placeMines(safe) {
      const rng = createRng(0);
      rng.state = state.rng;
      const banned = new Set([safe, ...around(safe, rows, cols)]);
      const pool = rng.shuffle(Array.from({ length: total }, (_, i) => i).filter((i) => !banned.has(i)));
      state.mines = Array(total).fill(false);
      pool.slice(0, state.mineCount).forEach((i) => { state.mines[i] = true; });
      state.rng = rng.state;
    }

    function reveal(start) {
      const stack = [start];
      while (stack.length) {
        const i = stack.pop();
        if (state.open[i] || state.flags[i]) continue;
        state.open[i] = true;
        if (!state.mines[i] && countAround(i) === 0) stack.push(...around(i, rows, cols));
      }
    }

    function check() {
      let safeLeft = 0;
      for (let i = 0; i < total; i++) if (!state.mines[i] && !state.open[i]) safeLeft++;
      return safeLeft === 0;
    }

    function dig(i) {
      if (over) return;
      if (!state.mines) placeMines(i);
      if (state.flags[i]) return;
      if (state.open[i]) {
        // « Accord » : un chiffre entouré d'assez de drapeaux révèle le reste de ses voisines.
        const nb = around(i, rows, cols);
        if (nb.filter((j) => state.flags[j]).length !== countAround(i)) return;
        nb.forEach((j) => { if (!state.flags[j] && !state.open[j]) reveal(j); });
      } else {
        reveal(i);
      }
      const hit = state.mines.findIndex((m, j) => m && state.open[j]);
      if (hit !== -1) {
        over = true;
        exploded = hit;
        paint();
        ctx.vibrate([40, 40, 80]);
        ctx.finish({ won: false });
        return;
      }
      paint();
      ctx.save(state);
      if (check()) {
        over = true;
        ctx.finish({ won: true, score: Math.max(1, Math.round(ctx.elapsed() / 1000)) });
      }
    }

    function toggleFlag(i) {
      if (over || state.open[i]) return;
      state.flags[i] = !state.flags[i];
      paint();
      ctx.save(state);
      ctx.vibrate(12);
    }

    // Appui long = drapeau ; le « click » qui suit un appui long est ignoré.
    let pressTimer = null;
    let longFired = false;
    board.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.ms-cell');
      if (!b) return;
      longFired = false;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => { longFired = true; toggleFlag(Number(b.dataset.i)); }, 450);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => board.addEventListener(ev, () => clearTimeout(pressTimer)));
    board.addEventListener('click', (e) => {
      const b = e.target.closest('.ms-cell');
      if (!b) return;
      if (longFired) { longFired = false; return; }
      const i = Number(b.dataset.i);
      if (flagMode) toggleFlag(i); else dig(i);
    });
    board.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const b = e.target.closest('.ms-cell');
      if (b && !longFired) toggleFlag(Number(b.dataset.i));
    });
    modeBtn.addEventListener('click', () => { flagMode = !flagMode; paint(); });

    paint();
    return () => clearTimeout(pressTimer);
  },
};

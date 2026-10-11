import * as store from './storage.js';
import { h, toast, dialog, confirmDialog, formatDuration, howtoList } from './ui.js';
import { GAMES, getGame } from './games/index.js';
import { createRng, newSeed, newId } from './rng.js';

const root = document.getElementById('app');
let teardown = null;

/* ---------- Réglages (thème, vibrations) ---------- */

function applyTheme() {
  const { theme } = store.getSettings();
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
function ago(ts) {
  const s = Math.round((ts - Date.now()) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return 'à l’instant';
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
}

const gameStyle = (g) => ({ '--c': g.color });
const diffLabel = (g, id) => (g.difficulties.find((d) => d.id === id) || { label: id }).label;

/* ---------- Nouvelle partie ---------- */

async function startGame(gameId, diffId) {
  const game = getGame(gameId);
  const u = store.usage();
  if (u.sessions >= store.MAX_SESSIONS) {
    await dialog({
      title: 'Trop de parties en cours',
      body: h('p', { text: `Tu as déjà ${store.MAX_SESSIONS} parties en cours, c’est la limite. Termine-en une ou supprime-en une depuis l’accueil pour en lancer une nouvelle.` }),
    });
    return;
  }
  if (u.ratio > 0.9) {
    await dialog({
      title: 'Stockage presque plein',
      body: h('p', { text: 'L’espace de stockage du navigateur est presque saturé. Supprime des parties en cours ou vide les données du site depuis ton profil.' }),
    });
    return;
  }
  const seed = newSeed();
  const rng = createRng(seed);
  const now = Date.now();
  const session = { id: newId(), game: game.id, diff: diffId, seed, createdAt: now, updatedAt: now, elapsed: 0, state: game.create(rng, diffId) };
  const res = store.saveSession(session);
  if (!res.ok) {
    toast(res.quota ? 'Stockage plein : impossible de créer la partie.' : 'Impossible d’enregistrer la partie.');
    return;
  }
  location.hash = `#/jeu/${game.id}/${session.id}`;
}

async function chooseDifficulty(game) {
  const choice = await dialog({
    title: `${game.emoji} ${game.name}`,
    actions: [{ label: 'Fermer', value: null, kind: 'ghost' }],
    body: (close) => h('div', null,
      howtoList(game.howto),
      h('div', { class: 'choices' },
        game.difficulties.map((d) => h('button', { type: 'button', class: 'choice', vars: gameStyle(game), onclick: () => close(d.id) },
          h('strong', { text: d.label }), h('span', { text: d.desc }))),
        h('button', { type: 'button', class: 'choice choice-random', vars: gameStyle(game), onclick: () => close(h2random(game)) },
          h('strong', { text: '🎲 Au hasard' }), h('span', { text: 'Niveau tiré au sort' })))),
  });
  if (choice) startGame(game.id, choice);
}
const h2random = (game) => game.difficulties[Math.floor(Math.random() * game.difficulties.length)].id;

function surprise() {
  const game = GAMES[Math.floor(Math.random() * GAMES.length)];
  startGame(game.id, h2random(game));
}

/* ---------- Vue : accueil ---------- */

function hubView() {
  const sessions = store.listSessions().filter((s) => getGame(s.game));
  const profile = store.getProfile();
  const u = store.usage();

  const els = [
    h('section', { class: 'hero' },
      h('h1', { text: `Salut ${profile.name} !` }),
      h('p', { text: 'Huit mini-jeux de réflexion, sans compte, qui marchent aussi hors ligne.' }),
      h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: surprise, text: '🎲 Surprends-moi' })),
  ];

  if (!store.isPersistent()) {
    els.push(h('p', { class: 'notice', text: 'Le stockage de ton navigateur est bloqué (navigation privée ?). Tes parties seront perdues en fermant la page.' }));
  } else if (u.ratio > 0.8) {
    els.push(h('p', { class: 'notice', text: 'Le stockage du navigateur est presque plein. Supprime des parties en cours depuis ton profil ou cette page.' }));
  }

  if (sessions.length) {
    els.push(h('section', null,
      h('div', { class: 'section-head' },
        h('h2', { text: 'Parties en cours' }),
        h('span', { class: 'muted', text: `${sessions.length}/${store.MAX_SESSIONS}` })),
      h('ul', { class: 'sessions' }, sessions.map((s) => {
        const g = getGame(s.game);
        return h('li', { class: 'session', vars: gameStyle(g) },
          h('a', { class: 'session-main', href: `#/jeu/${g.id}/${s.id}` },
            h('span', { class: 'session-emoji', 'aria-hidden': 'true', text: g.emoji }),
            h('span', { class: 'session-text' },
              h('strong', { text: g.name }),
              h('span', { text: `${diffLabel(g, s.diff)} · ${ago(s.updatedAt)}` })),
            h('span', { class: 'session-go', text: 'Reprendre' })),
          h('button', {
            class: 'icon-btn', type: 'button', 'aria-label': `Supprimer la partie de ${g.name}`, text: '🗑',
            onclick: async () => {
              if (await confirmDialog('Supprimer cette partie ?', 'Elle sera perdue et ne comptera pas dans tes statistiques.', 'Supprimer', true)) {
                store.deleteSession(s.id);
                route();
              }
            },
          }));
      }))));
  }

  els.push(h('section', null,
    h('div', { class: 'section-head' }, h('h2', { text: 'Tous les jeux' })),
    h('div', { class: 'games' }, GAMES.map((g) => {
      const running = sessions.filter((s) => s.game === g.id).length;
      return h('button', { class: 'game-card', type: 'button', vars: gameStyle(g), onclick: () => chooseDifficulty(g) },
        h('span', { class: 'game-emoji', 'aria-hidden': 'true', text: g.emoji }),
        h('strong', { text: g.name }),
        h('span', { class: 'game-tag', text: g.tagline }),
        running ? h('span', { class: 'game-badge', text: `${running} en cours` }) : null);
    }))));

  root.replaceChildren(...els);
}

/* ---------- Vue : partie ---------- */

function playView(gameId, sid) {
  const game = getGame(gameId);
  const session = store.getSession(sid);
  if (!game || !session || session.game !== game.id) {
    toast('Partie introuvable : elle a peut-être été terminée ou supprimée.');
    location.replace('#/');
    return;
  }
  document.body.classList.add('playing');
  document.title = `${game.name} – Arcade Junior`;

  let base = session.elapsed || 0;
  let t0 = performance.now();
  let running = true;
  let finished = false;
  let resultTimer = null;
  const elapsed = () => base + (running ? performance.now() - t0 : 0);

  const timerEl = h('span', { class: 'timer', 'aria-label': 'Temps écoulé', text: formatDuration(elapsed()) });
  const tick = setInterval(() => { timerEl.textContent = formatDuration(elapsed()); }, 1000);

  function persist() {
    if (finished) return;
    session.elapsed = elapsed();
    session.updatedAt = Date.now();
    const r = store.saveSession(session);
    if (!r.ok) toast(r.quota ? 'Stockage plein : la partie n’est plus sauvegardée !' : 'Sauvegarde impossible.');
  }
  const onVisibility = () => {
    if (document.hidden) {
      if (running) { base = elapsed(); running = false; persist(); }
    } else if (!running && !finished) {
      t0 = performance.now();
      running = true;
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  const ctx = {
    save(state) { session.state = state; persist(); },
    elapsed,
    toast,
    vibrate(p) { if (store.getSettings().vibrate && navigator.vibrate) navigator.vibrate(p); },
    finish({ won, score }) {
      if (finished) return;
      base = elapsed();
      running = false;
      finished = true;
      const ms = base;
      store.deleteSession(sid);
      const { isBest } = store.recordResult(game.id, session.diff, { won, score, ms }, game.score.better);
      const fmt = game.score.fmt || String;
      resultTimer = setTimeout(async () => {
        const lines = [h('p', { class: 'result-line', text: won ? 'Bien joué, tu as réussi !' : 'Raté cette fois… une autre partie ?' })];
        if (Number.isFinite(score)) lines.push(h('p', { class: 'result-score', text: fmt(score) }));
        if (isBest) lines.push(h('p', { class: 'result-best', text: '🏆 Nouveau record pour ce niveau !' }));
        lines.push(h('p', { class: 'muted', text: `Temps : ${formatDuration(ms)}` }));
        const choice = await dialog({
          title: won ? '🎉 Victoire !' : 'Partie terminée',
          body: h('div', null, lines),
          actions: [{ label: 'Accueil', value: 'home', kind: 'ghost' }, { label: 'Rejouer', value: 'again', kind: 'primary' }],
        });
        if (choice === 'again') startGame(game.id, session.diff);
        else if (choice === 'home') location.hash = '#/';
      }, 750);
    },
  };

  const stage = h('div', { class: 'stage', vars: gameStyle(game) });
  root.replaceChildren(
    h('div', { class: 'topbar', vars: gameStyle(game) },
      h('a', { class: 'icon-btn', href: '#/', 'aria-label': 'Retour à l’accueil', text: '←' }),
      h('div', { class: 'topbar-title' }, h('strong', { text: game.name }), h('span', { text: diffLabel(game, session.diff) })),
      timerEl,
      h('button', {
        class: 'icon-btn', type: 'button', 'aria-label': 'Menu de la partie', text: '⋯',
        onclick: async () => {
          const act = await dialog({
            title: game.name,
            actions: [{ label: 'Fermer', value: null }],
            body: (close) => h('div', null,
              howtoList(game.howto),
              h('div', { class: 'choices' },
                h('button', { type: 'button', class: 'choice', onclick: () => close('new') }, h('strong', { text: '↻ Nouvelle partie' }), h('span', { text: 'Même niveau, nouvelle grille. Celle-ci reste en cours.' })),
                finished ? null : h('button', { type: 'button', class: 'choice choice-danger', onclick: () => close('abandon') }, h('strong', { text: '🗑 Abandonner' }), h('span', { text: 'Supprime la partie sans toucher aux statistiques.' })))),
          });
          if (act === 'new') startGame(game.id, session.diff);
          else if (act === 'abandon') {
            store.deleteSession(sid);
            finished = true;
            location.hash = '#/';
          }
        },
      })),
    stage);

  const destroy = game.mount(stage, session.state, ctx);

  teardown = () => {
    persist();
    clearInterval(tick);
    clearTimeout(resultTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    if (typeof destroy === 'function') destroy();
    document.body.classList.remove('playing');
  };
}

/* ---------- Vue : profil ---------- */

const AVATARS = ['🦊', '🐼', '🐸', '🦄', '🐙', '🐯', '🐵', '🦉', '🐳', '🚀', '👾', '🎮'];

function badges(profile) {
  const all = Object.values(profile.stats);
  const played = all.reduce((a, s) => a + s.played, 0);
  const won = all.reduce((a, s) => a + s.won, 0);
  return [
    { emoji: '🌱', name: 'Première partie', on: played >= 1 },
    { emoji: '🏁', name: 'Première victoire', on: won >= 1 },
    { emoji: '🔟', name: '10 victoires', on: won >= 10 },
    { emoji: '💯', name: '50 parties', on: played >= 50 },
    { emoji: '🧭', name: 'Touche-à-tout (tous les jeux essayés)', on: GAMES.every((g) => profile.stats[g.id]?.played > 0) },
    { emoji: '🔥', name: 'Série de 5 victoires', on: all.some((s) => s.bestStreak >= 5) },
  ];
}

function profileView() {
  const profile = store.getProfile();
  const settings = store.getSettings();
  const u = store.usage();
  const all = Object.values(profile.stats);
  const played = all.reduce((a, s) => a + s.played, 0);
  const won = all.reduce((a, s) => a + s.won, 0);
  const ms = all.reduce((a, s) => a + s.ms, 0);
  const kb = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} Ko` : `${(b / 1024 / 1024).toFixed(1)} Mo`);
  const pct = Math.min(100, Math.round(u.ratio * 100));

  const editProfile = async () => {
    const input = h('input', { type: 'text', maxlength: '20', value: profile.name, class: 'input', 'aria-label': 'Pseudo' });
    let avatar = profile.avatar;
    const avatarBtns = AVATARS.map((a) => h('button', {
      type: 'button', class: `avatar-opt ${a === avatar ? 'on' : ''}`, text: a, 'aria-label': `Avatar ${a}`,
      onclick: (e) => { avatar = a; avatarBtns.forEach((b) => b.classList.toggle('on', b === e.currentTarget)); },
    }));
    const r = await dialog({
      title: 'Mon profil',
      body: h('div', null, h('label', { class: 'field' }, h('span', { text: 'Pseudo' }), input), h('div', { class: 'avatars' }, avatarBtns)),
      actions: [{ label: 'Annuler', value: false }, { label: 'Enregistrer', value: true, kind: 'primary' }],
    });
    if (r) {
      profile.name = input.value.trim() || 'Joueur';
      profile.avatar = avatar;
      store.saveProfile(profile);
      route();
    }
  };

  const seg = (label, key, options) => h('div', { class: 'setting' },
    h('span', { text: label }),
    h('div', { class: 'seg', role: 'group', 'aria-label': label }, options.map(([val, text]) => h('button', {
      type: 'button', class: settings[key] === val ? 'on' : '', 'aria-pressed': String(settings[key] === val), text,
      onclick: () => { settings[key] = val; store.saveSettings(settings); applyTheme(); route(); },
    }))));

  root.replaceChildren(
    h('section', { class: 'profile-head' },
      h('div', { class: 'avatar', 'aria-hidden': 'true', text: profile.avatar }),
      h('div', null, h('h1', { text: profile.name }), h('p', { class: 'muted', text: `Joueur depuis le ${new Date(profile.createdAt).toLocaleDateString('fr-FR')}` })),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: editProfile, text: 'Modifier' })),

    h('div', { class: 'tiles' },
      h('div', { class: 'tile' }, h('strong', { text: String(played) }), h('span', { text: 'parties jouées' })),
      h('div', { class: 'tile' }, h('strong', { text: String(won) }), h('span', { text: 'victoires' })),
      h('div', { class: 'tile' }, h('strong', { text: played ? `${Math.round((won / played) * 100)} %` : '–' }), h('span', { text: 'de réussite' })),
      h('div', { class: 'tile' }, h('strong', { text: ms ? formatDuration(ms) : '–' }), h('span', { text: 'de jeu' }))),

    h('section', null,
      h('div', { class: 'section-head' }, h('h2', { text: 'Par jeu' })),
      h('ul', { class: 'stats' }, GAMES.map((g) => {
        const s = profile.stats[g.id];
        const fmt = g.score.fmt || String;
        const bests = s ? g.difficulties.filter((d) => s.best[d.id] !== undefined) : [];
        return h('li', { class: 'stat', vars: gameStyle(g) },
          h('div', { class: 'stat-head' },
            h('strong', { text: `${g.emoji} ${g.name}` }),
            h('span', { class: 'muted', text: s ? `${s.won}/${s.played} gagnées${s.bestStreak ? ` · série max ${s.bestStreak}` : ''}` : 'Pas encore joué' })),
          bests.length ? h('ul', { class: 'bests' }, bests.map((d) => h('li', null, h('span', { text: d.label }), h('strong', { text: fmt(s.best[d.id]) })))) : null);
      }))),

    h('section', null,
      h('div', { class: 'section-head' }, h('h2', { text: 'Badges' })),
      h('ul', { class: 'badges' }, badges(profile).map((b) => h('li', { class: b.on ? 'on' : '', title: b.name },
        h('span', { 'aria-hidden': 'true', text: b.emoji }), h('span', { text: b.name }))))),

    h('section', null,
      h('div', { class: 'section-head' }, h('h2', { text: 'Réglages' })),
      seg('Thème', 'theme', [['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']]),
      seg('Vibrations', 'vibrate', [[true, 'Oui'], [false, 'Non']])),

    h('section', null,
      h('div', { class: 'section-head' }, h('h2', { text: 'Stockage' })),
      h('p', { class: 'muted', text: 'Tout est enregistré dans ton navigateur (localStorage), jamais envoyé sur un serveur. Les navigateurs limitent cet espace à environ 5 Mo par site.' }),
      h('div', { class: 'meter', role: 'img', 'aria-label': `Stockage utilisé : ${pct} %` }, h('div', { class: 'meter-fill', vars: { '--w': `${Math.max(pct, 1)}%` } })),
      h('p', { class: 'meter-legend' },
        h('span', { text: `Arcade Junior : ${kb(u.ours)}` }),
        h('span', { text: `Total du site : ${kb(u.total)} / ~${kb(u.quota)}` })),
      h('p', { class: 'muted', text: `${u.sessions} partie${u.sessions > 1 ? 's' : ''} en cours sur ${store.MAX_SESSIONS} maximum. Une partie terminée est effacée : seules tes statistiques restent.` }),
      !store.isPersistent() ? h('p', { class: 'notice', text: 'Stockage bloqué par le navigateur : rien n’est conservé après fermeture.' }) : null,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-ghost', type: 'button', text: 'Exporter', onclick: exportData }),
        h('button', { class: 'btn btn-ghost', type: 'button', text: 'Importer', onclick: importData }),
        h('button', {
          class: 'btn btn-danger', type: 'button', text: 'Tout effacer',
          onclick: async () => {
            if (await confirmDialog('Tout effacer ?', 'Parties en cours, statistiques et réglages seront supprimés définitivement de cet appareil.', 'Tout effacer', true)) {
              store.resetAll();
              applyTheme();
              toast('Données effacées.');
              route();
            }
          },
        }))));
}

function exportData() {
  const blob = new Blob([store.exportAll()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `arcade-junior-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function importData() {
  const input = h('input', { type: 'file', accept: 'application/json,.json' });
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Fichier trop volumineux.'); return; }
    if (!(await confirmDialog('Importer cette sauvegarde ?', 'Elle remplacera toutes les données actuelles de cet appareil.', 'Importer', true))) return;
    try {
      const n = store.importAll(await file.text(), GAMES.map((g) => g.id));
      applyTheme();
      toast(`${n} élément${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''}.`);
      route();
    } catch (e) {
      toast(e.message);
    }
  });
  input.click();
}

/* ---------- Routeur ---------- */

function route() {
  if (teardown) { teardown(); teardown = null; }
  document.title = 'Arcade Junior – mini-jeux de réflexion';
  const [, page, a, b] = location.hash.split('/');
  document.querySelectorAll('.tabbar a').forEach((l) => {
    const on = (l.dataset.tab === 'profil') === (page === 'profil');
    l.classList.toggle('on', on);
    if (on) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
  });
  if (page === 'jeu' && a && b) playView(a, b);
  else if (page === 'profil') { document.title = 'Profil – Arcade Junior'; profileView(); }
  else hubView();
  if (page !== 'jeu') window.scrollTo(0, 0);
}

applyTheme();
window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* hors ligne indisponible, sans conséquence */ });
}

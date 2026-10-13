// Tests de la couche de stockage (js/storage.js) hors navigateur : node tests/storage.test.mjs
// Un faux localStorage (avec quota) remplace celui du navigateur.
import assert from 'node:assert/strict';

const mem = new Map();
let limit = Infinity;
globalThis.localStorage = {
  get length() { return mem.size; },
  key: (i) => [...mem.keys()][i] ?? null,
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem(k, v) {
    const next = [...mem.entries()].filter(([kk]) => kk !== k).reduce((a, [kk, vv]) => a + kk.length + vv.length, 0) + k.length + String(v).length;
    if (next > limit) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
    mem.set(k, String(v));
  },
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};

const store = await import('../js/storage.js');
const { GAMES } = await import('../js/games/index.js');
const ids = GAMES.map((g) => g.id);

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok -', name); };
const session = (id, game = '2048', extra = {}) => ({ id, game, diff: 'classic', seed: 1, createdAt: 1, updatedAt: 1, elapsed: 0, state: { x: 1 }, ...extra });

ok('sauvegarde, relecture, liste et suppression d’une partie', () => {
  assert.ok(store.saveSession(session('abc123', '2048', { updatedAt: 5 })).ok);
  assert.equal(store.getSession('abc123').state.x, 1);
  assert.equal(store.listSessions().length, 1);
  store.deleteSession('abc123');
  assert.equal(store.listSessions().length, 0);
  assert.equal(store.getSession('abc123'), null);
});

ok('identifiant de partie invalide refusé', () => {
  assert.equal(store.getSession('../profile'), null);
  assert.equal(store.getSession('A B'), null);
});

ok('supprimer toutes les parties : visibles ou non, sans toucher au profil ni aux réglages', () => {
  store.resetAll();
  store.recordResult('2048', 'classic', { won: true, score: 500, ms: 1000 }, 'high');
  store.saveSettings({ theme: 'dark' });
  store.saveSession(session('a1'));
  store.saveSession(session('b2', 'sudoku'));
  localStorage.setItem('aj:s:fantome', JSON.stringify(session('fantome', 'jeu-qui-nexiste-plus'))); // invisible pour l'interface
  localStorage.setItem('aj:s:casse', '{pas du json');                                               // illisible
  localStorage.setItem('autre:cle', 'a conserver');                                                  // pas à nous
  assert.equal(store.usage().sessions, 4);
  assert.equal(store.deleteAllSessions(), 4);
  assert.equal(store.usage().sessions, 0);
  assert.equal(store.listSessions().length, 0);
  assert.equal(store.getProfile().stats['2048'].best.classic, 500, 'les records sont conservés');
  assert.equal(store.getSettings().theme, 'dark', 'les réglages sont conservés');
  assert.equal(localStorage.getItem('autre:cle'), 'a conserver', 'les clés étrangères sont intactes');
  assert.equal(store.deleteAllSessions(), 0, 'rien à supprimer : renvoie 0');
});

ok('records : « plus haut » et « plus bas », série remise à zéro en cas de défaite', () => {
  store.resetAll();
  assert.ok(store.recordResult('2048', 'classic', { won: true, score: 100, ms: 1 }, 'high').isBest);
  assert.ok(!store.recordResult('2048', 'classic', { won: true, score: 50, ms: 1 }, 'high').isBest);
  assert.ok(store.recordResult('sudoku', 'easy', { won: true, score: 300, ms: 1 }, 'low').isBest);
  assert.ok(store.recordResult('sudoku', 'easy', { won: true, score: 200, ms: 1 }, 'low').isBest);
  assert.ok(!store.recordResult('sudoku', 'easy', { won: true, score: 250, ms: 1 }, 'low').isBest);
  store.recordResult('2048', 'classic', { won: false, ms: 1 }, 'high');
  const p = store.getProfile();
  assert.equal(p.stats['2048'].best.classic, 100);
  assert.equal(p.stats.sudoku.best.easy, 200);
  assert.equal(p.stats['2048'].streak, 0);
  assert.ok(p.stats['2048'].bestStreak >= 1);
  store.recordResult('connect4', 'easy', { won: true, ms: 5 }, 'low');
  assert.equal(store.getProfile().stats.connect4.won, 1, 'une victoire sans score ne casse rien');
});

ok('export puis import : aller-retour identique', () => {
  store.saveSession(session('zz9', 'sudoku', { state: { n: 9 } }));
  const dump = store.exportAll();
  const before = JSON.stringify(store.getProfile());
  store.resetAll();
  assert.ok(store.importAll(dump, ids) >= 2);
  assert.equal(JSON.stringify(store.getProfile()), before);
  assert.equal(store.getSession('zz9').state.n, 9);
});

ok('import : fichiers invalides refusés avec un message clair', () => {
  for (const txt of ['pas du json', JSON.stringify({ app: 'autre', data: {} }), JSON.stringify({ app: 'arcade-junior', version: 1, data: {} })]) {
    assert.throws(() => store.importAll(txt, ids), (e) => typeof e.message === 'string' && e.message.length > 5);
  }
});

ok('import : clés étrangères, jeux inconnus, entrées énormes et clés piégées ignorés', () => {
  store.resetAll();
  const evil = { app: 'arcade-junior', version: 1, data: {
    'aj:profile': JSON.stringify({ name: 'x'.repeat(500), stats: { '__proto__': { played: 9 }, '2048': { played: 3, won: 'beaucoup', best: { '__proto__': 1, classic: 'NaN' } } } }),
    'autre:cle': '{}',
    'aj:s:ok1': JSON.stringify(session('ok1', 'jeuinconnu')),
    'aj:s:big': JSON.stringify(session('big', '2048', { state: { pad: 'x'.repeat(200000) } })),
    'aj:s:good': JSON.stringify(session('good')),
  } };
  store.importAll(JSON.stringify(evil), ids);
  const p = store.getProfile();
  assert.equal(store.getSession('ok1'), null);
  assert.equal(store.getSession('big'), null);
  assert.ok(store.getSession('good'));
  assert.ok(p.name.length <= 20);
  assert.equal(p.stats['2048'].won, 0);
  assert.equal(({}).played, undefined, 'pas de pollution de prototype');
});

ok('quota dépassé : l’écriture refusée est signalée', () => {
  limit = 200;
  const r = store.saveSession(session('q1', '2048', { state: { big: 'x'.repeat(500) } }));
  limit = Infinity;
  assert.equal(r.ok, false);
  assert.equal(r.quota, true);
});

ok('utilisation, réglages inconnus et profil corrompu', () => {
  store.resetAll();
  store.saveSession(session('u1'));
  const u = store.usage();
  assert.equal(u.sessions, 1);
  assert.ok(u.ratio > 0 && u.ratio < 0.01);
  localStorage.setItem('aj:settings', JSON.stringify({ theme: 'rose' }));
  assert.equal(store.getSettings().theme, 'auto');
  localStorage.setItem('aj:profile', '{pas du json');
  assert.equal(store.getProfile().name, 'Joueur');
});

console.log(`\n${n} groupes de tests de stockage réussis`);

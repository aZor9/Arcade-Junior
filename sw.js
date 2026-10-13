// Service worker : met les fichiers du site en cache pour jouer hors connexion.
// Stratégie : on répond depuis le cache et on met à jour en arrière-plan.
// Pense à changer VERSION et à tenir ASSETS à jour quand tu ajoutes un fichier.

const VERSION = 'aj-v12';
const ASSETS = [
  './', 'index.html', 'about.html', 'plan.html', 'privacy.html', 'legal.html',
  'css/style.css',
  'js/theme.js', 'js/app.js', 'js/rng.js', 'js/storage.js', 'js/ui.js',
  'js/games/index.js', 'js/games/g2048.js', 'js/games/mastermind.js', 'js/games/nombre.js',
  'js/games/lights.js', 'js/games/taquin.js', 'js/games/memory.js', 'js/games/demineur.js', 'js/games/sudoku.js',
  'js/games/untangle.js', 'js/games/pipes.js', 'js/games/takuzu.js', 'js/games/hanoi.js',
  'js/games/flow.js', 'js/games/compte.js', 'js/games/nonogram.js', 'js/games/connect4.js', 'js/games/numbermatch.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});

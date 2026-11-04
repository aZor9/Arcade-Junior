// Service worker : met les fichiers du site en cache pour jouer hors connexion.
// Stratégie : on répond depuis le cache et on met à jour en arrière-plan.
// Pense à changer VERSION et à tenir ASSETS à jour quand tu ajoutes un fichier.

const VERSION = 'aj-v21';
const ASSETS = [
  './', 'index.html', 'about.html', 'plan.html', 'privacy.html', 'legal.html',
  'css/style.css',
  'js/theme.js', 'js/app.js', 'js/rng.js', 'js/storage.js', 'js/ui.js', 'js/icons.js',
  'js/games/index.js', 'js/games/g2048.js', 'js/games/mastermind.js', 'js/games/nombre.js',
  'js/games/lights.js', 'js/games/taquin.js', 'js/games/memory.js', 'js/games/demineur.js', 'js/games/sudoku.js',
  'js/games/untangle.js', 'js/games/pipes.js', 'js/games/takuzu.js', 'js/games/hanoi.js',
  'js/games/flow.js', 'js/games/compte.js', 'js/games/nonogram.js', 'js/games/connect4.js', 'js/games/numbermatch.js',
  'js/games/shapes.js', 'js/games/watersort.js', 'js/games/rushhour.js', 'js/games/rushhour-levels.js', 'js/games/helix.js', 'js/games/stack.js', 'js/games/loop.js', 'js/games/futoshiki.js', 'js/games/skyscrapers.js',
  'js/games/reversi.js', 'js/games/cages.js', 'js/games/hitori.js', 'js/games/billes.js', 'js/games/blocs.js', 'js/games/snake.js', 'js/games/breakout.js', 'js/games/simon.js', 'js/games/schulte.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'js/emoji.js', 'js/emoji-set.js', 'icons/emoji/LICENSE',
  'icons/emoji/1f0cf.webp', 'icons/emoji/1f300.webp', 'icons/emoji/1f308.webp', 'icons/emoji/1f331.webp', 'icons/emoji/1f335.webp', 'icons/emoji/1f344.webp', 'icons/emoji/1f347.webp', 'icons/emoji/1f34c.webp', 'icons/emoji/1f34e.webp', 'icons/emoji/1f352.webp', 'icons/emoji/1f353.webp', 'icons/emoji/1f355.webp', 'icons/emoji/1f369.webp', 'icons/emoji/1f389.webp', 'icons/emoji/1f3ae.webp', 'icons/emoji/1f3af.webp', 'icons/emoji/1f3b2.webp', 'icons/emoji/1f3b8.webp', 'icons/emoji/1f3c1.webp', 'icons/emoji/1f3c6.webp', 'icons/emoji/1f3d3.webp', 'icons/emoji/1f3d9.webp', 'icons/emoji/1f40d.webp', 'icons/emoji/1f419.webp', 'icons/emoji/1f41e.webp', 'icons/emoji/1f422.webp', 'icons/emoji/1f428.webp', 'icons/emoji/1f42f.webp', 'icons/emoji/1f431.webp', 'icons/emoji/1f433.webp', 'icons/emoji/1f435.webp', 'icons/emoji/1f436.webp', 'icons/emoji/1f438.webp', 'icons/emoji/1f43c.webp', 'icons/emoji/1f47e.webp', 'icons/emoji/1f4a1.webp', 'icons/emoji/1f4a3.webp', 'icons/emoji/1f4af.webp', 'icons/emoji/1f4f1.webp', 'icons/emoji/1f506.webp', 'icons/emoji/1f517.webp', 'icons/emoji/1f51f.webp', 'icons/emoji/1f522.webp', 'icons/emoji/1f525.webp', 'icons/emoji/1f527.webp', 'icons/emoji/1f52e.webp', 'icons/emoji/1f534.webp', 'icons/emoji/1f535.webp', 'icons/emoji/1f578.webp', 'icons/emoji/1f579.webp', 'icons/emoji/1f5bc.webp', 'icons/emoji/1f5d1.webp', 'icons/emoji/1f5fc.webp', 'icons/emoji/1f680.webp', 'icons/emoji/1f697.webp', 'icons/emoji/1f6a9.webp', 'icons/emoji/1f7ea.webp', 'icons/emoji/1f981.webp', 'icons/emoji/1f984.webp', 'icons/emoji/1f989.webp', 'icons/emoji/1f98a.webp', 'icons/emoji/1f98b.webp', 'icons/emoji/1f9e0.webp', 'icons/emoji/1f9e9.webp', 'icons/emoji/1f9ea.webp', 'icons/emoji/1f9ed.webp', 'icons/emoji/1f9ee.webp', 'icons/emoji/1f9f1.webp', 'icons/emoji/265f.webp', 'icons/emoji/26aa.webp', 'icons/emoji/26ab.webp', 'icons/emoji/26bd.webp', 'icons/emoji/26cf.webp', 'icons/emoji/270f.webp', 'icons/emoji/2797.webp', 'icons/emoji/2b1b.webp', 'icons/emoji/2b50.webp',
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

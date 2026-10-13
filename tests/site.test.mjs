// Cohérence du site (pages, liens, plan du site, service worker, déploiement) : node tests/site.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));

const { GAMES } = await import('../js/games/index.js');
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok -', name); };

ok('pages attendues présentes (accueil, à propos, plan du site, confidentialité, mentions légales)', () => {
  for (const p of ['index.html', 'about.html', 'plan.html', 'privacy.html', 'legal.html']) assert.ok(pages.includes(p), p);
});

ok('bases d’accessibilité de chaque page : langue, titre, un seul h1, un seul main, navigation nommée, zoom autorisé', () => {
  for (const p of pages) {
    const html = read(p);
    assert.match(html, /<html lang="fr"/, `${p} : langue`);
    assert.match(html, /<title>[^<]{3,}<\/title>/, `${p} : titre`);
    assert.match(html, /<meta name="viewport"[^>]*width=device-width/, `${p} : viewport`);
    assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?[^0-9]/, `${p} : le zoom ne doit pas être bloqué`);
    assert.equal((html.match(/<main[\s>]/g) || []).length, 1, `${p} : un seul <main>`);
    assert.match(html, /<nav[^>]*aria-label="[^"]+"/, `${p} : navigation nommée`);
    // index.html : le h1 est créé par le JavaScript ; les autres pages le portent dans le HTML
    if (p !== 'index.html') assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${p} : un seul <h1>`);
  }
});

ok('le pied de page propose les mêmes liens sur toutes les pages, et marque la page courante', () => {
  const links = (p) => [...read(p).matchAll(/<footer[\s\S]*?<\/footer>/g)][0][0];
  const hrefs = (p) => [...links(p).matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]).join(',');
  const ref = hrefs('index.html');
  assert.equal(ref, 'about.html,plan.html,privacy.html,legal.html');
  for (const p of pages) {
    assert.equal(hrefs(p), ref, `${p} : mêmes liens`);
    if (p !== 'index.html') assert.match(links(p), new RegExp(`<a href="${p}" aria-current="page">`), `${p} : page courante marquée`);
  }
});

ok('tous les liens et fichiers référencés par les pages existent', () => {
  for (const p of pages) {
    const html = read(p);
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const target = m[1].split('#')[0].split('?')[0];
      if (!target || /^(https?:|mailto:|data:)/.test(target)) continue;
      assert.ok(fs.existsSync(path.join(root, target)), `${p} : « ${m[1]} » introuvable`);
    }
  }
});

ok('le plan du site liste toutes les pages', () => {
  const plan = read('plan.html');
  for (const p of pages.filter((x) => x !== 'plan.html')) assert.ok(plan.includes(`href="${p}`), `plan.html ne mentionne pas ${p}`);
  assert.ok(plan.includes('index.html#/profil'), 'le profil');
});

ok('le plan du site liste tous les jeux', () => {
  const plan = read('plan.html');
  for (const g of GAMES) assert.ok(plan.includes(`<li>${g.name}</li>`), `plan.html : jeu « ${g.name} » absent`);
});

ok('sitemap.xml contient toutes les pages et robots.txt le référence', () => {
  const sm = read('sitemap.xml');
  for (const p of pages) assert.ok(sm.includes(p === 'index.html' ? 'hugo-lembrez.fr/</loc>' : `/${p}</loc>`), `sitemap : ${p}`);
  assert.match(read('robots.txt'), /Sitemap: https:\/\/arcade\.hugo-lembrez\.fr\/sitemap\.xml/);
});

ok('le service worker met en cache tous les fichiers du site', () => {
  const sw = read('sw.js');
  const list = new Set([...sw.match(/ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
  const files = [...pages, 'manifest.webmanifest', ...walk('css'), ...walk('js'), ...walk('icons')];
  for (const f of files) assert.ok(list.has(f), `sw.js : ${f} absent du cache`);
  for (const f of list) if (f !== './') assert.ok(fs.existsSync(path.join(root, f)), `sw.js : ${f} n'existe pas`);
});

ok('le déploiement publie toutes les pages et les dossiers du site', () => {
  const yml = read('.github/workflows/site.yml');
  const cp = yml.match(/cp -r ([^\n]+) _site\//)[1].split(' ');
  for (const p of [...pages, 'manifest.webmanifest', 'sw.js', 'robots.txt', 'sitemap.xml', 'CNAME', 'css', 'js', 'icons']) assert.ok(cp.includes(p), `site.yml : ${p} non publié`);
});

console.log(`\n${n} groupes de tests de cohérence du site réussis`);

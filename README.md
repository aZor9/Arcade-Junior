# Arcade Junior 🕹️

Des mini-jeux de réflexion à jouer sur téléphone. **Site 100 % statique** (HTML, CSS, JavaScript natif) : pas de serveur, pas de compte, pas de pub, pas de suivi. Tes parties sont enregistrées dans ton navigateur et le site marche aussi hors ligne.

**Jouer :** https://arcade.hugo-lembrez.fr/

## Les jeux

| Jeu | Principe | Niveaux |
| --- | --- | --- |
| 🔢 2048 | Fusionne les tuiles identiques | 3×3, 4×4, 5×5 |
| 🎯 Mastermind | Devine un code de couleurs (symboles inclus, accessible au daltonisme) | 3 |
| 🔟 Sudoku | Grilles à solution unique générées sur l’appareil | 4×4, 6×6, 9×9 (3 niveaux) |
| 🔮 Nombre mystère | « Plus grand / plus petit » en nombre d’essais limité | 3 |
| 💡 Lumières | Éteins toutes les ampoules (grille toujours résoluble) | 3×3, 5×5, 7×7 |
| 🧩 Taquin | Remets les tuiles dans l’ordre (mélange toujours résoluble) | 3×3, 4×4, 5×5 |
| 🃏 Mémoire | Retrouve les paires | 6 à 15 paires |
| 💣 Démineur | Premier coup toujours sûr, appui long = drapeau | 3 |

Sur l’accueil, **🎲 Surprends-moi** tire au sort un jeu et un niveau.

## Fonctionnalités

- **Parties en cours** : lance plusieurs parties, quitte-les, reprends-les plus tard (jusqu’à 20). Une partie est sauvegardée à chaque coup, avec son temps écoulé.
- **Génération aléatoire reproductible** : chaque partie vient d’une graine (PRNG `mulberry32`) dont l’état est sauvegardé, donc une reprise continue exactement la même suite.
- **Profil** : pseudo, avatar, parties jouées et gagnées, séries, records par jeu et par niveau, badges.
- **Stockage visible** : jauge d’utilisation du `localStorage` (limite typique ≈ 5 Mo par site), limite de 20 parties, gestion du quota dépassé et du stockage bloqué (navigation privée).
- **Export / import** de toutes les données en JSON (pour changer de téléphone).
- **PWA** : installable sur l’écran d’accueil, utilisable hors ligne (service worker).
- **Thème** clair / sombre / automatique, vibrations optionnelles.
- **Vie privée** : aucune requête externe (polices système), CSP stricte, pas de cookie. Pages [confidentialité / RGPD](privacy.html), [mentions légales](legal.html) et [à propos](about.html).

## Une base de données est-elle possible ?

Pas besoin pour l’instant : tout vit dans le navigateur. Un site statique peut quand même parler à un service externe si tu veux plus tard des classements ou la synchronisation entre appareils (Supabase, Firebase, Cloudflare D1/Workers…). Cela impliquerait des comptes ou des pseudos côté serveur, donc de mettre à jour la page confidentialité (RGPD) et la CSP. D’ici là, « Exporter / Importer » du profil sert de sauvegarde manuelle.

## Lancer en local

Aucune dépendance, aucune étape de build. Les modules ES et le service worker demandent un serveur HTTP (pas `file://`) :

```bash
python -m http.server 8000
# puis ouvre http://localhost:8000
```

## Déployer sur GitHub Pages

1. Pousse le code sur la branche `main`.
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Le site est en ligne quelques minutes plus tard. `.nojekyll` désactive Jekyll : les fichiers sont servis tels quels.

### Nom de domaine personnalisé

Le site est servi sur `arcade.hugo-lembrez.fr` :

- le fichier `CNAME` à la racine contient le domaine (GitHub le crée quand on renseigne **Settings → Pages → Custom domain**) ;
- chez OVH, zone DNS de `hugo-lembrez.fr` : un enregistrement `CNAME` `arcade` qui pointe vers `azor9.github.io.` ;
- activer **Enforce HTTPS** dans les réglages Pages une fois le certificat émis.

Tous les chemins étant relatifs, le site fonctionnerait aussi dans un sous-dossier. Si tu changes de domaine, mets à jour `CNAME`, `sitemap.xml`, `robots.txt` et les balises `canonical` / `og:url` de `index.html`.

## Structure

```
index.html            Accueil, parties et profil (une seule page, routage par #/)
about.html, privacy.html, legal.html
css/style.css
js/app.js             Routeur, accueil, écran de partie, profil
js/storage.js         localStorage : parties, profil, quota, export/import
js/ui.js              Aides DOM, toasts, boîtes de dialogue (aucun innerHTML)
js/rng.js             PRNG à graine
js/games/*.js         Un fichier par jeu + index.js
sw.js, manifest.webmanifest, icons/
tests/                Tests de logique et pages de test navigateur
```

### Données dans le `localStorage`

| Clé | Contenu |
| --- | --- |
| `aj:s:<id>` | Une partie en cours (jeu, niveau, graine, temps, état) |
| `aj:profile` | Pseudo, avatar, statistiques et records |
| `aj:settings` | Thème, vibrations |

Une partie terminée est supprimée ; seules les statistiques restent.

## Ajouter un jeu

Crée `js/games/mon-jeu.js` qui exporte un objet :

```js
export default {
  id: 'mon-jeu', name: 'Mon jeu', emoji: '🎲', color: '#ff8a3d',
  tagline: 'Une phrase', howto: 'Les règles.',
  score: { label: 'Meilleur score', better: 'high', fmt: (v) => String(v) },   // 'high' ou 'low'
  difficulties: [{ id: 'easy', label: 'Facile', desc: '…' }],
  create(rng, diffId) { return { /* état sérialisable en JSON */ }; },
  mount(root, state, ctx) {
    // Dessine dans root, modifie `state` et appelle ctx.save(state) après chaque coup.
    // ctx.finish({ won, score }) en fin de partie. ctx.elapsed(), ctx.vibrate(), ctx.toast().
    return () => { /* nettoyage (écouteurs, timers) */ };
  },
};
```

Puis ajoute-le dans `js/games/index.js`, ajoute son fichier à `ASSETS` dans `sw.js` et incrémente `VERSION` pour que les téléphones récupèrent la mise à jour.

## Tests

```bash
node tests/games.test.mjs        # génération, solvabilité, unicité du Sudoku, Mastermind…
```

Avec le serveur local lancé, deux pages pilotent le vrai DOM dans le navigateur :

- `tests/app-flow.html` : parcours complet (créer, reprendre, supprimer, limite de 20 parties, victoire, export).
- `tests/harness.html?g=sudoku&auto=1` : monte un jeu seul (`g` = identifiant, `d` = niveau, `seed`) et joue des coups scriptés.

## Idées pour la suite

Wordle en français, Nonogram, Tours de Hanoï, Simon, Sudoku avec annotations, Démineur avec indice, défis du jour (même graine pour tout le monde, sans serveur), classement optionnel via un service externe.

## Licence

[MIT](LICENSE) © 2026 Hugo Lembrez

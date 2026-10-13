# Arcade Junior 🕹️

Des mini-jeux de réflexion à jouer sur téléphone. **Site 100 % statique** (HTML, CSS, JavaScript natif) : pas de serveur, pas de compte, pas de pub, pas de suivi. Tes parties sont enregistrées dans ton navigateur et le site marche aussi hors ligne.

**Jouer :** https://arcade.hugo-lembrez.fr/

## Les jeux

| Jeu | Principe | Niveaux |
| --- | --- | --- |
| 🔢 2048 | Fusionne les tuiles identiques | 3×3, 4×4, 5×5 |
| 🎯 Mastermind | Devine un code de couleurs (symboles inclus, accessible au daltonisme) | 3 |
| 🔟 Sudoku | Grilles à solution unique générées sur l’appareil, avec mode notes au crayon ; un chiffre terminé est grisé | 4×4, 6×6, 9×9 (3 niveaux) |
| 🔮 Nombre mystère | « Plus grand / plus petit » en nombre d’essais limité | 3 |
| 💡 Lumières | Éteins toutes les ampoules (grille toujours résoluble) | 3×3, 5×5, 7×7 |
| 🧩 Taquin | Remets les tuiles dans l’ordre (mélange toujours résoluble) | 3×3, 4×4, 5×5 |
| 🃏 Mémoire | Retrouve les paires | 6 à 15 paires |
| 💣 Démineur | Premier coup toujours sûr, appui long = drapeau | 3 |
| 🕸️ Démêle | Déplace les points d'un graphe pour qu'aucun trait n'en croise un autre (toujours possible) | 7 à 25 points |
| 🔧 Pipes | Fais pivoter les tuyaux pour alimenter toute la grille en eau | 5×5 à 11×11 |
| ⚫ Takuzu | Grille de 0 et de 1 : pas de triplé, autant de 0 que de 1, solution unique | 6×6 à 12×12 |
| 🗼 Hanoï | Déplace la tour disque par disque (piquets de départ et d'arrivée au hasard) | 3 à 7 disques |
| 🔗 Liaisons | Relie les paires de même couleur sans croiser, en remplissant toute la grille | 5×5 à 11×11 |
| 🧮 Le compte est bon | Atteins la cible avec + − × ÷ (cible toujours atteignable) | 4 à 6 nombres |
| 🖼️ Nonogram | Dessine d'après les indices ; chaque grille se résout par logique, sans deviner | 5×5 à 10×10 |
| 🔴 Puissance 4 | Affronte l'ordinateur (IA à recherche alpha-bêta) | 4 niveaux |
| 🧠 Number Match | Efface les paires de chiffres identiques ou de somme 10 (ligne, colonne, diagonale) ; grilles garanties gagnables | 4 niveaux |

Sur l’accueil, **🎲 Surprends-moi** tire au sort un jeu et un niveau.

## Fonctionnalités

- **Parties en cours** : lance plusieurs parties, quitte-les, reprends-les plus tard (jusqu’à 20), ou supprime-les toutes d'un coup (statistiques conservées). Une partie est sauvegardée à chaque coup, avec son temps écoulé.
- **Génération aléatoire reproductible** : chaque partie vient d’une graine (PRNG `mulberry32`) dont l’état est sauvegardé, donc une reprise continue exactement la même suite.
- **Profil** : pseudo, avatar, parties jouées et gagnées, séries, records par jeu et par niveau, badges.
- **Stockage visible** : jauge d’utilisation du `localStorage` (limite typique ≈ 5 Mo par site), limite de 20 parties, gestion du quota dépassé et du stockage bloqué (navigation privée).
- **Export / import** de toutes les données en JSON (pour changer de téléphone).
- **PWA** : installable sur l’écran d’accueil, utilisable hors ligne (service worker).
- **Thème** clair / sombre / automatique.
- **Mobile d'abord, mais aussi pensé pour ordinateur** : à partir de 960 px de large, barre latérale, grille de jeux élargie, et écran de partie en deux colonnes (plateau, puis règles, raccourcis clavier, record et actions). Clavier et clic droit pris en charge là où c'est utile.
- **Vie privée** : aucune requête externe (polices système), CSP stricte, pas de cookie. Pages [confidentialité / RGPD](privacy.html), [mentions légales](legal.html) et [à propos](about.html).

## Une base de données est-elle possible ?

Pas besoin pour l’instant : tout vit dans le navigateur. Un site statique peut quand même parler à un service externe si tu veux plus tard des classements ou la synchronisation entre appareils (Supabase, Firebase, Cloudflare D1/Workers…). Cela impliquerait des comptes ou des pseudos côté serveur, donc de mettre à jour la page confidentialité (RGPD) et la CSP. D’ici là, « Exporter / Importer » du profil sert de sauvegarde manuelle.

## Lancer en local

Aucune dépendance, aucune étape de build. Les modules ES et le service worker demandent un serveur HTTP (pas `file://`) :

```bash
python -m http.server 8000
# puis ouvre http://localhost:8000
```

## Tests et déploiement automatiques (GitHub Actions)

Le workflow [`.github/workflows/site.yml`](.github/workflows/site.yml) se lance à chaque push et chaque pull request :

1. **Tests** : logique (`tests/games.test.mjs`), puis navigateur (`tests/run-browser.sh` : chaque jeu, parcours complet, aucune page de jeu qui défile en 1280×720).
2. **Publication** (branche `main` uniquement, si les tests passent) : seuls les fichiers du site sont déployés (pas `tests/`, ni le README) et le nom du cache du service worker est remplacé par le numéro du commit, pour que les téléphones récupèrent chaque nouvelle version.

C'est gratuit : minutes illimitées pour un dépôt public (2000 min/mois pour un dépôt privé, un passage dure environ deux minutes).

**Mise en place (une seule fois)** : *Settings → Pages → Build and deployment → Source : **GitHub Actions***. Ensuite, un `git push` sur `main` suffit ; l'avancement se suit dans l'onglet *Actions*. Le domaine personnalisé reste configuré dans le même écran.

Lancer les tests chez soi (Chrome, Chromium ou Edge) :

```bash
node tests/games.test.mjs
bash tests/run-browser.sh        # variable CHROME pour indiquer un navigateur précis
```

### Nom de domaine personnalisé

Le site est servi sur `arcade.hugo-lembrez.fr` :

- le fichier `CNAME` à la racine contient le domaine (GitHub le crée quand on renseigne **Settings → Pages → Custom domain**) ;
- chez OVH, zone DNS de `hugo-lembrez.fr` : un enregistrement `CNAME` `arcade` qui pointe vers `azor9.github.io.` ;
- activer **Enforce HTTPS** dans les réglages Pages une fois le certificat émis.

Tous les chemins étant relatifs, le site fonctionnerait aussi dans un sous-dossier. Si tu changes de domaine, mets à jour `CNAME`, `sitemap.xml`, `robots.txt` et les balises `canonical` / `og:url` de `index.html`.

## Sécurité

- **Aucun code ni requête tiers** : pas de CDN, de police ou de statistiques externes. Une CSP stricte (`default-src 'self'`, sans script ni style en ligne, `frame-src 'none'`, `upgrade-insecure-requests`) est posée dans chaque page.
- **Aucun `innerHTML`** : tout le DOM est construit avec `createElement` / `textContent`.
- **Données importées non fiables** : l'import n'accepte que des clés `aj:*` connues, de taille limitée, avec des jeux existants ; les statistiques sont reconstruites champ par champ, et une partie illisible est supprimée au lieu de bloquer l'appli.
- **Pas de secret ni de donnée personnelle** : seulement des parties et des statistiques, dans le `localStorage` (non chiffré, visible par quiconque utilise le même navigateur).
- **Limites connues** : GitHub Pages ne permet pas d'envoyer d'en-têtes HTTP, donc `frame-ancestors` (anti-clickjacking) ne peut pas être imposé. Le site ne gère aucune action sensible, l'impact est faible.
- **À faire côté comptes** : activer l'authentification à deux facteurs sur GitHub et OVH (celui qui contrôle le dépôt ou le domaine contrôle le code servi), et vérifier le domaine dans GitHub (*Settings → Pages → Add a domain*, enregistrement TXT chez OVH) pour empêcher qu'un tiers ne réutilise le sous-domaine si Pages était désactivé un jour.

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
tests/                Tests de logique, pages de test navigateur, script run-browser.sh
.github/workflows/    Tests et déploiement automatiques
```

### Données dans le `localStorage`

| Clé | Contenu |
| --- | --- |
| `aj:s:<id>` | Une partie en cours (jeu, niveau, graine, temps, état) |
| `aj:profile` | Pseudo, avatar, statistiques et records |
| `aj:settings` | Thème |

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
    // ctx.finish({ won, score }) en fin de partie. ctx.elapsed(), ctx.toast().
    return () => { /* nettoyage (écouteurs, timers) */ };
  },
};
```

Puis ajoute-le dans `js/games/index.js`, ajoute son fichier à `ASSETS` dans `sw.js` et incrémente `VERSION` pour que les téléphones récupèrent la mise à jour.

## Tests

```bash
node tests/games.test.mjs        # génération, solvabilité, unicité du Sudoku, Mastermind…
node tests/storage.test.mjs      # sauvegardes, records, import / export, quota
```

`bash tests/run-browser.sh` lance tout ce qui suit (c'est ce que fait GitHub Actions). Avec le serveur local lancé, ces pages pilotent le vrai DOM dans le navigateur :

- `tests/app-flow.html` : parcours complet (créer, reprendre, supprimer, limite de 20 parties, victoire, export).
- `tests/harness.html?g=sudoku&auto=1` : monte un jeu seul (`g` = identifiant, `d` = niveau, `seed`) et joue des coups scriptés.
- `tests/scroll-check.html?w=1280&h=720` : charge chaque page et chaque jeu dans une fenêtre de cette taille et signale ceux qui obligent à faire défiler (ajouter `&nosess=1` pour tester l'accueil sans parties en cours).

## Idées pour la suite

Wordle en français, Simon, Hashi (ponts entre îles), Slitherlink, indices et annulation dans tous les jeux, défis du jour (même graine pour tout le monde, sans serveur), classement optionnel via un service externe.

## Licence

[MIT](LICENSE) © 2026 Hugo Lembrez

# À faire — Arcade Junior

## Laboratoire : à valider avant publication

Les jeux en test sont en ligne mais cachés derrière le laboratoire (6 appuis rapides sur l'onglet **Profil**) :

- [ ] ⋚ **Futoshiki** : carré latin avec signes < > entre cases voisines (4×4 à 7×7, solution unique).
- [ ] 🏙️ **Gratte-ciel** (Skyscrapers) : hauteurs 1 à N, indices de vue depuis les bords (4×4 à 6×6, solution unique).

Pour publier un jeu du laboratoire : le déplacer de `LAB_GAMES` vers `GAMES` dans `js/games/index.js`, puis l'ajouter au plan du site (`plan.html`) et à la page « À propos ». Le test `tests/site.test.mjs` rappelle ce qui manque.

## Nouveaux jeux retenus

- [ ] **Blocs** (type 1010!) : poser des pièces sur une grille 10×10 pour effacer lignes et colonnes ; jeu au score sans fin, glisser-déposer.
- [ ] **Reversi** (Othello) contre l'IA : même moteur de recherche que Puissance 4.
- [ ] **Hashi** (Ponts) : relier des îles par des ponts selon leur chiffre, sans croiser ; génération avec solution unique à soigner.

## Autres idées de jeux

- Casse-têtes de grille : Hitori, Akari (ampoules), Tentes et arbres, Slitherlink, KenKen.
- Stratégie contre l'ordinateur : Awalé (Mancala), Gomoku, Nim.
- Maths : le jeu du 24 (4 nombres pour atteindre 24), avec le moteur de « Le compte est bon ».
- Réflexes et mémoire : Simon, table de Schulte.
- Solitaire à billes (Hi-Q) avec positions de départ garanties résolubles.
- Jeux de mots (Wordle en français, mots mêlés, pendu) : choisir d'abord une liste de mots libre de droits.
- Sokoban : niveaux générés « à l'envers » depuis une position résolue.

## Fonctionnalités

- [ ] Hélice et Pile (publiés) : affiner la prise en main sur téléphone (sensibilité de la rotation, vitesses).

- [ ] **Défi du jour** : même grille pour tout le monde (graine = date), série de jours, résultat à partager.
- [ ] Annuler et indices dans tous les jeux (Sudoku : vérifier une case, donner un chiffre).
- [ ] Bouton « Continuer » sur l'accueil pour reprendre la dernière partie.
- [ ] Historique et graphiques de progression dans le profil.
- [ ] Animation de glissement des tuiles du 2048.
- [ ] Numéro de version visible, message « nouvelle version disponible », bouton « Installer l'application ».
- [ ] Sons (optionnels, désactivés par défaut).

## Accessibilité (RGAA) : corrections rapides

- [ ] Lien d'évitement « Aller au contenu » (12.7).
- [ ] Titre `h1` sur les pages de jeu (9.1).
- [ ] Noms accessibles des cases du Démineur (6.1 / 11.9).
- [ ] Contrastes : texte atténué sur les cartes en thème sombre, bouton « danger » en thème clair (3.2).
- [ ] Déplacer le focus sur le titre à chaque changement d'écran.
- [ ] Déclaration d'accessibilité (« partiellement conforme », non auditée).
- [ ] Démêle : croisements en pointillé en plus du rouge ; Liaisons : une lettre dans chaque point (3.1).
- [ ] Mesurer l'affichage à 320 px de large (10.11).
- [ ] Plus lourd : Liaisons jouable au clavier, annonces des scores aux lecteurs d'écran.

## Technique

- [ ] Code commun (`fmtTime`, score « secondes écoulées », constructeur SVG) dans un module partagé ; découper `js/app.js`.
- [ ] Champ de version dans les sauvegardes et fonctions de migration.
- [ ] Valider l'état d'une partie importée jeu par jeu (tailles, valeurs).
- [ ] Manifeste : `orientation: any`, `id`, `categories`, captures d'écran ; image de partage 1200×630.
- [ ] Test automatique des collisions de noms de classes CSS.

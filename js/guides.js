// « Comment jouer ? » : pour les jeux où la règle seule ne dit pas par où commencer.
// Pas de lien externe : le site marche hors ligne, ces explications aussi.
//
// Une étape = { text, grid?, list? }. `grid` est un petit exemple : une chaîne par ligne, cases séparées par un espace.
//   _ case vide   # case noire   x case barrée   ? case cachée
//   ~3 indice ou signe hors de la grille   *3 case à retenir (surlignée)   tout le reste s'affiche tel quel
import { h } from './ui.js';

export const GUIDES = {
  mastermind: [
    { text: "Tu proposes rouge, bleu, jaune, vert et tu obtiens 1 noire et 1 blanche : deux de ces couleurs sont dans le code, l'une bien placée, l'autre non. Le jeu ne dit pas lesquelles, c'est à toi de le déduire." },
    { text: "Les noires sont toujours affichées en premier : la place d'une pastille ne correspond pas à la place d'un pion." },
    { text: "Pour bien démarrer, joue deux couleurs par paires (rouge, rouge, bleu, bleu). Tu sais vite combien de fois chacune apparaît." },
  ],
  lights: [
    { text: "Toucher deux fois la même ampoule revient à ne rien faire, et l'ordre des coups ne change rien. Il existe une méthode qui marche toujours : on pousse les lumières vers le bas." },
    { text: "Pour chaque ampoule allumée de la première ligne, touche la case juste en dessous : la ligne s'éteint. Fais pareil avec la deuxième ligne, et ainsi de suite. Il ne reste alors des ampoules allumées que sur la dernière ligne." },
    {
      text: "En 5×5, regarde cette dernière ligne (● allumée, ○ éteinte), touche la case indiquée sur la première ligne, puis recommence à pousser vers le bas : tout s'éteint. Sur une autre taille, essaie quelques cases de la première ligne avant de pousser à nouveau.",
      list: ['●●●○○ : 2e case', '○○●●● : 4e case', '●●○●● : 3e case', '●○●●○ : 5e case', '○●●○● : 1re case', '●○○○● : 1re et 2e cases', '○●○●○ : 1re et 4e cases'],
    },
  ],
  taquin: [
    { text: "Ne cherche pas à tout placer d'un coup : range la rangée du haut, puis la suivante, sans plus jamais y toucher. Quand il ne reste que deux rangées, range-les colonne par colonne, de gauche à droite." },
    {
      text: "Les deux dernières tuiles d'une rangée se posent ensemble. Mets le 3 à la place du 4, le 4 juste en dessous, et la case vide à gauche du 3.",
      grid: ['1 2 _ *3', '_ _ _ *4'],
    },
    {
      text: "Fais glisser le 3 vers la gauche, puis le 4 vers le haut : les deux sont en place.",
      grid: ['1 2 *3 *4', '_ _ _ _'],
    },
  ],
  demineur: [
    {
      text: "Quand un chiffre a autant de cases cachées autour de lui que sa valeur, elles sont toutes minées. Ici, chaque 1 ne touche qu'une case cachée : c'est une mine.",
      grid: ['*🚩 1', '1 1'],
    },
    {
      text: "Quand un chiffre a déjà tous ses drapeaux, ses autres voisines sont sûres. Ici, le 1 du milieu a son drapeau : les cases cachées autour de lui peuvent être ouvertes. Touche ce 1 pour les révéler d'un coup.",
      grid: ['🚩 *? *?', '1 *1 *?'],
    },
    { text: "Pour la suite, commence toujours par les bords de la zone ouverte : c'est là que les chiffres donnent le plus d'informations." },
  ],
  takuzu: [
    {
      text: "Une case entre deux chiffres identiques prend l'autre chiffre, sinon on aurait un triplé.",
      grid: ['1 *0 1'],
    },
    {
      text: "Deux chiffres identiques côte à côte sont entourés de l'autre chiffre.",
      grid: ['*1 0 0 *1'],
    },
    {
      text: "Compte ce qui manque. Une ligne de 6 cases a trois 0 et trois 1 : dès que les trois 1 sont placés, le reste vaut 0.",
      grid: ['1 0 1 1 *0 *0'],
    },
    { text: "Enfin, quand deux lignes sont presque remplies de la même façon, les dernières cases doivent les rendre différentes." },
  ],
  hanoi: [
    { text: "Un coup sur deux, déplace le plus petit disque, toujours dans le même sens de rotation entre les piquets. L'autre coup, un seul déplacement est possible sans toucher au petit : fais-le." },
    { text: "Le premier coup décide du sens. Avec un nombre impair de disques, pose le plus petit directement sur le piquet ⭐. Avec un nombre pair, pose-le sur le piquet restant." },
    { text: "Tu arrives ainsi au minimum de coups, à chaque fois." },
  ],
  nonogram: [
    {
      text: "« 3 1 » veut dire : un bloc de 3 cases noires, puis un bloc de 1, dans cet ordre, avec au moins une case vide entre les deux. Un « 0 » veut dire que la ligne est vide.",
      grid: ['~3 ~1 # # # x # x'],
    },
    {
      text: "Commence par les grands blocs. Avec un « 4 » sur 5 cases, le bloc commence à la 1re ou à la 2e case : dans les deux cas, les 3 cases du milieu sont noires.",
      grid: ['~4 _ *# *# *# _'],
    },
    {
      text: "Barre les cases que tu sais vides (bouton ✖). Ici, le bloc « 2 » est complet : tout le reste de la ligne est vide. Chaque case trouvée sert d'indice dans l'autre sens, passe sans arrêt des lignes aux colonnes.",
      grid: ['~2 *x *x # # *x'],
    },
  ],
  nummatch: [
    {
      text: "Deux chiffres se voient s'il n'y a que des cases déjà effacées entre eux. Ici, 3 et 7 font 10 et peuvent partir, même éloignés.",
      grid: ['*3 _ _ *7 5'],
    },
    {
      text: "La fin d'une ligne rejoint le début de la suivante : le 4 et le 6 se voient, ils font 10.",
      grid: ['1 2 *4', '*6 5 8'],
    },
    { text: "Ne garde le bouton + que pour la fin : les ajouts sont comptés. Avant, vide les lignes presque terminées, elles disparaissent et rapprochent les chiffres." },
  ],
  futoshiki: [
    {
      text: "Le signe se lit comme en maths : la pointe va vers le plus petit. Dans une grille 4×4, la case avant un « < » ne peut pas être 4, et celle d'après ne peut pas être 1.",
      grid: ['*3 ~< *4'],
    },
    {
      text: "Cherche les chaînes de signes. Trois « < » à la suite sur 4 cases ne laissent qu'une possibilité.",
      grid: ['*1 ~< *2 ~< *3 ~< *4'],
    },
    { text: "Ensuite, raisonne comme au sudoku : chaque chiffre une seule fois par ligne et par colonne, et ce qui est placé élimine ses voisins." },
  ],
  skyscrapers: [
    {
      text: "Regarde la rangée depuis le bord : un immeuble plus haut cache tout ce qui est derrière lui. Depuis la gauche, on voit le 2 puis le 4 : indice 2. Depuis la droite, le 3 puis le 4 : indice 2.",
      grid: ['~2 2 1 4 3 ~2'],
    },
    {
      text: "Un indice 1 veut dire que le plus haut est collé à ce bord : il cache tout.",
      grid: ['~1 *4 _ _ _'],
    },
    {
      text: "Un indice égal à la taille de la grille veut dire qu'on les voit tous : ils montent dans l'ordre.",
      grid: ['~4 *1 *2 *3 *4 ~1'],
    },
    { text: "Place d'abord ces cas sûrs, puis le plus haut immeuble de chaque rangée : il décide de presque tout." },
  ],
  cages: [
    { text: "Une cage « 3− » de 2 cases en 4×4 ne peut contenir que 1 et 4 : aucune autre paire n'a 3 d'écart. Commence par ces cages à une seule solution, l'ordre des deux chiffres viendra plus tard." },
    { text: "D'autres cages de 2 cases faciles sur 4 chiffres : « 7+ » donne 3 et 4, « 6× » donne 2 et 3, « 12× » donne 3 et 4." },
    { text: "Pour − et ÷, l'ordre des cases ne compte pas : on part toujours du plus grand. Une cage en L peut contenir deux fois le même chiffre, s'ils ne sont ni sur la même ligne ni sur la même colonne." },
  ],
  hitori: [
    {
      text: "Un chiffre coincé entre deux chiffres identiques reste blanc : l'un des deux 3 doit être noirci, et deux cases noires ne peuvent pas se toucher.",
      grid: ['3 *(1) 3'],
    },
    {
      text: "Deux chiffres identiques côte à côte : l'un des deux sera noir, donc l'autre reste blanc. Tous les autres 2 de la ligne doivent être noircis.",
      grid: ['2 2 4 *# 1'],
    },
    {
      text: "Autour d'une case noire, tout est blanc : entoure ses voisines pour t'en souvenir. Et vérifie qu'aucune case blanche ne se retrouve enfermée par des noires.",
      grid: ['_ *(5) _', '*(4) # *(2)', '_ *(1) _'],
    },
  ],
};

function figure(rows) {
  const cells = rows.map((row) => row.split(' '));
  return h('div', { class: 'guide-fig', 'aria-hidden': 'true', vars: { '--cols': cells[0].length } }, cells.flat().map((tok) => {
    const clue = tok.startsWith('~');
    const key = tok.startsWith('*');
    const v = clue || key ? tok.slice(1) : tok;
    const kind = { '#': 'gc-black', x: 'gc-cross', '?': 'gc-hidden' }[v] || '';
    const label = v === '_' || v === '#' || v === '?' ? '' : v === 'x' ? '×' : v.replace(/[()]/g, '');
    return h('span', { class: ['guide-cell', clue ? 'gc-clue' : '', key ? 'gc-key' : '', kind, /^\(.*\)$/.test(v) ? 'gc-ring' : ''].filter(Boolean).join(' '), text: label });
  }));
}

export function guideView(id) {
  return h('div', { class: 'guide' }, GUIDES[id].map((s) => h('div', { class: 'guide-step' },
    h('p', { text: s.text }),
    s.grid ? figure(s.grid) : null,
    s.list ? h('ul', { class: 'guide-list' }, s.list.map((t) => h('li', { text: t }))) : null)));
}

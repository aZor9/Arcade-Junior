import { svg } from '../ui.js';

// Une forme par couleur (SVG 24×24) : les jeux restent jouables en cas de daltonisme
// (l'information ne passe jamais par la seule couleur).
export const SHAPES = [
  '<circle cx="12" cy="12" r="6.5"/>',
  '<path d="M12 4.5 20 19H4z"/>',
  '<rect x="5.5" y="5.5" width="13" height="13" rx="1.5"/>',
  '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/>',
  '<path d="m12 3.5 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z"/>',
  '<path d="M12 20s-8-4.9-8-10.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.4C20 15.1 12 20 12 20z"/>',
  '<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z"/>',
  '<path d="M15 4a8.5 8.5 0 1 0 5 15.4A7.5 7.5 0 0 1 15 4z"/>',
  '<path d="M12 19.5 4 5h16z"/>',
  '<path d="M7.5 4.5h9L21 12l-4.5 7.5h-9L3 12z"/>',
  '<path d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" fill-rule="evenodd"/>',
  '<path d="m6 3.5 6 6 6-6 2.5 2.5-6 6 6 6-2.5 2.5-6-6-6 6L3.5 18l6-6-6-6z"/>',
];
export const shape = (i) => svg(SHAPES[i % SHAPES.length]);

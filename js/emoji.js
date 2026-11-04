// Emojis du site : on remplace les emojis du système par des images (Fluent Emoji de Microsoft, licence MIT)
// pour que le rendu soit le même sur tous les appareils. Le texte d'origine reste dans l'attribut alt.
import AVAILABLE from './emoji-set.js';

const EMOJI = /(?:[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}](?:️|‍[\u{1F000}-\u{1FAFF}]️?)*)/gu;
const SKIP = new Set(['SCRIPT', 'STYLE', 'TITLE', 'TEXTAREA', 'OPTION', 'CANVAS', 'SVG']);

const code = (s) => [...s].map((c) => c.codePointAt(0).toString(16)).filter((c) => c !== 'fe0f').join('-');

export function emojiImg(char) {
  const img = document.createElement('img');
  img.className = 'emoji';
  img.src = `icons/emoji/${code(char)}.webp`;
  img.alt = char;
  img.width = 96;
  img.height = 96;
  img.draggable = false;
  return img;
}

// Remplace les emojis d'un nœud texte par des images (ceux qui n'ont pas d'image restent du texte).
function swap(text) {
  const value = text.nodeValue;
  if (!value || !EMOJI.test(value)) { EMOJI.lastIndex = 0; return; }
  EMOJI.lastIndex = 0;
  const parts = [];
  let last = 0;
  for (const m of value.matchAll(EMOJI)) {
    if (!AVAILABLE.has(code(m[0]))) continue;
    if (m.index > last) parts.push(value.slice(last, m.index));
    parts.push(emojiImg(m[0]));
    last = m.index + m[0].length;
  }
  if (!parts.length) return;
  if (last < value.length) parts.push(value.slice(last));
  text.replaceWith(...parts);
}

function scan(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (!SKIP.has(node.parentNode?.nodeName.toUpperCase())) swap(node);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || SKIP.has(node.nodeName.toUpperCase())) return;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode: (t) => (SKIP.has(t.parentNode.nodeName.toUpperCase()) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  texts.forEach(swap);
}

// À appeler une fois : traite la page, puis tout ce qui y est ajouté ou modifié ensuite.
export function useEmojiImages(root = document.body) {
  scan(root);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') scan(m.target);
      else m.addedNodes.forEach(scan);
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });
}

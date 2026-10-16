// Couche d'accès au localStorage : tout est préfixé "aj:" et protégé par try/catch
// (navigation privée, stockage bloqué, quota dépassé). Si le stockage est inutilisable,
// on bascule sur une mémoire volatile et l'interface prévient le joueur.

const PREFIX = 'aj:';
const K_PROFILE = PREFIX + 'profile';
const K_SETTINGS = PREFIX + 'settings';
const K_SESSION = PREFIX + 's:';

export const MAX_SESSIONS = 20;
// Limite typique d'un navigateur : ~5 Mo par origine (varie selon les navigateurs).
export const QUOTA = 5 * 1024 * 1024;

const mem = new Map();
let backend = null;
try {
  localStorage.setItem('__aj_test', '1');
  localStorage.removeItem('__aj_test');
  backend = localStorage;
} catch (e) {
  backend = null;
}
export const isPersistent = () => backend !== null;

function rawGet(k) {
  try { return backend ? backend.getItem(k) : (mem.get(k) ?? null); } catch (e) { return null; }
}
function rawSet(k, v) {
  try {
    if (backend) backend.setItem(k, v); else mem.set(k, v);
    return { ok: true };
  } catch (e) {
    const quota = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
    return { ok: false, quota };
  }
}
function rawRemove(k) {
  try { if (backend) backend.removeItem(k); else mem.delete(k); } catch (e) { /* ignoré */ }
}
function rawKeys() {
  const out = [];
  try {
    if (backend) for (let i = 0; i < backend.length; i++) out.push(backend.key(i));
    else out.push(...mem.keys());
  } catch (e) { /* ignoré */ }
  return out;
}
function readJson(k, fallback) {
  try {
    const v = rawGet(k);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}
const writeJson = (k, v) => rawSet(k, JSON.stringify(v));

/* ---------- Réglages ---------- */

export function getSettings() {
  const s = readJson(K_SETTINGS, {});
  const favorites = Array.isArray(s.favorites) ? [...new Set(s.favorites.filter((id) => typeof id === 'string' && /^[a-z0-9-]{1,30}$/.test(id)))].slice(0, 50) : [];
  return {
    theme: ['light', 'dark'].includes(s.theme) ? s.theme : 'auto',
    labs: s.labs === true, // « Laboratoire » : jeux en test, débloqués par 6 appuis sur Profil
    favorites,
  };
}
export function saveSettings(s) {
  return writeJson(K_SETTINGS, s);
}

/* ---------- Profil & statistiques ---------- */

const emptyStats = () => ({ played: 0, won: 0, streak: 0, bestStreak: 0, ms: 0, best: {} });

export function getProfile() {
  const p = readJson(K_PROFILE, {});
  const stats = {};
  if (p.stats && typeof p.stats === 'object') {
    for (const [id, s] of Object.entries(p.stats)) {
      if (!/^[a-z0-9-]+$/.test(id) || !s || typeof s !== 'object') continue;
      const best = {};
      if (s.best && typeof s.best === 'object') {
        for (const [d, v] of Object.entries(s.best)) if (/^[a-z0-9-]+$/.test(d) && Number.isFinite(v)) best[d] = v;
      }
      const num = (x) => (Number.isFinite(x) && x >= 0 ? x : 0);
      stats[id] = { played: num(s.played), won: num(s.won), streak: num(s.streak), bestStreak: num(s.bestStreak), ms: num(s.ms), best };
    }
  }
  return {
    name: typeof p.name === 'string' && p.name.trim() ? p.name.slice(0, 20) : 'Joueur',
    avatar: typeof p.avatar === 'string' && p.avatar ? p.avatar.slice(0, 8) : '🦊',
    createdAt: Number.isFinite(p.createdAt) ? p.createdAt : Date.now(),
    stats,
  };
}
export function saveProfile(p) {
  return writeJson(K_PROFILE, p);
}

// Enregistre le résultat d'une partie terminée. `better` vaut 'high' ou 'low'.
// Avec `always`, le record est mis à jour même sur une défaite (jeux d'arcade : le score compte toujours).
export function recordResult(gameId, diff, { won, score, ms }, better, always = false) {
  const p = getProfile();
  const s = p.stats[gameId] || emptyStats();
  s.played++;
  s.ms += Math.max(0, Math.round(ms || 0));
  let isBest = false;
  let previous = null;
  if (won) {
    s.won++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
  } else {
    s.streak = 0;
  }
  if ((won || always) && Number.isFinite(score)) {
    previous = s.best[diff] ?? null;
    if (previous === null || (better === 'high' ? score > previous : score < previous)) {
      s.best[diff] = score;
      isBest = true;
    }
  }
  p.stats[gameId] = s;
  saveProfile(p);
  return { isBest, previous };
}

/* ---------- Parties en cours ---------- */

export function listSessions() {
  const out = [];
  for (const k of rawKeys()) {
    if (!k.startsWith(K_SESSION)) continue;
    const s = readJson(k, null);
    if (s && s.id && s.game && s.state) out.push(s);
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}
export function getSession(id) {
  if (!/^[a-z0-9]+$/.test(id || '')) return null;
  const s = readJson(K_SESSION + id, null);
  return s && s.id === id && s.state ? s : null;
}
export function saveSession(s) {
  return writeJson(K_SESSION + s.id, s);
}
export function deleteSession(id) {
  rawRemove(K_SESSION + id);
}
// Supprime toutes les parties en cours (y compris celles que l'interface ne sait plus afficher). Le profil et les
// statistiques ne sont pas touchés. Retourne le nombre de parties supprimées.
export function deleteAllSessions() {
  let n = 0;
  for (const k of rawKeys()) if (k.startsWith(K_SESSION)) { rawRemove(k); n++; }
  return n;
}

/* ---------- Utilisation du stockage ---------- */

export function usage() {
  let ours = 0;
  let total = 0;
  let sessions = 0;
  for (const k of rawKeys()) {
    const len = k.length + (rawGet(k) || '').length;
    total += len;
    if (k.startsWith(PREFIX)) ours += len;
    if (k.startsWith(K_SESSION)) sessions++;
  }
  return { ours, total, sessions, quota: QUOTA, ratio: total / QUOTA };
}

/* ---------- Export / import / réinitialisation ---------- */

export function exportAll() {
  const data = {};
  for (const k of rawKeys()) if (k.startsWith(PREFIX)) data[k] = rawGet(k);
  return JSON.stringify({ app: 'arcade-junior', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

const KEY_OK = /^aj:(profile|settings|s:[a-z0-9]+)$/;
const MAX_ENTRY = 100000; // une partie réelle pèse quelques Ko : au-delà, l'entrée est ignorée

// Retourne le nombre d'entrées importées, ou lève une Error au message lisible.
export function importAll(text, knownGames) {
  let doc;
  try { doc = JSON.parse(text); } catch (e) { throw new Error('Ce fichier n’est pas un JSON valide.'); }
  if (!doc || doc.app !== 'arcade-junior' || !doc.data || typeof doc.data !== 'object') {
    throw new Error('Ce fichier n’est pas une sauvegarde Arcade Junior.');
  }
  const entries = [];
  for (const [k, v] of Object.entries(doc.data)) {
    if (!KEY_OK.test(k) || typeof v !== 'string' || v.length > MAX_ENTRY) continue;
    let parsed;
    try { parsed = JSON.parse(v); } catch (e) { continue; }
    if (!parsed || typeof parsed !== 'object') continue;
    if (k.startsWith(K_SESSION) && !(knownGames.includes(parsed.game) && parsed.id === k.slice(K_SESSION.length) && parsed.state)) continue;
    entries.push([k, v]);
  }
  if (!entries.length) throw new Error('Aucune donnée exploitable dans ce fichier.');
  resetAll();
  let n = 0;
  for (const [k, v] of entries) {
    if (rawSet(k, v).ok) n++;
  }
  return n;
}

export function resetAll() {
  for (const k of rawKeys()) if (k.startsWith(PREFIX)) rawRemove(k);
}

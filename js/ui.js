// Petits utilitaires d'interface : constructeur de DOM, toast, boîtes de dialogue.
// Aucun innerHTML : tout passe par textContent / createElement (pas d'injection possible).

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'vars') for (const [n, val] of Object.entries(v)) el.style.setProperty(n, val);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = (kid) => {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) kid.forEach(add);
    else el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  };
  kids.forEach(add);
  return el;
}

// Élément SVG (espace de noms requis, createElement ne suffit pas).
export function svg(markup) {
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">${markup}</svg>`, 'image/svg+xml');
  return document.importNode(doc.documentElement, true);
}

// Règles d'un jeu : chaque ligne de `howto` devient un point de la liste.
export function howtoList(text) {
  return h('ul', { class: 'howto' }, text.split('\n').map((line) => h('li', { text: line })));
}

let toastTimer;
export function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// Boîte modale (bottom sheet). `body` peut être un Node ou une fonction (close) => Node.
// Résout avec la valeur de l'action choisie (ou du `close(valeur)` du corps), null si fermée.
export function dialog({ title, body, actions = [{ label: 'OK', value: true, kind: 'primary' }] }) {
  return new Promise((resolve) => {
    let result = null;
    let done = false;
    const dlg = h('dialog', { class: 'sheet' });
    // On résout tout de suite plutôt que d'attendre l'événement « close », parfois différé.
    const finish = () => { if (done) return; done = true; dlg.remove(); resolve(result); };
    const close = (v) => { result = v ?? null; if (dlg.open) dlg.close(); finish(); };
    const content = typeof body === 'function' ? body(close) : body;
    dlg.append(
      h('div', { class: 'sheet-inner' },
        title ? h('h2', { text: title }) : null,
        content ? h('div', { class: 'sheet-body' }, content) : null,
        actions.length
          ? h('div', { class: 'sheet-actions' },
              actions.map((a) => h('button', { type: 'button', class: `btn btn-${a.kind || 'ghost'}`, onclick: () => close(a.value), text: a.label })))
          : null),
    );
    dlg.addEventListener('close', finish); // Échap ou retour arrière du système
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg);
    dlg.showModal();
  });
}

export async function confirmDialog(title, text, okLabel = 'Confirmer', danger = false) {
  const r = await dialog({
    title,
    body: h('p', { text }),
    actions: [
      { label: 'Annuler', value: false, kind: 'ghost' },
      { label: okLabel, value: true, kind: danger ? 'danger' : 'primary' },
    ],
  });
  return r === true;
}

export function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  const hh = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (hh) return `${hh} h ${String(m).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

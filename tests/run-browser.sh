#!/usr/bin/env bash
# Tests dans un vrai navigateur (Chromium sans fenêtre) : tous les jeux, le parcours complet de l'appli,
# et l'absence de défilement sur les pages de jeu en 1280x720.
#
#   bash tests/run-browser.sh                      # détecte Chrome / Chromium / Edge
#   CHROME="/chemin/vers/chrome" bash tests/run-browser.sh
#
# Utilisé tel quel par GitHub Actions (.github/workflows/site.yml).

set -u
cd "$(dirname "$0")/.."

# On vérifie que l'interpréteur fonctionne vraiment (sous Windows, « python3 » peut n'être qu'un raccourci du Store).
PY=""
for c in python3 python py; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c "import sys" >/dev/null 2>&1; then PY="$c"; break; fi
done
[ -n "$PY" ] || { echo "Python est requis (serveur local et analyse des résultats)."; exit 2; }

CHROME="${CHROME:-}"
if [ -z "$CHROME" ]; then
  for c in google-chrome google-chrome-stable chromium chromium-browser chrome msedge; do
    if command -v "$c" >/dev/null 2>&1; then CHROME="$c"; break; fi
  done
fi
[ -n "$CHROME" ] || { echo "Aucun navigateur Chromium trouvé : définis la variable CHROME."; exit 2; }

PORT="${PORT:-8765}"
FLAGS=(--headless=new --disable-gpu --hide-scrollbars --disable-extensions)
# Sur GitHub Actions (variable CI), le bac à sable de Chrome n'est pas disponible.
[ -n "${CI:-}" ] && FLAGS+=(--no-sandbox)

"$PY" -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null' EXIT
sleep 1

# Charge une page et en extrait le texte d'un bloc (regex en 4e argument). Réessaie si rien n'est revenu.
run_page() { # url taille budget_virtuel regex
  local out attempt
  for attempt in 1 2 3; do
    out=$(timeout 240 "$CHROME" "${FLAGS[@]}" --window-size="$2" --virtual-time-budget="$3" --dump-dom "$1" 2>/dev/null \
      | "$PY" -X utf8 -c '
import sys, re, html
d = sys.stdin.buffer.read().decode("utf-8", "replace")
m = re.search(sys.argv[1], d, re.S)
print(html.unescape(m.group(1)) if m and m.group(1).strip() else "NO RESULT")' "$4")
    [ "$out" != "NO RESULT" ] && break
  done
  printf '%s\n' "$out" | tr -d '\r'
}

FAILS=0
report() { # nom sortie
  local bad passes
  passes=$(printf '%s\n' "$2" | grep -c '^PASS')
  bad=$(printf '%s\n' "$2" | grep -v '^PASS' | grep -v '^$')
  if [ -z "$bad" ] && [ "$passes" -gt 0 ]; then
    echo "ok     $1 ($passes vérifications)"
  else
    echo "ECHEC  $1"
    if [ -z "$bad" ]; then echo "         aucune vérification n'a tourné"; else printf '%s\n' "$bad" | sed 's/^/         /'; fi
    FAILS=$((FAILS + 1))
  fi
}

echo "== Navigateur : $CHROME"
echo "== Jeux, laboratoire compris (premier et dernier niveau de chacun)"
while read -r id diff; do
  out=$(run_page "http://localhost:$PORT/tests/harness.html?g=$id&d=$diff&auto=1&seed=9" 500,900 8000 '<pre class="notice">(.*?)</pre>')
  report "$id / $diff" "$out"
done < <(node -e "import('./js/games/index.js').then(({ ALL_GAMES }) => { for (const g of ALL_GAMES) { const d = g.difficulties; console.log(g.id, d[0].id); if (d.length > 1) console.log(g.id, d[d.length - 1].id); } })")

echo "== Parcours complet de l'appli (390 px : créer, reprendre, supprimer, limite, victoire, export)"
out=$(run_page "http://localhost:$PORT/tests/app-flow.html" 700,900 90000 '<pre id="out">(.*?)</pre>')
report "parcours complet" "$out"

echo "== Défilement des pages de jeu en 1280x720 (aucune ne doit défiler)"
out=$(run_page "http://localhost:$PORT/tests/scroll-check.html?w=1280&h=720" 1280,720 120000 '<pre id="out">(.*?)</pre>')
scrolling=$(printf '%s\n' "$out" | grep '^SCROLL' | grep '/' || true)
if [ "$out" = "NO RESULT" ]; then
  echo "ECHEC  relevé de défilement : aucun résultat"; FAILS=$((FAILS + 1))
elif [ -n "$scrolling" ]; then
  echo "ECHEC  des pages de jeu défilent :"; printf '%s\n' "$scrolling" | sed 's/^/         /'; FAILS=$((FAILS + 1))
elif [ "$(printf '%s\n' "$out" | grep -c '/')" -eq 0 ]; then
  echo "ECHEC  relevé de défilement : aucune page de jeu mesurée"; FAILS=$((FAILS + 1))
else
  echo "ok     $(printf '%s\n' "$out" | grep -c .) pages mesurées, aucune page de jeu ne défile"
fi

echo
if [ "$FAILS" -eq 0 ]; then echo "Tous les tests navigateur passent."; else echo "$FAILS groupe(s) en échec."; fi
[ "$FAILS" -eq 0 ]

#!/usr/bin/env bash
# Avvia l'interfaccia di auto_ig e la apre nel browser.
# Uso: ./avvia.sh   (Ctrl+C per chiudere)
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")"
URL="http://127.0.0.1:5000"

# Già in esecuzione? Apro solo il browser.
if curl -s -o /dev/null "$URL/coda"; then
  echo "Interfaccia già attiva su $URL"
  xdg-open "$URL" >/dev/null 2>&1 || true
  exit 0
fi

# Primo avvio: crea l'ambiente virtuale e installa le dipendenze.
if [ ! -x .venv/bin/python ]; then
  echo "Preparo l'ambiente (solo la prima volta)..."
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi

# Apre il browser appena il server risponde.
(
  for _ in $(seq 1 40); do
    curl -s -o /dev/null "$URL/coda" && { xdg-open "$URL" >/dev/null 2>&1 || true; break; }
    sleep 0.25
  done
) &

exec .venv/bin/python -m auto_ig.ui

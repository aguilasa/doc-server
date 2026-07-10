#!/usr/bin/env bash
set -euo pipefail

MISE="$HOME/.local/bin/mise"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mapfile -t VERSIONS < <("$MISE" list node 2>/dev/null | awk '/^node/ {print $2}')

if [[ ${#VERSIONS[@]} -eq 0 ]]; then
  echo "Nenhuma versão do Node encontrada via mise."
  exit 1
fi

echo "Versões encontradas: ${VERSIONS[*]}"
echo

cd "$PROJECT_DIR"

FAILED=()

for VERSION in "${VERSIONS[@]}"; do
  echo "──────────────────────────────────────────"
  echo "Node $VERSION"
  echo "──────────────────────────────────────────"
  if "$MISE" exec "node@$VERSION" -- npm run install:local 2>&1; then
    echo "✓ Node $VERSION — OK"
  else
    echo "✗ Node $VERSION — FALHOU"
    FAILED+=("$VERSION")
  fi
  echo
done

echo "══════════════════════════════════════════"
if [[ ${#FAILED[@]} -eq 0 ]]; then
  echo "Instalação concluída em todas as versões."
else
  echo "Falhou em: ${FAILED[*]}"
  exit 1
fi

#!/usr/bin/env zsh
set -euo pipefail

cd "$(dirname "$0")"

echo "Publicar PrediSync en GitHub"
print -n "Usuario GitHub: "
read -r GH_USER
print -n "Repositorio (default: PrediSync): "
read -r GH_REPO
if [[ -z "$GH_REPO" ]]; then
  GH_REPO="PrediSync"
fi

REMOTE_URL="https://github.com/${GH_USER}/${GH_REPO}.git"

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

echo "Usando remote: $REMOTE_URL"
git push -u origin main

echo ""
echo "Push completado. Ahora activa GitHub Pages:"
echo "1) Abre https://github.com/${GH_USER}/${GH_REPO}/settings/pages"
echo "2) Build and deployment > Source: Deploy from a branch"
echo "3) Branch: main, folder: /(root), Save"
echo "4) Abre: https://${GH_USER}.github.io/${GH_REPO}/"

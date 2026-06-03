#!/usr/bin/env zsh
set -euo pipefail

cd "$(dirname "$0")"

echo "Publicar PrediSync en GitHub"
echo "Pega la URL HTTPS completa del repositorio remoto."
echo "Ejemplo: https://github.com/tu-usuario/PrediSync.git"
print -n "URL repo: "
read -r REMOTE_URL

if [[ -z "$REMOTE_URL" ]]; then
  echo "URL vacia. Cancelando."
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

echo "Usando remote: $REMOTE_URL"
if ! git push -u origin main; then
  echo ""
  echo "No se pudo hacer push. Verifica dos cosas:"
  echo "1) Que el repo exista en GitHub y no este vacio si ya tenia historial distinto."
  echo "2) Que pegaste la URL HTTPS exacta del repo."
  exit 1
fi

echo ""
echo "Push completado. Ahora activa GitHub Pages en la pagina de Settings > Pages de tu repo."
echo "2) Build and deployment > Source: Deploy from a branch"
echo "3) Branch: main, folder: /(root), Save"
echo "4) Abre la URL publicada que GitHub Pages te mostrara en esa seccion."

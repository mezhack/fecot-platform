#!/bin/bash
# Script de atualização de produção
# Uso: ./deploy.sh [backend|frontend|all]
# Rode na raiz do projeto, dentro da VPS, como usuário `fecot`.

set -euo pipefail

MODE="${1:-all}"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Atualizando código..."
cd "$PROJECT_ROOT"
git pull --rebase

deploy_backend() {
  echo
  echo "==> Deploy do backend..."
  cd "$PROJECT_ROOT/backend"
  source .venv/bin/activate
  pip install -e . --quiet
  alembic upgrade head
  deactivate
  sudo systemctl restart fecot-backend
  sleep 2
  if ! curl -sf http://127.0.0.1:3002/api/health > /dev/null; then
    echo "⚠️  Backend não respondeu ao health check! Verifique:"
    echo "   sudo journalctl -u fecot-backend -n 50"
    exit 1
  fi
  echo "✅ Backend OK"
}

deploy_frontend() {
  echo
  echo "==> Deploy do frontend..."
  cd "$PROJECT_ROOT/frontend"
  npm install --silent --no-audit --no-fund
  npm run build
  sudo systemctl restart fecot-frontend
  sleep 3
  if ! curl -sfI http://127.0.0.1:3000 > /dev/null; then
    echo "⚠️  Frontend não respondeu! Verifique:"
    echo "   sudo journalctl -u fecot-frontend -n 50"
    exit 1
  fi
  echo "✅ Frontend OK"
}

case "$MODE" in
  backend)  deploy_backend ;;
  frontend) deploy_frontend ;;
  all)      deploy_backend; deploy_frontend ;;
  *)        echo "Uso: $0 [backend|frontend|all]"; exit 1 ;;
esac

echo
echo "🎉 Deploy concluído."

#!/usr/bin/env bash
set -euo pipefail

# JellyCord VPS deploy (Ubuntu/Debian-ish)
#
# Usage (run on VPS):
#   curl -fsSL <your-raw-github-url>/scripts/vps-deploy.sh | bash
#
# Then:
#   cd ~/jellycord
#   cp .env.example .env
#   $EDITOR .env   # set secrets
#   docker compose -f docker-compose.prod.yml up -d --build

REPO_URL="${REPO_URL:-https://github.com/shayyz-code/jellycord.git}"
APP_DIR="${APP_DIR:-$HOME/jellycord}"

# Optional: read deploy settings from .env.deploy (next to repo)
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-$APP_DIR/.env.deploy}"

load_env_file() {
  local f="$1"
  if [ -f "$f" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$f"
    set +a
  fi
}

need_cmd() { command -v "$1" >/dev/null 2>&1; }

install_docker() {
  if need_cmd docker && docker compose version >/dev/null 2>&1; then
    return
  fi

  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg

  sudo install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
  fi

  . /etc/os-release
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    ${UBUNTU_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  sudo usermod -aG docker "$USER" || true
}

install_git() {
  if need_cmd git; then
    return
  fi
  sudo apt-get update -y
  sudo apt-get install -y git
}

clone_or_update_repo() {
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" fetch --all --prune
    git -C "$APP_DIR" pull --ff-only
  else
    git clone "$REPO_URL" "$APP_DIR"
  fi
}

main() {
  if ! need_cmd sudo; then
    echo "sudo is required"
    exit 1
  fi

  install_git
  install_docker
  clone_or_update_repo
  load_env_file "$DEPLOY_ENV_FILE"

  # Make prod compose pick up deployment vars without editing YAML.
  # docker compose reads .env automatically; we symlink it to .env.deploy for deployment config.
  if [ -f "$APP_DIR/.env.deploy" ] && [ ! -f "$APP_DIR/.env" ]; then
    ln -s ".env.deploy" "$APP_DIR/.env" || true
  fi

  echo
  echo "Repo ready at: $APP_DIR"
  echo
  echo "Next:"
  echo "  cd $APP_DIR"
  echo "  cp .env.deploy.example .env.deploy"
  echo "  nano .env.deploy    # set JELLYCORD_VPS_IP + host port/bind"
  echo "  cp .env.secrets.example .env.secrets"
  echo "  nano .env.secrets   # set JELLYCORD_JWT_SECRET + JELLYCORD_ADMIN_KEY"
  echo "  docker compose --env-file .env.deploy -f docker-compose.prod.yml --env-file .env.secrets up -d --build"
  echo
  echo "Update/redeploy later:"
  echo "  cd $APP_DIR && git pull --ff-only && docker compose --env-file .env.deploy -f docker-compose.prod.yml --env-file .env.secrets up -d --build"

  if [ "${JELLYCORD_VPS_IP:-}" != "" ]; then
    echo
    echo "If bound publicly, server would be at:"
    echo "  http://${JELLYCORD_VPS_IP}:${JELLYCORD_HOST_PORT:-8080}"
  fi
}

main "$@"

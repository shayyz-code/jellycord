#!/usr/bin/env bash
set -euo pipefail

# JellyCord Production Push Deploy Script
# This script pushes local files to the VPS and triggers a redeploy.

# Colors for logging
BLUE='\033[34m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}==>${NC} ${BOLD}$1${NC}"; }
BOLD='\033[1m'

# Check if .env.deploy exists for server details
if [ ! -f ".env.deploy" ]; then
    log_error ".env.deploy not found! Please create it from .env.deploy.example"
    exit 1
fi

# Load deployment variables
# Expected: JELLYCORD_VPS_USER, JELLYCORD_VPS_IP, APP_DIR
set -a
source .env.deploy
set +a

VPS_USER="${JELLYCORD_VPS_USER:-root}"
VPS_IP="${JELLYCORD_VPS_IP:?JELLYCORD_VPS_IP must be set in .env.deploy}"
REMOTE_DIR="${APP_DIR:-/home/$VPS_USER/jellycord}"
SSH_TARGET="$VPS_USER@$VPS_IP"

log_info "Deploying to ${BOLD}${SSH_TARGET}:${REMOTE_DIR}${NC}"

# 1. Prepare remote directory
log_step "Preparing remote directory..."
ssh "$SSH_TARGET" "mkdir -p $REMOTE_DIR $REMOTE_DIR/server"
log_success "Remote directory ready."

# 2. Upload files one by one with status
FILES_TO_PUSH=(
    "docker-compose.prod.yml"
    "server/Dockerfile"
    "server/.dockerignore"
    "go.mod"
    "go.sum"
    ".env.deploy"
)

# Also push the entire server/internal directory
log_step "Uploading core files..."

for file in "${FILES_TO_PUSH[@]}"; do
    if [ -f "$file" ]; then
        log_info "Pushing $file..."
        scp "$file" "$SSH_TARGET:$REMOTE_DIR/$file"
    elif [ -d "$file" ]; then
        log_info "Pushing directory $file..."
        scp -r "$file" "$SSH_TARGET:$REMOTE_DIR/$file"
    else
        log_warn "Skip: $file not found."
    fi
done

# Sync directories
log_step "Syncing source code..."
log_info "Pushing server/ directory..."
# Create the server directory structure first
ssh "$SSH_TARGET" "mkdir -p $REMOTE_DIR/server"
# Push the entire server directory (includes internal and cmd)
scp -r server/* "$SSH_TARGET:$REMOTE_DIR/server/"
log_success "Source code synced."

# 3. Check for secrets on remote
log_step "Checking for remote secrets..."
if ! ssh "$SSH_TARGET" "[ -f $REMOTE_DIR/.env.secrets ]"; then
    log_warn ".env.secrets missing on VPS!"
    if [ -f ".env.secrets" ]; then
        log_info "Found local .env.secrets, uploading..."
        scp ".env.secrets" "$SSH_TARGET:$REMOTE_DIR/.env.secrets"
    else
        log_error "No .env.secrets found locally or remotely. Deployment will fail."
    fi
else
    log_success "Remote secrets found."
fi

# 4. Remote build and up
log_step "Triggering remote build and restart..."
ssh "$SSH_TARGET" "cd $REMOTE_DIR && \
    docker compose -f docker-compose.prod.yml --env-file .env.deploy --env-file .env.secrets up -d --build"

log_success "Deployment completed successfully!"
log_info "Server should be live at: ${BOLD}http://$VPS_IP:${JELLYCORD_HOST_PORT:-8080}${NC}"

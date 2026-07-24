#!/usr/bin/env bash
set -euo pipefail

# Local demo credential bridge (managed by tools/fix_demo_autofill.mjs)
demo_credentials_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$demo_credentials_project_dir/.env" ]; then
  while IFS= read -r demo_credentials_line || [ -n "$demo_credentials_line" ]; do
    case "$demo_credentials_line" in ''|'#'*) continue ;; esac
    demo_credentials_line="${demo_credentials_line#export }"
    demo_credentials_key="${demo_credentials_line%%=*}"
    demo_credentials_value="${demo_credentials_line#*=}"
    case "$demo_credentials_key" in
      NODE_ENV|ENABLE_DEMO_CREDENTIAL_AUTOFILL|DEMO_EMAIL|DEMO_PASSWORD|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|SEED_USER_EMAIL|SEED_USER_PASSWORD|PROVISION_ADMIN_EMAIL|PROVISION_ADMIN_PASSWORD|BOOTSTRAP_ADMIN_EMAIL|BOOTSTRAP_ADMIN_PASSWORD|ADMIN_EMAIL|ADMIN_PASSWORD|DEFAULT_EMAIL|DEFAULT_PASSWORD|DEMO_TENANT|BOOTSTRAP_TENANT_SLUG|GOVERNANCE_TENANT_ID|TENANT_ID) ;;
      *) continue ;;
    esac
    [ -n "${!demo_credentials_key+x}" ] && continue
    demo_credentials_first="${demo_credentials_value:0:1}"
    demo_credentials_last="${demo_credentials_value: -1}"
    if { [ "$demo_credentials_first" = '"' ] && [ "$demo_credentials_last" = '"' ]; } || { [ "$demo_credentials_first" = "'" ] && [ "$demo_credentials_last" = "'" ]; }; then
      demo_credentials_value="${demo_credentials_value:1:${#demo_credentials_value}-2}"
    fi
    export "$demo_credentials_key=$demo_credentials_value"
  done < "$demo_credentials_project_dir/.env"
fi
demo_credentials_email=""
demo_credentials_password=""
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
if [ -n "${PROVISION_ADMIN_EMAIL:-}" ] && [ -n "${PROVISION_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$PROVISION_ADMIN_EMAIL"
  demo_credentials_password="$PROVISION_ADMIN_PASSWORD"
elif [ -n "${BOOTSTRAP_ADMIN_EMAIL:-}" ] && [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$BOOTSTRAP_ADMIN_EMAIL"
  demo_credentials_password="$BOOTSTRAP_ADMIN_PASSWORD"
elif [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_ADMIN_EMAIL"
  demo_credentials_password="$SEED_ADMIN_PASSWORD"
elif [ -n "${SEED_USER_EMAIL:-}" ] && [ -n "${SEED_USER_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_USER_EMAIL"
  demo_credentials_password="$SEED_USER_PASSWORD"
elif [ -n "${DEMO_EMAIL:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  demo_credentials_email="$DEMO_EMAIL"
  demo_credentials_password="$DEMO_PASSWORD"
elif [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$ADMIN_EMAIL"
  demo_credentials_password="$ADMIN_PASSWORD"
elif [ -n "${DEFAULT_EMAIL:-}" ] && [ -n "${DEFAULT_PASSWORD:-}" ]; then
  demo_credentials_email="$DEFAULT_EMAIL"
  demo_credentials_password="$DEFAULT_PASSWORD"
fi
if [ "${NODE_ENV:-development}" != production ] && [ "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" = true ] && [ -n "$demo_credentials_email" ] && [ -n "$demo_credentials_password" ]; then
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_DEMO_EMAIL="$demo_credentials_email"
  export NEXT_PUBLIC_DEMO_PASSWORD="$demo_credentials_password"
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export VITE_DEMO_EMAIL="$demo_credentials_email"
  export VITE_DEMO_PASSWORD="$demo_credentials_password"
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export REACT_APP_DEMO_EMAIL="$demo_credentials_email"
  export REACT_APP_DEMO_PASSWORD="$demo_credentials_password"
  if [ -n "$demo_credentials_tenant" ]; then
    export NEXT_PUBLIC_DEMO_TENANT="$demo_credentials_tenant"
    export VITE_DEMO_TENANT="$demo_credentials_tenant"
    export REACT_APP_DEMO_TENANT="$demo_credentials_tenant"
  else
    unset NEXT_PUBLIC_DEMO_TENANT VITE_DEMO_TENANT REACT_APP_DEMO_TENANT
  fi
else
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  unset NEXT_PUBLIC_DEMO_EMAIL NEXT_PUBLIC_DEMO_PASSWORD NEXT_PUBLIC_DEMO_TENANT
  unset VITE_DEMO_EMAIL VITE_DEMO_PASSWORD VITE_DEMO_TENANT
  unset REACT_APP_DEMO_EMAIL REACT_APP_DEMO_PASSWORD REACT_APP_DEMO_TENANT
fi
unset demo_credentials_email demo_credentials_password demo_credentials_tenant demo_credentials_project_dir demo_credentials_line demo_credentials_key demo_credentials_value demo_credentials_first demo_credentials_last

project_dir="$(cd "$(dirname "$0")" && pwd)"
backend_pid=""
frontend_pid=""

fail() {
  echo "start.sh: $*" >&2
  exit 1
}

[ -f "$project_dir/.env" ] || fail "copy .env.example to .env and supply local secrets"
set -a
# shellcheck disable=SC1091
source "$project_dir/.env"
set +a
[ "${#JWT_SECRET}" -ge 32 ] || fail "JWT_SECRET in .env must contain at least 32 characters"
backend_port="${PORT:-${BACKEND_PORT:-5001}}"
frontend_port="${FRONTEND_PORT:-${CLIENT_PORT:-3000}}"
[ "$backend_port" != "$frontend_port" ] || fail "backend and frontend ports must be different"
[ -d "$project_dir/backend/node_modules" ] || fail "backend dependencies are absent; run the documented npm ci step explicitly"
[ -d "$project_dir/frontend/node_modules" ] || fail "frontend dependencies are absent; run the documented npm ci step explicitly"

check_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1 && lsof -ti ":${port}" >/dev/null 2>&1; then
    fail "port ${port} is already owned by another process; stop it explicitly or configure another port"
  fi
}

cleanup() {
  trap - EXIT
  [ -z "$frontend_pid" ] || kill "$frontend_pid" 2>/dev/null || true
  [ -z "$backend_pid" ] || kill "$backend_pid" 2>/dev/null || true
  [ -z "$frontend_pid" ] || wait "$frontend_pid" 2>/dev/null || true
  [ -z "$backend_pid" ] || wait "$backend_pid" 2>/dev/null || true
}

shutdown() {
  cleanup
  exit 130
}

trap cleanup EXIT
trap shutdown INT TERM
check_port "$backend_port"
check_port "$frontend_port"

if [ "${ALLOW_SCHEMA_MIGRATION:-false}" = "true" ]; then
  : "${DATABASE_URL:?DATABASE_URL is required for migrations}"
  for migration in "$project_dir"/backend/migrations/*.sql; do
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
  done
  node "$project_dir/backend/create-admin.js"
fi

(
  cd "$project_dir/backend"
  PORT="$backend_port" node src/index.js
) &
backend_pid="$!"

(
  cd "$project_dir/frontend"
  BACKEND_PORT="$backend_port" npm run dev -- --host "${HOST:-127.0.0.1}" --port "$frontend_port" --strictPort
) &
frontend_pid="$!"

echo "Backend child $backend_pid; frontend child $frontend_pid."
echo "No dependency install, database creation, migration, seed, system-service start, or port-owner termination was performed."
wait "$backend_pid" "$frontend_pid"

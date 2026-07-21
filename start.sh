#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
backend_port="5001"
frontend_port="3000"
backend_pid=""
frontend_pid=""

fail() {
  echo "start.sh: $*" >&2
  exit 1
}

[ -f "$project_dir/.env" ] || fail "copy .env.example to .env and supply local secrets"
jwt_secret="$(sed -n 's/^JWT_SECRET=//p' "$project_dir/.env" | tail -n 1)"
[ "${#jwt_secret}" -ge 32 ] || fail "JWT_SECRET in .env must contain at least 32 characters"
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

(
  cd "$project_dir/backend"
  node src/index.js
) &
backend_pid="$!"

(
  cd "$project_dir/frontend"
  npm run dev -- --host 127.0.0.1 --port "$frontend_port"
) &
frontend_pid="$!"

echo "Backend child $backend_pid; frontend child $frontend_pid."
echo "No dependency install, database creation, migration, seed, system-service start, or port-owner termination was performed."
wait "$backend_pid" "$frontend_pid"

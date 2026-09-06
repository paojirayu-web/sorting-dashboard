#!/usr/bin/env bash
set -euo pipefail

# Resolve project root (directory containing this script)
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="${SOURCE_DIR}/production_package"

echo "========================================================"
echo "  Next.js Production Packager (macOS / Linux)"
echo "========================================================"
echo "Project Directory: ${SOURCE_DIR}"
echo "Target Directory:  ${DIST_DIR}"
echo

if [[ ! -d "${SOURCE_DIR}/.next/standalone" ]]; then
    echo "[ERROR] .next/standalone folder not found!"
    echo
    echo "Please ensure:"
    echo '  1. You ran "npm run build" successfully.'
    echo "  2. Your next.config.ts/js contains: output: 'standalone'"
    echo
    exit 1
fi

echo "Cleaning old package if exists..."
rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

echo "[1/6] Copying standalone core files..."
cp -R "${SOURCE_DIR}/.next/standalone/." "${DIST_DIR}/"

echo "[2/6] Copying static assets (.next/static)..."
mkdir -p "${DIST_DIR}/.next/static"
cp -R "${SOURCE_DIR}/.next/static/." "${DIST_DIR}/.next/static/"

echo "[3/6] Copying public folder assets..."
if [[ -d "${SOURCE_DIR}/public" ]]; then
    mkdir -p "${DIST_DIR}/public"
    cp -R "${SOURCE_DIR}/public/." "${DIST_DIR}/public/"
fi

echo "[4/6] Environment files (skipped — use .env on server only)..."
rm -f "${DIST_DIR}/.env" "${DIST_DIR}/.env.local"
find "${DIST_DIR}" -maxdepth 1 -name '.env.*' -type f -delete 2>/dev/null || true
if [[ -f "${SOURCE_DIR}/.env.example" ]]; then
    cp "${SOURCE_DIR}/.env.example" "${DIST_DIR}/.env.example"
    echo "- .env.example copied as reference (no secrets)."
else
    echo "- No local env copied; keep .env on the server."
fi

echo "[5/6] Automation schedule (skipped — keep data/ on server)..."

echo "[6/6] Creating run_server.sh..."
cat > "${DIST_DIR}/run_server.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-}"

if [[ -z "${PORT}" ]]; then
    echo
    read -r -p "Enter Port Number [Default 8080]: " USR_PORT
    PORT="${USR_PORT:-8080}"
else
    PORT="${PORT}"
fi

export PORT

echo "---------------------------------------------------"
echo "  Starting Next.js Server on Port: ${PORT}"
echo "  (Press Ctrl+C to stop)"
echo "---------------------------------------------------"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"
node server.js
EOF
chmod +x "${DIST_DIR}/run_server.sh"

echo
echo "========================================================"
echo "  SUCCESS: Production package is ready!"
echo "========================================================"
echo "Summary Location: ${DIST_DIR}"
echo
echo "To Deploy:"
echo '  1. Copy "production_package" to the server (safe to overwrite — no .env or data/).'
echo "  2. Server keeps its own .env and data/ folder."
echo "  3. pm2 restart sorting-dashboard   (or ./run_server.sh 8021)"
echo

if [[ -t 0 ]]; then
    read -r -p "Press Enter to continue..."
fi

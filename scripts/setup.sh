#!/usr/bin/env bash
# One-command setup for working on this repository.
set -euo pipefail
cd "$(dirname "$0")/.."
# --with-deps also installs Chromium's system libraries (Linux, needs sudo). The dev container uses it.
deps=""; [ "${1:-}" = "--with-deps" ] && deps="--with-deps"

say() { printf '\n== %s\n' "$1"; }

say "Node"
# package.json requires Node 22.12 or newer; CI builds with the version in .nvmrc.
if ! node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=12)?0:1)' 2>/dev/null; then
  echo "Node 22.12 or newer is required (found: $(node -v 2>/dev/null || echo none)). Install it, e.g. with nvm: nvm install 22"; exit 1
fi
echo "Node $(node -v)"

say "Dependencies (exact versions from the lockfile)"
npm ci

say "Chromium for the phone-layout check"
npx --no-install playwright install $deps chromium || echo "Could not install Chromium; npm run qa:overflow will not work until it is installed."

say "Tools"
for tool in gh gitleaks; do
  if command -v "$tool" >/dev/null 2>&1; then echo "ok       $tool"; else echo "missing  $tool"; fi
done
command -v gh >/dev/null 2>&1 && (gh auth status >/dev/null 2>&1 && echo "gh is logged in" || echo "Run: gh auth login")
command -v gitleaks >/dev/null 2>&1 || echo "gitleaks is optional locally (CI always scans): https://github.com/gitleaks/gitleaks#installing"

say "Done"
echo "Next: npm run dev to work on the site, npm run check before pushing. Deployment setup is in README.md."

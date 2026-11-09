#!/usr/bin/env bash
# The checks CI runs (.github/workflows/ci.yml): the `check` job's lint,
# type-check, tests with coverage thresholds, the JSON Schema up to date,
# build, and pack; then the `browser` job's Playwright tests (Chromium
# installed once with `npx playwright install chromium`).
# Prints one line per step; the full output of each goes to
# .logs/<step>.log, and a failing step also prints its last 30 lines.
#
# Usage: scripts/check.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
logs="$root/.logs"
mkdir -p "$logs"
cd "$root"
failed=0

# run <name> <command...>
run() {
  local name=$1
  shift
  local log="$logs/$name.log"
  if "$@" >"$log" 2>&1; then
    echo "pass  $name"
  else
    echo "FAIL  $name  (full log: .logs/$name.log)"
    tail -n 30 "$log"
    failed=1
  fi
}

# Regenerates the schema and fails if that changed the committed file.
# Like CI, it leaves the regenerated file in place: commit it if it's right.
schema_up_to_date() {
  npm run generate:schema && git diff --exit-code character-sheet.schema.json
}

run lint npm run lint
run typecheck npm run typecheck
run test npm test
run schema schema_up_to_date
run build npm run build
run pack npm pack --dry-run
run browser npm run test:browser

exit "$failed"

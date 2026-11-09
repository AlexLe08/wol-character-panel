#!/usr/bin/env bash
# Prepares a fresh checkout (usually a git worktree under .claude/worktrees/)
# to run: node_modules from the lockfile. The package has no env files or
# other gitignored setup to copy from the main checkout. Safe to re-run.
#
# Usage: scripts/setup-worktree.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd -P)"

echo "npm ci"
(cd "$root" && npm ci --loglevel=error --no-audit --no-fund)

echo "ready"

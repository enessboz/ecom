#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm -r typecheck
pnpm -r test

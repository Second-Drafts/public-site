#!/usr/bin/env bash
# Not `set -e`: a non-zero oxlint exit is the signal we report, not a script failure.
set -uo pipefail

input=$(cat)
file_path=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).tool_input?.file_path??"")}catch{}})')

[ -n "$file_path" ] || exit 0
[ -f "$file_path" ] || exit 0

case "$file_path" in
  *.js | *.jsx | *.ts | *.tsx | *.mjs | *.cjs | *.mts | *.cts | *.astro) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}"
[ -x node_modules/.bin/oxlint ] || exit 0

if ! lint_output=$(node_modules/.bin/oxlint --fix --quiet "$file_path" 2>&1); then
  printf 'Lint errors remain in %s after auto-fix:\n\n%s\n' "$file_path" "$lint_output" >&2
  exit 2
fi

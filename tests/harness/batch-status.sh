# Shared by the offline Kitchen aggregate runner. POSIX sh; no network or DB access.
# A bare `wait` returns the status of the last job (or zero when given no PIDs),
# so record and inspect EVERY child's exit status explicitly.
PIDS=''
rc=0
track_pid() { PIDS="$PIDS $1"; }
wait_batch() {
  for pid in $PIDS; do
    if wait "$pid"; then :; else rc=1; fi
  done
  PIDS=''
}
require_result() {
  file=$1
  if [ ! -s "$file" ]; then echo "MISSING/EMPTY result: $file" >&2; rc=1; return 1; fi
  if ! grep -Eq '^ALL [1-9][0-9]* CHECKS PASS[[:space:]]*$' "$file"; then
    echo "NO COMPLETE PASS SUMMARY: $file" >&2; rc=1; return 1
  fi
  if grep -Eq '^(FAIL([[:space:]]|$)|HARNESS TIMEOUT|WATCHDOG|EXCEPTION|THREW|stalled after)' "$file"; then
    echo "FAILED PROBE: $file" >&2; rc=1; return 1
  fi
  return 0
}

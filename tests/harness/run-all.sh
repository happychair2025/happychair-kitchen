#!/bin/sh
# Runs the catalog gate and every probe that targets the current offline fixture, in parallel,
# writing tests/<probe>.results.txt. Network-free (see run.js). Exit 1 if anything fails.
# Not run here: board-selection (live data), board-ux / lockout / verification-contract (the
# retired ?fixture=1 built-in fixture), render-churn / second-check-persistence (reference the
# removed verifyOpenId), paired-authorization (its own 115h fixture) — all already stale at 09b6b94.
cd "$(dirname "$0")/../.." || exit 2
node tests/i18n/check-catalog.js || exit 1
L=$(mktemp -d)   # per-run harness logs (stderr: start-up retries, page exceptions)
run(){ node tests/harness/run.js "tests/$1.probe.js" --query="$2" --out="tests/$3.results.txt" --timeout=420000 >"$L/$3.log" 2>&1 & }
for p in kitchen-copy kitchen-i18n-cycle kitchen-i18n kitchen-milestones record-sheet second-check-success sheet-coherence ux-pass; do run $p 'inst=1' $p; done
wait
# The long timing-sensitive safety probes get their own batch: under the full parallel load a
# headless Chrome could stall before running the page at all.
run safety-continuity 'inst=1&rows=none' safety-continuity
run safety-continuity-2 'inst=1&rows=none' safety-continuity-2
run lockout-priority 'inst=1&rows=none' lockout-priority
run safety-continuity 'inst=1&rows=none&cold=1' safety-continuity.cold
wait
# Matrices, concatenated in the order the committed results record them.
T=$(mktemp -d)
for l in en zh-CN es; do node tests/harness/run.js tests/kitchen-i18n-boot.probe.js --query="inst=1&devlocale=$l" --out="$T/boot-$l" >/dev/null 2>&1 & done; wait
cat "$T/boot-en" "$T/boot-zh-CN" "$T/boot-es" | grep -v '^network:' > tests/kitchen-i18n-boot.results.txt
for l in en es zh-CN; do
  for v in 1280x800 1180x820 1024x768 820x1180 390x844; do
    node tests/harness/run.js tests/kitchen-layout.probe.js --query="inst=1&qalocale=$l" --size=$v --out="$T/layout-$l-$v" >/dev/null 2>&1 &
  done; wait
done
: > tests/kitchen-layout.results.txt
for l in en es zh-CN; do for v in 1280x800 1180x820 1024x768 820x1180 390x844; do grep -v '^network:' "$T/layout-$l-$v" >> tests/kitchen-layout.results.txt; done; done
rm -rf "$T"
echo "harness logs: $L"
rc=0
for f in kitchen-copy kitchen-i18n-cycle kitchen-i18n kitchen-layout kitchen-milestones record-sheet second-check-success sheet-coherence ux-pass kitchen-i18n-boot safety-continuity safety-continuity-2 safety-continuity.cold lockout-priority; do
  r=$(grep -E 'CHECKS PASS|pass, |TIMEOUT|stalled' "tests/$f.results.txt" | sort | uniq -c | tr -s ' ' | tr '\n' ';'); echo "$f: $r"
  if grep -qE '^FAIL|TIMEOUT|stalled|WATCHDOG' "tests/$f.results.txt"; then rc=1; fi
done
exit $rc

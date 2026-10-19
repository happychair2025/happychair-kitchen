# Kitchen offline safety harness: result freshness review (Oct 19, 2026)

**Review only.** No production, database, or runtime code changed. No probes executed in this review.

## Evidence from staging/kitchen

- `tests/harness/run-all.sh` starts multiple asynchronous offline probes with `run()` and then reads `tests/*.results.txt` at the end.
- These results files are committed in the repository. The runner does not clear each result file before a new probe starts.
- The final gate fails on `FAIL`, `TIMEOUT`, `stalled`, or `WATCHDOG`, but does not require a new completion marker for each probe.
- If a probe exits before rewriting its file, a prior all-PASS result may remain. A missing or partial result can also escape the current gate. This is a **test-runner evidence gap**, not evidence of an application safety failure.
- The Kitchen implementation gates lockout eligibility on `!c._fromCache`, and its safety probes cover offline cache restore, stale-write refusal, lockout priority, reconnect read, and independent declarations. The current code appears to preserve those safeguards, but this pass did not execute them.

## Proposed acceptance gate (do not merge untested)

1. Invalidate each target result before starting its probe, or write each run into a fresh temporary directory.
2. Fail if a required result is missing, empty, or lacks a terminal `ALL <n> CHECKS PASS` marker.
3. For the locale boot matrix, require three independent completion markers. For the layout matrix, require fifteen.
4. Deliberately force one probe to exit before producing output and verify the full runner exits nonzero even if a committed result file exists.
5. Deliberately drop one locale/viewport result and verify the matrix fails.
6. Run the complete network-stubbed harness in an isolated workspace; save logs, exact commit SHA, exit status, and completion counts.
7. Do not run any tests that use live venue records. `board-selection` is explicitly excluded from `run-all.sh` because it uses live data.

## Release status

This is a review finding only. No new automated checks or runtime fixes were applied; prior committed PASS logs are historical evidence and are not a current execution result. Keep the test harness change in a separate review branch until it can be executed and checked.

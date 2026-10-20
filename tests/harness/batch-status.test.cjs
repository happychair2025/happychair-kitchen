'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const helper = join(__dirname, 'batch-status.sh')
const run = script => spawnSync('sh', ['-c', '. "' + helper + '"\n' + script], { encoding: 'utf8' })

test('batch succeeds only when every child exits zero', () => {
  assert.equal(run('(exit 0) & track_pid $!; (exit 0) & track_pid $!; wait_batch; [ "$rc" -eq 0 ]').status, 0)
  assert.equal(run('(exit 1) & track_pid $!; (exit 0) & track_pid $!; wait_batch; [ "$rc" -eq 1 ]').status, 0)
  assert.equal(run('(exit 0) & track_pid $!; (exit 3) & track_pid $!; wait_batch; [ "$rc" -eq 1 ]').status, 0)
})

test('batch waits for all children even after an earlier failure', () => {
  const d = mkdtempSync(join(tmpdir(), 'hc-kitchen-batch-'))
  try {
    const f = join(d, 'done')
    const script = '(exit 1) & track_pid $!; (sleep 0.1; echo ready > "' + f + '") & track_pid $!; wait_batch; test -s "' + f + '" && [ "$rc" -eq 1 ]'
    const r = run(script)
    assert.equal(r.status, 0, r.stderr)
  } finally { rmSync(d, { recursive: true, force: true }) }
})

test('missing, empty, incomplete or failed output is never counted as passing', () => {
  const d = mkdtempSync(join(tmpdir(), 'hc-kitchen-result-'))
  try {
    const f = join(d, 'result')
    const q = '"' + f + '"'
    const bad = [
      'require_result ' + q + ' >/dev/null 2>&1; [ "$rc" -eq 1 ]',
      ': > ' + q + '; require_result ' + q + ' >/dev/null 2>&1; [ "$rc" -eq 1 ]',
      'printf "PASS  one\\n" > ' + q + '; require_result ' + q + ' >/dev/null 2>&1; [ "$rc" -eq 1 ]',
      'printf "PASS  one\\nALL 1 CHECKS PASS\\nFAIL  late error\\n" > ' + q + '; require_result ' + q + ' >/dev/null 2>&1; [ "$rc" -eq 1 ]',
    ]
    for (const script of bad) assert.equal(run(script).status, 0, script)
    assert.equal(run('printf "PASS  one\\nALL 1 CHECKS PASS\\n" > ' + q + '; require_result ' + q + '; [ "$rc" -eq 0 ]').status, 0)
  } finally { rmSync(d, { recursive: true, force: true }) }
})

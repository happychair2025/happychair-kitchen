'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { evaluateProbe } = require('./result-status.cjs')

const good = '\n──── SAFETY ────\nPASS  cached allergy never acknowledged\nPASS  reconnect requires server confirmation\n\nALL 2 CHECKS PASS\n'
const check = (raw, opts = { probeServed: true }) => evaluateProbe(raw, opts)

test('accepts only a complete, fresh two-check result', () => {
  assert.deepEqual(check(good), { ok: true, reason: null, checks: 2 })
})
test('refuses an old-looking pass if the new probe never loaded', () => {
  assert.equal(check(good, { probeServed: false }).ok, false)
})
test('refuses empty, truncated and summary-only output', () => {
  for (const raw of ['', 'PASS  a check\n', 'ALL 2 CHECKS PASS\n', 'PASS  one\nALL 2 CHECKS PASS']) {
    assert.equal(check(raw).ok, false, JSON.stringify(raw))
  }
})
test('refuses mismatched counts and duplicate success summaries', () => {
  assert.equal(check(good.replace('ALL 2', 'ALL 3')).ok, false)
  assert.equal(check(good + '\nALL 2 CHECKS PASS\n').ok, false)
})
test('refuses failures even if a passing summary follows', () => {
  assert.equal(check('FAIL  allergy incorrectly cleared\n' + good).ok, false)
  assert.equal(check('HARNESS TIMEOUT after 100ms\n' + good).ok, false)
  assert.equal(check('WATCHDOG stalled after 30s\n' + good).ok, false)
})
test('refuses attempted external network access even though DevTools blocks it', () => {
  assert.equal(check(good, { probeServed: true, blocked: ['https://example.org/'] }).ok, false)
})
test('refuses zero-check success and invalid input', () => {
  assert.equal(check('ALL 0 CHECKS PASS\n').ok, false)
  assert.equal(check(null).ok, false)
})

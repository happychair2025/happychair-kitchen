// Isolated, network-free Kitchen fail-closed contract tests.
// Run: node --test tests/offline-firstpaint-contract.test.mjs
// This is a source-level + extracted-function harness, NOT a browser, DB, or live allergy test.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../index.html'), 'utf8')

test('initial markup warns before the first authenticated board read', () => {
  assert.match(source, /<div class="offline-banner on" id="offlineBanner"/)
  assert.match(source, /<div class="empty-text" data-i18n="board.unverified">Allergy status unverified<\/div>/)
})

test('empty render does not claim no active allergies while offline', () => {
  assert.match(source, /th\(online\?'board.empty':'board.unverified'\)/)
})

test('reconcile rejects failed reads and caught exceptions as offline', () => {
  assert.match(source, /if\(res.error\|\|!res.data\)\{[^}]*setOnline\(false\);return false/)
  assert.match(source, /catch\(e\)\{\s*console.error\('\[kitchen\] reconcile exception:',e\);\s*setOnline\(false\);\s*return false;/)
})

test('cached anaphylaxis cannot cause an unverified lockout', () => {
  assert.match(source, /function lockoutEligible\(c\)\{return [^}]*!c\._fromCache/)
})

test('offline and verified transitions update the banner, heartbeat and empty message', () => {
  // Evaluate ONLY setOnline(), with a synthetic DOM. No app startup or network.
  const match = source.match(/function setOnline\(v\)\{[\s\S]*?\n\}/)
  assert.ok(match, 'setOnline() function exists')
  const nodes = {
    heartbeat: { className: '' },
    offlineBanner: { classList: {
      state: new Set(),
      add(key) { this.state.add(key) },
      remove(key) { this.state.delete(key) },
      contains(key) { return this.state.has(key) },
    } },
    empty: { textContent: '' },
  }
  const document = {
    getElementById(id) { return nodes[id] },
    querySelector(selector) { return selector === '#cardArea .empty-text' ? nodes.empty : null },
  }
  const setOnline = new Function('document', 'th', match[0] + ';return setOnline')(document, key => key)
  setOnline(false)
  assert.equal(nodes.heartbeat.className, 'hb off')
  assert.equal(nodes.offlineBanner.classList.contains('on'), true)
  assert.equal(nodes.empty.textContent, 'board.unverified')
  setOnline(true)
  assert.equal(nodes.heartbeat.className, 'hb ok')
  assert.equal(nodes.offlineBanner.classList.contains('on'), false)
  assert.equal(nodes.empty.textContent, 'board.empty')
})

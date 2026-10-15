// Staging configuration (C1).   node --test tests/staging-config.test.mjs
//
// Proves: every production path produces index.html BYTE FOR BYTE; a staging build differs only
// in the two config lines it replaces, names staging and never production, shows a STAGING strip,
// and refuses to run on a production Kitchen host; every misconfiguration fails the build.
// No network, no database.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import vm from 'node:vm'
import {
  configure, resolveTarget, stagingBlock, keyRef,
  PRODUCTION_URL, PRODUCTION_REF, STAGING_URL, STAGING_REF, PRODUCTION_HOSTS,
} from '../scripts/staging-config.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const HTML = readFileSync(join(root, 'index.html'), 'utf8')
const fakeKey = ref => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  Buffer.from(JSON.stringify({ iss: 'supabase', ref, role: 'anon' })).toString('base64url') + '.c2ln'
const STAGING_KEY = fakeKey(STAGING_REF)
const PROD_KEY = HTML.match(/^var SUPABASE_KEY='([^']*)';$/m)[1]

test('the committed index.html is the production board', () => {
  assert.equal(HTML.match(/^var SUPABASE_URL='([^']*)';$/m)[1], PRODUCTION_URL)
  assert.equal(keyRef(PROD_KEY), PRODUCTION_REF)
  assert.ok(!HTML.includes(STAGING_REF), 'no staging reference in the production source')
})

test('every production path is byte-for-byte index.html', () => {
  for (const env of [
    { vercelEnv: 'production' },
    { vercelEnv: 'production', url: PRODUCTION_URL, key: PROD_KEY },
    { vercelEnv: '' },
    { vercelEnv: '', url: PRODUCTION_URL, key: PROD_KEY },
  ]) {
    const r = configure(HTML, env)
    assert.equal(r.target, 'production')
    assert.ok(Buffer.from(r.html).equals(Buffer.from(HTML)), JSON.stringify(env))
  }
})

test('a production build given staging (or any non-production) variables fails', () => {
  assert.throws(() => resolveTarget({ vercelEnv: 'production', url: STAGING_URL, key: STAGING_KEY }), /production build/)
  assert.throws(() => resolveTarget({ vercelEnv: 'production', key: STAGING_KEY }), /production build/)
  assert.throws(() => resolveTarget({ vercelEnv: 'production', url: STAGING_URL }), /production build/)
})

test('a Preview build is staging or it fails', () => {
  assert.equal(resolveTarget({ vercelEnv: 'preview', url: STAGING_URL, key: STAGING_KEY }).target, 'staging')
  for (const env of [
    {}, { url: STAGING_URL }, { key: STAGING_KEY },
    { url: PRODUCTION_URL, key: PROD_KEY }, { url: STAGING_URL, key: PROD_KEY }, { url: PRODUCTION_URL, key: STAGING_KEY },
    { url: 'https://otherprojectref0000.supabase.co', key: fakeKey('otherprojectref0000') },
  ]) assert.throws(() => resolveTarget({ vercelEnv: 'preview', ...env }), undefined, JSON.stringify(env))
})

test('a local build never silently falls back to production when given a bad pair', () => {
  assert.equal(resolveTarget({ url: STAGING_URL, key: STAGING_KEY }).target, 'staging')
  assert.throws(() => resolveTarget({ url: STAGING_URL }))
  assert.throws(() => resolveTarget({ url: STAGING_URL, key: PROD_KEY }))
})

test('staging output differs from production ONLY in the replaced config lines', () => {
  const { target, html } = configure(HTML, { vercelEnv: 'preview', url: STAGING_URL, key: STAGING_KEY })
  assert.equal(target, 'staging')
  const pair = `var SUPABASE_URL='${PRODUCTION_URL}';\nvar SUPABASE_KEY='${PROD_KEY}';`
  const at = HTML.indexOf(pair)
  assert.ok(at > 0)
  const block = stagingBlock(STAGING_URL, STAGING_KEY)
  assert.equal(html, HTML.slice(0, at) + block + HTML.slice(at + pair.length))
  assert.ok(!html.includes(PRODUCTION_REF), 'no production reference in the staging output')
  assert.ok(html.includes(`var SUPABASE_URL='${STAGING_URL}';`))
  assert.ok(html.includes(`var SUPABASE_KEY='${STAGING_KEY}';`))
  // the board script still parses
  const open = html.indexOf('<script>'), close = html.lastIndexOf('</script>')
  assert.doesNotThrow(() => new vm.Script(html.slice(open + 8, close)))
})

function runBlock(hostname) {
  const appended = []
  const app = { style: {} }
  const body = { innerHTML: '', firstChild: null, insertBefore: el => appended.push(el) }
  const document = {
    title: 'HC Kitchen', body,
    createElement: () => ({ style: {}, setAttribute() {}, textContent: '' }),
    getElementById: id => (id === 'app' ? app : null),
  }
  const ctx = vm.createContext({ document, location: { hostname } })
  let error = null
  try { vm.runInContext(stagingBlock(STAGING_URL, STAGING_KEY), ctx) } catch (e) { error = e }
  return { error, appended, document, body, ctx }
}

test('a staging build refuses to start on a production Kitchen host', () => {
  for (const h of PRODUCTION_HOSTS) {
    const r = runBlock(h)
    assert.match(String(r.error), /staging build on production host/)
    assert.match(r.body.innerHTML, /Refusing to start/)
    assert.equal(r.appended.length, 0)
  }
})

test('a staging build shows a STAGING strip on every other host', () => {
  for (const h of ['happychair-kitchen-git-staging-kitchen-hc.vercel.app', '192.168.1.20', 'localhost']) {
    const r = runBlock(h)
    assert.equal(r.error, null)
    assert.equal(r.appended.length, 1)
    assert.match(r.appended[0].textContent, /STAGING/)
    assert.match(r.document.title, /^\[STAGING\] /)
    assert.equal(r.ctx.SUPABASE_URL, STAGING_URL)
  }
})

test('CLI: a misconfigured Preview build exits non-zero; --out writes a staging board', () => {
  const script = join(root, 'scripts', 'staging-config.mjs')
  const clean = { PATH: process.env.PATH }
  const bad = spawnSync(process.execPath, [script], { env: { ...clean, VERCEL_ENV: 'preview' }, encoding: 'utf8' })
  assert.equal(bad.status, 1)
  assert.match(bad.stderr, /staging guard/)
  const prodBad = spawnSync(process.execPath, [script], { env: { ...clean, VERCEL_ENV: 'production', VITE_SUPABASE_URL: STAGING_URL, VITE_SUPABASE_ANON_KEY: STAGING_KEY }, encoding: 'utf8' })
  assert.equal(prodBad.status, 1)
  const dir = mkdtempSync(join(tmpdir(), 'hc-kitchen-staging-'))
  const ok = spawnSync(process.execPath, [script, '--out', dir], { env: { ...clean, VITE_SUPABASE_URL: STAGING_URL, VITE_SUPABASE_ANON_KEY: STAGING_KEY }, encoding: 'utf8' })
  assert.equal(ok.status, 0, ok.stderr)
  const written = readFileSync(join(dir, 'index.html'), 'utf8')
  assert.ok(written.includes(STAGING_URL) && !written.includes(PRODUCTION_REF))
  // the repo's index.html is untouched by a local run
  assert.ok(Buffer.from(readFileSync(join(root, 'index.html'), 'utf8')).equals(Buffer.from(HTML)))
})

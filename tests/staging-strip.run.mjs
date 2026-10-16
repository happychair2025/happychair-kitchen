// Builds a staging board (staging-shaped key, never a real one) and runs tests/staging-strip.probe.js
// against it in the offline harness.   node tests/staging-strip.run.mjs
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = mkdtempSync(join(tmpdir(), 'hc-kitchen-strip-'))
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + Buffer.from(JSON.stringify({ iss: 'supabase', ref: 'pfzkaqqgwxdkmkmksoiz', role: 'anon' })).toString('base64url') + '.c2ln'
const env = { ...process.env, VITE_SUPABASE_URL: 'https://pfzkaqqgwxdkmkmksoiz.supabase.co', VITE_SUPABASE_ANON_KEY: key }
const b = spawnSync(process.execPath, [join(root, 'scripts/staging-config.mjs'), '--out', dir], { env, stdio: 'inherit' })
if (b.status !== 0) process.exit(1)
const out = join(root, 'tests', 'staging-strip.results.txt')
const r = spawnSync(process.execPath, [join(root, 'tests/harness/run.js'), join(root, 'tests/staging-strip.probe.js'), '--query=inst=1', `--out=${out}`, '--timeout=120000'],
  { env: { ...process.env, KITCHEN_INDEX: join(dir, 'index.html') }, stdio: 'inherit' })
const txt = readFileSync(out, 'utf8')
process.exit(r.status === 0 && / 0 failed/.test(txt) ? 0 : 1)

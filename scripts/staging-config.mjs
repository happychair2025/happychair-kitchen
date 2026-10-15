#!/usr/bin/env node
// Kitchen Supabase target — production by default, staging only when explicitly configured.
//
// index.html in the repo is the PRODUCTION board and stays that way: it hard-codes the
// production project. This script is the only way a build talks to staging, and it can only
// produce two things:
//
//   production  index.html byte for byte. Nothing is written.
//   staging     index.html with exactly the two config lines (SUPABASE_URL / SUPABASE_KEY)
//               replaced by the staging project, a visible STAGING strip, and a guard that
//               refuses to run on a production Kitchen host.
//
// Inputs (the same two names as Admin and Staff): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
//
//   VERCEL_ENV=production   always production. Given non-production variables → the build FAILS.
//   VERCEL_ENV=preview      always staging. Missing, half-set, mismatched or production
//                           variables → the build FAILS (no deployment is produced).
//   local (no VERCEL_ENV)   production unless given a matching staging pair; a half-set or
//                           mismatched pair fails rather than falling back.
//
// Usage:
//   node scripts/staging-config.mjs                  on Vercel (VERCEL=1): rewrites index.html in
//                                                    the build checkout only when staging.
//                                                    Locally: validates and prints the target.
//   node scripts/staging-config.mjs --out <dir>      writes <dir>/index.html (LAN device QA).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PRODUCTION_REF = 'hnrojtcctqgtzdrinyvu'
export const STAGING_REF = 'pfzkaqqgwxdkmkmksoiz'
export const PRODUCTION_URL = `https://${PRODUCTION_REF}.supabase.co`
export const STAGING_URL = `https://${STAGING_REF}.supabase.co`
/** Hosts that serve the PRODUCTION Kitchen. A staging build refuses to run on any of them. */
export const PRODUCTION_HOSTS = ['happychair-kitchen.vercel.app']

// The two config lines, adjacent, exactly as index.html carries them.
const PAIR = /^var SUPABASE_URL='([^']*)';\nvar SUPABASE_KEY='([^']*)';$/m

export function keyRef(key) {
  try { return JSON.parse(Buffer.from(String(key).split('.')[1], 'base64url').toString('utf8')).ref ?? null }
  catch { return null }
}

const clean = v => (v ?? '').trim()

/** Decide the target. Returns { target: 'production'|'staging', url?, key? } or throws. */
export function resolveTarget({ vercelEnv = '', url: rawUrl, key: rawKey } = {}) {
  const url = clean(rawUrl), key = clean(rawKey)
  const ref = key ? keyRef(key) : null
  if (vercelEnv === 'production') {
    // The URL decides where data goes; a key only fails the build if it decodes to another project.
    if ((url && url !== PRODUCTION_URL) || (ref !== null && ref !== PRODUCTION_REF)) {
      throw new Error('production build was given non-production VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY; remove them from the Production environment')
    }
    return { target: 'production' }
  }
  const preview = vercelEnv === 'preview'
  if (!url && !key) {
    if (preview) throw new Error('Preview build needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for the staging project')
    return { target: 'production' }
  }
  if (!url || !key) throw new Error('only one of VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY is set')
  if (!ref || url !== `https://${ref}.supabase.co`) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are for different projects')
  if (ref === PRODUCTION_REF) {
    if (preview) throw new Error('Preview variables name the production project')
    return { target: 'production' }
  }
  if (ref !== STAGING_REF) throw new Error(`VITE_SUPABASE_URL names an unknown project (${ref}); only staging is allowed`)
  if (!/^[A-Za-z0-9._-]+$/.test(key)) throw new Error('VITE_SUPABASE_ANON_KEY is not a JWT')
  return { target: 'staging', url, key }
}

/** The staging replacement for the two config lines. Keeps the same two globals. */
export function stagingBlock(url, key) {
  return [
    `var SUPABASE_URL='${url}';`,
    `var SUPABASE_KEY='${key}';`,
    `// STAGING BUILD (scripts/staging-config.mjs). Never runs on a production Kitchen host.`,
    `var HC_STAGING=true;`,
    `(function(){var p=${JSON.stringify(PRODUCTION_HOSTS)};if(p.indexOf(location.hostname.toLowerCase())!==-1){`,
    `document.body.innerHTML='<div style="padding:40px;font:600 22px system-ui;color:#fff;background:#7f1d1d;min-height:100vh">STAGING build on a production Kitchen host. Refusing to start.</div>';`,
    `throw new Error('staging build on production host');}`,
    `var s=document.createElement('div');s.id='hcStaging';s.setAttribute('role','status');s.textContent='STAGING \\u2014 test data only \\u2014 not a live kitchen';`,
    `s.style.cssText='position:fixed;top:0;left:0;right:0;height:22px;z-index:2147483647;background:#b45309;color:#fff;font:700 13px/22px system-ui,sans-serif;letter-spacing:.06em;text-align:center;pointer-events:none';`,
    `document.body.insertBefore(s,document.body.firstChild);var a=document.getElementById('app');if(a){a.style.height='calc(100vh - 22px)';a.style.marginTop='22px';}`,
    `document.title='[STAGING] '+document.title;})();`,
  ].join('\n')
}

/** Apply a target to index.html text. Production returns the input unchanged. */
export function configure(html, env) {
  const t = resolveTarget(env)
  if (t.target === 'production') return { target: 'production', html }
  const pair = PAIR.exec(html)
  if (!pair || html.match(new RegExp(PAIR.source, 'gm')).length !== 1) {
    throw new Error('index.html must contain exactly one adjacent SUPABASE_URL / SUPABASE_KEY pair')
  }
  if (pair[1] !== PRODUCTION_URL || keyRef(pair[2]) !== PRODUCTION_REF) {
    throw new Error('index.html config is not the production project; refusing to rewrite')
  }
  const out = html.slice(0, pair.index) + stagingBlock(t.url, t.key) + html.slice(pair.index + pair[0].length)
  if (out.includes(PRODUCTION_URL) || out.includes(PRODUCTION_REF)) throw new Error('staging output still references the production project')
  return { target: 'staging', html: out }
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const src = join(root, 'index.html')
  const outIdx = process.argv.indexOf('--out')
  const outDir = outIdx > -1 ? process.argv[outIdx + 1] : null
  const env = { vercelEnv: process.env.VERCEL_ENV ?? '', url: process.env.VITE_SUPABASE_URL, key: process.env.VITE_SUPABASE_ANON_KEY }
  let res
  try { res = configure(readFileSync(src, 'utf8'), env) }
  catch (e) { console.error(`[staging guard] ${e.message}`); process.exit(1) }
  if (outDir) {
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, 'index.html'), res.html)
    console.log(`[staging-config] ${res.target} → ${join(outDir, 'index.html')}`)
  } else if (process.env.VERCEL === '1') {
    if (res.target === 'staging') writeFileSync(src, res.html)
    console.log(`[staging-config] ${res.target}${res.target === 'staging' ? ' (index.html rewritten in the build checkout)' : ' (index.html unchanged)'}`)
  } else {
    console.log(`[staging-config] ${res.target} (validate only; pass --out <dir> to write)`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()

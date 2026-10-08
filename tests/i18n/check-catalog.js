#!/usr/bin/env node
// Kitchen string catalog — release gate.
//
// Runs as the Vercel build command (vercel.json), so a release with a missing or broken Kitchen
// string FAILS TO DEPLOY. No dependencies; reads index.html as text.
//
// Fails when:
//   1. a supported locale is missing a key, has an orphaned key, or a value is empty;
//   2. a value's {placeholders} differ from English;
//   3. code references a catalog key that does not exist (th/tt/tRaw literals, data-i18n*,
//      error keys, and the composed step./do./sev. keys);
//   4. a Spanish value makes a claim the English does not (safe, allergen-free, guaranteed…);
//   5. a user-visible string in the markup or render code bypasses the catalog and is not on
//      the DATA allowlist below, which says why each one is intentionally not translated.
// Runtime fallback (⟦locale:key⟧ in development, English meaning in production) stays as a
// last resort; this gate is what keeps it from ever being needed in a release.
'use strict';
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const errors = [], notes = [];

// ── load the catalog exactly as the board does ─────────────────────────────────────────────────
const a = html.indexOf('var I18N={'), b = html.indexOf('var KITCHEN_LOCALES');
if (a < 0 || b < 0) { console.error('catalog not found'); process.exit(1) }
const I18N = eval('(' + html.slice(a, b).replace(/^var I18N=/, '').replace(/;\s*$/, '') + ')');
const LOCALES = eval(html.match(/var KITCHEN_LOCALES=(\[[^\]]*\]);/)[1]);
const EN = I18N.en, enKeys = Object.keys(EN);
const ph = s => (String(s).match(/\{\w+\}/g) || []).sort().join(',');

// 1 + 2 · completeness, emptiness, placeholders
for (const l of LOCALES) {
  const cat = I18N[l];
  if (!cat) { errors.push(`locale ${l}: no catalog`); continue }
  for (const k of enKeys) {
    if (!(k in cat)) errors.push(`${l}: missing key ${k}`);
    else if (!String(cat[k]).trim()) errors.push(`${l}: empty value for ${k}`);
    else if (ph(cat[k]) !== ph(EN[k])) errors.push(`${l}: ${k} placeholders {${ph(cat[k])}} ≠ en {${ph(EN[k])}}`);
  }
  for (const k of Object.keys(cat)) if (!(k in EN)) errors.push(`${l}: orphaned key ${k} (not in en)`);
}

// 3 · every key the code uses exists
const code = html.slice(0, a) + html.slice(b);
const has = k => k in EN || ((k + '.one') in EN && (k + '.other') in EN);
const used = new Set();
// a literal key, not a prefix being composed ('step.'+act.a is covered by the composed list below)
for (const m of code.matchAll(/\b(?:th|tt|tRaw|langMsg)\('([\w.]*\w)'(?!\s*\+)/g)) used.add(m[1]);
for (const m of code.matchAll(/data-i18n(?:-title|-aria)?="([\w.]+)"/g)) used.add(m[1]);
// an error key passed to showRowError / renderLockout, with or without trailing options
for (const m of code.matchAll(/(?:showRowError\(id,|showNotice\(id,|renderLockout\(id,'\w+',)'([\w.]+)'[,)]/g)) used.add(m[1]);
for (const m of code.matchAll(/recordHeadHtml\(c,'([\w.]+)'/g)) used.add(m[1]);
for (const m of code.matchAll(/\bsec\('\w+','([\w.]+)'/g)) used.add(m[1]);
for (const m of code.matchAll(/\?\s*\w+(?:\.\w+)?\s*:\s*'(title\.[\w.]+)'/g)) used.add(m[1]);
for (const m of code.matchAll(/th\((\w+)\?'([\w.]+)':'([\w.]+)'\)/g)) { used.add(m[2]); used.add(m[3]) }
// keys composed at runtime: one per workflow step and per stored severity
for (const s of ['ack', 'prep', 'verify', 'serve']) { used.add('step.' + s); used.add('do.' + s); used.add('hold.' + s); used.add('err.' + s) }
for (const s of ['anaphylaxis', 'severe', 'discomfort', 'unsure', 'unknown']) used.add('sev.' + s);
for (const k of used) if (!has(k)) errors.push(`code uses unknown key ${k}`);
const unused = enKeys.filter(k => !used.has(k) && !used.has(k.replace(/\.(one|other)$/, '')));
if (unused.length) notes.push(`catalog keys not referenced by a literal (check they are still needed): ${unused.join(', ')}`);

// 4 · no stronger claim in translation
// Per language: safe, allergen-free, guaranteed, certified, protected, verified, independent.
const CLAIM = {
  es: /segur|libre de|sin al[eé]rgenos|garantiz|certificad|protegid|verificad|apto para|independiente/i,
  'zh-CN': /安全|无过敏|不含过敏|没有过敏原|保证|担保|认证|保护|验证|核验|独立|合格|放心/,
};
for (const l of LOCALES) if (l !== 'en') {
  if (!CLAIM[l]) { errors.push(`${l}: no claim pattern defined — add one before shipping this locale`); continue }
  for (const [k, v] of Object.entries(I18N[l]))
    if (CLAIM[l].test(v)) errors.push(`${l}: ${k} makes a claim the English does not: "${v}"`);
}

// 5 · nothing user-visible bypasses the catalog
// Each entry is shown verbatim BY DESIGN. Anything else that looks like words fails the gate.
const DATA = {
  '&times;': 'close glyph, not a word',
  'H': 'venue logo initial placeholder, replaced by the venue mark',
  'HC Kitchen': 'brand name; also in the catalog (key brand) and re-applied from it',
  'Set Up &rarr; Kitchen Displays': 'Admin menu path, quoted verbatim so it matches the (English) Admin UI',
  'Add Kitchen Display': 'Admin button label, quoted verbatim so it matches the (English) Admin UI',
  'Kitchen Display': 'default display name; also the provenance value written to the database — never translated',
  'T?': 'table label fallback when a declaration has no service point',
  'Kitchen string catalog incomplete — ': 'developer diagnostic, shown only in development builds when this gate would also fail',
};
const visible = [];
const body = code.slice(code.indexOf('<body>'));
body.split('\n').forEach((line, i) => {
  const t = line.trim();
  if (/^(\/\/|\*|\/\*)/.test(t) || /console\.(error|log|warn)/.test(line)) return;
  if (/^var ALLERGEN_DEFS=/.test(t)) return;               // reference lists: data, untranslated by design
  for (const m of line.matchAll(/>([^<>{}'"\n]*[A-Za-z\u3400-\u9fff\uf900-\ufaff][^<>{}'"\n]*)</g)) {
    const s = m[1].trim(); if (!s) continue;
    // static markup carrying data-i18n is replaced from the catalog at boot
    const before = line.slice(0, m.index + 1);
    if (/data-i18n="[\w.]+"[^<]*>$/.test(before)) continue;
    visible.push([s, i]);
  }
  for (const m of line.matchAll(/(?<![\w-])(aria-label|title|placeholder|alt)="([^"'+]*[A-Za-z\u3400-\u9fff][^"'+]*)"/g)) {
    // static attributes re-applied from the catalog at boot
    if (m[1] === 'title' && /data-i18n-title="[\w.]+"/.test(line)) continue;
    if (m[1] === 'aria-label' && /data-i18n-aria="[\w.]+"/.test(line)) continue;
    visible.push([m[2], i]);
  }
  for (const m of line.matchAll(/\.(?:textContent|title|placeholder)=(['"])([^'"]*[A-Za-z\u3400-\u9fff][^'"]*)\1/g)) visible.push([m[2], i]);
});
const startLine = html.slice(0, html.indexOf('<body>')).split('\n').length;
for (const [s, i] of visible) {
  if (DATA[s] !== undefined) continue;
  if (/^(EN|ES|中文)$/.test(s)) continue;                    // each language's own name on the EN | ES | 中文 control
  errors.push(`hard-coded visible string (line ~${i + startLine}): "${s}" — move it to the catalog or classify it in DATA`);
}

// ── report ─────────────────────────────────────────────────────────────────────────────────────
const n = enKeys.length;
console.log(`Kitchen catalog: ${n} keys × ${LOCALES.length} locales (${LOCALES.join(', ')}); ${used.size} keys referenced by code; ${Object.keys(DATA).length} data strings classified.`);
notes.forEach(x => console.log('note: ' + x));
if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s) — this release must not ship:`);
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log('✓ every supported locale is complete, consistent and claim-free; no visible string bypasses the catalog.');

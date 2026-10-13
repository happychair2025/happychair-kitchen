// Carried-over open work on the kitchen board (contract C4; admin migration 20261012100000).
//   node --test tests/carried-over.test.mjs
// Two layers: the pure CARRIED-OVER RULES block on its own, and the REAL board script booted in
// node (tests/carried-over.harness.mjs) through every ingest path — boot cache restore, the
// reconcile/poll read, realtime INSERT and UPDATE, resync — against BOTH the current
// kitchen_board() (no carried_over column) and the new one.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadRules, bootBoard } from './carried-over.harness.mjs'

const R = loadRules()
const ago = ms => new Date(Date.now() - ms).toISOString()
const DAY = 864e5

// A current anaphylaxis, unacknowledged for a minute (past the 30 s anaphylaxis window).
const cur = (o = {}) => ({ id: 'c1', asset_id: 'a1', table_label: 'T1', zone_name: 'Main', guest_name: 'Ana Lee',
  allergens: ['Peanuts'], severity: 'anaphylaxis', cross_contact: false, status: 'pending', created_at: ago(60e3),
  kitchen_ack_at: null, protocol_confirmed_at: null, verified_at: null, served_at: null, closed_at: null,
  superseded_at: null, supersedes_id: null, service_instance_id: 's-now', service_kind: 'live', is_open: true,
  carried_over: false, record_service_date: '2026-10-12', service_label: 'Lunch', ...o })
// An open anaphylaxis from the Oct 9 service that is still open (the staging shape).
const old = (o = {}) => ({ ...cur(), id: 'o1', asset_id: 'a2', table_label: 'P4', zone_name: 'Terrace', guest_name: 'Tom',
  allergens: ['Fish'], created_at: ago(3 * DAY), service_instance_id: 's-oct9',
  carried_over: true, record_service_date: '2026-10-09', service_label: 'Dinner', ...o })
// The same rows as the CURRENT kitchen_board() returns them: no computed columns.
const legacy = r => { const x = { ...r }; delete x.carried_over; delete x.record_service_date; delete x.service_label; return x }

// ── 1. Pure rules ────────────────────────────────────────────────────────────────────────
test('rules: only carried_over === true is carried over; absent / null / false is current', () => {
  assert.equal(R.isCarriedOver(old()), true)
  for (const c of [cur(), legacy(old()), { ...old(), carried_over: null }, { ...old(), carried_over: 'true' }, null, undefined])
    assert.equal(R.isCarriedOver(c), false)
  assert.equal(R.alarmEligible(old()), false)
  assert.equal(R.alarmEligible(cur()), true)
  assert.equal(R.alarmEligible(legacy(old())), true, 'old server: today\'s behaviour')
  assert.equal(R.actionable(old()), false)
  assert.equal(R.actionable(cur()), true)
  assert.equal(R.actionable(cur({ served_at: ago(1) })), false)
})

test('rules: bands — carried-over is always EARLIER, never NEEDS / WORKING / DONE', () => {
  assert.equal(R.boardBand(cur()), 'needs')
  assert.equal(R.boardBand(cur({ kitchen_ack_at: ago(1) })), 'working')
  assert.equal(R.boardBand(cur({ served_at: ago(1) })), 'served')
  assert.equal(R.boardBand(old()), 'earlier')
  assert.equal(R.boardBand(old({ kitchen_ack_at: ago(1) })), 'earlier')
  assert.equal(R.boardBand(legacy(old())), 'needs', 'old server: today\'s behaviour')
})

test('rules: computed columns survive a raw realtime row, and a board read is the truth', () => {
  const prev = old()
  assert.deepEqual({ ...R.keepBoardComputed(prev, legacy(old())) },
    { carried_over: true, record_service_date: '2026-10-09', service_label: 'Dinner' })
  assert.deepEqual({ ...R.keepBoardComputed(prev, { carried_over: false }) },
    { carried_over: false, record_service_date: '2026-10-09', service_label: 'Dinner' })
  const card = old()
  R.syncBoardComputed(card, legacy(old()))
  assert.equal('carried_over' in card, false, 'older kitchen_board read clears a stale flag')
})

test('rules: EARLIER summary counts open carried-over records and names the worst severity', () => {
  assert.deepEqual({ ...R.earlierSummary([old(), old({ id: 'o2', severity: 'severe' })]) }, { n: 2, sev: 'anaphylaxis' })
  assert.deepEqual({ ...R.earlierSummary([old({ severity: 'severe' }), old({ id: 'o3', severity: 'discomfort' })]) }, { n: 2, sev: 'severe' })
  assert.deepEqual({ ...R.earlierSummary([old({ severity: 'unsure' })]) }, { n: 1, sev: null })
  assert.deepEqual({ ...R.earlierSummary([cur(), old({ served_at: ago(1) })]) }, { n: 0, sev: null })
})

test('rules: service reference is the venue calendar date, never shifted by timezone', () => {
  assert.equal(R.serviceRefText(old(), 'en-US'), 'Dinner · Oct 9')
  assert.equal(R.serviceRefText(old({ service_label: null }), 'en-US'), 'Oct 9')
  assert.equal(R.serviceRefText(old({ record_service_date: '2026-01-01', service_label: null }), 'en-US'), 'Jan 1')
  assert.equal(R.serviceRefText({}, 'en-US'), '')
})

test('rules: never merge across the carried-over boundary', () => {
  assert.equal(R.canMergeInto(cur(), cur({ id: 'c2' })), true)
  assert.equal(R.canMergeInto(old(), cur({ id: 'c2' })), false)
  assert.equal(R.canMergeInto(cur(), old()), false)
})

// ── 2. The real board ────────────────────────────────────────────────────────────────────
test('backward compatible: the CURRENT kitchen_board (no carried_over) behaves exactly as today', async () => {
  const b = await bootBoard({ rows: [legacy(cur()), legacy(old())] })
  assert.deepEqual(Object.keys(b.cards()).sort(), ['c1', 'o1'])
  b.ctx.checkEscalations()
  assert.equal(b.rec.chimeAnaph.length, 2, 'both unacknowledged anaphylaxis records escalate, as today')
  assert.match(b.board(), /Needs You <span class="sec-ct red">2</, 'both in NEEDS YOU, as today')
  assert.doesNotMatch(b.board(), /EARLIER SERVICE|Manager closes out/)
})

test('new kitchen_board, mixed rows: carried-over is labelled, quiet and non-actionable', async () => {
  const b = await bootBoard({ rows: [cur(), old()] })
  b.ctx.checkEscalations()
  assert.equal(b.rec.chimeAnaph.length, 1, 'only the current record escalates')
  assert.equal(b.rec.lockouts.filter(l => l.id === 'o1').length, 0, 'no lockout for the carried-over record')
  assert.match(b.board(), /Needs You <span class="sec-ct red">1</)
  // EARLIER header: count and the severity WORD, even while collapsed
  assert.match(b.board(), /Earlier <span class="sec-ct amber">1<\/span>.*<span class="sec-sev r">ANAPHYLAXIS<\/span>/s)
  assert.match(b.board(), /A manager closes these out in the Shift Record/)
  // the summary bar is the current service only
  assert.match(b.summary(), /1 Table/)
  assert.match(b.summary(), /1 Need Action/)
  // expanded: the carried row says so in words and carries no Kitchen control
  b.ctx.toggleEarlier()
  const row = b.board().split('\n').find(l => l.includes("openRecord('o1')"))
  assert.ok(row, 'carried row rendered when expanded')
  assert.match(row, /EARLIER SERVICE · Dinner · Oct 9/)
  assert.match(row, /Manager closes out/)
  assert.match(row, /ANAPHYLAXIS/, 'severity keeps its word')
  assert.doesNotMatch(row, /hold-btn|startHold|Confirm Received|Mark Served|Second Check/)
  assert.doesNotMatch(row, /pulse-/, 'no pulse')
  assert.equal(b.rec.writes.length, 0)
})

test('the record sheet for a carried-over record is read-only and says who closes it out', async () => {
  const b = await bootBoard({ rows: [cur(), old()] })
  b.ctx.openRecord('o1')
  const sheet = b.els('verifyContent').innerHTML
  assert.match(sheet, /Earlier service — still open/)
  assert.match(sheet, /A manager closes it out in the Shift Record/)
  assert.doesNotMatch(sheet, /hold-btn|startHold/)
})

test('cache restore (boot, offline): a cached carried-over card never alarms', async () => {
  const cache = { o1: { ...old(), _assetLabel: 'P4 · Terrace' }, c1: { ...cur(), _assetLabel: 'T1' } }
  const b = await bootBoard({ cache, rows: { error: { message: 'offline' } } })
  assert.deepEqual(Object.keys(b.cards()).sort(), ['c1', 'o1'], 'cache kept when the read fails')
  b.ctx.checkEscalations()
  assert.equal(b.rec.chimeAnaph.length, 1, 'only the current cached card escalates')
  assert.equal(b.rec.lockouts.length, 0)
  assert.match(b.board(), /Earlier <span class="sec-ct amber">1</)
})

test('cache restore from a pre-change board (no flag): today\'s behaviour, then the read decides', async () => {
  const cache = { o1: { ...legacy(old()), _assetLabel: 'P4' } }
  const b = await bootBoard({ cache, rows: [old()] })   // new server marks it carried on the first read
  b.ctx.checkEscalations()
  assert.equal(b.rec.chimeAnaph.length, 0, 'the completed read flagged it before any escalation tick')
  assert.equal(b.cards().o1.carried_over, true)
})

test('realtime INSERT: a flagged row never alarms; a new current row never merges into an old card', async () => {
  const b = await bootBoard({ rows: [old({ guest_session_id: 'g1' })] })
  // defensive: a row arriving already flagged carried-over
  await b.realtime('INSERT', old({ id: 'o9', asset_id: 'a3' }))
  assert.equal(b.rec.chimeAnaph.length, 0)
  assert.equal(b.rec.lockouts.length, 0)
  // a brand-new declaration at the same table, same guest session as the Oct 9 record
  await b.realtime('INSERT', legacy(cur({ id: 'n1', asset_id: 'a2', guest_session_id: 'g1', allergens: ['Sesame'] })))
  assert.ok(b.cards().n1, 'its own card')
  assert.deepEqual([...b.cards().o1.allergens], ['Fish'], 'the old record is untouched')
  assert.equal(b.ctx.mergedInto.n1, undefined)
  assert.equal(b.rec.chimeAnaph.length, 1, 'the new current record alarms')
  assert.deepEqual(b.rec.lockouts.map(l => l.id), ['n1'])
})

test('realtime UPDATE on a carried-over card keeps it carried over (and silent)', async () => {
  const b = await bootBoard({ rows: [old()] })
  await b.realtime('UPDATE', { ...legacy(old()), minimized_at: ago(1), venue_id: 'venue-1' })
  assert.equal(b.cards().o1.carried_over, true)
  assert.equal(b.cards().o1.service_label, 'Dinner')
  b.ctx.checkEscalations()
  assert.equal(b.rec.chimeAnaph.length, 0)
  assert.match(b.board(), /Earlier <span class="sec-ct amber">1</)
})

test('reconnect / resync: a record that becomes carried-over drops its lockout and stops escalating', async () => {
  const b = await bootBoard({ rows: [cur()] })
  await b.realtime('INSERT', legacy(cur({ id: 'n2', asset_id: 'a5' })))
  assert.ok(b.lockoutOn(), 'lockout up for the new current record')
  // the service ends; the next read (poll, reconnect or tab wake) returns it carried-over
  b.setRows([cur(), old({ id: 'n2', asset_id: 'a5' })])
  await b.reconcile()
  assert.equal(b.lockoutOn(), false, 'lockout closed: it could never be cleared from this board')
  b.ctx.cards.c1._escalated = true          // isolate n2
  b.ctx.cards.n2._escalated = false
  const before = b.rec.chimeAnaph.length
  b.ctx.checkEscalations()
  assert.equal(b.rec.chimeAnaph.length, before, 'n2 does not escalate')
  await b.reconcile()   // a second resync changes nothing
  assert.equal(b.cards().n2.carried_over, true)
})

test('no Kitchen milestone can be written on a carried-over record, by any path', async () => {
  const b = await bootBoard({ rows: [old()] })
  await b.ctx.doAck('o1', 'row')
  await b.ctx.confirmProtocol('o1', 'row')
  await b.ctx.verifyDish('o1', 'sheet')
  await b.ctx.markServed('o1', 'row')
  assert.equal(b.rec.writes.length, 0, 'nothing written')
  assert.equal(b.cards().o1._error, 'err.carried')
  assert.equal(b.cards().o1.kitchen_ack_at, null)
  b.ctx.renderLockout('o1', 'ack')
  b.ctx.showLockout('o1')
  assert.equal(b.lockoutOn(), false, 'the lockout refuses a carried-over record')
})

test('server rolled back to the current kitchen_board: the flag clears, today\'s behaviour returns', async () => {
  const b = await bootBoard({ rows: [old()] })
  b.setRows([legacy(old())])
  await b.reconcile()
  assert.equal('carried_over' in b.cards().o1, false)
  b.ctx.checkEscalations()
  assert.equal(b.rec.chimeAnaph.length, 1)
})

test('revoked display: nothing loads, the cache is dropped, pairing opens (as today)', async () => {
  const cache = { o1: old(), c1: cur() }
  const b = await bootBoard({ cache, rows: [cur(), old()], exchange: 'revoked' })
  assert.deepEqual(Object.keys(b.cards()), [])
  assert.equal(b.rec.rpcs.includes('kitchen_board'), false)
  assert.ok(b.els('pair').classList.contains('on'))
  b.ctx.checkEscalations()
  assert.equal(b.rec.chimeAnaph.length, 0)
})

test('wrong venue / unbound device: an empty board read prunes everything (as today)', async () => {
  const b = await bootBoard({ cache: { o1: old(), c1: cur() }, rows: [] })
  assert.deepEqual(Object.keys(b.cards()), [])
  b.ctx.checkEscalations()
  assert.equal(b.rec.chimeAnaph.length, 0)
})

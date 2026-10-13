// Carried-over open work on the kitchen board (contract C4; admin migration 20261012100000;
// Product Owner decision PR #5: visible, labelled, NOT actionable, NEVER alarming).
//   node --test tests/carried-over.test.mjs
// Two layers: the pure CARRIED-OVER RULES block on its own, and the REAL board script booted in
// node (tests/carried-over.harness.mjs) through every ingest path of the shared-ingest
// architecture — boot cache restore, the board read (boot / poll / reconnect / wake), realtime
// INSERT and UPDATE — and through both lockout queues (un-acknowledged lockoutQueue and the
// routine / displaced lockoutRoutine), against BOTH the current kitchen_board() (no carried_over
// column) and the new one.
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
  delivered_to_kitchen_at: ago(50e3), carried_over: false, record_service_date: '2026-10-12', service_label: 'Lunch', ...o })
// An open anaphylaxis from the Oct 9 service that is still open (the staging shape).
const old = (o = {}) => ({ ...cur(), id: 'o1', asset_id: 'a2', table_label: 'P4', zone_name: 'Terrace', guest_name: 'Tom',
  allergens: ['Fish'], created_at: ago(3 * DAY), service_instance_id: 's-oct9', delivered_to_kitchen_at: null,
  carried_over: true, record_service_date: '2026-10-09', service_label: 'Dinner', ...o })
// The same rows as the CURRENT kitchen_board() returns them: no computed carried-over columns.
const legacy = r => { const x = { ...r }; delete x.carried_over; delete x.record_service_date; delete x.service_label; return x }
const inLockoutQueues = (b, id) => b.ctx.lockoutId === id || b.ctx.lockoutQueue.includes(id) || b.ctx.lockoutRoutine.includes(id)

// ── 1. Pure rules ────────────────────────────────────────────────────────────────────────
test('rules: only carried_over === true is carried over; absent / null / false is current', () => {
  assert.equal(R.isCarriedOver(old()), true)
  for (const c of [cur(), legacy(old()), { ...old(), carried_over: null }, { ...old(), carried_over: 'true' }, null, undefined])
    assert.equal(R.isCarriedOver(c), false)
  assert.equal(R.inCurrentService(old()), false)
  assert.equal(R.inCurrentService(legacy(old())), true, 'old server: today\'s behaviour')
  assert.equal(R.alarmEligible(old()), false)
  assert.equal(R.alarmEligible(cur()), true)
  assert.equal(R.alarmEligible(legacy(old())), true, 'old server: today\'s behaviour')
})

test('rules: a board read is the truth for the computed columns', () => {
  const card = old()
  R.syncBoardComputed(card, legacy(old()))
  assert.equal('carried_over' in card, false, 'older kitchen_board read clears a stale flag')
  const c2 = cur(); R.syncBoardComputed(c2, old())
  assert.equal(c2.carried_over, true)
})

test('rules: service reference is the venue calendar date, never shifted by timezone', () => {
  assert.equal(R.serviceRefText(old(), 'en-US'), 'Dinner · Oct 9')
  assert.equal(R.serviceRefText(old({ service_label: null }), 'en-US'), 'Oct 9')
  assert.equal(R.serviceRefText(old({ record_service_date: '2026-01-01', service_label: null }), 'en-US'), 'Jan 1')
  assert.equal(R.serviceRefText({}, 'en-US'), '')
})

// ── 2. The real board ────────────────────────────────────────────────────────────────────
test('backward compatible: the CURRENT kitchen_board (no carried_over) behaves exactly as today', async () => {
  const b = await bootBoard({ rows: [legacy(cur()), legacy(old())] })
  assert.deepEqual(Object.keys(b.cards()).sort(), ['c1', 'o1'])
  assert.ok(b.lockoutOn(), 'a lockout is up')
  assert.ok(inLockoutQueues(b, 'c1') && inLockoutQueues(b, 'o1'), 'both un-acknowledged anaphylaxis records are in the lockout queue, as today')
  assert.ok(b.rec.alarms.length >= 1, 'the alarm sounds, as today')
  assert.match(b.board(), /Needs You <span class="sec-ct red">2</, 'both in NEEDS YOU, as today')
  assert.doesNotMatch(b.board(), /EARLIER SERVICE|Manager closes out|From Earlier Service/)
})

test('new kitchen_board, mixed rows: carried-over is labelled, quiet and non-actionable', async () => {
  const b = await bootBoard({ rows: [cur(), old()] })
  assert.equal(b.ctx.lockoutId, 'c1', 'only the current record takes the lockout')
  assert.equal(inLockoutQueues(b, 'o1'), false, 'the carried-over record is in neither lockout queue')
  const alarms = b.rec.alarms.length
  b.ctx.cards.c1._escalated = true          // isolate o1 in the escalation check
  b.ctx.checkEscalations()
  b.ctx.lastAlarmAt = 0; b.ctx.lockoutQueue = []; b.ctx.lockoutId = null   // only o1 could keep the alarm repeating
  delete b.ctx.cards.c1
  assert.equal(b.ctx.alarmPending(), false, 'the repeating alarm has nothing to repeat for o1')
  b.ctx.alarmTick()
  assert.equal(b.rec.alarms.length, alarms, 'no escalation or repeat alarm for the carried-over record')
  assert.equal(b.rec.writes.filter(w => w.id === 'o1').length, 0, 'no delivery write on the carried-over record')
})

test('mixed rows: the EARLIER band, the row and the summary bar', async () => {
  const b = await bootBoard({ rows: [cur(), old()] })
  const board = b.board()
  assert.match(board, /Needs You <span class="sec-ct red">1</)
  assert.match(board, /From Earlier Service <span class="sec-ct amber">1</)
  assert.match(board, /A manager closes these out in the Shift Record/)
  const row = board.split('\n').find(l => l.includes("openRecord('o1')"))
  assert.ok(row, 'carried row rendered (never collapsed)')
  assert.match(row, /EARLIER SERVICE · Dinner · Oct 9/)
  assert.match(row, /Manager closes out/)
  assert.match(row, /ANAPHYLAXIS/, 'severity keeps its word')
  assert.doesNotMatch(row, /hold-btn|startHold|Confirm Received|Mark Served|Second Check/)
  assert.doesNotMatch(row, /pulse-/, 'no pulse')
  assert.match(b.summary(), /1 Table/)
  assert.match(b.summary(), /1 Need Action/)
})

test('the record sheet for a carried-over record is read-only and says who closes it out', async () => {
  const b = await bootBoard({ rows: [old()] })
  b.ctx.openRecord('o1')
  const sheet = b.els('verifyContent').innerHTML
  assert.match(sheet, /Earlier service — still open/)
  assert.match(sheet, /A manager closes it out in the Shift Record/)
  assert.doesNotMatch(sheet, /hold-btn|startHold/)
})

test('cache restore (boot, offline): cached cards are silent; a cached carried card stays in EARLIER', async () => {
  const cache = { o1: old(), c1: cur() }
  const b = await bootBoard({ cache, rows: { error: { message: 'offline' } } })
  assert.deepEqual(Object.keys(b.cards()).sort(), ['c1', 'o1'], 'cache kept when the read fails')
  b.ctx.checkEscalations(); b.ctx.alarmTick()
  assert.equal(b.rec.alarms.length, 0)
  assert.equal(b.lockoutOn(), false)
  assert.match(b.board(), /From Earlier Service <span class="sec-ct amber">1</)
  // the network comes back: the board read confirms both — only the current one alarms
  b.setRows([cur(), old()])
  await b.reconcile()
  assert.equal(b.ctx.lockoutId, 'c1')
  assert.equal(inLockoutQueues(b, 'o1'), false)
})

test('cache from a pre-change board (no flag): the first board read decides, before any alarm', async () => {
  const b = await bootBoard({ cache: { o1: legacy(old()) }, rows: [old()] })
  assert.equal(b.cards().o1.carried_over, true)
  assert.equal(inLockoutQueues(b, 'o1'), false)
  assert.equal(b.rec.alarms.length, 0)
})

test('realtime INSERT: a flagged row never alarms or locks out; a new current row is its own card', async () => {
  const b = await bootBoard({ rows: [old({ guest_session_id: 'g1' })] })
  b.setRows([old({ guest_session_id: 'g1' }), old({ id: 'o9', asset_id: 'a3' })])
  await b.realtime('INSERT', old({ id: 'o9', asset_id: 'a3' }))
  assert.equal(b.rec.alarms.length, 0)
  assert.equal(b.rec.chimeStd, 0)
  assert.equal(inLockoutQueues(b, 'o9'), false)
  // a brand-new declaration at the same table and guest session as the Oct 9 record
  // (the INSERT triggers a board read; the server returns the new row as current work)
  b.setRows([old({ guest_session_id: 'g1' }), old({ id: 'o9', asset_id: 'a3' }), cur({ id: 'n1', asset_id: 'a2', guest_session_id: 'g1', allergens: ['Sesame'] })])
  await b.realtime('INSERT', legacy(cur({ id: 'n1', asset_id: 'a2', guest_session_id: 'g1', allergens: ['Sesame'] })))
  assert.ok(b.cards().n1, 'its own card (client-side merging was removed on main — moot, still holds)')
  assert.deepEqual([...b.cards().o1.allergens], ['Fish'], 'the old record is untouched')
  assert.equal(b.ctx.lockoutId, 'n1', 'the new current record takes the lockout')
  assert.ok(b.rec.alarms.length >= 1)
})

test('realtime INSERT of a carried non-anaphylaxis row: no standard chime', async () => {
  const b = await bootBoard({ rows: [] })
  b.setRows([old({ id: 'o5', severity: 'severe' })])
  await b.realtime('INSERT', old({ id: 'o5', severity: 'severe' }))
  assert.equal(b.rec.chimeStd, 0)
  b.setRows([old({ id: 'o5', severity: 'severe' }), cur({ id: 'n5', severity: 'severe' })])
  await b.realtime('INSERT', legacy(cur({ id: 'n5', severity: 'severe' })))
  assert.equal(b.rec.chimeStd, 1, 'a current one still chimes')
})

test('realtime UPDATE on a carried-over card keeps it carried over (and silent)', async () => {
  const b = await bootBoard({ rows: [old()] })
  await b.realtime('UPDATE', { ...legacy(old()), minimized_at: ago(1), venue_id: 'venue-1' })
  assert.equal(b.cards().o1.carried_over, true)
  assert.equal(b.cards().o1.service_label, 'Dinner')
  b.ctx.checkEscalations(); b.ctx.alarmTick()
  assert.equal(b.rec.alarms.length, 0)
  assert.equal(inLockoutQueues(b, 'o1'), false)
})

test('resync: an UN-ACKNOWLEDGED lockout whose record becomes carried-over closes and leaves the queue', async () => {
  const b = await bootBoard({ rows: [cur(), cur({ id: 'c2', asset_id: 'a5', created_at: ago(30e3) })] })
  assert.equal(b.ctx.lockoutId, 'c1'); assert.ok(b.ctx.lockoutQueue.includes('c2'))
  // the service ends; the next read (poll, reconnect or tab wake) returns both carried-over
  // Same service point, label, guest and content — ONLY the carried-over flag changes, so the
  // lockout closing is the gate's doing and not a redraw triggered by something else.
  const same = id => ({ ...cur({ id, asset_id: id === 'c1' ? 'a1' : 'a5', created_at: id === 'c1' ? ago(60e3) : ago(30e3) }),
    carried_over: true, record_service_date: '2026-10-09', service_label: 'Dinner' })
  b.setRows([same('c1'), same('c2')])
  await b.reconcile()
  assert.equal(b.lockoutOn(), false, 'lockout closed: it could never be cleared from this board')
  assert.equal(inLockoutQueues(b, 'c1') || inLockoutQueues(b, 'c2'), false, 'both out of every queue')
  const n = b.rec.alarms.length
  b.ctx.cards.c1._escalated = false; b.ctx.cards.c2._escalated = false; b.ctx.lastAlarmAt = 0
  b.ctx.checkEscalations(); b.ctx.alarmTick()
  assert.equal(b.rec.alarms.length, n, 'no alarm after it became carried-over')
  await b.reconcile()   // a second resync changes nothing
  assert.equal(b.lockoutOn(), false)
})

test('resync: a ROUTINE / displaced lockout whose record becomes carried-over never returns', async () => {
  // c1 acknowledged, at Prep (routine step) on screen; c2 un-acknowledged arrives and displaces it.
  const b = await bootBoard({ rows: [cur({ kitchen_ack_at: ago(20e3) })] })
  b.ctx.renderLockout('c1', 'prep')
  assert.equal(b.ctx.lockoutId, 'c1')
  b.setRows([cur({ kitchen_ack_at: ago(20e3) }), cur({ id: 'c2', asset_id: 'a5', created_at: ago(5e3) })])
  await b.realtime('INSERT', legacy(cur({ id: 'c2', asset_id: 'a5', created_at: ago(5e3) })))
  assert.equal(b.ctx.lockoutId, 'c2', 'the un-acknowledged record takes priority')
  assert.ok(b.ctx.lockoutRoutine.includes('c1'), 'c1 waits in the displaced/routine FIFO')
  // c1's service ends while it waits
  b.setRows([old({ id: 'c1', asset_id: 'a1', kitchen_ack_at: ago(20e3) }), cur({ id: 'c2', asset_id: 'a5', created_at: ago(5e3) })])
  await b.reconcile()
  assert.equal(b.ctx.lockoutRoutineWaiting(), 0, 'c1 left the routine queue')
  b.ctx.closeLockout()   // c2 done with: nothing must come back
  assert.equal(b.lockoutOn(), false, 'the carried-over record does not return to the lockout')
})

test('no Kitchen milestone can be written on a carried-over record, by any path', async () => {
  const b = await bootBoard({ rows: [old()] })
  const before = b.rec.writes.length
  await b.ctx.doAck('o1', 'row')
  await b.ctx.confirmProtocol('o1', 'row')
  await b.ctx.verifyDish('o1', 'sheet')
  await b.ctx.markServed('o1', 'row')
  const r = await b.ctx.writeDeclaration('o1', { minimized_at: ago(0) })
  assert.equal(r.error.code, 'HC_CARRIED_OVER')
  assert.equal(b.rec.writes.length, before, 'nothing written')
  assert.equal(b.cards().o1._error, 'err.carried')
  assert.equal(b.cards().o1.kitchen_ack_at, null)
  b.ctx.renderLockout('o1', 'ack')
  b.ctx.showLockout('o1')
  assert.equal(b.lockoutOn(), false, 'the lockout refuses a carried-over record')
})

test('server rolled back to the current kitchen_board: the flag clears, today\'s behaviour returns', async () => {
  const b = await bootBoard({ rows: [old()] })
  assert.equal(b.lockoutOn(), false)
  b.setRows([legacy(old())])
  await b.reconcile()
  assert.equal('carried_over' in b.cards().o1, false)
  assert.equal(b.ctx.lockoutId, 'o1', 'as today: an un-acknowledged anaphylaxis record locks out')
})

test('revoked display: nothing loads, the cache is dropped, pairing opens (as today)', async () => {
  const b = await bootBoard({ cache: { o1: old(), c1: cur() }, rows: [cur(), old()], exchange: 'revoked' })
  assert.deepEqual(Object.keys(b.cards()), [])
  assert.equal(b.rec.rpcs.includes('kitchen_board'), false)
  assert.ok(b.els('pair').classList.contains('on'))
  assert.equal(b.rec.alarms.length, 0)
})

test('wrong venue / unbound device: an empty board read prunes everything (as today)', async () => {
  const b = await bootBoard({ cache: { o1: old(), c1: cur() }, rows: [] })
  assert.deepEqual(Object.keys(b.cards()), [])
  assert.equal(b.rec.alarms.length, 0)
  assert.equal(b.lockoutOn(), false)
})

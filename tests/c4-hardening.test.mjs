// C4 release hardening — the REAL board script, booted in node by tests/carried-over.harness.mjs.
//   node --test tests/c4-hardening.test.mjs
//
// tests/carried-over.test.mjs proves the carried-over gates. This file proves the other half of
// the release contract: that CURRENT-service safety behaviour is unchanged around them —
// lockout, alarm, the acknowledgement / prep / served writes and their revert-on-failure
// (§11 / §12.1) — and that the paths a real tablet takes between reads (realtime drop and
// rejoin, tab wake, reload from cache) never turn a carried-over record into an alarm, and never
// turn a cached record into state the database does not hold.
//
// No browser, no network: every write is recorded by the fake client and never leaves the
// process. Nothing here touches a real database.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bootBoard } from './carried-over.harness.mjs'

const ago = ms => new Date(Date.now() - ms).toISOString()
const DAY = 864e5

const cur = (o = {}) => ({ id: 'c1', asset_id: 'a1', table_label: 'T1', zone_name: 'Main', guest_name: 'Ana Lee',
  allergens: ['Peanuts'], severity: 'anaphylaxis', cross_contact: false, status: 'pending', created_at: ago(60e3),
  kitchen_ack_at: null, protocol_confirmed_at: null, verified_at: null, served_at: null, closed_at: null,
  superseded_at: null, supersedes_id: null, service_instance_id: 's-now', service_kind: 'live', is_open: true,
  delivered_to_kitchen_at: ago(50e3), carried_over: false, record_service_date: '2026-10-12', service_label: 'Lunch', ...o })
const old = (o = {}) => ({ ...cur(), id: 'o1', asset_id: 'a2', table_label: 'P4', zone_name: 'Terrace', guest_name: 'Tom',
  allergens: ['Fish'], created_at: ago(3 * DAY), service_instance_id: 's-oct9', delivered_to_kitchen_at: null,
  carried_over: true, record_service_date: '2026-10-09', service_label: 'Dinner', ...o })
const raw = r => { const x = { ...r }; delete x.carried_over; delete x.record_service_date; delete x.service_label;
  delete x.table_label; delete x.zone_name; delete x.service_kind; delete x.is_open; return x }
const inQueues = (b, id) => b.ctx.lockoutId === id || b.ctx.lockoutQueue.includes(id) || b.ctx.lockoutRoutine.includes(id)
const writesTo = (b, id) => b.rec.writes.filter(w => w.id === id)
const milestoneWrites = (b, id) => writesTo(b, id).filter(w => !('delivered_to_kitchen_at' in w.payload))
const rowOf = (b, id) => b.board().split('\n').find(l => l.includes(`openRecord('${id}')`)) || ''

// ── 1. Classification comes from the server flag, and only from it ───────────────────────────
test('classification: carried_over === true → EARLIER; false / absent / null / "true" → current', async () => {
  const b = await bootBoard({ rows: [
    cur({ id: 'f', asset_id: 'af', severity: 'severe' }),
    old({ id: 't', asset_id: 'at', severity: 'severe' }),
    cur({ id: 'n', asset_id: 'an', severity: 'severe', carried_over: null }),
    cur({ id: 's', asset_id: 'as', severity: 'severe', carried_over: 'true' }),
    (() => { const r = cur({ id: 'u', asset_id: 'au', severity: 'severe' }); delete r.carried_over; return r })(),
  ] })
  const [needs, earlier] = b.board().split('From Earlier Service')
  assert.ok(earlier, 'EARLIER band rendered')
  for (const id of ['f', 'n', 's', 'u']) assert.ok(needs.includes(`openRecord('${id}')`), `${id} is current work`)
  assert.ok(earlier.includes(`openRecord('t')`) && !needs.includes(`openRecord('t')`), 'only the flagged row is earlier')
  assert.match(b.board(), /From Earlier Service <span class="sec-ct amber">1</)
})

test('classification: no age rule — a 40-day-old row is current if the server says so', async () => {
  const b = await bootBoard({ rows: [cur({ created_at: ago(40 * DAY) })] })
  assert.equal(b.ctx.lockoutId, 'c1', 'still locks out: only the server decides membership')
  assert.doesNotMatch(b.board(), /From Earlier Service/)
})

// ── 2. Carried-over: never an alarm, never a write, through the REAL alarm path ───────────────
test('carried-over anaphylaxis with the REAL single-flight alarm: no sound at boot, on ticks or on escalation', async () => {
  const b = await bootBoard({ rows: [old(), old({ id: 'o2', asset_id: 'a9', created_at: ago(2 * DAY) })], realAlarm: true })
  await b.runTimers(0)
  for (let i = 0; i < 3; i++) { b.ctx.lastAlarmAt = 0; b.ctx.alarmTick(); b.ctx.checkEscalations(); await b.runTimers(0) }
  assert.equal(b.rec.alarms.length, 0, 'chimeAnaphylaxis never reached')
  assert.equal(b.rec.chimeStd, 0)
  assert.equal(b.lockoutOn(), false)
  assert.equal(b.ctx.alarmPending(), false)
})

test('carried-over: a completed hold from the row, the sheet or a stale lockout writes nothing to the network', async () => {
  const b = await bootBoard({ rows: [old({ kitchen_ack_at: ago(2 * DAY), protocol_confirmed_at: ago(2 * DAY) })] })
  const n = b.rec.writes.length
  b.ctx.openRecord('o1')
  await b.ctx.verifyDish('o1', 'sheet')
  await b.ctx.markServed('o1', 'sheet')
  await b.ctx.confirmProtocol('o1', 'lockout')
  await b.ctx.doAck('o1', 'lockout')
  assert.equal(b.rec.writes.length, n, 'zero writes, including delivery')
  assert.equal(b.rec.chimeAck, 0, 'no confirmation chime for something not recorded')
  assert.equal(b.cards().o1.served_at, null)
  assert.equal(b.cards().o1.verified_at, null)
  assert.match(b.els('verifyContent').innerHTML, /A manager closes it out in the Shift Record/)
  assert.doesNotMatch(b.els('verifyContent').innerHTML, /hold-btn/)
})

test('carried-over: the refusal is stated on the row in words (notification), and clears like any row message', async () => {
  const b = await bootBoard({ rows: [old()] })
  await b.ctx.doAck('o1', 'row')
  assert.equal(b.cards().o1._error, 'err.carried')
  const t = b.timers.find(x => x.ms === 8000 && !x.every)
  assert.ok(t, 'the message expires like every row message')
})

// ── 3. Current service: unchanged ─────────────────────────────────────────────────────────
test('current anaphylaxis: lockout + ONE alarm through the real single-flight path, and it repeats until acknowledged', async () => {
  const b = await bootBoard({ rows: [cur(), cur({ id: 'c2', asset_id: 'a5', created_at: ago(30e3) }), old()], realAlarm: true })
  assert.equal(b.ctx.lockoutId, 'c1', 'oldest current record on screen')
  assert.ok(b.ctx.lockoutQueue.includes('c2'))
  assert.equal(inQueues(b, 'o1'), false)
  await b.runTimers(0)
  assert.equal(b.rec.alarms.length, 1, 'two lockouts in one read = one alarm')
  b.ctx.lastAlarmAt = 0; b.ctx.alarmTick(); await b.runTimers(0)
  assert.equal(b.rec.alarms.length, 2, 'repeats while un-acknowledged')
  assert.match(b.summary(), /2 Need Action|2 Need/, 'summary counts the two current records only')
})

test('current anaphylaxis: acknowledge writes once, chimes after success, advances the SAME lockout to Prep', async () => {
  const b = await bootBoard({ rows: [cur()] })
  assert.equal(b.ctx.lockoutId, 'c1')
  await b.ctx.doAck('c1', 'lockout')
  const w = milestoneWrites(b, 'c1')
  assert.equal(w.length, 1)
  assert.deepEqual(Object.keys(w[0].payload).sort(), ['kitchen_ack_at', 'kitchen_ack_by', 'status'])
  assert.equal(w[0].payload.status, 'acknowledged')
  assert.ok(b.cards().c1.kitchen_ack_at, 'confirmed truth only after the write')
  assert.equal(b.rec.chimeAck, 1)
  assert.equal(b.ctx.lockoutId, 'c1')
  assert.equal(b.ctx.lockoutStage, 'prep')
  assert.equal(b.ctx.alarmPending(), false, 'the repeating alarm stops once the ack is confirmed')
})

test('current: Prep → Second Check → Served each write exactly their own milestone', async () => {
  const b = await bootBoard({ rows: [cur({ kitchen_ack_at: ago(40e3), status: 'acknowledged' })] })
  await b.ctx.confirmProtocol('c1', 'row')
  await b.ctx.verifyDish('c1', 'row')
  await b.ctx.markServed('c1', 'row')
  const w = milestoneWrites(b, 'c1').map(x => Object.keys(x.payload).sort().join(','))
  assert.deepEqual(w, ['protocol_confirmed_at,protocol_confirmed_by', 'verified_at,verified_by', 'served_at,status'])
  assert.equal(b.rec.chimeAck, 3)
  assert.ok(b.cards().c1.served_at)
})

test('§12.1 revert: a REFUSED acknowledgement leaves the record un-acknowledged, silent, alarming, and says so', async () => {
  const b = await bootBoard({ rows: [cur()], writeMode: 'err' })
  await b.ctx.doAck('c1', 'lockout')
  const c = b.cards().c1
  assert.equal(c.kitchen_ack_at, null)
  assert.equal(c._ackPending, undefined)
  assert.equal(c._writing, undefined, 'the in-flight latch is released')
  assert.equal(b.rec.chimeAck, 0, 'no confirmation chime for a write that did not land')
  assert.equal(b.ctx.lockoutId, 'c1'); assert.equal(b.ctx.lockoutStage, 'ack')
  assert.equal(b.ctx.lockoutErr, 'err.ack', 'the lockout states the failure')
  assert.equal(b.ctx.alarmPending(), true, 'escalation continues')
  // the cache must not hold an acknowledgement the database does not have
  const cached = JSON.parse(b.store.get('hc_k_cards_v2') || '{}')
  assert.ok(!cached.c1 || !cached.c1.kitchen_ack_at)
})

test('§12.1 revert: refused Prep / Second Check / Served restore the prior values exactly and never chime', async () => {
  const b = await bootBoard({ rows: [cur({ kitchen_ack_at: ago(40e3), status: 'acknowledged' })], writeMode: 'err' })
  await b.ctx.confirmProtocol('c1', 'row')
  assert.equal(b.cards().c1.protocol_confirmed_at, null)
  assert.equal(b.cards().c1._error, 'err.prep')
  b.setWriteMode('ok'); await b.ctx.confirmProtocol('c1', 'row'); b.setWriteMode('err')
  await b.ctx.verifyDish('c1', 'row')
  assert.equal(b.cards().c1.verified_at, null)
  b.setWriteMode('ok'); await b.ctx.verifyDish('c1', 'row'); b.setWriteMode('err')
  const before = b.rec.chimeAck
  await b.ctx.markServed('c1', 'row')
  assert.equal(b.cards().c1.served_at, null)
  assert.equal(b.cards().c1.status, 'acknowledged', 'status reverted, not left at resolved')
  assert.equal(b.cards().c1._error, 'err.serve')
  assert.equal(b.rec.chimeAck, before)
})

test('§12.1 revert: a HUNG Served write is released by its own bound, reverted, and reads as unknown — not as recorded', async () => {
  const b = await bootBoard({ rows: [cur({ kitchen_ack_at: ago(40e3), protocol_confirmed_at: ago(30e3), verified_at: ago(20e3), status: 'acknowledged' })], writeMode: 'hang' })
  const p = b.ctx.markServed('c1', 'row')
  assert.ok(b.cards().c1.served_at, 'optimistic while in flight')
  await b.runTimers(10000)
  await p
  assert.equal(b.cards().c1.served_at, null, 'reverted after the bound')
  assert.equal(b.cards().c1._error, 'err.timeout', 'outcome UNKNOWN, never "recorded"')
  assert.equal(b.rec.chimeAck, 0)
})

// ── 4. Reconnect / resubscribe / wake ────────────────────────────────────────────────────
test('channel drop then rejoin: offline is shown; a declaration missed during the gap is found by the rejoin read', async () => {
  const b = await bootBoard({ rows: [old()] })
  await b.channelStatus('CHANNEL_ERROR')
  assert.ok(b.els('offlineBanner').classList.contains('on'), 'offline banner up')
  // inserted server-side while the socket was down: no realtime event will ever deliver it
  b.setRows([old(), cur({ id: 'gap', asset_id: 'a7' })])
  const reads = b.rec.rpcs.filter(r => r === 'kitchen_board').length
  await b.channelStatus('SUBSCRIBED')
  assert.equal(b.rec.rpcs.filter(r => r === 'kitchen_board').length, reads + 1, 'rejoin forces a board read')
  assert.equal(b.ctx.lockoutId, 'gap', 'the missed current anaphylaxis locks out')
  assert.ok(b.rec.alarms.length >= 1)
  assert.equal(inQueues(b, 'o1'), false, 'the carried-over record still does not')
  assert.equal(b.els('offlineBanner').classList.contains('on'), false, 'health restored by the READ, not the socket')
})

test('rejoin with a failing read: the socket coming back does NOT claim the board is current', async () => {
  const b = await bootBoard({ rows: [old()] })
  await b.channelStatus('TIMED_OUT')
  b.setRows({ error: { message: 'network' } })
  await b.channelStatus('SUBSCRIBED')
  assert.ok(b.els('offlineBanner').classList.contains('on'), 'still offline')
  assert.ok(b.cards().o1 && b.cards().o1.carried_over === true, 'held cards kept, still carried over')
})

test('tablet wake (visibilitychange): re-reads, and a record that became carried-over while asleep stops alarming', async () => {
  const b = await bootBoard({ rows: [cur()] })
  assert.equal(b.ctx.lockoutId, 'c1')
  b.setRows([{ ...cur(), carried_over: true, record_service_date: '2026-10-12', service_label: 'Lunch' }])
  await b.fire('document:visibilitychange')
  assert.equal(b.lockoutOn(), false)
  assert.equal(inQueues(b, 'c1'), false)
  assert.match(rowOf(b, 'c1'), /EARLIER SERVICE · Lunch · Oct 12/)
})

test('raw realtime UPDATE after a reconnect does not drop the flag (it carries no computed columns)', async () => {
  const b = await bootBoard({ rows: [old()] })
  await b.channelStatus('CHANNEL_ERROR'); await b.channelStatus('SUBSCRIBED')
  await b.realtime('UPDATE', raw(old({ notes: 'edited' })))
  assert.equal(b.cards().o1.carried_over, true)
  assert.equal(b.lockoutOn(), false)
})

// ── 5. Cache restoration ────────────────────────────────────────────────────────────────
test('cache: a cached carried-over card is restored AS carried-over (EARLIER, silent), never as current work', async () => {
  const b = await bootBoard({ cache: { o1: old() }, rows: { error: { message: 'offline' } }, realAlarm: true })
  await b.runTimers(0)
  assert.equal(b.cards().o1.carried_over, true)
  assert.match(b.board(), /From Earlier Service/)
  assert.doesNotMatch(b.board().split('From Earlier Service')[0], /openRecord\('o1'\)/, 'not in Needs You')
  assert.equal(b.rec.alarms.length, 0)
  assert.equal(b.lockoutOn(), false)
})

test('cache: cached CURRENT un-acknowledged anaphylaxis raises nothing before the first read, then exactly as the read says', async () => {
  const b = await bootBoard({ cache: { c1: cur() }, rows: { error: { message: 'offline' } } })
  assert.equal(b.lockoutOn(), false, 'a cached card is not evidence of current state')
  assert.equal(b.rec.alarms.length, 0)
  await b.ctx.doAck('c1', 'row')
  assert.equal(milestoneWrites(b, 'c1').length, 0, 'no write on an unconfirmed cached card')
  b.setRows([cur()]); await b.reconcile()
  assert.equal(b.ctx.lockoutId, 'c1')
})

test('cache: the server now says carried-over for a card cached as current → no alarm at any point', async () => {
  const b = await bootBoard({ cache: { c1: cur() }, rows: [{ ...cur(), carried_over: true, service_label: 'Lunch', record_service_date: '2026-10-12' }] })
  assert.equal(b.rec.alarms.length, 0)
  assert.equal(b.lockoutOn(), false)
  assert.equal(b.cards().c1.carried_over, true)
})

test('cache: the server now says CURRENT for a card cached as carried-over → it is current work again', async () => {
  const b = await bootBoard({ cache: { o1: old() }, rows: [{ ...old(), carried_over: false }] })
  assert.equal(b.cards().o1.carried_over, false)
  assert.equal(b.ctx.lockoutId, 'o1', 'the cache never overrides the server')
})

test('cache: corrupt JSON and UI latches from an older build are discarded, not trusted', async () => {
  const b1 = await bootBoard({ cacheRaw: '{not json', rows: [old()] })
  assert.deepEqual(Object.keys(b1.cards()), ['o1'])
  const latched = { ...cur(), _escalated: true, _ackPending: ago(1), _fromCache: false, _writing: true }
  const b2 = await bootBoard({ cache: { c1: latched }, rows: [cur()] })
  assert.equal(b2.cards().c1._ackPending, undefined, 'a cached pending ack is not an ack')
  assert.equal(b2.cards().c1._writing, undefined)
  assert.equal(b2.ctx.lockoutId, 'c1', 'escalation decided from the database, not the cached latch')
})

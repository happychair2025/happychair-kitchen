// Kitchen cache hotfix — the REAL board script, booted in node by tests/carried-over.harness.mjs.
//   node --test tests/cache-hotfix.test.mjs
//
// The two cache fixes cherry-picked from PR #2 (w3/c4-hardening) onto main, independent of C4:
//   cf02eae — an optimistic milestone in flight is never written to the cache (§12.4)
//   fed9387 — a cache-restored card takes its milestones from the first database row
// plus the current-service safety contract around them (lockout, alarm, ack / prep / second
// check / served, §12.1 revert-on-failure, rejoin read). These tests are the current-service
// subset of tests/c4-hardening.test.mjs (PR #2) with every carried-over row removed, so they run
// against a board that has no C4 code. They must pass both before and after C4 lands.
//
// The harness (tests/carried-over.harness.mjs) is byte-identical to the one on PR #2, so a later
// merge of PR #1 + PR #2 sees the same file on both sides.
//
// No browser, no network: every write is recorded by the fake client and never leaves the
// process. Nothing here touches a real database.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bootBoard } from './carried-over.harness.mjs'

const ago = ms => new Date(Date.now() - ms).toISOString()

const cur = (o = {}) => ({ id: 'c1', asset_id: 'a1', table_label: 'T1', zone_name: 'Main', guest_name: 'Ana Lee',
  allergens: ['Peanuts'], severity: 'anaphylaxis', cross_contact: false, status: 'pending', created_at: ago(60e3),
  kitchen_ack_at: null, protocol_confirmed_at: null, verified_at: null, served_at: null, closed_at: null,
  superseded_at: null, supersedes_id: null, service_instance_id: 's-now', service_kind: 'live', is_open: true,
  delivered_to_kitchen_at: ago(50e3), ...o })
const raw = r => { const x = { ...r }; delete x.table_label; delete x.zone_name; delete x.service_kind; delete x.is_open; return x }
const writesTo = (b, id) => b.rec.writes.filter(w => w.id === id)
const milestoneWrites = (b, id) => writesTo(b, id).filter(w => !('delivered_to_kitchen_at' in w.payload))
const served3 = o => cur({ kitchen_ack_at: ago(40e3), protocol_confirmed_at: ago(30e3), verified_at: ago(20e3), status: 'acknowledged', ...o })

// ── 1. The two fixes ─────────────────────────────────────────────────────────────────────
test('cf02eae: an in-flight optimistic Served never reaches the cache through another write path', async () => {
  const b = await bootBoard({ rows: [served3()], writeMode: 'hang' })
  const p = b.ctx.markServed('c1', 'row')
  assert.ok(b.cards().c1.served_at, 'optimistic on screen while in flight')
  b.setRows([served3(), cur({ id: 'z', asset_id: 'az', severity: 'severe' })])
  await b.realtime('INSERT', raw(cur({ id: 'z', asset_id: 'az', severity: 'severe' })))
  const cached = JSON.parse(b.store.get('hc_k_cards_v2'))
  assert.equal(cached.c1.served_at, null, 'the cache holds the database value, not the optimistic one')
  assert.equal(cached.c1.status, 'acknowledged')
  await b.runTimers(10000); await p
})

test('cf02eae: in-flight Prep and Second Check are cached with their pre-write values too', async () => {
  const b = await bootBoard({ rows: [cur({ kitchen_ack_at: ago(40e3), status: 'acknowledged' })], writeMode: 'hang' })
  const p1 = b.ctx.confirmProtocol('c1', 'row')
  b.ctx.cacheCards()
  assert.equal(JSON.parse(b.store.get('hc_k_cards_v2')).c1.protocol_confirmed_at, null)
  await b.runTimers(10000); await p1
  b.setWriteMode('ok'); await b.ctx.confirmProtocol('c1', 'row'); b.setWriteMode('hang')
  const p2 = b.ctx.verifyDish('c1', 'row')
  b.ctx.cacheCards()
  const c = JSON.parse(b.store.get('hc_k_cards_v2')).c1
  assert.ok(c.protocol_confirmed_at, 'the confirmed Prep IS cached')
  assert.equal(c.verified_at, null, 'the in-flight Second Check is not')
  await b.runTimers(20000); await p2
})

test('fed9387: a milestone the cache holds but the database does NOT is not shown as recorded after the read', async () => {
  // An optimistic Served (in flight) reached the cache through an unrelated cacheCards() call on
  // a build without cf02eae, then the tablet reloaded. The database never recorded it.
  const b = await bootBoard({ cache: { c1: cur({ kitchen_ack_at: ago(40e3), protocol_confirmed_at: ago(30e3), served_at: ago(5e3), status: 'resolved' }) },
    rows: [cur({ kitchen_ack_at: ago(40e3), protocol_confirmed_at: null, served_at: null, status: 'acknowledged' })] })
  const c = b.cards().c1
  assert.equal(c.served_at, null, 'not served — the database says so')
  assert.equal(c.protocol_confirmed_at, null, 'prep not confirmed — the database says so')
  assert.equal(c.status, 'acknowledged')
  assert.match(b.board(), /In Progress/, 'still open work on the board')
})

test('fed9387 (first-deploy N1): a cached un-acknowledged anaphylaxis that the cache shows as served re-opens AND re-alarms after the read', async () => {
  const b = await bootBoard({ cache: { c1: cur({ kitchen_ack_at: ago(40e3), served_at: ago(5e3), status: 'resolved' }) },
    rows: [cur()] })
  assert.equal(b.cards().c1.kitchen_ack_at, null)
  assert.equal(b.cards().c1.served_at, null)
  assert.equal(b.ctx.lockoutId, 'c1', 'the database says un-acknowledged: the lockout is owed')
  assert.ok(b.rec.alarms.length >= 1, 'and the alarm sounds')
})

test('combined: hung Served → reload from that cache → board read: never shown as served', async () => {
  const b1 = await bootBoard({ rows: [served3()], writeMode: 'hang' })
  b1.ctx.markServed('c1', 'row')
  b1.ctx.cacheCards()
  const snapshot = b1.store.get('hc_k_cards_v2')
  // the tablet reloads while the write is still outstanding; the database never recorded it
  const b2 = await bootBoard({ cacheRaw: snapshot, rows: [served3()] })
  assert.equal(b2.cards().c1.served_at, null)
  assert.equal(b2.cards().c1.status, 'acknowledged')
  assert.match(b2.board(), /In Progress/)
})

test('a milestone the database DOES hold is kept after a cache restore (no regression to the fold)', async () => {
  const b = await bootBoard({ cache: { c1: served3({ served_at: ago(5e3), status: 'resolved' }) },
    rows: [served3({ served_at: ago(5e3), status: 'resolved' })] })
  assert.ok(b.cards().c1.served_at)
  assert.equal(b.cards().c1.status, 'resolved')
})

// ── 2. Current service: unchanged ─────────────────────────────────────────────────────────
test('current anaphylaxis: lockout + ONE alarm through the real single-flight path, and it repeats until acknowledged', async () => {
  const b = await bootBoard({ rows: [cur(), cur({ id: 'c2', asset_id: 'a5', created_at: ago(30e3) })], realAlarm: true })
  assert.equal(b.ctx.lockoutId, 'c1', 'oldest record on screen')
  assert.ok(b.ctx.lockoutQueue.includes('c2'))
  await b.runTimers(0)
  assert.equal(b.rec.alarms.length, 1, 'two lockouts in one read = one alarm')
  b.ctx.lastAlarmAt = 0; b.ctx.alarmTick(); await b.runTimers(0)
  assert.equal(b.rec.alarms.length, 2, 'repeats while un-acknowledged')
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
  assert.ok(JSON.parse(b.store.get('hc_k_cards_v2')).c1.served_at, 'a CONFIRMED Served is cached')
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
  const b = await bootBoard({ rows: [served3()], writeMode: 'hang' })
  const p = b.ctx.markServed('c1', 'row')
  assert.ok(b.cards().c1.served_at, 'optimistic while in flight')
  await b.runTimers(10000)
  await p
  assert.equal(b.cards().c1.served_at, null, 'reverted after the bound')
  assert.equal(b.cards().c1._error, 'err.timeout', 'outcome UNKNOWN, never "recorded"')
  assert.equal(b.rec.chimeAck, 0)
})

// ── 3. Reconnect / wake / cache restore ───────────────────────────────────────────────────
test('channel drop then rejoin: offline is shown; a declaration missed during the gap is found by the rejoin read', async () => {
  const b = await bootBoard({ rows: [] })
  await b.channelStatus('CHANNEL_ERROR')
  assert.ok(b.els('offlineBanner').classList.contains('on'), 'offline banner up')
  b.setRows([cur({ id: 'gap', asset_id: 'a7' })])
  const reads = b.rec.rpcs.filter(r => r === 'kitchen_board').length
  await b.channelStatus('SUBSCRIBED')
  assert.equal(b.rec.rpcs.filter(r => r === 'kitchen_board').length, reads + 1, 'rejoin forces a board read')
  assert.equal(b.ctx.lockoutId, 'gap', 'the missed anaphylaxis locks out')
  assert.ok(b.rec.alarms.length >= 1)
  assert.equal(b.els('offlineBanner').classList.contains('on'), false, 'health restored by the READ, not the socket')
})

test('rejoin with a failing read: the socket coming back does NOT claim the board is current', async () => {
  const b = await bootBoard({ rows: [cur({ severity: 'severe' })] })
  await b.channelStatus('TIMED_OUT')
  b.setRows({ error: { message: 'network' } })
  await b.channelStatus('SUBSCRIBED')
  assert.ok(b.els('offlineBanner').classList.contains('on'), 'still offline')
  assert.ok(b.cards().c1, 'held cards kept')
})

test('tablet wake (visibilitychange) re-reads the board', async () => {
  const b = await bootBoard({ rows: [] })
  const reads = b.rec.rpcs.filter(r => r === 'kitchen_board').length
  b.setRows([cur()])
  await b.fire('document:visibilitychange')
  assert.ok(b.rec.rpcs.filter(r => r === 'kitchen_board').length > reads, 'wake forces a board read')
  assert.equal(b.ctx.lockoutId, 'c1')
})

test('cache: cached un-acknowledged anaphylaxis raises nothing before the first read, then exactly as the read says', async () => {
  const b = await bootBoard({ cache: { c1: cur() }, rows: { error: { message: 'offline' } } })
  assert.equal(b.lockoutOn(), false, 'a cached card is not evidence of current state')
  assert.equal(b.rec.alarms.length, 0)
  await b.ctx.doAck('c1', 'row')
  assert.equal(milestoneWrites(b, 'c1').length, 0, 'no write on an unconfirmed cached card')
  b.setRows([cur()]); await b.reconcile()
  assert.equal(b.ctx.lockoutId, 'c1')
})

test('cache: corrupt JSON and UI latches from an older build are discarded, not trusted', async () => {
  const b1 = await bootBoard({ cacheRaw: '{not json', rows: [cur({ severity: 'severe' })] })
  assert.deepEqual(Object.keys(b1.cards()), ['c1'])
  const latched = { ...cur(), _escalated: true, _ackPending: ago(1), _fromCache: false, _writing: true }
  const b2 = await bootBoard({ cache: { c1: latched }, rows: [cur()] })
  assert.equal(b2.cards().c1._ackPending, undefined, 'a cached pending ack is not an ack')
  assert.equal(b2.cards().c1._writing, undefined)
  assert.equal(b2.ctx.lockoutId, 'c1', 'escalation decided from the database, not the cached latch')
})

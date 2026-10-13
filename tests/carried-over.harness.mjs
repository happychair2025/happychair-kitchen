// Node harness for the REAL board script (index.html's inline <script>), with no browser and no
// network: a minimal fake DOM, a fake supabase client that serves kitchen_board() rows and
// records every write and channel handler, a fake localStorage, and spies on every alarm path
// (chimeAnaphylaxis, chimeStandard, showLockout's modal). Timers are captured, never run —
// tests drive reconcile(), checkEscalations() and the realtime handlers directly.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
export const HTML = readFileSync(join(here, '..', 'index.html'), 'utf8')
const SCRIPT = (() => {
  const open = HTML.indexOf('<script>'), close = HTML.lastIndexOf('</script>')
  return HTML.slice(open + '<script>'.length, close)
})()

/** The pure CARRIED-OVER RULES block, by its markers, evaluated on its own. */
export function loadRules() {
  const a = HTML.indexOf('// ═══ CARRIED-OVER RULES — BEGIN'), b = HTML.indexOf('// ═══ CARRIED-OVER RULES — END')
  if (a < 0 || b < 0) throw new Error('rules block markers not found')
  const ctx = vm.createContext({ Date, Intl, String })
  vm.runInContext(HTML.slice(a, b), ctx)
  return ctx
}

class ClassList {
  constructor() { this.s = new Set() }
  add(...c) { c.forEach(x => this.s.add(x)) }
  remove(...c) { c.forEach(x => this.s.delete(x)) }
  contains(c) { return this.s.has(c) }
  toggle(c, f) { const on = f === undefined ? !this.s.has(c) : f; on ? this.s.add(c) : this.s.delete(c); return on }
}
function el(id) {
  const e = {
    id, children: [], dataset: {}, style: { setProperty() {} }, classList: new ClassList(),
    _html: '', textContent: '', value: '', className: '', offsetHeight: 60,
    get innerHTML() { return this._html },
    set innerHTML(v) { this._html = String(v); if (this._html === '') this.children = [] },
    appendChild(n) { this.children.push(n); n.parentNode = this; return n },
    prepend(n) { this.children.unshift(n); n.parentNode = this },
    insertBefore(n, ref) {
      const i0 = this.children.indexOf(n); if (i0 >= 0) this.children.splice(i0, 1)
      const i = ref ? this.children.indexOf(ref) : -1
      if (i < 0) this.children.push(n); else this.children.splice(i, 0, n)
      n.parentNode = this; return n
    },
    remove() { if (this.parentNode) { const p = this.parentNode.children; const i = p.indexOf(this); if (i >= 0) p.splice(i, 1) } },
    querySelector() { return null }, querySelectorAll() { return [] },
    addEventListener() {}, removeEventListener() {}, focus() {}, blur() {}, setAttribute() {}, getAttribute() { return null },
    closest() { return null }, scrollIntoView() {}, getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 } },
  }
  return e
}

/**
 * Boot the board.
 *   rows        — what kitchen_board() returns (array), or a function () => rows, or {error}
 *   cache       — cards object pre-seeded into localStorage (boot cache restore)
 *   exchange    — 'ok' (paired) | 'revoked' (401) | 'none' (no stored credential)
 */
export async function bootBoard({ rows = [], cache = null, exchange = 'ok' } = {}) {
  const els = new Map()
  const byId = id => { if (!els.has(id)) els.set(id, el(id)); return els.get(id) }
  const store = new Map()
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  }
  if (exchange !== 'none') localStorage.setItem('hc_k_venue_device', JSON.stringify({ device_token: 'tok', device_id: 'dev-1' }))
  if (cache) localStorage.setItem('hc_k_cards_v2', JSON.stringify(cache))

  const rec = { writes: [], rpcs: [], alarms: [], chimeStd: 0, lockouts: [], handlers: {}, fetches: [] }
  let serve = rows
  const result = v => {
    const p = Promise.resolve(v)
    const q = { then: (a, b) => p.then(a, b), abortSignal() { return q }, retry() { return q }, eq() { return q },
      single() { return q }, select() { return q }, order() { return q }, limit() { return q }, maybeSingle() { return q }, in() { return q } }
    return q
  }
  const client = () => ({
    rpc(name) {
      rec.rpcs.push(name)
      if (name === 'kitchen_board') {
        const r = typeof serve === 'function' ? serve() : serve
        return result(r && r.error ? { data: null, error: r.error } : { data: JSON.parse(JSON.stringify(r)), error: null })
      }
      return result({ data: [], error: null })
    },
    from(table) {
      const q = {
        select() {
          const data = table === 'assets' ? { label: 'T9', zone: null }
            : table === 'venues' ? { name: 'Bistro' }
            : table === 'venue_devices' ? { display_locale: 'en' } : null
          return result({ data, error: null })
        },
        update(payload) {
          const w = { table, payload, id: null }
          rec.writes.push(w)
          const r = result({ data: [{ id: 'x' }], error: null })
          r.eq = (k, v) => { w.id = v; return r }
          r.is = () => r
          return r
        },
      }
      return q
    },
    channel() {
      const ch = {
        on(_t, spec, fn) { rec.handlers[spec.event] = fn; return ch },
        subscribe(cb) { if (cb) cb('SUBSCRIBED'); return ch },
      }
      return ch
    },
    removeChannel() {}, realtime: { setAuth() {} },
  })

  const timers = []
  const ctx = {
    console: { log() {}, info() {}, warn() {}, error() {} },
    Date, Intl, JSON, Math, Promise, Object, Array, String, Number, Boolean, RegExp, Error, Set, Map, URLSearchParams, AbortController,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length },
    clearTimeout() {}, setInterval: (fn, ms) => { timers.push({ fn, ms, every: true }); return timers.length }, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, addEventListener() {}, removeEventListener() {},
    localStorage,
    location: { search: '', hostname: 'kitchen.test', href: 'https://kitchen.test/' },
    navigator: { userAgent: 'node' },
    fetch: async (url) => {
      rec.fetches.push(url)
      if (String(url).includes('venue-device-token')) {
        if (exchange === 'revoked') return { ok: false, status: 401, json: async () => ({ error: 'revoked' }) }
        return { ok: true, status: 200, json: async () => ({ access_token: 'jwt', expires_at: new Date(Date.now() + 3600e3).toISOString(),
          venue_id: 'venue-1', display_name: 'Kitchen', device_role: 'kitchen' }) }
      }
      return { ok: true, status: 200, json: async () => [] }
    },
  }
  const document = {
    getElementById: byId, querySelector: () => byId('__q'), querySelectorAll: () => [],
    createElement: () => el(null), addEventListener() {}, hidden: false,
    documentElement: { style: { setProperty() {} }, lang: 'en' }, body: byId('__body'), title: '',
  }
  ctx.document = document
  ctx.window = ctx
  ctx.window.supabase = { createClient: client }
  vm.createContext(ctx)
  vm.runInContext(SCRIPT, ctx)
  // Spies on every alarm path. Function declarations are globals of the script, so internal
  // calls resolve through these replacements.
  // soundAlarm() is the single entry to the anaphylaxis alarm (first sound, repeat, escalation);
  // chimeAnaphylaxis is spied too in case any path reaches it directly.
  ctx.soundAlarm = () => { rec.alarms.push(Date.now()); return true }
  ctx.chimeAnaphylaxis = () => rec.alarms.push(Date.now())
  ctx.chimeStandard = () => { rec.chimeStd++ }
  const realRender = ctx.renderLockout
  ctx.renderLockout = function (id, stage, err) {
    const before = ctx.lockoutId
    const r = realRender.call(this, id, stage, err)
    if (ctx.lockoutId === id && byId('lockout').classList.contains('on')) rec.lockouts.push({ id, stage })
    return r
  }
  await flush()
  return {
    ctx, rec, els: byId,
    setRows(r) { serve = r },
    cards: () => ctx.cards,
    lockoutOn: () => byId('lockout').classList.contains('on'),
    async reconcile() { const r = await ctx.reconcile(); await flush(); return r },
    async realtime(event, row) { rec.handlers[event]({ new: row }); await flush() },
    board: () => byId('cardArea').children.map(n => n.innerHTML).join('\n'),
    summary: () => byId('summaryBar').innerHTML,
  }
}

export async function flush() { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)) }

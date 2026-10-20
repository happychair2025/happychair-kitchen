'use strict'

// Fail closed: a probe is successful only when this invocation produced a complete,
// internally consistent summary. Historical *.results.txt files are NOT evidence.
function evaluateProbe(raw, { probeServed = false, blocked = [] } = {}) {
  if (!probeServed) return { ok: false, reason: 'probe script was never served' }
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, reason: 'probe posted no results' }
  if (/^(?:FAIL\b|HARNESS TIMEOUT\b|WATCHDOG\b|stalled after\b|EXCEPTION\b|THREW\b)/mi.test(raw)) {
    return { ok: false, reason: 'probe reported failure or timeout' }
  }
  const summaries = [...raw.matchAll(/^ALL (\d+) CHECKS PASS\s*$/gm)]
  if (summaries.length !== 1) {
    return { ok: false, reason: 'expected exactly one ALL N CHECKS PASS summary' }
  }
  // A crash after the success summary must never be reported as a passing probe.
  if (raw.slice(summaries[0].index + summaries[0][0].length).trim()) {
    return { ok: false, reason: 'unexpected output after success summary' }
  }
  const expected = Number(summaries[0][1])
  const actual = (raw.match(/^PASS  /gm) || []).length
  if (!Number.isSafeInteger(expected) || expected < 1 || actual !== expected) {
    return { ok: false, reason: 'PASS count does not match summary (' + actual + '/' + expected + ')' }
  }
  if (blocked.length) {
    return { ok: false, reason: 'probe attempted ' + blocked.length + ' external network request(s)' }
  }
  return { ok: true, reason: null, checks: actual }
}

module.exports = { evaluateProbe }

# Kitchen safety release gate

Status: **PREPARATION ONLY. Nothing here has been deployed, merged or applied.**
Prepared 2026-10-14 on branch `w3/kitchen-release-gate` (draft PR, base `main`).
Production: `main` auto-deploys to `happychair-kitchen.vercel.app`. Production `main` at
preparation time: `cf39eb1`.

This document covers two release paths for the kitchen board and recommends one. It does not
authorise either. A release happens only after the approvals in section 8.

---

## 1. Dependency facts (verified in code, not inferred)

| Question | Answer | Evidence |
|---|---|---|
| Does PR #1 (`w3/carried-over` @ `2517905`) need admin migration `20261012100000` (staging step 19) applied? | **No.** It is designed to ship **before** the migration. | Migration header, "ROLLOUT GATE": the Kitchen and Staff client builds that recognise `carried_over` ship first; the migration is applied only after both are live. |
| What does PR #1 do against production `kitchen_board()`, which has no `carried_over` column? | Every row is **current**. Lockout, chime, escalation unchanged. | `isCarriedOver(c){ return !!(c&&c.carried_over===true) }` — only a literal `true` makes a row carried-over; absent / `null` / `false` / `"true"` are current. Test `classification: carried_over === true → EARLIER; false / absent / null / "true" → current` (PR #2 `tests/c4-hardening.test.mjs`). |
| Do PR #1 / PR #2 call any RPC, table or function production lacks? | **No.** The call set is identical to `main`. | All three builds call exactly: `rpc('kitchen_board')`, `rpc('set_own_display_locale')`, `rpc('venue_branding_logo')`, `from('allergen_declarations')` ×2, `from('venue_devices')`, `from('venues')`, Edge Function `venue-device-token`. All three RPCs are present in the production snapshot `supabase/tests/lane/prod_schema_2026-10-09/03_functions.sql` (admin `origin/w3/integration`). The only new fields PR #1 reads (`carried_over`, `record_service_date`, `service_label`) are optional and only arrive once step 19 is applied. |
| Is the **reverse** safe — migration applied, old kitchen client still live? | **No. This is the hazard.** | Step 19 adds a second `UNION ALL` branch to `kitchen_board()` returning open records from earlier services. The `main` build ignores `carried_over` and would raise the anaphylaxis lockout + alarm for records it is not permitted to acknowledge. Hence: kitchen client first, migration second, and on rollback, migration first. |
| Does staging step 20 (`20261012200000_w3_alert_delivery`) affect the kitchen? | **No direct dependency.** | It adds alert tables, triggers on `allergen_declarations` INSERT, and alert RPCs. It does not change `kitchen_board()` or the venue-device policies the board writes through; the board never inserts declarations. |
| Do the two cache fixes (`cf02eae`, `fed9387`) depend on C4? | **No.** Both fix defects already on production `main`. | Cherry-picked onto `cf39eb1`, `index.html` applied with no conflict; only the test file conflicted (it did not exist on `main`). `fe55a0d` (ghost tab) **does** depend on C4 (`isCarriedOver`) and is excluded from path A. |

---

## 2. The two paths

### Path A — cache hotfix (RECOMMENDED now)

This branch. Production `cf39eb1` plus:

| Commit on this branch | Cherry-picked from (PR #2) | Change |
|---|---|---|
| `4b678e2` | `cf02eae` | An optimistic milestone (Prep / Second Check / Served) whose write is still in flight is cached with its **pre-write** values. Before: any `cacheCards()` call during the write (realtime, board read, another card's write) cached the optimistic stamp, and a reload restored it as recorded. |
| `b587c59` | `fed9387` | On the first database row for a cache-restored card, the row's lifecycle stamps and `status` replace the cached ones. Before: set-once-forward folding kept a cached stamp the database never held, permanently — the record sat in Done, out of the lockout and out of every escalation. |
| (tests commit) | — | `tests/cache-hotfix.test.mjs` (17 tests) + `tests/carried-over.harness.mjs` (byte-identical to PR #2's). |
| (this doc + vercel) | — | This file; `vercel.json` `w1/*`–`w4/*` deployment guard (byte-identical to PR #1's). |

`index.html` diff vs production: +23 / −7 lines, cache and ingest only. No copy, no i18n keys, no
schema, no RPCs. Merging PR #2 on top of this branch later was dry-run: **merges cleanly**, and
`index.html` + the harness end byte-identical to PR #2.

### Path B — release PR #1 + PR #2 together

`w3/c4-hardening` @ `ee45dbf` (includes PR #1 `2517905`): C4 client (EARLIER band, carried-over
records visible, never actionable, never alarming) + `fe55a0d` + both cache fixes.
Larger change (`6f401ec` alone is +216 lines of `index.html`, plus a merge re-implementing the
rules on the shared-ingest architecture), new visible copy in three locales (translation review
package `docs/i18n/C4_TRANSLATION_REVIEW.md` on PR #2), and its real-device QA
(`docs/qa/KITCHEN_C4_DEVICE_QA.md` sections C–G) needs step 19 applied on **staging** first.

### Recommendation

**A now, B as its own gated release later.** Reasons:

1. A fixes two defects that are live in production today, on the safety surface, and its value
   does not depend on any server change.
2. A is minimal and isolated; B's C4 behaviour is inert in production until step 19 is applied
   there, so shipping B early buys no safety but carries its full change risk.
3. B still has open gates (C4 translation review, staging step 19, device QA C–G) that A does not.
4. A does not block B: B merges cleanly on top of it (verified).

Path B remains a valid single release if the Product Owner prefers one tablet change instead
of two; in that case sections 4A and 4B are both run against the PR #2 build.

---

## 3. Preconditions (both paths)

1. PR approved by an independent reviewer (PR #2 review already covers `cf02eae` / `fed9387`
   and recommends fast-tracking them).
2. `node --test tests/*.test.mjs` green on the exact SHA to be merged; `node tests/i18n/check-catalog.js`
   green (it is also the Vercel build command — a failing catalog fails the deploy).
3. Chrome probes (section 6) green on the exact SHA.
4. Real-device acceptance (section 4) passed and the sheet signed.
5. **The current production deployment id is recorded** (Vercel → happychair-kitchen →
   Deployments → the one marked Production, `cf39eb1`): `dpl_______________________`.
   Without it, instant rollback is not prepared and the release does not start.
6. Release window is **outside service** at every venue whose kitchen board is paired.
   (Pre-pilot this is Happy Bistro only.) See N1, section 5.
7. Path B only: staging step 19 applied and verified (`supabase/tests/lane/LANE_REPORT.md` row 19);
   **production step 19 NOT applied**, and the Staff client that recognises `carried_over` is
   on its own release track.

### Ordering relative to admin staging steps 19 / 20 and production

| # | Action | Path A | Path B |
|---|---|---|---|
| 1 | Kitchen client released to production | any time — no dependency on 19 / 20 | — |
| 2 | Staging step 19 (`20261012100000`) applied | not required | required **before** device QA C–G |
| 3 | Staging step 20 (`20261012200000`) | independent | independent |
| 4 | Kitchen C4 client (PR #1 + PR #2) released to production | — | **before** production step 19 |
| 5 | Staff C4 client released | — | **before** production step 19 |
| 6 | Production step 19 applied | — | **only after** 4 and 5 are live and verified |

Never apply step 19 to production while the `main` kitchen build is live.

---

## 4. Real-device acceptance tests

**Staging only, synthetic venue only.** The board hardcodes the production Supabase URL and
anon key (`index.html`, `SUPABASE_URL` / `SUPABASE_KEY`). For device QA, make a local copy of the
branch build with **only those two lines** changed to the staging project
(`pfzkaqqgwxdkmkmksoiz`) and its anon key, serve it on the LAN, and pair it to the staging QA
venue. Confirm with `git diff` that those two lines are the only difference from the SHA under
test, and record the SHA. **A device under test must never point at production.** Every guest
name contains `QA`.

Record: tester, date/time, tablet model + OS, browser + version, SHA under test, staging venue id.
A step fails if anything differs — an extra sound, an extra write, a missing word, a flash of the
wrong state.

### 4A. Current-service safety and the fixed cache scenario (both paths)

| # | Step | Expected |
|---|---|---|
| 1 | Pair the tablet to the staging QA venue. Tap once to enable alarms. | Board loads; heartbeat green after first read; alarm prompt clears. |
| 2 | Submit a current-service **anaphylaxis** declaration (Tableside staging, `QA Ana`, Peanuts). | Within one read: blocking lockout, anaphylaxis chime, severity shown in **words** as well as colour. |
| 3 | Do not acknowledge for 30 s. | Alarm keeps repeating while un-acknowledged; the 30 s anaphylaxis escalation (`ACK_TIMEOUT_ANAPH`, `checkEscalations`) fires its alarm. Lockout stays up. |
| 4 | Hold to acknowledge. | Chime stops only after the write is confirmed; lockout advances to Prep on the same record. |
| 5 | Confirm Prep, Second Check, Served in turn. | Each shows in place, each chimes after success; record moves to Done. Staging DB row has `protocol_confirmed_at`, `verified_at`, `served_at`, `status='resolved'`. |
| 6 | **Network drop during a write.** New declaration `QA Ben` (severe), acknowledge + Prep. Disconnect Wi-Fi, hold Served. | After the 10 s bound: Served reverts, row says the outcome is unknown (not "recorded"), no chime. Offline banner on. |
| 7 | **Hung write + reload (the fixed scenario).** Reconnect. New declaration `QA Cy`, acknowledge + Prep + Second Check. Block the Supabase host only (router/firewall rule or captive proxy so the request hangs rather than fails), hold Served, and **while it is still in flight** have a second declaration arrive (or wait for a board read), then reload the page. | After reload and the first board read: `QA Cy` is **not** Served, is open (In Progress), Second Check shown. Staging DB `served_at` is NULL. On `cf39eb1` this step showed Served for ever — that is the defect being fixed. |
| 8 | Remove the block; hold Served on `QA Cy`. | Recorded normally; DB `served_at` set. |
| 9 | **Cache restore after tablet sleep.** New anaphylaxis `QA Dee`; do not acknowledge. Lock the tablet for 5 min (screen off). Wake it. | On wake: board re-reads (heartbeat), lockout for `QA Dee` is present, alarm sounds. Nothing shows as acknowledged that the DB does not hold. |
| 10 | Reload with Wi-Fi off. | Cached cards render, **no** lockout or alarm before the first read, holds refused with "checking" notice. Wi-Fi on: lockout returns for `QA Dee` exactly as the DB says. |
| 11 | Acknowledge and serve `QA Dee`, close out all QA records. | Board empty of open QA work. |

### 4B. Carried-over records (path B only, after staging step 19)

Run `docs/qa/KITCHEN_C4_DEVICE_QA.md` (on PR #2) sections B–G in full. Section B is run
**before** step 19 is applied on staging, sections C–G after. Minimum required outcome: an open
anaphylaxis record from an ended service appears in "From Earlier Service", labelled with service
and date, with no lockout, no chime, no escalation, and no hold control that writes.

### 4C. First-deploy expectation N1 (both paths)

| # | Step | Expected |
|---|---|---|
| 1 | On the **previous** build (`cf39eb1`, staging copy), reproduce step 7 so the tablet's cache holds a Served the DB does not. Leave the record un-acknowledged in the DB if testing the re-alarm case (create the inconsistency with an anaphylaxis record whose ack write hung). | Old build shows the record as Done. |
| 2 | Switch the same tablet (same origin, same localStorage) to the release build and load. | After the first read the record **reappears as open**. If the DB says un-acknowledged anaphylaxis: lockout + alarm. This is correct — the database is authoritative — but staff will see a record "come back". |

---

## 5. N1 — what staff will see on the first load after release

Any card whose cached milestones disagree with the database reopens on the first board read.
If the database holds an **un-acknowledged anaphylaxis**, the lockout and alarm fire. That is
the fix working (cached state no longer outranks the database), not a regression. Mitigation:

- Release outside service (precondition 6).
- Before release, have the kitchen lead resolve the board so nothing open is left in it.
- Tell the kitchen lead: "after the update, a record may reappear if it was never actually saved
  as served; treat it as open and complete it again."

---

## 6. Automated checks (run on this branch, 2026-10-14)

| Check | Command | Result |
|---|---|---|
| Node suite | `node --test tests/*.test.mjs` | **17 / 17 pass** |
| Same suite against unfixed `cf39eb1` `index.html` | (swap `index.html`, re-run) | 12 pass, **5 fail** — every fix test fails before the fix |
| Catalog gate (= Vercel build command) | `node tests/i18n/check-catalog.js` | pass (106 keys × 3 locales) |
| Chrome probe — safety continuity | `node tests/harness/run.js tests/safety-continuity.probe.js --query='inst=1&rows=none'` | ALL 85 CHECKS PASS (same count as committed `cf39eb1` baseline) |
| Chrome probe — safety continuity 2 | `node tests/harness/run.js tests/safety-continuity-2.probe.js --query='inst=1&rows=none'` | ALL 81 CHECKS PASS |
| Chrome probe — lockout priority | `node tests/harness/run.js tests/lockout-priority.probe.js --query='inst=1&rows=none'` | ALL 75 CHECKS PASS |
| Chrome probe — milestones | `node tests/harness/run.js tests/kitchen-milestones.probe.js --query='inst=1'` | ALL 72 CHECKS PASS |

Every probe reported "network: no request left the local server" (the harness stubs supabase-js
and fails any non-local request). The full probe set is `sh tests/harness/run-all.sh`; it was not
run in full for this preparation (it also rewrites the committed `*.results.txt` files).

---

## 7. Rollback

### Path A

1. **Instant rollback:** Vercel → happychair-kitchen → Deployments → the pre-release production
   deployment (precondition 5, `cf39eb1`) → "Instant Rollback" / "Promote to Production".
   Takes effect on the next page load of each tablet; ask the kitchen to reload.
2. **Git:** `git revert -m 1 <merge commit>` on `main` (or revert the individual commits in
   reverse order: tests, `b587c59`, `4b678e2`), pushed as a normal PR. Instant rollback first,
   revert second, so the next auto-deploy does not re-promote the release.
3. **Cache:** no clearing required. The cache format and keys are unchanged
   (`hc_k_cards_v2`, `hc_k_ghosts_v2`, `hc_k_supersession_v1`); the old build reads what the new
   build wrote, and what the new build wrote is more conservative (database-confirmed values only).
   After rollback the original defect is back, so a hung write can again cache an optimistic stamp.
   If a card is seen stuck as Done that the database shows open, clear **only**
   `hc_k_cards_v2`, `hc_k_ghosts_v2`, `hc_k_supersession_v1` and reload — the board re-reads from
   the database. **Never clear `hc_k_venue_device`** (the pairing credential — clearing it unpairs
   the display) and there is no reason to clear `hc_k_locale`.

### Path B

1. **If production step 19 has NOT been applied:** as path A (instant rollback, then revert).
   Production never returns `carried_over = true`, so no cached card carries it.
2. **If production step 19 HAS been applied:** roll back the **migration first**
   (`supabase/sql/carried_over_read_models_rollback.sql`, admin repo), confirm `kitchen_board()`
   is back to the 25-column production shape, **then** roll back the client. Rolling back the
   client first would put carried-over rows in front of a build that treats them as current and
   alarms on them. After the client rollback, cached carried-over cards raise nothing before the
   first read (cached cards are never evidence) and are pruned by the first successful read
   (`reconcile` drops ids the read does not return).

---

## 8. Approval

| Role | Who | Approves |
|---|---|---|
| Product Owner | Tom Augustine | Path choice; release window; go / no-go after section 4 |
| Independent reviewer | reviewer of PR #2 (or a second reviewer for this PR) | Code + tests on the exact SHA |
| Device QA tester | named on the QA sheet | Section 4 sheet, signed |
| Path B, additionally | Product Owner | C4 translation review sign-off; staging step 19; production step 19 timing |

No AI agent merges, deploys, promotes or applies anything under this gate.

---

## 9. Monitoring — first service after release

- **Before service:** confirm the deployed SHA (view source / Vercel deployment) matches the
  approved SHA; heartbeat green; tap-to-enable-alarms done.
- **During service, kitchen lead watches for:** any record that reappears after being completed
  (N1 — expected once only, at first load); any Served / Prep / Second Check that shows as
  recorded but later reverts; the offline banner; any alarm that does not stop after acknowledge.
- **Admin side, after service:** Shift Record for the service — every kitchen milestone on screen
  should have a matching timestamp in `allergen_declarations`; any served-on-board /
  NULL-in-database mismatch is a release failure. Check for open anaphylaxis records with no
  `kitchen_ack_at` older than the 30 s window.
- **Trigger for rollback:** an alarm that fails to fire for a current un-acknowledged anaphylaxis;
  a milestone shown as recorded that the database does not hold; a lockout that cannot be
  cleared after a confirmed write. Any one → section 7 immediately, then investigate.
- Path B, additionally: any lockout, chime or escalation for a record in "From Earlier Service"
  → rollback per section 7, path B order.

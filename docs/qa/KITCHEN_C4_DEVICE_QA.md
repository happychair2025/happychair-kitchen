# Kitchen board — C4 carried-over: real-device QA script

Branch under test: `w3/c4-hardening` (on top of `w3/carried-over`, PR #1).
What C4 means on this board (Product Owner decision, PR #5): a record left open by an earlier
service is **visible** in its own labelled band ("From Earlier Service"), **never actionable**
and **never alarming**. Current-service anaphylaxis behaviour is **unchanged**.

## Ground rules — read before starting

- **Staging only.** Use the staging Supabase project and a **synthetic venue** created for QA.
  Never point a device at production, never use Happy Bistro production data, never use a real
  guest. Every declaration in this script is typed by the tester.
- Every guest name you type contains `QA` (for example `QA Ana`) so a stray row is recognisable.
- Do not deploy anything. The board under test is served from a preview/local build of this
  branch, paired to the staging venue as a venue device.
- The server change (`20261012100000_carried_over_read_models.sql`) must be applied to
  **staging** for sections C–G. Section B is run **before** it is applied (rollout gate: clients
  first, migration second).
- Record the device model, OS version, browser version and build SHA in the header below.
- A step **fails** if the observed result differs from the expected result in any way —
  including extra sounds, extra writes, a flash of the wrong band, or a missing word.

| Field | Value |
|---|---|
| Tester | |
| Date / time (venue local) | |
| Tablet model + OS | |
| Browser + version | |
| Build SHA | |
| Staging venue id | |
| Second device (for 2-display steps) | |

## A. Setup

| # | Step | Expected | Pass | Fail |
|---|---|---|---|---|
| A1 | Pair the tablet to the staging QA venue as a kitchen venue device. | Board loads, header shows the QA venue name, heartbeat green after the first read. | ☐ | ☐ |
| A2 | Tap the screen once to enable allergy alarms. Set the volume slider to ~60%. | "Tap to enable allergy alarms" prompt clears. | ☐ | ☐ |
| A3 | In staging Admin, open a **live** service instance for today (call it Service B). Confirm an earlier instance (Service A, e.g. "Dinner" yesterday) exists. | Admin shows A and B. | ☐ | ☐ |
| A4 | Have the Admin / SQL operator ready to (a) end a service, (b) apply and roll back `20261012100000` on **staging**, (c) insert synthetic declarations through Tableside staging. | Operator confirms. | ☐ | ☐ |

## B. Before the migration (backward compatibility)

| # | Step | Expected | Pass | Fail |
|---|---|---|---|---|
| B1 | With the migration NOT applied, submit a current anaphylaxis declaration (`QA Ana`, Peanut) at T1. | Lockout opens within one read (≤ 5 s), ANAPHYLAXIS chip in words, alarm sounds and repeats every ~10 s. No "Earlier Service" text anywhere. | ☐ | ☐ |
| B2 | Hold Acknowledge to completion on the lockout. | Short confirmation chime **after** the hold completes; lockout stays on the same record and moves to Confirm Prep Area Cleared; alarm stops. | ☐ | ☐ |
| B3 | Complete Prep, Second Check and Mark Served from the record sheet. | Each step shows in place; the record moves to "Done This Service". | ☐ | ☐ |

## C. Carried-over at the service boundary

| # | Step | Expected | Pass | Fail |
|---|---|---|---|---|
| C1 | Apply `20261012100000` to staging. Reload the board. | Board unchanged for current records; no errors; heartbeat green. | ☐ | ☐ |
| C2 | During Service A (or with A still open), submit `QA Tom`, Fish, **severe**, at P4. Do **not** acknowledge. Submit `QA Lee`, Sesame, **anaphylaxis**, at T2, and acknowledge it only (no prep). | Both appear as current work. T2 alarm sounds until acknowledged. | ☐ | ☐ |
| C3 | Have the operator make Service B current (end A / open B) **while the board is open and idle**. Wait up to 10 s. | Both records move to **From Earlier Service** (amber heading with a count) between Needs You and In Progress. Each row reads `EARLIER SERVICE · <service> · <date>` and "Manager closes out". Severity word is still shown (SEVERE / ANAPHYLAXIS). | ☐ | ☐ |
| C4 | Listen for 60 s. | **No** alarm, no repeat, no chime of any kind for either record. | ☐ | ☐ |
| C5 | Check the summary bar. | The carried records are **not** counted in tables / allergies / "need action". | ☐ | ☐ |
| C6 | Tap the P4 row to open its record sheet. | Title "Earlier service — still open"; rail shows how far it got; Avoid-all reference shown; **no hold button**; text says nothing is recorded from this board and a manager closes it out in the Shift Record. "Back to Kitchen Board" returns. | ☐ | ☐ |
| C7 | Repeat C3 with the board showing the T2 **lockout** open at that moment (re-create T2 un-acknowledged first). | Within one read the lockout **closes by itself** and does not return; T2 appears in From Earlier Service; alarm stops. | ☐ | ☐ |
| C8 | Ask the operator to confirm in staging SQL that no row in C2–C7 gained `kitchen_ack_at`, `protocol_confirmed_at`, `verified_at`, `served_at` or `delivered_to_kitchen_at` after C3. | None changed after the boundary. | ☐ | ☐ |
| C9 | In Admin Shift Record, close out the P4 record (manager disposition). Wait ≤ 10 s. | The P4 row leaves the board through the next read. No sound. | ☐ | ☐ |

## D. Current service still alarms (regression)

| # | Step | Expected | Pass | Fail |
|---|---|---|---|---|
| D1 | With carried-over T2 still on the board, submit a **current** anaphylaxis `QA Kim`, Shellfish, at the **same table** T2. | A new, separate card in Needs You; lockout opens for `QA Kim` only; alarm sounds. The carried T2 card is unchanged and still in From Earlier Service. | ☐ | ☐ |
| D2 | Acknowledge `QA Kim` from the lockout. | Chime after success; lockout advances to Prep; alarm stops. The carried card did not change. | ☐ | ☐ |
| D3 | Ask the operator to block the tablet's network **during** a Mark Served hold on `QA Kim` (or use staging RLS to refuse it). | Within 10 s the row says it was not saved / could not confirm; the record is **not** shown as served; no confirmation chime. | ☐ | ☐ |

## E. Two simultaneous anaphylaxis declarations

| # | Step | Expected | Pass | Fail |
|---|---|---|---|---|
| E1 | Submit two current anaphylaxis declarations at T3 and T4 within the same second. | One lockout on screen, "1 of 2" shown; ONE alarm (not two stacked). | ☐ | ☐ |
| E2 | Acknowledge the first, then tap Back. | The second opens; it must be acknowledged separately; each gets its own chime. | ☐ | ☐ |
| E3 | Repeat E1 with one current and one carried-over anaphylaxis present at the same time. | Only the current one locks out; the queue never shows "1 of 2". | ☐ | ☐ |

## F. Network drop, reconnect and reload

| # | Step | Expected | Pass | Fail |
|---|---|---|---|---|
| F1 | Turn Wi-Fi off on the tablet for 60 s. | Offline banner within ~15 s; heartbeat not green. Board keeps showing the cards it had (carried still in its band). | ☐ | ☐ |
| F2 | While offline, have the operator submit a current anaphylaxis `QA Gap` at T5. Turn Wi-Fi back on. | Within one read after reconnect: lockout for `QA Gap`, alarm sounds; offline banner clears only after a successful read. | ☐ | ☐ |
| F3 | While offline, have the operator end the current service so `QA Gap` becomes carried-over. Reconnect. | No alarm for `QA Gap` after the read; it sits in From Earlier Service. | ☐ | ☐ |
| F4 | Reload the page (pull to refresh / reload button) with a carried record present. | Before the first read: the carried record is drawn in From Earlier Service, never in Needs You, no alarm. After the read: unchanged. | ☐ | ☐ |
| F5 | Reload with Wi-Fi **off**. | Cached cards drawn; carried still carried; no lockout and no alarm from the cache; offline banner up. Holds on cached cards say "Not confirmed with the server yet — nothing was recorded." | ☐ | ☐ |

## G. Tablet sleep / wake

| # | Step | Expected | Pass | Fail |
|---|---|---|---|---|
| G1 | Let the tablet sleep (screen off) for 5 minutes with a current un-acknowledged anaphylaxis present. Wake it. | A read happens on wake; lockout present; alarm resumes (tap to re-enable audio if the OS suspended it — the prompt must say so). | ☐ | ☐ |
| G2 | Let it sleep while the operator moves that record's service to ended. Wake it. | After the wake read: lockout closed, record in From Earlier Service, no alarm. | ☐ | ☐ |

## H. Languages and copy

| # | Step | Expected | Pass | Fail |
|---|---|---|---|---|
| H1 | Switch EN → ES → 中文 with a carried record visible and its sheet open. | Same record, same band, same sheet; every carried string in the selected language; the service name ("Dinner") stays as stored; date localised (Oct 9 / 9 oct / 10月9日). | ☐ | ☐ |
| H2 | Read every carried-over string on screen in all three languages. | None says safe, protected, resolved, handled, verified or guaranteed. Severity is always a word as well as a colour. | ☐ | ☐ |

## I. Rollback

| # | Step | Expected | Pass | Fail |
|---|---|---|---|---|
| I1 | Operator rolls staging back (`supabase/sql/carried_over_read_models_rollback.sql`). Wait one read. | The band disappears; earlier-service records leave the board (as before C4). No alarm burst, no errors. | ☐ | ☐ |

## Sign-off

| Result | Count |
|---|---|
| Steps passed | |
| Steps failed | |
| Defects filed (ids) | |

Tester signature: ____________________   Reviewer: ____________________

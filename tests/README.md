# Kitchen board — selection + presentation regression

`board-selection.seed.html` poisons `localStorage` exactly as a real tablet had accumulated
it: a 39-day-old card whose allergens/name/notes are `<b>ESC-TEST</b>` (a row that exists in
NO venue), a 4-day-old card, and a card belonging to a different venue.

`board-selection.probe.js` is appended to the real `index.html`, which then loads against the
live Happy Bistro data. It asserts that every seeded card is gone from both the board AND the
cache, that the two genuinely current declarations render, and the presentation rules.

21 checks; results in `board-selection.results.txt`.

Run: serve this directory, load `seed.html` then `index.html?venue=<uuid>` in the SAME browser
profile so the poisoned cache is actually present at boot.

## Board UX regression (`board-ux.*`)

`board-ux.probe.js` runs against an OFFLINE fixture (`?fixture=1`, no venue id, no network,
no realtime) so hold gestures can be pressed and released without any possibility of touching
live rehearsal records. Four fixture cards cover long guest names
("Bartholomew Fitzwilliam-Harrington"), a six-allergen list, cross-contact, and the two-record
ambiguous case.

It measures real boxes at board widths 1280 / 1024 / 860 / 720 and asserts the priority order
survives — service point → allergens → severity → action — with the guest name the only
element allowed to give way. It then presses a hold, samples the fill at 60ms and 360ms, and
releases early to prove the reset and that no write fires.

114 checks; results in `board-ux.results.txt`.

## Anaphylaxis lockout (`lockout.*`)

The blocking modal is rendered from the offline fixture (`?fixture=1&lockout=1`) and asserted
directly. It exists because the first pass of the XC rename missed this surface entirely —
the row was changed and the lockout was not — and a "no XC on the page" check passed anyway
because the modal had never rendered. The probe now asserts the modal IS up before it asserts
anything about its contents.

## Verification contract (`verification-contract.*`)

Runs the real board against an OFFLINE fixture (`?fixture=1`) with a stubbed `sb` that records
every write, so the live rehearsal records cannot be reached. Three write modes —
`writemode=ok|err|hang` — cover a successful write, a refused one, and one that never settles.

Asserts: opening Second Check writes NOTHING; the review shows service point, guest,
allergens, severity, cross-contact and what is already recorded; no independence claim appears
anywhere; the recording control is a press-and-hold that writes only on completion and writes
only `verified_at`/`verified_by`; early release writes nothing and resets; and — the Block D
regression — no no-write interaction can remove a card, including with `_writing` latched and
under a failed or hung write.

100 checks across the three modes.

## Paired authorization (`paired-authorization.*`)

Drives the real board with the credential exchange stubbed and `kitchen_board()` returning
EXACTLY the rows it returned for the real paired display — including their 115h/113h ages.

Paired: both P4 records render, rehearsal still reads as rehearsal, the two records stay
separate with no invented supersession, ack/prep evidence survives so the next action is
Second Check, and QA performs zero writes.

Unpaired: no allergy data loads at all, the pairing sheet opens, and no anonymous fallback is
used — an unpaired board has no authority and does not borrow any.

The database side is proven separately in SQL against the REAL paired device's claims.

## Second Check persistence (`second-check-persistence.*`)

The review must stay open through everything the board does on its own, and close only when
the operator closes it or completes the hold.

Covers: opening writes nothing; survives six reconcile cycles, a real 5-second polling tick,
a paired-token refresh, and an unrelated card updating underneath; a rebuild is suppressed
while a hold is running and the review survives a poll DURING the hold; early release keeps it
open with zero writes; Close returns to the board with zero writes; completing the hold writes
EXACTLY once, only verified_at/verified_by, for the intended declaration; the sibling record is
untouched and nothing anywhere is served/closed/superseded/minimized.

`repro-attempt.txt` records that the original failure could NOT be reproduced in the harness
(18s of real 5s polling, zero writes, stayed open) — the fix is architectural, not a patch to
an identified trigger.

## Render churn (`render-churn.*`)

Live state shape: 3 current records (1 Needs You, 2 In Progress), all rehearsal, two sharing a
service point so the duplicate marker renders, paired venue-device state.

`before.txt` is the measured defect: the Second Check button node was destroyed and recreated
on **4 of 4 polls** with identical data. `results.txt` is after: **0 of 5**, while a card whose
data genuinely changes still updates in place (node kept, content changed, action advances to
Mark Served and reverts).

Also covers the full Second Check lifecycle under the real 5s cadence: one click opens, no
open/close flash, stays open across polls, token refresh and a poll mid-hold, background
polling continues, early release and Close write nothing, a completed hold writes exactly once.

## Record sheet (`record-sheet.*`)

Fixture is Tom's exact three records, **all at P4** (the earlier fixture put Closure Test on
another table, which is why no test ever exercised the group and the marker defect survived):

| | guest | allergens | state |
|---|---|---|---|
| A | Closure Test | Sesame + Peanut | unacknowledged, own guest session |
| B | Tom `56a859b5…` | Fish | acked + prep, own guest session |
| C | Tom `7784ff89…` | Fish + Tree Nuts | acked + prep, **different** guest session, no supersession |

`diagnosis.txt` is the measured state before the change. `results.txt` is after — 83 checks.

## Record sheet UX pass (`ux-pass.*`)

Same offline fixture as `record-sheet.*`. Asserts the sheet is titled Second Check (never
"Independent Check") while the instruction and the identity disclosure survive; the incomplete
Second Check hold wears the neutral action surface, not the green success colour, with a
visible fill; an allergen with no reference list reads "<ALLERGEN> — CHECK INGREDIENTS" on both
the sheet and the lockout; red severity and the rehearsal marker are unchanged; Waiting is
is timed from the start of the step the record currently owes (Received → `created_at`,
Prep → `kitchen_ack_at`, Second Check → `protocol_confirmed_at`, Served → `verified_at`) while
`checkEscalations` keeps its own clock; the disclosure says the display is authenticated to the
venue — name read through the device credential — without identifying the person; the
rehearsal marker is a compact boxed status above the title in the order REHEARSAL → Second
Check → P4 · Terrace → Tom → allergens; and the probe writes nothing.

42 checks; results in `ux-pass.results.txt`.

## Second Check success + rehearsal identity (`second-check-success.*`)

Same offline fixture; its stub channel now KEEPS realtime handlers so the probe can deliver a
`postgres_changes` UPDATE exactly as the socket does — raw table columns, no `service_kind`.
That is the path that erased the REHEARSAL badge at Mark Served, and no earlier probe could
reach it because the stub discarded the handlers.

Asserts: a completed Second Check hold writes once, only `verified_at`/`verified_by`, to the
selected record, sibling untouched; the sheet stays open on "Second Check Recorded" with the
rehearsal marker, the same identity lines, the rail showing Second Check complete and Served
not, "Ready to Serve" copy and the device-not-person disclosure; Mark Served is offered as a
hold and is not executed (an early release writes nothing); Back closes with no write; the
success state survives the realtime echo, a real 5s poll, a token refresh and forced
re-renders; the REHEARSAL badge survives the UPDATE event; reopening shows the ordinary record;
a refused write shows the error and no success; a hung write neither claims success nor offers
the next step early.

48 checks; results in `second-check-success.results.txt`. Against 03830b1 the same probe fails
15 checks, including the badge-after-UPDATE regression.

## One Kitchen interaction contract (`kitchen-milestones.*`)

Received → Prep Confirmed → Second Check → Served, driven from all three places a milestone
can start: the anaphylaxis lockout, the record sheet, and (for the unpaired check) the sheet
with no credential. Adds five fixture records in every stage; B and C are the sibling
controls and are never acted on.

Asserts: early release, a single tap, mouse-leave and blur all write nothing; a completed hold
(mouse or keyboard) writes exactly the one intended milestone to the intended record; Confirm
Prep Area Cleared is a real hold button, and a poll mid-hold does not replace it; success is
confirmed IN PLACE — the lockout keeps the same card and states Allergy Received / Prep Area
Cleared, the sheet shows a Received/Prep banner with the next requirement, Served Recorded
with all four rail stages and the display-not-person disclosure — and survives a real 5s poll,
a token refresh and a raw realtime UPDATE; REHEARSAL survives every transition on the sheet,
the lockout and the row; refused and hung writes never claim completion and a refused lockout
write shows its error ON the lockout; no write ever uses the anonymous client, and an unpaired
display writes nothing.

70 checks; results in `kitchen-milestones.results.txt`. Against 4247714 a single click() on
Confirm Prep Area Cleared wrote protocol_confirmed_at and closed the lockout.

## Record sheet coherence (`sheet-coherence.*`)

Drives fixture B through Second Check → Served and measures the sheet in three states against
the ordinary record (C). Asserts every completed rail stage uses the existing success class
with its timestamp — none grey after Served, none amber mid-workflow — owed stages are neutral,
and the three states share the same blocks, in the same order, with identical vertical gaps
(REHEARSAL → title → service point → guest → allergens → badges → note → context → rail).
Against a7eaf42 the served rail failed every completion check and the success states were
missing the badges and context line. 19 checks.

## Phase 1 copy contract (`kitchen-copy.*`) and renders (`renders/phase1/`)

`kitchen-copy.probe.js` walks one fixture record through every Record Sheet state (Received,
Prep, Second Check, Second Check Recorded, Served Recorded, reopened served) and every lockout
stage, asserting the same hierarchy each time — REHEARSAL → current step → service point →
guest → allergens → chips → wait → rail → Avoid all → guest notes → ONE instruction → hold →
ONE small provenance line — plus the redundancy rules: cross-contact once, no section heading
over a single instruction, no wait line or "Served at" prose once served, no prohibited claims.
84 checks.

`renders/phase1/before/` (cd08f57) and `after/` are screenshots of the same walk, produced by
`renders/phase1/walk.probe.js` under a DevTools-enabled copy of the offline harness.

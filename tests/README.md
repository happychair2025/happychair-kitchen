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

## Localization — EN | ES (`kitchen-i18n.*`, `kitchen-i18n-boot.*`, `i18n/`, `renders/i18n-es/`)

One catalog (`I18N` in `index.html`), one UI, one state machine: a locale changes which string
is drawn, never which state is drawn or what a control does. `i18n/KITCHEN_STRINGS_EN_ES_ZH.md` is
the full EN → ES inventory, generated from the catalog, with every term flagged for review.

`kitchen-i18n.probe.js` (57): EN → ES with the board open (same records, states, order, zero
writes); with the Second Check sheet open (same declaration, same step); ES → EN round trip;
lockout in both languages at the same stage; a mouse or keyboard hold cannot be disturbed — the
switch is refused mid-hold, the held button is not replaced, the hold completes exactly once,
and the control never takes focus; refused while a milestone write is in flight; polls, token
refresh and live updates never reset the language; a failed save keeps the choice and retries
at next boot; a missing string shows ⟦locale:key⟧ in development and the English meaning in
production; no Spanish string claims safe / allergen-free / guaranteed / certified / protected /
verified; provenance written to the database stays "Kitchen Display".

`kitchen-i18n-boot.probe.js` (5 per display): run with `?devlocale=es` and `?devlocale=en` in
fresh profiles — each display starts in its own stored language, writes nothing to read it, and
caches it for first paint.

## Release gate — string catalog (`i18n/check-catalog.js`) — runs as the Vercel build

`vercel.json` runs `node tests/i18n/check-catalog.js` as the build command, so a release with a
broken Kitchen catalog does not deploy. It fails on: a missing or orphaned key in any supported
locale, an empty value, mismatched {placeholders}, code referencing an unknown key, a Spanish
value claiming safe / allergen-free / verified / guaranteed / certified / protected, or a
user-visible string in the markup or render code that bypasses the catalog without being
classified in its DATA allowlist (each entry says why it is shown verbatim).
`check-catalog.mutations.txt`: eight deliberate breakages, each one blocked.

## Spanish review material (`i18n/`)

`review-meta.json` (where each string appears, what it means operationally, the review concern)
plus the catalog generate, via `build-review.js`, both `KITCHEN_STRINGS_EN_ES_ZH.md` and the
reviewer page (`review-page.template.html`). Neither can drift from the code. Spanish is NOT
approved for pilot until a native speaker who knows restaurant kitchens has reviewed it;
Cross-contact is explicitly unresolved.

## Layout QA (`kitchen-layout.*`, `renders/kitchen-qa/`)

Spanish, at 1280×800, 1024×768, 820×1180 and 390×844: header fits and never clips, hold labels
inside their buttons and ≥52px, the record sheet starts below the header (EN | ES reachable)
and scrolls to its action without covering guest notes, the lockout keeps its action in view
and has its own EN | ES, rail stages aligned and labels never collide, rehearsal visible, no
English interface text. 65 checks per viewport. `kitchen-layout.before-18dd941.txt` is the
same walk (earlier probe revision) against the previous release.


## Pilot languages: en, es (Mexican / U.S. kitchens), zh-CN

One catalog, three locales (`I18N.en`, `I18N.es`, `I18N['zh-CN']`); one UI and one workflow. The
release gate requires every key in all three, a claim pattern per language, and catches
hard-coded Latin OR Chinese text (`check-catalog.mutations.txt`: 13 breakages, all blocked).

`kitchen-i18n-cycle.probe.js` (98): EN → ES → 中文 → EN with the board open, the Record Sheet
open with Second Check owed, Second Check Recorded, Mark Served owed, and the anaphylaxis
lockout open (switched from the lockout's own control), during an active rehearsal — at every
transition the same declaration, the same state, the same open surface, zero writes.

`kitchen-i18n-boot` runs three displays at once (en / es / zh-CN defaults), each starting in its
own language. Database isolation between two displays is proven in SQL (rolled back).

`kitchen-layout` runs per language (`?qalocale=`) at 1280×800, 1180×820, 1024×768, 820×1180 and
390×844 (94–95 checks each): adds long allergen combinations on board / sheet / lockout, minimum
text size, NOT-recorded errors, offline and pairing. `renders/kitchen-qa/<lang>-1280x800/` holds
the 14-state walk (`renders/walk-qa.probe.js`) in each language.

Review matrix: `i18n/KITCHEN_STRINGS_EN_ES_ZH.md` (+ review page), highest-risk terms first.
Spanish and Chinese stay DRAFT until native speakers who know U.S. restaurant kitchens review them.

## Offline harness (`harness/`)

`node tests/harness/run.js tests/<probe>.probe.js --query='inst=1'` drives the real `index.html` in
headless Chrome over the DevTools protocol, with no dependencies. **No request leaves the machine:**
the jsdelivr supabase-js tag is replaced by `harness/stub-supabase.js` (dead clients that record any
call in `window.__ANON__`), the fixture is inserted before the boot IIFE, and every request to
anything other than the local server is failed by the DevTools Fetch domain and listed at the end
of the output. `/__tap?x=&y=` gives a probe a TRUSTED input event (audio unlock); `/__shot?n=`
saves a screenshot to `../shots-kitchen/`. `harness/run-all.sh` runs the gate and every current
probe and rewrites the `*.results.txt` files.

Stale before this change (fail on 09b6b94 too, not run): `board-selection` (live data),
`board-ux` / `lockout` / `verification-contract` (the retired `?fixture=1` built-in fixture),
`render-churn` / `second-check-persistence` (reference the removed `verifyOpenId`),
`paired-authorization` (its own 115h fixture).

The fixture's write stub now models the supabase-js builder (`update().eq().is().select().abortSignal()`,
metadata non-enumerable) and records the once-per-record DELIVERY receipt in `__DW__`, separately
from milestone writes in `__W__`. `?rows=none` starts empty; `window.__WRITE_MODE='ok'|'err'|'hang'`.

## Safety continuity (`safety-continuity.*`) — W1-3

Fault injection with the realtime socket dead throughout. (a) a record found ONLY by the board read
→ lockout within one reconcile cycle, alarm, exactly one guarded `delivered_to_kitchen_at` write;
the alarm repeats every 10s, survives a refused acknowledgement, and stops once the ack is
confirmed. (b) two anaphylaxis INSERTs in one moment → first on the lockout, second queued,
"1 of 2", each acknowledged individually, Back opens the next; labels come from the board read and
the anonymous client is never used. (d) a hung write is released at 10s, fully reverted, the row says
"Not saved — tap to retry", the sheet says why, a retry records once; a write that committed after
its timeout is restored by the next board read and the message clears. (e) a `carried_over` record
sits in "From Earlier Service" between Needs You and In Progress, actionable. (c) after reload the
blocking "Tap to enable allergy alarms" prompt covers the lockout, nothing claims to sound, a real tap
unlocks and the pending alarm sounds. `cold=1` repeats (c) in a fresh profile with the browser's
autoplay rule EMULATED (headless Chrome does not enforce it): an untrusted click cannot dismiss.

Added after the first independent verification: (g) a retry after a timed-out write that
committed — guarded IS NULL, matches nothing, the board is re-read, "Already recorded — this hold
changed nothing.", recorded time unchanged, no confirmation chime; (h) three lockouts in one board
read = ONE alarm, never stacked, slider volume intact; (i) after reload, cached un-acknowledged
records raise no lockout and no alarm before the first board read, one the read shows acknowledged
elsewhere never becomes a lockout, one absent is dropped. 81 + 11 checks.

## Safety continuity part 2 (`safety-continuity-2.*`) — client-side merge REMOVED

After the second verification failure the client-side merge of continuation declarations was
subtracted, not patched: every `allergen_declarations` row is its own card, lockout, milestones and
acknowledgement. (f) two declarations at one table and guest session → two cards and two lockouts,
each acknowledged separately; the second never changes the first; a hold in progress on the first
completes on the first (its content never changed); an honest count cue "Also at this table: 1 other
allergy record" with no correction claim; supersession still replaces. (j) becoming acknowledged —
elsewhere on screen, elsewhere in the queue, or by this display's own late commit — never sounds
the alarm. (o) another declaration while an ack is in flight: the ack lands on its own record only,
the new one stays owed. (p) a write resolving after its record's content changed, or after it was
superseded, is stale — no chime, no stage drawn from it, "This record changed while saving —
showing what is recorded." (q) a guarded write that matched nothing followed by a failed re-read says
"Couldn't confirm — check the record." / "Not confirmed — tap to check", never "NOT recorded", and
the next good read resolves it. (r) a hold on content that changes is cancelled for any severity.
Third verification round: (s) a record superseded ONLY by its successor's `supersedes_id` (its own
`superseded_at` never landed) — a hold in progress writes nothing, it leaves every band and the
same-visit count, direct milestone calls on it write nothing, the successor carries "The record you
were holding was replaced by this newer one — nothing was recorded."; (t) a lockout record whose
severity changes away from anaphylaxis closes its lockout — no ANAPHYLAXIS chip, no alarm — and stays
on the board as itself; (u) an INSERT that arrives while a board read is in flight is not pruned by
that read, and one more read runs after it. 51 checks. A timed-out write now reads as UNKNOWN —
"No response — couldn't confirm. Hold to try again." / row "Not confirmed — tap to check";
"NOT recorded" is kept only for an explicit refusal.

The fixture now applies `.is()` write guards to `__ROWS` as PostgREST would, and has
`__WRITE_MODE='hold'` (released by the probe, commits on match) and `'hangcommit'` (commits, never
answers), `__BOARD_FAIL` for a failing board read, can delay the first board read and seed rows
across a reload (sessionStorage), and logs every lockout drawn (`__LKLOG`).

Probe adaptations for refactor decision 1 (every un-acknowledged anaphylaxis record raises its own
lockout on load, queued one at a time — fixture record A now does so at boot): `showLockout(X)`
used to mean "draw X's lockout now", which is `renderLockout(X,'ack')`; kitchen-milestones'
"no lockout popped" is asserted as "this action did not change which lockout is up", and Back now
also asserts that the next waiting lockout opens.

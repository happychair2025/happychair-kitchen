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

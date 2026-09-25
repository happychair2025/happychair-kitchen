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

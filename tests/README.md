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

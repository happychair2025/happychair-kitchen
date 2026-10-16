# Kitchen staging candidate (phase 1)

**Status:** prepared and tested on 2026-10-16. **Not deployed.** No `staging/kitchen` branch
exists yet. Nothing here was merged into `main`, pushed to `staging/*`, or applied to any
database. Runbook: `happychair-admin` `docs/staging/THREE_APP_STAGING.md`. The production
hotfix gate (`docs/release/KITCHEN_RELEASE_GATE.md`) is **not** exercised or changed by this.

## What the candidate is

| | SHA |
|---|---|
| Production (`main`, deployed) | `cf39eb1dde294fe88bd23cd2f63ee8e99d6e0eb8` |
| Base: `w3/staging-config` (#4; contains #1 `2517905` and #2 `ee45dbf`) | `1d881f73f29da73e69a6e1b0ed2a7587db7fdb6f` |
| Merged: `w3/kitchen-release-gate` (#3, cache hotfix) | `9af0306e0a238041ec5a5af6e977c597c7040d36` |
| Candidate code (merge commit) | `07a9135fb620ac36fc9b81b74a7e91c93267d48e` |
| Candidate head (`w3/staging-candidate`) | the commit that adds this file. Its only parent is `07a9135` and it changes nothing else |

### Merge order and conflicts

1. Start at `w3/staging-config` `1d881f7` (already contains all of `main`).
2. `git merge --no-ff origin/w3/kitchen-release-gate` (`9af0306`).
   - **Conflict: `vercel.json` `buildCommand`.** Resolved to this branch's
     `node tests/i18n/check-catalog.js && node scripts/staging-config.mjs`, so the build still
     runs the staging-config step. `deploymentEnabled` is identical on both sides.
   - `index.html` auto-merged with **no change**: #3's two fixes (`4b678e2`, `b587c59`) are
     cherry-picks of `cf02eae` / `fed9387`, which #2 already carries.
   - Net effect of the merge: two new files only, `docs/release/KITCHEN_RELEASE_GATE.md` and
     `tests/cache-hotfix.test.mjs`.

**Why the hotfix belongs on the staging candidate: yes.** The fixes are already in the board
code via #2, so the merge adds no runtime change; it adds the hotfix's own test suite (the
current-service subset of the C4 suite, written to pass with and without C4). Carrying it means
staging QA runs, and re-proves, the exact tests that gate the production hotfix, and the two
branches cannot drift on that file. It also pre-resolves the one `vercel.json` conflict that
PATH_TO_NOV7 §b predicts for a later `main` → C4 merge.

`vercel.json` at the candidate head has `"w3/*": false`, so pushing `w3/staging-candidate`
produces no Preview. `staging/*` is not named, so `staging/kitchen` will deploy.

## Results (local, 2026-10-16, node v24.14.1; no network database)

| Check | Result |
|---|---|
| `node tests/i18n/check-catalog.js` | pass (111 keys × 3 locales) |
| `node --test tests/*.test.mjs` (staging-config, c4-hardening, carried-over, cache-hotfix) | **67/67** |
| `node tests/staging-strip.run.mjs` (headless Chrome, offline) | **20 passed / 0 failed**, no request left the local server |
| `sh tests/harness/run-all.sh` (every current offline probe) | **all pass**: copy 84, i18n-cycle 98, i18n 57, layout 15 runs × 97, milestones 72, record-sheet 83, second-check-success 48, sheet-coherence 20, ux-pass 42, i18n-boot 3 × 5, safety-continuity 88, safety-continuity-2 81, cold 11, lockout-priority 75. The regenerated `*.results.txt` differed only in timings and timestamps and were not committed |

### Builds (the Vercel `buildCommand`, run in a clean `git archive` of the candidate with `VERCEL=1`)

| Environment | Result |
|---|---|
| `VERCEL_ENV=production`, no variables (Kitchen Production must have none) | `[staging-config] production (index.html unchanged)`; output **byte-identical** to the repo `index.html` |
| `VERCEL_ENV=production`, production-shaped pair | same, byte-identical |
| `VERCEL_ENV=preview`, staging-shaped pair | `[staging-config] staging (index.html rewritten in the build checkout)`; staging URL/key 1, **production ref 0** |
| production + staging pair | **refused**: `production build was given non-production VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY…` |
| production + staging key only | **refused**, same |
| preview + production pair | **refused**: `Preview variables name the production project` |
| preview, no variables | **refused**: `Preview build needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY…` |
| preview, staging URL + production key | **refused**: `…are for different projects` |

The production output contains the production ref once (the `SUPABASE_URL` line) and the staging
ref **zero** times; its `SUPABASE_URL` / `SUPABASE_KEY` lines are identical to `main`'s. The
staging output differs from the repo file only by the replaced config block (staging URL/key,
`HC_STAGING`, production-host refusal, strip, overlay offsets, `[STAGING]` title).

### Production `index.html` vs `main` (192 changed lines, 44 hunks)

Production serves the repo `index.html` unchanged, so the only differences from what production
serves today are the intended C4 and cache changes (attributed per hunk with `git blame`):

| Change | Commits | Hunks (new line numbers) |
|---|---|---|
| C4 carried-over: amber EARLIER band, labelled, never red / never pulsing (CSS) | `6f401ec`, `fd431dc` | +115 (5 lines); removes the old `.lk-carried` lockout label CSS at 209–210 |
| C4 copy: `board.carried*` strings in en / es / zh-CN | `6f401ec`, `fd431dc` | +520, +633, +746 |
| C4 carried-over rules block (`isCarriedOver`, current-service gates) | `6f401ec`, `fd431dc` | +1002–1049 |
| C4 ingest: reconcile computed fields; no standard chime / delivery write for carried-over rows | `fd431dc` | +1264, +1307, +1315 |
| C4 board render: own band below Needs You, no pulse, read-only, never minimised to a ghost tab | `6f401ec`, `fd431dc`, `fe55a0d` | +1332, +1340, +1393, +1405, +1441, +1500, +1509, +1554 |
| C4 write refusal: no milestone write ever reaches a carried-over record (`refuseCarried`) | `fd431dc` | +1680, +1715, +1785, +1826, +1857, +1887 |
| C4 record sheet: read-only carried-over record | `6f401ec`, `fd431dc` | +2243, +2283 |
| C4 lockout / escalation: carried-over and cache-only rows never lock out or escalate; old lockout "carried" label removed | `fd431dc`, `6f401ec` | +2354, +2376, +2491, +2544, 2449–2450 removed, +2640 |
| Cache fix `cf02eae`: an optimistic milestone in flight is never written to the cache (`_pre` snapshot) | `cf02eae` | +1832, +1837, +1863, +1868, +1893, +1899, +2674 |
| Cache fix `fed9387`: a cache-restored card takes its milestones from the first database row | `fed9387` | +1245 |

No hunk touches the Supabase config lines, pairing, or any unrelated surface.

### Host refusal (headless Chromium)

How: Playwright (`playwright-core` 1.55.1, Chromium 1193) loaded the built `index.html` **at the
real production or staging origin** with no network: requests to the page's own origin were
answered from the local file by request interception (`context.route`), every other request was
aborted (the supabase-js CDN included, so the board cannot reach any project).

| Bundle | Origin | Result |
|---|---|---|
| staging | `https://happychair-kitchen.vercel.app/` | **refused**: "STAGING build on a production Kitchen host. Refusing to start." |
| staging | `https://Happychair-Kitchen.vercel.app/?venue=x` | **refused** (case ignored) |
| staging | `https://happychair-kitchen-staging.vercel.app/` | runs; strip "STAGING — test data only — not a live kitchen"; title `[STAGING] HC Kitchen…` |
| production | both hosts | runs, no strip (Kitchen has no production-on-staging-host refusal by design; the board's config is fixed at build time) |

**Gap found (not fixed here):** the staging refusal does **not** strip a trailing dot.
`https://happychair-kitchen.vercel.app./` runs the staging board (with its strip, talking to
staging only). THREE_APP_STAGING.md says a trailing dot is ignored in all four apps; for Kitchen
it is not. Low risk (the board still shows STAGING and still targets staging only). Fix, if
wanted, in `scripts/staging-config.mjs` `stagingBlock`: compare
`location.hostname.toLowerCase().replace(/\.+$/,'')`, plus a test.

## Later: creating `staging/kitchen` (NOT run now)

Prerequisites: THREE_APP_STAGING.md step 2 (staging pair in Kitchen **Preview** only; Production
has neither variable) and founder approval.

```sh
git fetch origin
git rev-parse origin/w3/staging-candidate^            # must print 07a9135fb620ac36fc9b81b74a7e91c93267d48e
git diff --stat 07a9135 origin/w3/staging-candidate   # must list only docs/release/STAGING_CANDIDATE.md
git push origin origin/w3/staging-candidate:refs/heads/staging/kitchen   # creates it; never --force
```

Domain: Vercel → happychair-kitchen → Settings → Domains → `happychair-kitchen-staging.vercel.app`
assigned to Git branch `staging/kitchen`. Never assign `happychair-kitchen.vercel.app`.

## Verification after the deploy

```sh
curl -sI https://happychair-kitchen-staging.vercel.app/ | head -1                   # HTTP/2 200
curl -s https://happychair-kitchen-staging.vercel.app/ | grep -c pfzkaqqgwxdkmkmksoiz   # >= 1
curl -s https://happychair-kitchen-staging.vercel.app/ | grep -c hnrojtcctqgtzdrinyvu   # 0
curl -s https://happychair-kitchen-staging.vercel.app/ | grep -c 'var HC_STAGING=true'  # 1
curl -s https://happychair-kitchen.vercel.app/ | grep -c pfzkaqq                        # 0 (production untouched)
curl -s https://happychair-kitchen.vercel.app/ | shasum -a 256; git show origin/main:index.html | shasum -a 256   # equal
```

Build log of `staging/kitchen`: `[staging-config] staging (index.html rewritten in the build checkout)`.
On the tablet: the orange strip at the top, no card / lockout / record sheet covered.

## Rollback

- Unassign the staging domain; `git push origin --delete staging/kitchen` (ordinary push, never
  forced).
- Nothing is promoted to production. `staging/kitchen` never merges into `main`. The production
  hotfix still goes only through KITCHEN_RELEASE_GATE.md.
- Roll back if: the staging page names `hnrojtcctqgtzdrinyvu`; the strip is missing or covers
  board content; production `index.html` changes; or the build log is not the staging line.
- **Hazard (from PATH_TO_NOV7):** once step 19 is applied on staging, do not roll the C4 board
  back while step 19 stays applied.

# Kitchen board — C4 carried-over: translation review package

**Status of every Spanish and Chinese string below: DRAFT — needs native review.** They are
machine drafts written with the code. Nothing here is approved for a pilot. Reviewers should be
native speakers who know U.S. restaurant kitchens (es: Mexican / U.S. kitchen Spanish;
zh-CN: Simplified Chinese as used in U.S. kitchens).

Scope: every user-facing string added or changed by the C4 carried-over PR (`w3/carried-over`,
PR #1) and this hardening branch. Source of truth is the `I18N` catalog in `index.html`; the
full catalog review matrix is `tests/i18n/KITCHEN_STRINGS_EN_ES_ZH.md` (regenerated on this
branch so it includes these keys and the corrected meanings).

## What the strings must say (context for reviewers)

A record "from an earlier service" is an allergy record that a previous service (for example
yesterday's dinner) left open. The kitchen board **shows** it so it is not lost, but the kitchen
**cannot act on it**: there is no button, nothing is recorded from this screen, and a manager
closes it out later in the Admin "Shift Record". The guest who declared it is probably not at
the table now.

Rules every translation must keep:

1. **No safety claims.** Never "safe", "protected", "resolved", "handled", "verified",
   "guaranteed", "allergen-free", or an equivalent. The board says a record is still open, not
   that a guest is fine. (`tests/i18n/check-catalog.js` blocks the obvious Spanish and Chinese
   forms; it cannot judge tone.)
2. **"Closes out" is an administrative step**, not a safety outcome. It must not read as "solved"
   or "dealt with".
3. **Severity is always a word** (ANAFILAXIA / 过敏性休克 …) next to the colour. Carried-over rows
   keep the existing `sev.*` words; those words are unchanged by C4 but appear in a new context.
4. **"Nothing is recorded here"** must be unmistakable — a cook must not think a step was saved.
5. "Shift Record" is the name of an Admin screen and is currently kept in English in all
   locales. Reviewers: confirm, or propose the name the Admin UI will use in that language.

## Strings

| Key | Where | EN (source) | ES (draft) | zh-CN (draft) | Flags |
|---|---|---|---|---|---|
| `board.carried` (unchanged text; heading now amber, record now non-actionable) | Board section heading, between Needs You and In Progress | From Earlier Service | De un servicio anterior | 之前餐段遗留 | Meaning changed under the PO decision: these are no longer kitchen work. Check the heading does not invite action. |
| `board.carried_note` (**changed**) | Under the heading | Still open from an earlier service. Closing that service did not complete it. A manager closes these out in the Shift Record. | Sigue abierta desde un servicio anterior. Cerrar ese servicio no la completó. Un gerente las cierra en el Shift Record. | 之前餐段遗留，仍未完成。关闭该餐段并不会完成它。由经理在 Shift Record 中结案。 | **ES number mismatch**: "Sigue abierta … la completó" (singular) then "las cierra" (plural). Pick one subject. **ES gender**: other strings use "registro" (masculine). **zh**: 结案 = "close the case" — confirm it does not read as "resolved". |
| `row.carried` (new) | Row tag, followed by `· <service> · <date>` | EARLIER SERVICE | SERVICIO ANTERIOR | 之前的餐段 | Followed by data that is **not translated** (service name from the database, e.g. "Dinner"). |
| `row.carried_note` (new) | Row, where the action button would be | Manager closes out | La cierra un gerente | 由经理结案 | **ES gender**: "La" (feminine) vs "Este registro … lo cierra" in `do.carried`. Must not read as "handled". |
| `title.carried` (new) | Record sheet title | Earlier service — still open | Servicio anterior — sigue abierta | 之前的餐段 — 仍未结案 | **ES gender**: "abierta" vs masculine "registro". **zh**: 仍未结案 — confirm "still open", not "unsolved case". |
| `do.carried` (new) — **safety-critical** | Record sheet, in place of the hold | This record is from an earlier service. Nothing is recorded from this board. A manager closes it out in the Shift Record. | Este registro es de un servicio anterior. Desde esta pantalla no se registra nada. Un gerente lo cierra en el Shift Record. | 此记录来自之前的餐段。此屏幕不记录任何操作。由经理在 Shift Record 中结案。 | Must state that NOTHING is recorded. ES "pantalla" vs EN "board" — fine if consistent with the rest of the catalog. |
| `err.carried` (new) | Row / sheet message if a hold is attempted on such a record | This record is from an earlier service. A manager closes it out in the Shift Record. | Este registro es de un servicio anterior. Un gerente lo cierra en el Shift Record. | 此记录来自之前的餐段。由经理在 Shift Record 中结案。 | Must read as "not recorded", not as a retryable error. |

### Removed

| Key / string | Note |
|---|---|
| Lockout label "From Earlier Service" (`.lk-carried`, reused `board.carried`) | Removed: a carried-over record can no longer reach the lockout. No translation impact. |

### Data shown verbatim (not translated — by design, flag only)

| Item | Example | Note |
|---|---|---|
| Service name | Dinner | Comes from the venue's service configuration. Shown as stored in every locale. Open question: should service names be localised at source (Admin)? |
| Service date | Oct 9 / 9 oct / 10月9日 | Formatted per locale (`en-US`, `es-US`, `zh-CN`) from the venue calendar date, in UTC so the device timezone cannot shift it a day. Reviewers: confirm the short forms are natural. |

## Missing translations

None in the Kitchen catalog: `node tests/i18n/check-catalog.js` passes (111 keys × en, es, zh-CN,
no orphan or missing keys, placeholders consistent, no claim words).

## Review checklist (per language)

| # | Check | ES | zh-CN |
|---|---|---|---|
| 1 | No string implies safety, resolution or verification | ☐ | ☐ |
| 2 | "Closes out" reads as an administrative manager step | ☐ | ☐ |
| 3 | "Nothing is recorded from this board" is unmistakable | ☐ | ☐ |
| 4 | Number and gender agree across the five strings (ES) | ☐ | n/a |
| 5 | Shift Record naming confirmed | ☐ | ☐ |
| 6 | Severity words read correctly in a carried-over row | ☐ | ☐ |
| 7 | Date short form natural | ☐ | ☐ |

Reviewer name / date: ES ____________________   zh-CN ____________________

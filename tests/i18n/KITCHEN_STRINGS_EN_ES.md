# Kitchen strings — EN → ES (DRAFT for native-speaker review)

Generated from the catalog in `index.html`; this file cannot drift from the code. 97 keys, both locales complete.

**Not translated by design (data):** allergen names, Avoid all reference-list contents, guest notes, guest names, table / service-point labels, venue name, display name, and the provenance values written to the database (`kitchen_ack_by` etc. stay "Kitchen Display"). Timer units `d` / `h` are unchanged.

**Rule:** no Spanish string may claim more than its English source — never safe / allergen-free / guaranteed / certified / protected / verified (safe). `tests/kitchen-i18n.probe.js` checks the catalog for these.

⚠ = flagged for review (reason below the table).

| key | English | Español | |
|---|---|---|---|
| `brand` | HC Kitchen | HC Kitchen |  |
| `app.activate` | Tap to Activate · HC Kitchen | Toca para activar · HC Kitchen | ⚠ |
| `hdr.kitchen` | {venue} · Kitchen | {venue} · Cocina |  |
| `hdr.contrast` | Contrast | Contraste |  |
| `lang.label` | Display language | Idioma de la pantalla |  |
| `lang.blocked` | Finish the current step first | Termina primero el paso actual |  |
| `lang.not_saved` | Language not saved to this display | El idioma no se guardó en esta pantalla |  |
| `status.paired` | {display} · Paired | {display} · Vinculada |  |
| `status.not_paired` | Not paired | Sin vincular |  |
| `status.pair_title` | Pair this display | Vincular esta pantalla |  |
| `offline.banner` | OFFLINE — NOT RECEIVING ALLERGY ALERTS | SIN CONEXIÓN — NO SE ESTÁN RECIBIENDO ALERTAS DE ALERGIAS |  |
| `board.empty` | No Active Allergies | No hay alergias activas |  |
| `board.needs` | Needs You | Requiere acción | ⚠ |
| `board.working` | In Progress | En curso |  |
| `board.done` | Done This Service | Terminadas en este servicio |  |
| `board.earlier` | Earlier | Anteriores |  |
| `board.show` | Show | Mostrar |  |
| `board.hide` | Hide | Ocultar |  |
| `board.earlier_note` | Not part of the service running now. Review in the Shift Record. | No forman parte del servicio en curso. Revísalas en el Shift Record. | ⚠ |
| `summary.tables.one` | {n} Table | {n} mesa |  |
| `summary.tables.other` | {n} Tables | {n} mesas |  |
| `summary.allergies.one` | {n} Allergy | {n} alergia |  |
| `summary.allergies.other` | {n} Allergies | {n} alergias |  |
| `summary.anaphylaxis` | {n} Anaphylaxis | {n} con anafilaxia | ⚠ |
| `summary.need_action.one` | {n} Need Action | {n} requiere acción |  |
| `summary.need_action.other` | {n} Need Action | {n} requieren acción |  |
| `summary.all_confirmed` | All Confirmed | Todas confirmadas | ⚠ |
| `row.rehearsal` | REHEARSAL | ENSAYO |  |
| `row.updated` | UPDATED | ACTUALIZADA |  |
| `row.open` | Open this allergy record | Abrir este registro de alergia |  |
| `row.confirm_received` | Confirm Received | Confirmar recepción |  |
| `row.confirm_prep` | Confirm Prep Area | Confirmar área de preparación |  |
| `row.second_check` | Second Check → | Segunda revisión → |  |
| `row.second_check_aria` | Open the second check | Abrir la segunda revisión |  |
| `row.mark_served` | Mark Served | Marcar como servida |  |
| `sev.anaphylaxis` | ANAPHYLAXIS | ANAFILAXIA | ⚠ |
| `sev.severe` | SEVERE | GRAVE |  |
| `sev.discomfort` | DISCOMFORT | MALESTAR | ⚠ |
| `sev.unsure` | UNSURE | GRAVEDAD NO INDICADA | ⚠ |
| `sev.unknown` | UNKNOWN | DESCONOCIDA |  |
| `chip.cross_contact` | CROSS-CONTACT | CONTACTO CRUZADO | ⚠ |
| `reh.full` | REHEARSAL · NOT A GUEST | ENSAYO · NO ES UN HUÉSPED REAL | ⚠ |
| `step.ack` | Confirm Received | Confirmar recepción |  |
| `step.prep` | Prep Confirmation | Confirmación de preparación | ⚠ |
| `step.verify` | Second Check | Segunda revisión | ⚠ |
| `step.serve` | Mark Served | Marcar como servida | ⚠ |
| `step.waiting` | {step} waiting {time} | {step}: esperando {time} |  |
| `hold.ack` | Hold to Confirm Allergy Received | Mantén presionado para confirmar que se recibió la alergia | ⚠ |
| `hold.prep` | Hold to Confirm Prep Area Cleared | Mantén presionado para confirmar el área de preparación despejada | ⚠ |
| `hold.verify` | Hold to Record Second Check | Mantén presionado para registrar la segunda revisión | ⚠ |
| `hold.serve` | Hold to Mark Served | Mantén presionado para marcar como servida |  |
| `do.ack` | Confirm the kitchen has received this allergy. | Confirma que la cocina recibió esta alergia. |  |
| `do.prep` | Clear and separate the prep area, utensils and surfaces. | Despeja y separa el área de preparación, los utensilios y las superficies. | ⚠ |
| `do.verify` | Have another team member check the allergy preparation. | Pide a otro miembro del equipo que revise la preparación de la alergia. |  |
| `do.serve` | Mark served when the dish leaves the kitchen. | Márcala como servida cuando el plato salga de la cocina. |  |
| `do.complete` | Kitchen steps complete. | Pasos de cocina completados. |  |
| `do.gone` | This allergy is no longer current work here. Nothing was recorded on this display. | Esta alergia ya no es trabajo actual aquí. No se registró nada en esta pantalla. |  |
| `title.record` | Allergy Record | Registro de alergia |  |
| `title.second_check_done` | Second Check Recorded | Segunda revisión registrada | ⚠ |
| `title.served_done` | Served Recorded | Servida: registrado | ⚠ |
| `title.gone` | No longer on the board | Ya no está en la pantalla |  |
| `ok.ack` | Allergy Received | Alergia recibida |  |
| `ok.prep` | Prep Area Cleared | Área de preparación despejada | ⚠ |
| `ok.recorded` | Recorded {time} | Registrado {time} |  |
| `rail.received` | Received | Recibida |  |
| `rail.confirmed` | Confirmed | Confirmada |  |
| `rail.second_check` | Second Check | Segunda revisión |  |
| `rail.served` | Served | Servida |  |
| `ref.avoid_all` | Avoid all — {allergen} | Evitar todo — {allergen} | ⚠ |
| `ref.check_ingredients` | {allergen} — Check ingredients | {allergen} — Revisa los ingredientes |  |
| `ref.no_list` | No reference list is available. Confirm ingredients before preparation. | No hay lista de referencia. Confirma los ingredientes antes de preparar. |  |
| `ref.untranslated` | *(empty)* | Los nombres de alérgenos y las listas de referencia se muestran en inglés (sin traducir). | ⚠ |
| `notes.heading` | Guest notes | Notas del huésped (sin traducir) | ⚠ |
| `prov.line` | {display} · {venue} — records the display, not the person. | {display} · {venue} — registra la pantalla, no a la persona. |  |
| `prov.this_display` | This display | Esta pantalla |  |
| `prov.this_venue` | this venue | este local | ⚠ |
| `nav.back` | Back to Kitchen Board | Volver a la pantalla de cocina |  |
| `nav.close` | Close | Cerrar |  |
| `lock.next` | Next: Second Check. | Siguiente: segunda revisión. |  |
| `misc.table` | Table | Mesa |  |
| `misc.guest` | Guest | Huésped | ⚠ |
| `err.not_paired` | Display not paired — pair it in Set Up. | Pantalla sin vincular — vincúlala en Set Up. | ⚠ |
| `err.ack` | Received NOT recorded — try again | Recepción NO registrada — inténtalo de nuevo |  |
| `err.prep` | Prep NOT recorded — try again | Preparación NO registrada — inténtalo de nuevo |  |
| `err.verify` | Second Check NOT recorded — try again | Segunda revisión NO registrada — inténtalo de nuevo |  |
| `err.serve` | Served NOT recorded — try again | Servida NO registrada — inténtalo de nuevo |  |
| `err.minimize` | Hidden locally, but couldn't sync — try again | Oculta en esta pantalla, pero no se sincronizó — inténtalo de nuevo |  |
| `pair.title` | Pair this display | Vincular esta pantalla |  |
| `pair.body` | In Happy Chair, open {path} and tap {action}, then enter the 6-digit code it shows. | En Happy Chair, abre {path} y toca {action}; luego escribe el código de 6 dígitos que aparece. |  |
| `pair.button` | Pair Display | Vincular pantalla |  |
| `pair.need_code` | Enter the 6-digit code. | Escribe el código de 6 dígitos. |  |
| `pair.pairing` | Pairing… | Vinculando… |  |
| `pair.failed` | Could not pair. Check the code and try again. | No se pudo vincular. Revisa el código e inténtalo de nuevo. |  |
| `pair.unreachable` | Could not reach Happy Chair. | No se pudo conectar con Happy Chair. |  |
| `pair.done_title` | Display paired | Pantalla vinculada |  |
| `pair.done_body` | This display is now authenticated to this venue. It identifies the display, not the person using it. | Esta pantalla ya está autenticada en este local. Identifica la pantalla, no a la persona que la usa. |  |
| `pair.this_venue` | This venue | Este local |  |

## Flags

- **`app.activate`** — Brand "HC Kitchen" kept.
- **`board.needs`** — Not literal ("Te necesita"). "Requiere acción" chosen for clarity.
- **`board.earlier_note`** — "Shift Record" kept in English: it is the name of the Admin page, which is English.
- **`summary.anaphylaxis`** — "{n} con anafilaxia" = n records with anaphylaxis severity.
- **`summary.all_confirmed`** — "All Confirmed" = all received. "Todas confirmadas" agrees with "alergias".
- **`sev.anaphylaxis`** — Medical term "ANAFILAXIA". Confirm kitchen staff recognise it; consider pairing with a plain word if they do not, without weakening it.
- **`sev.discomfort`** — "MALESTAR" for the mildest stated severity. Confirm it does not read as more or less serious than "discomfort".
- **`sev.unsure`** — NOT "NO SEGURO": "seguro" also means "safe", so "no seguro" reads as "not safe". "GRAVEDAD NO INDICADA" = severity not stated. Confirm.
- **`chip.cross_contact`** — HIGH PRIORITY. "CONTACTO CRUZADO" (allergen cross-contact) vs the common kitchen term "contaminación cruzada", which usually means microbial cross-contamination, a different concept. Choose the term cooks will act on correctly.
- **`reh.full`** — GUEST = "huésped" throughout (also notes.heading, misc.guest). In a restaurant "comensal" or "cliente" may read more naturally; "huésped" leans hotel. Pick one word and use it everywhere.
- **`step.prep`** — "Confirmación de preparación" can read as "the dish was prepared". The English has the same ambiguity; the step is confirming the PREP AREA was cleared.
- **`step.verify`** — "Segunda revisión", deliberately NOT "verificación": "verificado/verificación" reads as "verified (safe)", a stronger claim than English "Second Check".
- **`step.serve`** — Agreement: "servida" agrees with "la alergia" (the record). If reviewers read it as the dish, it should be "servido" (el plato). Decide once; it recurs in row.mark_served, hold.serve, rail.served, err.serve, title.served_done.
- **`hold.ack`** — "Mantén presionado" (Latin America) vs "Mantén pulsado" (Spain). Informal tú imperative used throughout; confirm the register (tú vs usted) for kitchen staff.
- **`hold.prep`** — "despejada" = cleared of things. It must NOT drift toward "limpia de alérgenos" / "libre de alérgenos" (a claim). Confirm a cook reads it as "separated and cleared", which is what the English instruction asks.
- **`hold.verify`** — See step.verify.
- **`do.prep`** — Same as hold.prep.
- **`title.second_check_done`** — See step.verify.
- **`title.served_done`** — Awkward ("Servida: registrado"). Needs a native phrasing that says only "served was recorded", e.g. "Servida — registrada". Must not imply the guest received or ate it.
- **`ok.prep`** — Same as hold.prep.
- **`ref.avoid_all`** — Infinitive "Evitar todo" (sign style) vs imperative "Evita todo". The allergen after the dash stays English data until the canonical allergen vocabulary exists, so the line is mixed-language by design.
- **`ref.untranslated`** — English is empty on purpose: the note only appears when the reference data is not in the display language.
- **`notes.heading`** — See reh.full on "huésped". "(sin traducir)" is deliberate: guest text is shown verbatim, never machine-translated.
- **`prov.this_venue`** — "este local" vs "este restaurante" / "este establecimiento".
- **`misc.guest`** — See reh.full.
- **`err.not_paired`** — "Set Up" kept in English: it is the Admin menu label.

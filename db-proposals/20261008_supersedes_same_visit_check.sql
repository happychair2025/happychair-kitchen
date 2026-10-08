-- ════════════════════════════════════════════════════════════════════════════════════════════
-- PROPOSAL — NOT APPLIED. W1-3 Safety continuity, verifier rounds 4–5. For the integrator.
-- Project: hnrojtcctqgtzdrinyvu. Written against live state read on 2026-10-08.
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
-- ⛔ APPLYING THIS IS BLOCKED ON A TABLESIDE DECISION. Tableside's guestSessionFor()
--    (happychair-tableside src/App.tsx, w1/tableside @ 9cf694d, ~:668) returns a FRESH
--    crypto.randomUUID() on every submission whenever sessionStorage throws (private mode, storage
--    disabled). A correction from such a browser then carries a different guest_session_id from the
--    declaration it corrects, and this trigger would REJECT it — the guest's correction would fail.
--    The Tableside fix is to carry the ORIGINAL declaration's guest_session_id into the correction
--    (it already holds that declaration's id as p_supersedes_id). Tableside is not changed here.
--
-- ⚠ SCOPE — THIS IS NOT A SECURITY BOUNDARY YET. While the broad anon policies on
--    allergen_declarations remain (anon_select_allergen_declarations and
--    allergen_declarations_update_anon_lifecycle — 36h window, no venue scoping; the CLAUDE.md
--    launch blocker / P0-11), an anonymous caller can READ any recent row's guest_session_id and
--    asset_id — so anyone holding a table's code can submit a "same-visit" correction carrying a
--    session id they read — and can UPDATE superseded_at directly on any recent row, hiding it from
--    every reader without any supersedes_id at all. This trigger closes the cross-visit supersedes_id
--    route only. It becomes part of a real boundary after the P0-11 anon revocation; do not record it
--    as one before.
--    Separately, guest_supersede_declaration sets superseded_at on ANY record at the code's table
--    regardless of guest session — see 20261008_guest_supersede_same_session.sql (also not applied).
--
-- INTENT. A correction is a new row whose supersedes_id names the record it replaces. Readers
-- (the Kitchen client already) honour that reference ONLY within the same visit. This makes the
-- database refuse anything else, for every reader:
--   1. On INSERT, supersedes_id (if set) must name an EXISTING row that is OLDER (created_at strictly
--      earlier), is not the row itself, and has the SAME venue_id, the SAME asset_id and the SAME
--      non-null guest_session_id.
--   2. supersedes_id is IMMUTABLE after insert — any UPDATE that changes it is refused. (So no
--      reference can be re-pointed, and no cycle can be built: a reference can only point at an
--      older row, and only at insert time.)
--   3. venue_id, asset_id and guest_session_id are IMMUTABLE after insert — any UPDATE that changes
--      them is refused, so a validated reference can never be invalidated (or a record moved under
--      a reference) afterwards.
--
-- WRITERS CHECKED (2026-10-08), none of which changes 1–3 after insert:
--   * database functions: only guest_submit_declaration INSERTs (sets venue/asset from the code, and
--     already refuses a supersedes_id at another table); guest_supersede_declaration UPDATEs
--     superseded_at only. No function updates venue_id, asset_id, guest_session_id or supersedes_id.
--   * clients (grep of update() calls on allergen_declarations): Tableside (w1/tableside), Kitchen
--     (w1/kitchen), Admin (main) and Staff (main) never update those columns. Kitchen updates only
--     lifecycle columns; Admin's Shift Record dispositions use their own table.
--   * triggers already present: stamp_service_instance_declarations (BEFORE INSERT; sets
--     service_instance_id only) and stamp_venue_device_provenance_trg (BEFORE UPDATE; provenance
--     device columns only). Neither touches the guarded columns.
--   * FK supersedes_id → allergen_declarations(id) ON DELETE SET NULL — a cascade from deleting the
--     referenced row SETS supersedes_id to NULL. That is an UPDATE changing supersedes_id, so the
--     immutability rule exempts exactly that transition (old not null → new null while the
--     referenced row no longer exists).
--   * existing rows with supersedes_id: 2 — dangling 0, different venue 0, different asset 0,
--     different session 0, null session 0; both successors are newer than their predecessors.
--
-- SECURITY DEFINER because the predecessor must be read regardless of the caller's RLS. It reads one
-- row by primary key and returns nothing to the caller but an error.
-- ════════════════════════════════════════════════════════════════════════════════════════════

begin;

create or replace function public.enforce_declaration_identity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  p record;
begin
  if tg_op = 'UPDATE' then
    -- 3. identity columns never change after insert
    if new.venue_id is distinct from old.venue_id
       or new.asset_id is distinct from old.asset_id
       or new.guest_session_id is distinct from old.guest_session_id then
      raise exception 'venue_id, asset_id and guest_session_id cannot change after a declaration is recorded'
        using errcode = 'check_violation';
    end if;
    -- 2. supersedes_id never changes after insert — except the FK's own ON DELETE SET NULL
    if new.supersedes_id is distinct from old.supersedes_id then
      if new.supersedes_id is null
         and not exists (select 1 from public.allergen_declarations where id = old.supersedes_id) then
        return new;
      end if;
      raise exception 'supersedes_id cannot change after a declaration is recorded'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- INSERT
  if new.supersedes_id is null then
    return new;
  end if;
  if new.supersedes_id = new.id then
    raise exception 'a declaration cannot supersede itself' using errcode = 'check_violation';
  end if;
  select venue_id, asset_id, guest_session_id, created_at into p
    from public.allergen_declarations where id = new.supersedes_id;
  if not found then
    raise exception 'supersedes_id references no declaration' using errcode = 'foreign_key_violation';
  end if;
  if new.guest_session_id is null
     or p.guest_session_id is null
     or p.guest_session_id is distinct from new.guest_session_id
     or p.venue_id is distinct from new.venue_id
     or p.asset_id is distinct from new.asset_id then
    raise exception 'a declaration may only supersede one from the same visit (venue, table and guest session)'
      using errcode = 'check_violation';
  end if;
  if p.created_at is null or coalesce(new.created_at, now()) <= p.created_at then
    raise exception 'a declaration may only supersede an OLDER declaration' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke all on function public.enforce_declaration_identity() from public, anon, authenticated;

create trigger enforce_declaration_identity_ins
  before insert on public.allergen_declarations
  for each row when (new.supersedes_id is not null)
  execute function public.enforce_declaration_identity();

create trigger enforce_declaration_identity_upd
  before update of supersedes_id, venue_id, asset_id, guest_session_id on public.allergen_declarations
  for each row
  execute function public.enforce_declaration_identity();

commit;

-- ── VERIFY (after apply; negative cases in a BRANCH or a rolled-back transaction) ─────────────
-- a) Both triggers present:
--    select tgname, pg_get_triggerdef(oid) from pg_trigger
--     where tgrelid='public.allergen_declarations'::regclass and not tgisinternal order by 1;
-- b) Existing data complies (expected 0):
--    select count(*) from allergen_declarations s join allergen_declarations p on p.id=s.supersedes_id
--     where s.guest_session_id is null or p.guest_session_id is distinct from s.guest_session_id
--        or p.asset_id is distinct from s.asset_id or p.venue_id is distinct from s.venue_id
--        or s.created_at <= p.created_at;
-- c) INSERT negatives (branch): other table → ERROR; other session → ERROR; null session → ERROR;
--    self-reference → ERROR; a NEWER row as predecessor → ERROR.
-- d) INSERT positive: same venue, asset and session, older predecessor → inserted.
-- e) UPDATE negatives: set supersedes_id on an existing row → ERROR; change asset_id / venue_id /
--    guest_session_id → ERROR.
-- f) UPDATE positives: kitchen_ack_at / served_at / superseded_at updates succeed (not in the column
--    list for the trigger, so not even evaluated); deleting a referenced row nulls its successor's
--    supersedes_id via the FK without error.

-- ── ROLLBACK ────────────────────────────────────────────────────────────────────────────────
-- begin;
-- drop trigger if exists enforce_declaration_identity_ins on public.allergen_declarations;
-- drop trigger if exists enforce_declaration_identity_upd on public.allergen_declarations;
-- drop function if exists public.enforce_declaration_identity();
-- commit;

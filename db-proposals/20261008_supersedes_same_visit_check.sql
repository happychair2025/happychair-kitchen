-- ════════════════════════════════════════════════════════════════════════════════════════════
-- PROPOSAL — NOT APPLIED. W1-3 Safety continuity, verifier round 4. For the integrator.
-- Project: hnrojtcctqgtzdrinyvu. Written against live state read on 2026-10-08.
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
-- INTENT. A correction is a new allergen_declarations row whose supersedes_id names the record it
-- replaces. Nothing in the database requires the two to belong to the same visit. The anon INSERT
-- policy (allergen_declarations_insert_anon_guest) checks only status='pending' and that asset_id
-- is an active asset of the row's venue — supersedes_id is free. So anyone holding the publishable
-- key can insert a row at ANY table that names ANY declaration (even another venue's) as
-- superseded. A reader that honours that reference hides an un-acknowledged anaphylaxis record.
--
-- The Kitchen client (w1/kitchen) already ignores a reference unless the successor has the same
-- asset_id and the same non-null guest_session_id as the record it names. This makes the database
-- refuse such a row in the first place, for every reader (Kitchen, Staff, Admin, Shift Record):
--   a row may name a predecessor only if the predecessor exists and has the SAME venue_id, the
--   SAME asset_id and the SAME non-null guest_session_id, and is not the row itself.
--
-- LIVE STATE READ FIRST (2026-10-08):
--   * triggers on allergen_declarations: stamp_service_instance_declarations (BEFORE INSERT),
--     stamp_venue_device_provenance_trg (BEFORE UPDATE). Neither touches supersedes_id.
--   * supersedes_id: FK → allergen_declarations(id) ON DELETE SET NULL; unique partial index
--     allergen_declarations_one_replacement_per_prior_idx (one replacement per prior).
--   * guest_session_id: text, nullable. venue_id: uuid, nullable. asset_id: uuid, nullable.
--   * existing rows with supersedes_id: 2; dangling 0; different venue 0; different asset 0;
--     different session 0; null session 0. → the trigger rejects NO existing data, and an
--     UPDATE that leaves supersedes_id unchanged is not checked at all (see WHEN clause).
--
-- SECURITY DEFINER because the predecessor must be read regardless of the caller's RLS (anon has
-- no SELECT on other venues' rows; the check must not depend on what the caller can see). It reads
-- exactly one row by primary key and returns nothing to the caller but an error.
--
-- RELEASE / COMPATIBILITY: Tableside's correction path sends the same guest_session_id and
-- asset_id as the record it corrects (both live rows confirm this). A correction sent WITHOUT a
-- guest_session_id would now be refused — check Tableside before applying; a refusal surfaces to
-- the guest as a failed submission, never as a silent one.
-- ════════════════════════════════════════════════════════════════════════════════════════════

begin;

create or replace function public.enforce_supersedes_same_visit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  p record;
begin
  if new.supersedes_id is null then
    return new;
  end if;
  if new.supersedes_id = new.id then
    raise exception 'supersedes_id may not reference the row itself'
      using errcode = 'check_violation';
  end if;
  select venue_id, asset_id, guest_session_id into p
    from public.allergen_declarations where id = new.supersedes_id;
  if not found then
    raise exception 'supersedes_id references no declaration'
      using errcode = 'foreign_key_violation';
  end if;
  if new.guest_session_id is null
     or p.guest_session_id is null
     or p.guest_session_id is distinct from new.guest_session_id
     or p.venue_id is distinct from new.venue_id
     or p.asset_id is distinct from new.asset_id then
    raise exception 'a declaration may only supersede one from the same visit (venue, table and guest session)'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke all on function public.enforce_supersedes_same_visit() from public, anon, authenticated;

create trigger enforce_supersedes_same_visit_trg
  before insert or update of supersedes_id, venue_id, asset_id, guest_session_id
  on public.allergen_declarations
  for each row
  when (new.supersedes_id is not null)
  execute function public.enforce_supersedes_same_visit();

commit;

-- ── VERIFY (after apply; the negative cases in a BRANCH or inside a rolled-back transaction) ──
-- a) Trigger present, BEFORE INSERT/UPDATE, row-level:
--    select tgname, pg_get_triggerdef(oid) from pg_trigger
--     where tgrelid='public.allergen_declarations'::regclass and not tgisinternal;
-- b) Existing data still valid (expected 0):
--    select count(*) from allergen_declarations s join allergen_declarations p on p.id=s.supersedes_id
--     where s.guest_session_id is null or p.guest_session_id is distinct from s.guest_session_id
--        or p.asset_id is distinct from s.asset_id or p.venue_id is distinct from s.venue_id;
-- c) Negative (branch): as anon, insert a pending row at table P1 with supersedes_id = a T3 record
--    → ERROR check_violation. Same with a different guest_session_id → ERROR. Different venue → ERROR.
-- d) Positive (branch): same venue, same asset, same guest_session_id → inserted.
-- e) An unrelated UPDATE (e.g. kitchen_ack_at) on a row that has supersedes_id is not checked
--    (WHEN + column list) and succeeds.

-- ── ROLLBACK ────────────────────────────────────────────────────────────────────────────────
-- begin;
-- drop trigger if exists enforce_supersedes_same_visit_trg on public.allergen_declarations;
-- drop function if exists public.enforce_supersedes_same_visit();
-- commit;

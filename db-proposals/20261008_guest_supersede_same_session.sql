-- ════════════════════════════════════════════════════════════════════════════════════════════
-- PROPOSAL — NOT APPLIED. W1-3 verifier round 5, item 6. For the integrator.
-- Project: hnrojtcctqgtzdrinyvu. Written against the live definition read on 2026-10-08.
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
-- INTENT. guest_supersede_declaration(p_code, p_declaration_id) is the guest's "second statement" of
-- a correction: it marks the corrected record superseded_at. Today it does so for ANY record at the
-- code's table and venue, with no check that the caller's correction exists or belongs to the same
-- guest visit:
--
--   update allergen_declarations set superseded_at = now()
--    where id = p_declaration_id and asset_id = sp.asset_id and venue_id = sp.venue_id
--      and superseded_at is null;
--
-- So anyone holding a table's code can hide ANOTHER guest's open declaration at that table from every
-- reader (superseded rows leave the Kitchen board). EXECUTE is granted to anon (and PUBLIC).
--
-- This version marks a record superseded ONLY when a correction for it already exists — a row whose
-- supersedes_id names it — from the SAME guest session at the same table and venue. That is exactly
-- the order Tableside uses (first statement inserts the correction via guest_submit_declaration with
-- p_supersedes_id; second statement calls this), so a genuine correction is unaffected.
--
-- ⛔ SAME TABLESIDE DEPENDENCY as 20261008_supersedes_same_visit_check.sql: a browser whose
--    sessionStorage throws generates a new guest_session_id per submission, so the correction row
--    carries a different session from the original — this function would then refuse the second
--    statement (returns ok:false). The record is NOT hidden in that case: the correction still appears
--    as its own record and the original stays live, which is the safe outcome, but Tableside should
--    carry the original's guest_session_id into the correction before this is applied.
--
-- ⚠ Not a security boundary while the broad anon UPDATE policy on allergen_declarations
--    (allergen_declarations_update_anon_lifecycle) remains: anon can set superseded_at directly.
--    This closes the RPC route; the direct route closes with the P0-11 anon revocation.
--
-- Signature, return shape and grants are unchanged (CREATE OR REPLACE keeps the ACL).
-- ════════════════════════════════════════════════════════════════════════════════════════════

begin;

create or replace function public.guest_supersede_declaration(p_code text, p_declaration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare sp record; n int;
begin
  select * into sp from public.guest_service_point_from_code(p_code);
  if not found then return jsonb_build_object('ok', false, 'reason', 'unavailable'); end if;
  update public.allergen_declarations d set superseded_at = now()
   where d.id = p_declaration_id
     and d.asset_id = sp.asset_id and d.venue_id = sp.venue_id
     and d.superseded_at is null
     and d.guest_session_id is not null
     -- a correction for it must already exist, from the same visit
     and exists (
       select 1 from public.allergen_declarations c
        where c.supersedes_id = d.id
          and c.asset_id = d.asset_id and c.venue_id = d.venue_id
          and c.guest_session_id = d.guest_session_id
          and c.created_at > d.created_at);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n > 0);
end
$$;

commit;

-- ── VERIFY (branch) ─────────────────────────────────────────────────────────────────────────
-- a) Genuine correction: insert B (supersedes A, same session) via guest_submit_declaration, then
--    guest_supersede_declaration(code, A) → ok:true, A.superseded_at set.
-- b) No correction exists: guest_supersede_declaration(code, A) → ok:false, A unchanged.
-- c) Correction from another session: → ok:false, A unchanged.
-- d) Another table's code: → ok:false (unchanged behaviour).
-- e) ACL unchanged: select proacl from pg_proc where proname='guest_supersede_declaration';

-- ── ROLLBACK (restores the definition read on 2026-10-08) ──────────────────────────────────
-- create or replace function public.guest_supersede_declaration(p_code text, p_declaration_id uuid)
--  returns jsonb language plpgsql security definer set search_path to 'public'
-- as $$
-- declare sp record; n int;
-- begin
--   select * into sp from public.guest_service_point_from_code(p_code);
--   if not found then return jsonb_build_object('ok', false, 'reason', 'unavailable'); end if;
--   update public.allergen_declarations set superseded_at = now()
--    where id = p_declaration_id and asset_id = sp.asset_id and venue_id = sp.venue_id
--      and superseded_at is null;
--   get diagnostics n = row_count;
--   return jsonb_build_object('ok', n > 0);
-- end
-- $$;

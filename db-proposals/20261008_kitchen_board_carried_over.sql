-- ════════════════════════════════════════════════════════════════════════════════════════════
-- PROPOSAL — NOT APPLIED. W1-3 Safety continuity (Kitchen). For the integrator to review/apply.
-- Project: hnrojtcctqgtzdrinyvu. Written against the live definitions read on 2026-10-08
-- (kitchen_board, is_current_service_record, allergyshield_prior_service_backlog_count,
-- allergen_record_dispositions, policies allergen_declarations_{select,update}_venue_device).
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
-- INTENT (Contract C4 — "Open records from earlier services stay visible (carried-over) until
-- disposed"; C7 — "a delivery record written once per display").
--
-- Today kitchen_board() returns ONLY current-service records, and the venue-device SELECT and
-- UPDATE policies are gated on the same is_current_service_record(). So when a service closes
-- with an unresolved declaration in it, that declaration silently leaves every kitchen display
-- and the display can no longer record anything against it. Measured on 2026-10-08 at Happy
-- Bistro: 10 open, non-disposed declarations are outside current service (7 unattached legacy /
-- seed rows, 1 rehearsal row, 5 of them un-acknowledged anaphylaxis).
--
-- 1. kitchen_board() also returns OPEN records from earlier services that are not disposed,
--    flagged carried_over = true. "Open" = not superseded, not served, not closed. "Not disposed"
--    = no allergen_record_dispositions row. Rehearsal records are EXCLUDED, matching
--    allergyshield_prior_service_backlog_count (practice is not unresolved guest safety work);
--    unattached records (no service_instance_id) are INCLUDED, as the backlog count does.
-- 2. kitchen_board() also returns delivered_to_kitchen_at, so the client skips a delivery write
--    it does not need (the write is conditional on IS NULL either way — this only saves a
--    round trip per record per page life).
--    Both new columns are APPENDED, so existing column positions are unchanged.
-- 3. The venue-device SELECT and UPDATE policies are widened by exactly the carried-over set, so
--    the records the board now shows are ACTIONABLE from it (the client treats a 0-row update as
--    a failure, so without this every milestone on a carried row would show "Not saved").
--      SELECT: current-service OR carried-over-reachable (incl. once served, so the UPDATE's
--              RETURNING row and the realtime echo stay visible to the display that wrote it).
--      UPDATE USING: current-service OR carried-over (open).
--      UPDATE CHECK: current-service OR carried-over-reachable (served allowed — Mark Served
--              must pass its own CHECK).
--    No new actor, no new column writable, no change for current-service rows, no change to the
--    venue-member, paired-device (staff) or anon policies.
--
-- RELEASE ORDER: the client (w1/kitchen) tolerates this NOT being applied — without it,
-- carried_over is never set, every row reads as current, and delivery is still written once per
-- page life (guarded IS NULL). Apply this AFTER or WITH the client. Do NOT apply before the
-- venue has dispositioned stale seed/test rows: on apply, every kitchen display at Happy Bistro
-- will raise one blocking lockout + repeating alarm per un-acknowledged carried anaphylaxis row
-- (5 today: ba65384b, 84aad87e, b60e4805, 5f5c0f60, 29e1847c), one at a time.
-- ════════════════════════════════════════════════════════════════════════════════════════════

begin;

-- Same set, but a record that was just SERVED from the display stays reachable — used for the
-- UPDATE CHECK (Mark Served) and SELECT (RETURNING row / realtime echo). Still never superseded,
-- closed, disposed or rehearsal, and never current-service (those have their own branch).
create or replace function public.kitchen_carried_over_reachable(
  p_declaration_id uuid, p_venue_id uuid, p_service_instance_id uuid, p_created_at timestamptz,
  p_superseded_at timestamptz, p_closed_at timestamptz)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select p_superseded_at is null
     and p_closed_at is null
     and coalesce((select i.kind from public.service_instances i where i.id = p_service_instance_id), 'live') <> 'rehearsal'
     and not public.is_current_service_record(p_venue_id, p_service_instance_id, p_created_at)
     and not exists (select 1 from public.allergen_record_dispositions x where x.declaration_id = p_declaration_id);
$$;

-- Open work a CLOSED/EARLIER service left behind, not disposed, not rehearsal.
create or replace function public.kitchen_is_carried_over(
  p_declaration_id uuid, p_venue_id uuid, p_service_instance_id uuid, p_created_at timestamptz,
  p_superseded_at timestamptz, p_served_at timestamptz, p_closed_at timestamptz)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select p_superseded_at is null
     and p_served_at is null
     and p_closed_at is null
     and public.kitchen_carried_over_reachable(p_declaration_id, p_venue_id, p_service_instance_id,
                                               p_created_at, p_superseded_at, p_closed_at);
$$;

revoke all on function public.kitchen_carried_over_reachable(uuid,uuid,uuid,timestamptz,timestamptz,timestamptz) from public, anon;
revoke all on function public.kitchen_is_carried_over(uuid,uuid,uuid,timestamptz,timestamptz,timestamptz,timestamptz) from public, anon;
grant execute on function public.kitchen_carried_over_reachable(uuid,uuid,uuid,timestamptz,timestamptz,timestamptz) to authenticated;
grant execute on function public.kitchen_is_carried_over(uuid,uuid,uuid,timestamptz,timestamptz,timestamptz,timestamptz) to authenticated;

-- The return type changes (two appended columns), so the function must be dropped, not replaced.
drop function public.kitchen_board();

create function public.kitchen_board()
returns table(id uuid, asset_id uuid, table_label text, zone_name text, guest_name text, allergens text[],
              severity text, cross_contact boolean, notes text, status text, created_at timestamptz,
              kitchen_ack_at timestamptz, kitchen_ack_by text, protocol_confirmed_at timestamptz,
              protocol_confirmed_by text, verified_at timestamptz, verified_by text, served_at timestamptz,
              closed_at timestamptz, superseded_at timestamptz, supersedes_id uuid, minimized_at timestamptz,
              service_instance_id uuid, service_kind text, is_open boolean,
              delivered_to_kitchen_at timestamptz, carried_over boolean)
language sql stable security definer
set search_path to 'public'
as $$
  select d.id, d.asset_id, a.label, z.name,
         d.guest_name, d.allergens, d.severity, coalesce(d.cross_contact,false), d.notes,
         d.status, d.created_at,
         d.kitchen_ack_at, d.kitchen_ack_by,
         d.protocol_confirmed_at, d.protocol_confirmed_by,
         d.verified_at, d.verified_by,
         d.served_at, d.closed_at, d.superseded_at,
         d.supersedes_id, d.minimized_at,
         d.service_instance_id,
         public.service_instance_context(d.service_instance_id),
         (d.superseded_at is null and d.served_at is null and d.closed_at is null),
         d.delivered_to_kitchen_at,
         not c.is_current
  from public.allergen_declarations d
  cross join lateral (select public.is_current_service_record(d.venue_id, d.service_instance_id, d.created_at) as is_current) c
  left join public.assets a on a.id = d.asset_id
  left join public.zones  z on z.id = a.zone_id
  where public.venue_device_is_active(d.venue_id)
    and (c.is_current
         or public.kitchen_is_carried_over(d.id, d.venue_id, d.service_instance_id, d.created_at,
                                           d.superseded_at, d.served_at, d.closed_at))
  order by d.created_at desc;
$$;

-- A dropped-and-created function gets PUBLIC execute by default. Venue devices are
-- `authenticated`; anon had EXECUTE before but the body returns nothing for anon
-- (venue_device_is_active is false), so it is not re-granted.
revoke all on function public.kitchen_board() from public, anon;
grant execute on function public.kitchen_board() to authenticated, service_role;

-- Policies: widened by the carried-over set only.
alter policy allergen_declarations_select_venue_device on public.allergen_declarations
  using (
    public.venue_device_is_active(venue_id)
    and (public.is_current_service_record(venue_id, service_instance_id, created_at)
         or public.kitchen_carried_over_reachable(id, venue_id, service_instance_id, created_at, superseded_at, closed_at))
  );

alter policy allergen_declarations_update_venue_device on public.allergen_declarations
  using (
    public.venue_device_is_active(venue_id)
    and (public.is_current_service_record(venue_id, service_instance_id, created_at)
         or public.kitchen_is_carried_over(id, venue_id, service_instance_id, created_at, superseded_at, served_at, closed_at))
  )
  with check (
    public.venue_device_is_active(venue_id)
    and (public.is_current_service_record(venue_id, service_instance_id, created_at)
         or public.kitchen_carried_over_reachable(id, venue_id, service_instance_id, created_at, superseded_at, closed_at))
  );

commit;

-- ── VERIFY (read-only, after apply) ─────────────────────────────────────────────────────────
-- a) Shape: 27 columns, the last two delivered_to_kitchen_at, carried_over.
--    select pg_get_function_result('public.kitchen_board()'::regprocedure);
-- b) Grants: authenticated + service_role only.
--    select proacl from pg_proc where oid='public.kitchen_board()'::regprocedure;
-- c) Policies: exactly two changed, everything else byte-identical to the pre-apply snapshot.
--    select policyname, cmd, qual, with_check from pg_policies where tablename='allergen_declarations' order by 1;
-- d) Carried set matches the backlog definition (excluding disposed + rehearsal), per venue:
--    select count(*) from allergen_declarations d
--     where d.venue_id='593de041-c609-46fe-bbc7-7268ab6ca462'
--       and public.kitchen_is_carried_over(d.id,d.venue_id,d.service_instance_id,d.created_at,d.superseded_at,d.served_at,d.closed_at);
--    -- expected today: 9 (the 10 open non-current rows minus rehearsal 18ed1112)
-- e) Negative: a venue-device JWT for venue X still sees nothing of venue Y (venue_device_is_active
--    is unchanged and still first in every predicate); anon still sees nothing through kitchen_board.
-- f) A disposition removes the row from the board on the next read (insert a disposition in a
--    BRANCH, not production, and re-run kitchen_board as the device).

-- ── ROLLBACK ────────────────────────────────────────────────────────────────────────────────
-- begin;
-- alter policy allergen_declarations_select_venue_device on public.allergen_declarations
--   using (venue_device_is_active(venue_id) and is_current_service_record(venue_id, service_instance_id, created_at));
-- alter policy allergen_declarations_update_venue_device on public.allergen_declarations
--   using (venue_device_is_active(venue_id) and is_current_service_record(venue_id, service_instance_id, created_at))
--   with check (venue_device_is_active(venue_id) and is_current_service_record(venue_id, service_instance_id, created_at));
-- drop function public.kitchen_board();
-- create function public.kitchen_board()
--  returns table(id uuid, asset_id uuid, table_label text, zone_name text, guest_name text, allergens text[],
--                severity text, cross_contact boolean, notes text, status text, created_at timestamptz,
--                kitchen_ack_at timestamptz, kitchen_ack_by text, protocol_confirmed_at timestamptz,
--                protocol_confirmed_by text, verified_at timestamptz, verified_by text, served_at timestamptz,
--                closed_at timestamptz, superseded_at timestamptz, supersedes_id uuid, minimized_at timestamptz,
--                service_instance_id uuid, service_kind text, is_open boolean)
--  language sql stable security definer set search_path to 'public'
-- as $$
--   select d.id, d.asset_id, a.label, z.name, d.guest_name, d.allergens, d.severity, coalesce(d.cross_contact,false), d.notes,
--          d.status, d.created_at, d.kitchen_ack_at, d.kitchen_ack_by, d.protocol_confirmed_at, d.protocol_confirmed_by,
--          d.verified_at, d.verified_by, d.served_at, d.closed_at, d.superseded_at, d.supersedes_id, d.minimized_at,
--          d.service_instance_id, public.service_instance_context(d.service_instance_id),
--          (d.superseded_at is null and d.served_at is null and d.closed_at is null)
--   from public.allergen_declarations d
--   left join public.assets a on a.id = d.asset_id
--   left join public.zones  z on z.id = a.zone_id
--   where public.venue_device_is_active(d.venue_id)
--     and public.is_current_service_record(d.venue_id, d.service_instance_id, d.created_at)
--   order by d.created_at desc;
-- $$;
-- revoke all on function public.kitchen_board() from public;
-- grant execute on function public.kitchen_board() to anon, authenticated, service_role;
-- drop function public.kitchen_is_carried_over(uuid,uuid,uuid,timestamptz,timestamptz,timestamptz,timestamptz);
-- drop function public.kitchen_carried_over_reachable(uuid,uuid,uuid,timestamptz,timestamptz,timestamptz);
-- commit;
-- (Rolling back while the w1/kitchen client is live is safe: carried_over is simply never set.)

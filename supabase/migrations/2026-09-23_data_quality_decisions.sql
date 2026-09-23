-- Révision de la base : décisions historisées (doublons, villes conservées, fiches ignorées) — direction uniquement
create table if not exists data_quality_decisions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('doublon', 'ville', 'fiche')),
  entity_a uuid not null,            -- pas de clé étrangère : une fiche peut disparaître après fusion
  entity_b uuid,
  name_a text,                       -- noms figés au moment de la décision
  name_b text,
  decision text not null check (decision in ('doublon', 'pas_doublon', 'ignore')),
  note text,
  decided_by uuid references profiles(id) on delete set null,
  decided_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references profiles(id) on delete set null
);
create index if not exists dqd_kind_idx on data_quality_decisions (kind, revoked_at);
grant select, insert, update on public.data_quality_decisions to authenticated;
grant select, insert, update, delete on public.data_quality_decisions to service_role;
alter table data_quality_decisions enable row level security;
drop policy if exists dqd_select on data_quality_decisions;
drop policy if exists dqd_insert on data_quality_decisions;
drop policy if exists dqd_update on data_quality_decisions;
create policy dqd_select on data_quality_decisions for select to authenticated using (is_direction());
create policy dqd_insert on data_quality_decisions for insert to authenticated with check (is_direction() and decided_by = auth.uid());
create policy dqd_update on data_quality_decisions for update to authenticated using (is_direction()) with check (is_direction());

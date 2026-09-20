-- Suggestions du jour par commercial (calculées chaque nuit par le Worker)
create table if not exists ia_suggestions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  profile_id uuid not null references profiles(id) on delete cascade,
  enterprise_id uuid not null references enterprises(id) on delete cascade,
  rank smallint not null,
  suggested_action text,
  reason text not null,
  model text,
  created_at timestamptz not null default now(),
  unique (date, profile_id, enterprise_id)
);
create index if not exists ia_suggestions_date_idx on ia_suggestions (date, profile_id);
alter table ia_suggestions enable row level security;
drop policy if exists "ia_suggestions lecture" on ia_suggestions;
create policy "ia_suggestions lecture" on ia_suggestions for select to authenticated using (true);

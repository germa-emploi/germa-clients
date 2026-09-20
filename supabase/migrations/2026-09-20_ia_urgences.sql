-- Urgence des relances en retard (calculée chaque nuit par le Worker)
create table if not exists ia_urgences (
  enterprise_id uuid primary key references enterprises(id) on delete cascade,
  level smallint not null check (level between 0 and 3),   -- 3 urgent · 2 à faire · 1 peut attendre · 0 à solder
  reason text,
  model text,
  computed_at timestamptz not null default now()
);
alter table ia_urgences enable row level security;
drop policy if exists "ia_urgences lecture" on ia_urgences;
create policy "ia_urgences lecture" on ia_urgences for select to authenticated using (true);

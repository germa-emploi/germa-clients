-- Briefings de réunion commerciale (lecture réservée à la direction ; écriture par le Worker). Le PDF du compte rendu n'est pas conservé.
create table if not exists ia_reunions (
  id uuid primary key default gen_random_uuid(),
  meeting_date date not null,
  previous_date date not null,
  cr_filename text,
  content text not null,
  stats jsonb not null,
  model text,
  generated_at timestamptz not null default now(),
  generated_by uuid references profiles(id) on delete set null
);
create index if not exists ia_reunions_date_idx on ia_reunions (meeting_date desc);
grant select on public.ia_reunions to authenticated;
grant select, insert, update, delete on public.ia_reunions to service_role;
alter table ia_reunions enable row level security;
drop policy if exists "ia_reunions direction" on ia_reunions;
create policy "ia_reunions direction" on ia_reunions for select to authenticated using (is_direction());

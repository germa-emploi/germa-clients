-- Veille presse : mentions d'entreprises en base et pistes de nouveaux prospects
create table if not exists ia_veille (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('mention','piste')),
  enterprise_id uuid references enterprises(id) on delete cascade,   -- mention : entreprise de la base
  company_name text,                                                  -- piste : nom détecté
  city text,
  department text,                                                    -- '67' | '68' | null
  title text not null,
  url text not null,
  source text,
  published_at date,
  summary text,                                                       -- résumé IA (2 phrases)
  why text,                                                           -- piste : pourquoi c'est intéressant
  status text not null default 'new' check (status in ('new','read','created','ignored')),
  created_enterprise_id uuid references enterprises(id) on delete set null,
  model text,
  created_at timestamptz not null default now(),
  unique (url, kind, enterprise_id, company_name)
);
create index if not exists ia_veille_status_idx on ia_veille (status, created_at desc);
alter table ia_veille enable row level security;
drop policy if exists "ia_veille lecture" on ia_veille;
create policy "ia_veille lecture" on ia_veille for select to authenticated using (true);
drop policy if exists "ia_veille statut" on ia_veille;
create policy "ia_veille statut" on ia_veille for update to authenticated using (true) with check (true);

-- Rapport mensuel : rapports archivés et consignes de rédaction (lecture réservée à la direction ; écriture par le Worker)
create table if not exists ia_rapports (
  month text primary key,               -- 'AAAA-MM'
  content text not null,                -- texte Markdown rédigé par l'assistant
  stats jsonb not null,                 -- chiffres calculés par le serveur
  remarques text,
  model text,
  generated_at timestamptz not null default now(),
  generated_by uuid references profiles(id) on delete set null
);
create table if not exists ia_rapport_config (
  id smallint primary key default 1 check (id = 1),
  instructions text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);
grant select, insert, update, delete on public.ia_rapports to authenticated, service_role;
grant select, insert, update, delete on public.ia_rapport_config to authenticated, service_role;
alter table ia_rapports enable row level security;
alter table ia_rapport_config enable row level security;
drop policy if exists "ia_rapports direction" on ia_rapports;
create policy "ia_rapports direction" on ia_rapports for select to authenticated using (is_direction());
drop policy if exists "ia_rapport_config direction" on ia_rapport_config;
create policy "ia_rapport_config direction" on ia_rapport_config for select to authenticated using (is_direction());

-- Calcul de marge : paramètres (IFM, ICP, charges par structure) et catalogue des EPI, fixés par la direction
create table if not exists marge_config (
  id smallint primary key default 1 check (id = 1),
  params jsonb not null,        -- { "ETTI": { "ifm": 10, "icp": 10, "charges": 28.2 }, "AI": { ... } }
  epi jsonb not null,           -- [ { "nom": "Chaussures de sécurité", "prix": 45 }, ... ]
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);
grant select, insert, update on public.marge_config to authenticated;
grant select, insert, update, delete on public.marge_config to service_role;
alter table marge_config enable row level security;
drop policy if exists marge_config_select on marge_config;
drop policy if exists marge_config_write on marge_config;
drop policy if exists marge_config_update on marge_config;
-- lecture : tout compte actif (les commerciaux utiliseront les valeurs une fois l'outil ouvert)
create policy marge_config_select on marge_config for select to authenticated using (is_active_user());
-- écriture : direction uniquement
create policy marge_config_write on marge_config for insert to authenticated with check (is_direction());
create policy marge_config_update on marge_config for update to authenticated using (is_direction()) with check (is_direction());

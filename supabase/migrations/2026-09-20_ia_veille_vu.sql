-- Articles déjà analysés par la veille (pour ne jamais les renvoyer à l'IA)
create table if not exists ia_veille_vu (
  url text primary key,
  seen_at timestamptz not null default now()
);
alter table ia_veille_vu enable row level security;

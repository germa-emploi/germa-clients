-- Compteur quotidien des demandes à l'assistant IA, par utilisateur (plafond appliqué par le Worker)
create table if not exists ia_usage (
  profile_id uuid not null references profiles(id) on delete cascade,
  day date not null,
  calls integer not null default 0,
  primary key (profile_id, day)
);
alter table ia_usage enable row level security;
-- aucune règle : seule la clé service du Worker lit et écrit

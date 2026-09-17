-- Schéma GermaClients — relevé depuis information_schema le 17/09/2026 (v2.9.1)
-- Référence uniquement : la base de production existe déjà, ne pas ré-exécuter tel quel.
-- Contraintes FK d'après la doc technique (non relevées ici). RLS activé sur toutes les tables.

create table sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key,                       -- = auth.users.id
  email text,
  full_name text,
  role text not null default 'commercial',   -- 'direction' | 'commercial' | 'autre'
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

create table enterprises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector_id uuid references sectors(id),
  city text,
  department text,                           -- '67' | '68'
  phone text,
  email text,
  contact_name text,
  interlocuteur text,
  communaute_communes text,
  a_relancer boolean not null default false,
  status text not null default 'prospect',   -- 'prospect' | 'client'
  converted_at timestamptz,
  converted_by uuid references profiles(id),
  created_by uuid references profiles(id),
  assigned_to uuid references profiles(id),
  description_activite text,
  proposition_envoyee_at date,
  proposition_signee_at date,
  notes text,
  created_at timestamptz not null default now(),
  dernier_contrat_at date
);

create table interlocuteurs (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references enterprises(id) on delete cascade,
  name text not null,
  fonction text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table actions (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references enterprises(id) on delete cascade,
  performed_by uuid references profiles(id),
  performed_at timestamptz not null default now(),
  action_type text not null,                 -- Physique | Téléphonique | Mail | Courrier | Non défini
  channel text,
  is_new_prospect boolean default false,
  need_identified boolean default false,
  need_type text,
  maturity text,                             -- Froid | Tiède | Chaud
  result text,                               -- À relancer | RDV pris | Refus | Sans suite | Signé
  next_action text,
  next_action_date date,
  comments text,
  contact text
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null,
  performed_by uuid references profiles(id),
  target_type text,
  target_id uuid,
  target_name text,
  details text,
  created_at timestamptz not null default now()
);

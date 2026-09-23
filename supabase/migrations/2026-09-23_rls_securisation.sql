-- ============================================================
-- GermaClients — sécurisation des droits d'accès (RLS)
-- Remplace les règles « tout est permis à tout compte connecté » par des règles par rôle.
-- Rejouable. Annulation : rls_retour_arriere.sql
-- ============================================================
begin;

-- ---------- fonctions d'aide (exécutées avec les droits du propriétaire, sans boucle RLS) ----------
create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active)
$$;
create or replace function public.is_direction() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active and role = 'direction')
$$;

-- ---------- suppression des anciennes règles ouvertes ----------
drop policy if exists all_enterprises on enterprises;
drop policy if exists all_actions on actions;
drop policy if exists all_interlocuteurs on interlocuteurs;
drop policy if exists all_sectors on sectors;
drop policy if exists all_profiles on profiles;
drop policy if exists all_activity_log on activity_log;

-- ---------- enterprises : tout compte actif lit, crée, modifie ; seule la direction supprime ----------
drop policy if exists ent_select on enterprises; drop policy if exists ent_insert on enterprises;
drop policy if exists ent_update on enterprises; drop policy if exists ent_delete on enterprises;
create policy ent_select on enterprises for select to authenticated using (is_active_user());
create policy ent_insert on enterprises for insert to authenticated with check (is_active_user());
create policy ent_update on enterprises for update to authenticated using (is_active_user()) with check (is_active_user());
create policy ent_delete on enterprises for delete to authenticated using (is_direction());

-- ---------- actions : on crée en son nom, on modifie les siennes ; la direction fait tout ----------
drop policy if exists act_select on actions; drop policy if exists act_insert on actions;
drop policy if exists act_update on actions; drop policy if exists act_delete on actions;
create policy act_select on actions for select to authenticated using (is_active_user());
create policy act_insert on actions for insert to authenticated with check (is_direction() or (is_active_user() and performed_by = auth.uid()));
create policy act_update on actions for update to authenticated using (is_direction() or (is_active_user() and performed_by = auth.uid())) with check (is_direction() or (is_active_user() and performed_by = auth.uid()));
create policy act_delete on actions for delete to authenticated using (is_direction());

-- ---------- interlocuteurs : tout compte actif (comme l'interface aujourd'hui) ----------
drop policy if exists int_all on interlocuteurs;
create policy int_all on interlocuteurs for all to authenticated using (is_active_user()) with check (is_active_user());

-- ---------- sectors : tout compte actif lit ; la direction gère ----------
drop policy if exists sec_select on sectors; drop policy if exists sec_write on sectors;
create policy sec_select on sectors for select to authenticated using (is_active_user());
create policy sec_write on sectors for all to authenticated using (is_direction()) with check (is_direction());

-- ---------- profiles : lecture par les actifs (et son propre profil même inactif, pour le message de connexion) ;
--            modification : la direction, ou soi-même (mot de passe changé) sans pouvoir toucher rôle / actif / e-mail ----------
drop policy if exists prof_select on profiles; drop policy if exists prof_update on profiles;
create policy prof_select on profiles for select to authenticated using (id = auth.uid() or is_active_user());
create policy prof_update on profiles for update to authenticated using (is_direction() or id = auth.uid()) with check (is_direction() or id = auth.uid());
-- pas d'insert ni de delete depuis l'appli (les profils sont créés par la base à l'inscription)

create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_direction() then
    new.id := old.id; new.role := old.role; new.is_active := old.is_active; new.email := old.email;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_fields on profiles;
create trigger protect_profile_fields before update on profiles for each row execute function public.protect_profile_fields();

-- ---------- activity_log : lecture par les actifs, écriture en son propre nom, jamais de modification ni de suppression ----------
drop policy if exists log_select on activity_log; drop policy if exists log_insert on activity_log;
create policy log_select on activity_log for select to authenticated using (is_active_user());
create policy log_insert on activity_log for insert to authenticated with check (is_active_user() and performed_by = auth.uid());

-- ---------- ia_veille : l'appli ne peut changer que le statut (et le lien vers le prospect créé) ----------
create or replace function public.protect_veille_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.id := old.id; new.kind := old.kind; new.enterprise_id := old.enterprise_id; new.company_name := old.company_name;
    new.city := old.city; new.department := old.department; new.title := old.title; new.url := old.url; new.source := old.source;
    new.published_at := old.published_at; new.summary := old.summary; new.why := old.why; new.model := old.model; new.created_at := old.created_at;
    if not public.is_active_user() then return null; end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_veille_fields on ia_veille;
create trigger protect_veille_fields before update on ia_veille for each row execute function public.protect_veille_fields();

-- ---------- création de compte : le rôle envoyé à l'inscription n'est plus pris en compte ----------
-- Tout nouveau profil naît « commercial » et INACTIF ; la direction l'active et fixe son rôle depuis l'Admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'commercial', false);
  return new;
end $$;

commit;

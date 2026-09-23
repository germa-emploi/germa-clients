-- Retour à l'état d'avant (règles ouvertes) — à n'utiliser qu'en cas de blocage
begin;
drop policy if exists ent_select on enterprises; drop policy if exists ent_insert on enterprises; drop policy if exists ent_update on enterprises; drop policy if exists ent_delete on enterprises;
drop policy if exists act_select on actions; drop policy if exists act_insert on actions; drop policy if exists act_update on actions; drop policy if exists act_delete on actions;
drop policy if exists int_all on interlocuteurs;
drop policy if exists sec_select on sectors; drop policy if exists sec_write on sectors;
drop policy if exists prof_select on profiles; drop policy if exists prof_update on profiles;
drop policy if exists log_select on activity_log; drop policy if exists log_insert on activity_log;
drop trigger if exists protect_profile_fields on profiles;
drop trigger if exists protect_veille_fields on ia_veille;
create policy all_enterprises on enterprises for all to authenticated using (true) with check (true);
create policy all_actions on actions for all to authenticated using (true) with check (true);
create policy all_interlocuteurs on interlocuteurs for all to authenticated using (true) with check (true);
create policy all_sectors on sectors for all to authenticated using (true) with check (true);
create policy all_profiles on profiles for all to authenticated using (true) with check (true);
create policy all_activity_log on activity_log for all to authenticated using (true) with check (true);
-- (la fonction handle_new_user sécurisée est conservée volontairement : la remettre dans son ancien état rouvrirait la faille)
commit;

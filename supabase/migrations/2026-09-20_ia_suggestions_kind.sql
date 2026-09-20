-- Suggestions : ajout du type (jour | sans_suite | refus) et profile_id optionnel
alter table ia_suggestions add column if not exists kind text not null default 'jour';
alter table ia_suggestions alter column profile_id drop not null;
alter table ia_suggestions drop constraint if exists ia_suggestions_date_profile_id_enterprise_id_key;
create unique index if not exists ia_suggestions_uniq on ia_suggestions (date, kind, enterprise_id);

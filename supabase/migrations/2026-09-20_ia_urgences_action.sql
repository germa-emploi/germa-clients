-- Conseil de l'assistant sur les relances : ajout du moyen de relance conseillé
alter table ia_urgences add column if not exists suggested_action text;

-- Propositions : statut « refusée » (date et motif) en plus de « envoyée » et « signée »
alter table enterprises add column if not exists proposition_refusee_at date;
alter table enterprises add column if not exists proposition_motif_refus text;

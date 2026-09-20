-- Harmonisation du libellé "Prochaine action" (actions.next_action) — 20/09/2026
begin;
update actions set next_action = 'Relance téléphonique'
 where next_action is not null and (
   lower(next_action) in ('relance téléphonique','relance téléphnique','relance','téléphonique','relance tél','téléphone','rappeler','relancer','téléphoner','recontacter, relancer','reprendre contact pour saison à venir','téléphonique - date démarrage','téléphoner pour prendre rdv','relance tél + mail','relance tél ou mail','rappeler ou envoi mail')
 );
update actions set next_action = 'Relance par mail'
 where next_action is not null and lower(next_action) in ('relance par mail','mail','envoi mail','faire un mail','relance mail','envoyer mail','mail de présentation');
update actions set next_action = 'Visite'
 where next_action is not null and lower(next_action) in ('visite entreprise','entretien physique','visite','rdv physique','rdv sur site','rdv pris');
update actions set next_action = 'Envoi de candidats'
 where next_action is not null and lower(next_action) in ('proposition candidats','prop candidats par mail');
update actions set next_action = 'Envoi de proposition'
 where next_action is not null and lower(next_action) in ('prop active par mail','faire proposition commerciale','envoyer proposition','faire proposition active','envoi contrat');
-- date de relance sans libellé → relance téléphonique
update actions set next_action = 'Relance téléphonique' where next_action_date is not null and (next_action is null or next_action = '');
-- tout reste non reconnu → Autre
update actions set next_action = 'Autre'
 where next_action is not null and next_action <> '' and next_action not in ('Relance téléphonique','Relance par mail','Visite','Envoi de candidats','Envoi de proposition','Autre');
select next_action, count(*) from actions where next_action is not null group by next_action order by 2 desc;
commit;

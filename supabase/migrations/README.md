# Scripts SQL exécutés à la main (SQL Editor Supabase), dans l'ordre

| Date | Fichier | Objet | Environnement |
|---|---|---|---|
| 2026-09-18 | `2026-09-18_import_vendanges_2026.sql` | Import des prospections vendanges 2026 (3 Excel) | prod |
| 2026-09-18 | `2026-09-18_ia_scores_initial.sql` *(branche demo-ia)* | Table `ia_scores` + notation initiale des 1 407 prospects | démo (table dans la base commune) |
| 2026-09-20 | `2026-09-20_harmonisation_prochaine_action.sql` | `actions.next_action` ramené à la liste fermée | prod |
| 2026-09-20 | `2026-09-20_renommage_envoi_candidature.sql` | « Envoi de candidats » → « Envoi de candidature » | prod |
| 2026-09-23 | `2026-09-23_rls_securisation.sql` | Droits d'accès par rôle (RLS), journal non modifiable, rôle protégé, comptes créés inactifs | prod (base commune) |
| — | `2026-09-23_rls_retour_arriere.sql` | Retour aux règles ouvertes en cas de blocage (garde le correctif de création de compte) | secours |
| 2026-09-20 | `2026-09-20_ia_*.sql` *(branche demo-ia)* | Tables `ia_suggestions`, `ia_veille`, `ia_veille_vu`, `ia_urgences` | démo |

Les tables `ia_*` vivent dans la base de prod (une seule base) ; l'appli de prod ne les lit pas.

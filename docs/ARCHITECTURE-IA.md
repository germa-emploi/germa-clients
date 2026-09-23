# GermaClients — architecture de l'assistant IA (branche `demo-ia`)

## Vue d'ensemble

```
Navigateur (démo)  ──POST──►  Worker Cloudflare `germaclients-ia`  ──►  API Anthropic (Claude)
                                       │
                                       └──►  Supabase (clé service) : lecture des fiches, écriture des tables ia_*
Cron 0 1 * * * (UTC)  ────────────────►  scheduled() : chaîne nocturne
```

- Le site n'a **jamais** de clé API : il appelle le Worker, qui détient la clé Anthropic et la clé service Supabase en secrets.
- Le Worker n'accepte que les origines `demo-ia.germa-clients.pages.dev`, `germa-clients.pages.dev` et `localhost:5173` (CORS), et les commandes manuelles exigent `CRON_SECRET`.
- Code du Worker : `worker-ia/worker.js` (un seul fichier, collé tel quel dans l'éditeur Cloudflare → Deploy). Il n'est **pas** déployé automatiquement par Git.

## Worker : variables (Cloudflare → Worker → Settings → Variables and Secrets)

| Nom | Type | Rôle |
|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | clé API Claude (compte perso de Yann pour la démo, à remplacer par un compte GERMA en prod) |
| `SUPABASE_URL` | Text | `https://zlrqwstsahrlghhvfaob.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Secret | clé `service_role` Supabase (tous droits — ne vit que là) |
| `CRON_SECRET` | Secret | mot de passe des commandes manuelles |
| `AI_DAILY_LIMIT` | Text (optionnel) | plafond de demandes IA par personne et par jour (défaut 150) |
| `MODEL` | Text (optionnel) | modèle Claude ; défaut `claude-sonnet-5` |
| `ALLOWED_ORIGINS` | Text (optionnel) | origines CORS, séparées par des virgules |

Cron : `0 1 * * *` (1 h UTC = 3 h Paris en été, 2 h en hiver).

## Chaîne nocturne (dans l'ordre)

1. **Notation** (`nightlyScoring`) — prospects dont une fiche, une action ou le journal a bougé dans les 26 h (max 150) → `ia_scores` (score 1-5, raison). Calcul initial du 18/09/2026 fait à la main sur 1 407 prospects.
2. **Suggestions du jour** (`dailySuggestions`) — par commercial actif (rôle `commercial`, comptes techniques exclus) : candidats = ses prospects à ≥ 3 flammes (40 max envoyés), l'IA en classe jusqu'à 15 → `ia_suggestions` (`kind = jour`).
3. **Veille presse / BOAMP** (`veille`) — sources RSS (DNA économie, L'Alsace économie, Rue89 Strasbourg) + API BOAMP open data (67 et 68, 60 derniers avis). Correspondance des noms avec la base **dans le Worker** (gratuit) ; l'IA ne voit que les correspondances (→ `ia_veille kind=mention`) et 40 articles récents pour détecter des pistes (→ `kind=piste`). Articles analysés mémorisés dans `ia_veille_vu`.
4. **Sans suite / Refus à rouvrir** (`reopenSuggestions`) — 60 candidats par catégorie (commentaire, > 60 j ou actu récente, hors « ne plus recontacter »), l'IA en retient ≤ 5 → `ia_suggestions` (`kind = sans_suite | refus`). Un prospect suggéré ne revient pas avant 30 jours.
5. **Conseil sur les relances** (`urgenceRelances`) — toutes les relances datées (retard et à venir, clients compris) : urgence 0-3 + moyen conseillé + raison → `ia_urgences`. Recalcul seulement si la fiche a bougé ou après 7 jours ; purge des relances disparues.
   - Niveaux : 3 = urgent 🏃🏃🏃 · 2 = à faire 🏃🏃 · 1 = peut attendre 🏃 · 0 = **à solder** 🧹 (la relance n'a plus de sens — besoin passé, pas de besoin, refus implicite, contact obsolète : enregistrer un « Sans suite » plutôt que rappeler).
   - Moyens : Appeler · Envoyer un mail · Passer sur site · Envoyer des candidatures · Envoyer une proposition · **Aucune action pour l'instant** ⏸️ (relance future déjà programmée, rien à faire avant).

## Rapport mensuel

- `POST /rapport` `{ month: 'AAAA-MM', remarques }` (direction) : `computeMonthStats` calcule les chiffres dans la base, l'assistant rédige le texte selon les consignes de `ia_rapport_config` (ou `DEFAULT_RAPPORT_CONSIGNES`), résultat archivé dans `ia_rapports`.
- `POST /rapport/config` (direction) : `{}` lit les consignes, `{ instructions }` les enregistre, `{ reset: true }` revient aux consignes d'origine.
- Cron : le 1er du mois (heure de Paris), génération du mois écoulé s'il n'existe pas encore.
- Page `RapportMensuel.jsx` : chiffres affichés depuis `stats` (jamais depuis le texte), rendu Markdown minimal échappé, impression via une fenêtre dédiée.

## Création de comptes (utilisée par la prod)

`POST /admin/create-user` avec le jeton de session d'un compte **direction** actif : crée l'utilisateur par l'API d'administration Supabase (clé de service), active son profil avec le rôle choisi, journalise. Les inscriptions publiques sont fermées dans Supabase.

## Tâches à la demande (depuis le site)

`POST` sur l'URL du Worker avec `{ task, context }` : `mail` (brouillon, tient compte de la presse si la case est cochée), `brief`, `relance_date` (propose le **type de prochaine action** dans la liste fermée **et sa date**, d'après le contexte complet de la fiche + le commentaire en cours de saisie), `score`, `daily`, `veille_mention`, `veille_pistes`, `reopen`, `urgence`. `priorities` existe encore mais n'est plus appelée (fonction « Priorités de la semaine » retirée en 2.36.1). Les consignes (system prompts) sont dans l'objet `SYSTEM` du Worker — c'est là qu'on règle le ton et les règles.

## Commandes manuelles (PowerShell)

```powershell
$S = "VALEUR_DE_CRON_SECRET"
$U = "https://germaclients-ia.old-cake-a2b6.workers.dev"
# notation des fiches modifiées (26 h) ; "force":["uuid",…] pour cibler ; "hours":0 pour ne prendre que force
Invoke-RestMethod -Method Post -Uri "$U/nightly" -ContentType "application/json" -Body "{`"secret`":`"$S`"}"
# suggestions du jour
Invoke-RestMethod -Method Post -Uri "$U/daily"   -ContentType "application/json" -Body "{`"secret`":`"$S`"}"
# veille : test des sources sans IA / réelle / rattrapage BOAMP sur N jours
Invoke-RestMethod -Method Post -Uri "$U/veille-test" -ContentType "application/json" -Body "{`"secret`":`"$S`"}" | ConvertTo-Json -Depth 4
(Invoke-RestMethod -Method Post -Uri "$U/veille" -ContentType "application/json" -Body "{`"secret`":`"$S`"}") | ConvertTo-Json -Depth 4
(Invoke-RestMethod -Method Post -Uri "$U/veille" -ContentType "application/json" -Body "{`"secret`":`"$S`",`"days`":14}") | ConvertTo-Json -Depth 4
# sans suite / refus à rouvrir
Invoke-RestMethod -Method Post -Uri "$U/reopen"  -ContentType "application/json" -Body "{`"secret`":`"$S`"}"
# conseil sur les relances ("force":true pour tout recalculer)
Invoke-RestMethod -Method Post -Uri "$U/urgence" -ContentType "application/json" -Body "{`"secret`":`"$S`"}"
```

Un appel manuel long peut dépasser le délai Cloudflare : les lots déjà traités sont enregistrés, relancer reprend la suite.

## Tables IA (dans la base de prod, lues seulement par la démo)

| Table | Contenu | Écriture |
|---|---|---|
| `ia_scores` | score de chaleur par prospect | Worker |
| `ia_suggestions` | suggestions du jour / sans suite / refus (`kind`, `date`, `rank`, `profile_id`) | Worker |
| `ia_veille` | mentions (entreprise de la base) et pistes (nouveau prospect), avec `status` new/read/created/ignored | Worker ; statut modifiable par l'appli |
| `ia_veille_vu` | URL des articles déjà analysés | Worker |
| `ia_urgences` | urgence + moyen conseillé + raison par relance | Worker |
| `ia_rapports` | rapports mensuels (texte + chiffres), lecture direction | Worker |
| `ia_rapport_config` | consignes de rédaction du rapport, lecture direction | Worker |
| `ia_usage` | compteur quotidien de demandes IA par personne | Worker |

Scripts de création : `supabase/migrations/2026-09-*_ia_*.sql`. RLS : lecture pour tout compte connecté, écriture réservée à la clé service (sauf `ia_veille.status`).

## Côté site (branche démo)

- `src/demo/demo.js` : `AI_WORKER_URL`, `aiRequest`, `buildContext` (contexte textuel envoyé à l'IA, presse incluse), gabarits de repli si le Worker ne répond pas.
- `src/lib/supabase.js` : `makeReadOnly` — bloque insert/update/delete/rpc et les opérations de compte, avec message à l'écran.
- Pages spécifiques démo : `NouveautesDemo.jsx` (présentation pour le comité de direction, avec coûts), `Presse.jsx`, `ActionsDuJour.jsx` (avec les suggestions du jour). Composants IA dans `EnterpriseDetail.jsx` (mail, brief, prochaine action suggérée, chaleur et conseil intégrés à la carte principale, fenêtre « Historique de la fiche » lisant `activity_log`) et `Dashboard.jsx` (barre de navigation rapide, suggestions du jour avec « Voir plus », sans suite/refus à rouvrir, urgence et moyen conseillé sur les relances, badge Client).
- `index.html` a un titre « DÉMO · » : ne pas le reporter en prod lors d'une fusion inverse.

## Coûts mesurés (Sonnet 5 : 2 $/M tokens en entrée, 10 $/M en sortie)

- Notation : ~950 tokens par fiche · Suggestions du jour : ~10 000 tokens par commercial · Veille : ~13 000 tokens par nuit · Rouvrir : ~4 000 par catégorie · Urgence : ~1 800 par relance (premier passage), puis incrémental.
- Ordre de grandeur pour GERMA (150 actions/mois, 2 commerciaux) : **6 à 7 € par mois** toutes fonctions comprises. Suivi : console Claude → API keys → colonne Cost ; plafond réglable dans Limits.

## Chantiers à venir (Worker)

- **Séparer** un petit Worker « administration » (création de comptes, stable) du Worker IA (qui évolue souvent) : aujourd'hui, un déploiement raté de la partie IA couperait aussi la création de comptes en prod.
- **Déployer depuis GitHub** (Workers Builds) au lieu du copier-coller dans l'éditeur Cloudflare, pour que le code en ligne soit toujours celui du repo.

## Passage en prod d'une fonction IA (procédure)

1. Créer un compte API Anthropic au nom de GERMA, clé en secret dans le Worker ; ajouter la prod à `ALLOWED_ORIGINS` si besoin (déjà incluse par défaut).
2. Reporter sur `main` : `src/demo/demo.js` (renommer), le composant concerné, les lectures des tables `ia_*`, et l'entrée de changelog — sans `makeReadOnly` ni le bandeau démo.
3. Le Worker et les tables sont déjà en place : rien à refaire côté Cloudflare/Supabase.

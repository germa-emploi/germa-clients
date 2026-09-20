export const APP_DISPLAY_VERSION = '2.26.0-démo'

export const CHANGELOG = [
  {
    version: '2.26.0-démo',
    date: '2026-09-20',
    changes: [
      'Tableau de bord : les relances sont séparées en deux blocs côte à côte — « Relances en retard » (rouge) et « Relances planifiées » (aujourd\'hui et à venir, filtrables par année et mois). Les relances du jour sont surlignées en orange',
    ],
  },
  {
    version: '2.25.1-démo',
    date: '2026-09-20',
    changes: [
      'Page Nouveautés démo : coût estimé par mois et par an pour chaque fonction, Suggestions du jour ajoutées, Copier les e-mails retiré (déjà en prod)',
      'Démo alignée sur la prod 2.19.1 (les évolutions 2.17 à 2.19 y étaient déjà appliquées)',
    ],
  },
  {
    version: '2.24.1-démo',
    date: '2026-09-20',
    changes: [
      'Listes : colonne « Dernier résultat » (triable) à côté de « Dernière action »',
    ],
  },
  {
    version: '2.24.0-démo',
    date: '2026-09-20',
    changes: [
      'Drapeau 🔔 « À relancer » retiré (fiche, formulaire, filtre de la liste, bloc du tableau de bord) : doublon avec l\'action « À relancer » datée',
    ],
  },
  {
    version: '2.23.0-démo',
    date: '2026-09-20',
    changes: [
      'Listes prospects/clients : nouveau filtre « Dernier résultat » (À relancer, RDV pris, Refus, Sans suite, Signé, ou aucune action)',
    ],
  },
  {
    version: '2.22.0-démo',
    date: '2026-09-20',
    changes: [
      '✨ Suggestions du jour : à droite des relances planifiées, les 5 prospects que l\'assistant conseille de traiter aujourd\'hui à chaque commercial, avec l\'action et la raison ; calculées chaque nuit après la notation',
    ],
  },
  {
    version: '2.21.0-démo',
    date: '2026-09-20',
    changes: [
      'Formulaire d\'action : la prochaine action et sa date ne sont saisissables que pour « À relancer » ou « RDV pris » ; elles sont effacées si on passe à « Sans suite », « Refus » ou « Signé »',
    ],
  },
  {
    version: '2.20.0-démo',
    date: '2026-09-20',
    changes: [
      'Reprend la prod 2.16.0 (relances filtrables par mois/année, voir tout)',
    ],
  },
  {
    version: '2.19.1-démo',
    date: '2026-09-20',
    changes: [
      'Page « Nouveautés démo » dans le menu : présentation des nouvelles fonctions, pensée pour une démonstration en direct',
    ],
  },
  {
    version: '2.18.1-démo',
    date: '2026-09-20',
    changes: [
      '« Envoi de candidats » renommé « Envoi de candidature » dans la liste des prochaines actions',
    ],
  },
  {
    version: '2.18.0-démo',
    date: '2026-09-20',
    changes: [
      'Reprend la prod 2.15.0 (« Prochaine action » en liste) ; la date de relance suggérée choisit désormais son libellé dans cette liste',
    ],
  },
  {
    version: '2.17.0-démo',
    date: '2026-09-20',
    changes: [
      '✨ Bouton « Suggérer une date de relance » toujours visible dans les formulaires d\'action « À relancer » ; message si aucun commentaire n\'est saisi',
    ],
  },
  {
    version: '2.16.0-démo',
    date: '2026-09-20',
    changes: [
      'Mode démo bien visible : bandeau violet fixe en haut de toutes les pages, menu latéral teinté avec liseré violet, titre d\'onglet « DÉMO · GermaClients », page de connexion en violet avec badge DÉMO',
    ],
  },
  {
    version: '2.15.0-démo',
    date: '2026-09-20',
    changes: [
      'Reprend la prod 2.14.0 (page Historique)',
    ],
  },
  {
    version: '2.14.0-démo',
    date: '2026-09-20',
    changes: [
      '✨ Date de relance suggérée : dans une action « À relancer », l\'assistant lit le commentaire et propose une date et un libellé de prochaine action, que le commercial peut modifier avant d\'enregistrer',
    ],
  },
  {
    version: '2.13.0-démo',
    date: '2026-09-20',
    changes: [
      'Champ « Suivi / Contact » retiré des formulaires d\'action (les anciennes valeurs restent visibles)',
      '🔥 Flammes affichées dans les blocs « Relances planifiées » et « Entreprises à relancer » du tableau de bord (prospects notés)',
      'Reprend les évolutions de la prod 2.11.0 (copier les e-mails) et 2.12.0 (relances par commercial assigné, réattribution à la désactivation)',
    ],
  },
  {
    version: '2.12.0-démo',
    date: '2026-09-18',
    changes: [
      '🔥 Score de chaleur (1 à 5 flammes) sur chaque fiche prospect, avec la raison et la date de calcul',
      'Colonne « Chaleur » triable dans la liste des prospects (survol = raison)',
      'Calcul nocturne par l\'assistant (Worker germaclients-ia, 3 h du matin) sur les prospects modifiés dans la journée ; calcul initial du 18/09/2026 sur les 1 407 prospects ayant au moins une action',
      '✨ Priorités de la semaine : lecture instantanée des scores stockés, 15 prospects les plus chauds',
      'Saisie libre d\'action retirée',
    ],
  },
  {
    version: '2.11.0-démo',
    date: '2026-09-18',
    changes: [
      'Branche de démonstration en lecture seule sur la vraie base : rien de ce qui est saisi n\'est enregistré',
      '✨ Rédiger un e-mail (fiche entreprise) : brouillon de relance ou de premier contact rédigé par Claude à partir de l\'historique, modifiable, copier ou ouvrir dans Outlook',
      '✨ Brief avant l\'appel (fiche entreprise) : résumé en cinq points de la relation, angle conseillé, questions à poser',
      '✨ Priorités de la semaine (tableau de bord) : les 10 prospects tièdes à travailler, notés de 1 à 5 avec la raison',
      '📋 Copier les e-mails (listes) : sélection des adresses de la liste filtrée (e-mail de la fiche et des interlocuteurs) puis copie pour un mailing en Cci',
      'Appels IA via le Worker Cloudflare germaclients-ia (modèle Sonnet 5) ; repli sur un gabarit local si l\'IA ne répond pas',
    ],
  },
  {
    version: '2.19.1',
    date: '2026-09-20',
    changes: [
      'Listes : colonne « Dernier résultat » (triable) à côté de « Dernière action »',
    ],
  },
  {
    version: '2.19.0',
    date: '2026-09-20',
    changes: [
      'Drapeau 🔔 « À relancer » retiré (fiche, formulaire, filtre de la liste, bloc du tableau de bord) : doublon avec l\'action « À relancer » datée',
    ],
  },
  {
    version: '2.18.0',
    date: '2026-09-20',
    changes: [
      'Listes prospects/clients : nouveau filtre « Dernier résultat » (À relancer, RDV pris, Refus, Sans suite, Signé, ou aucune action)',
    ],
  },
  {
    version: '2.17.0',
    date: '2026-09-20',
    changes: [
      'Formulaire d\'action : la prochaine action et sa date ne sont saisissables que pour « À relancer » ou « RDV pris » ; elles sont effacées si on passe à « Sans suite », « Refus » ou « Signé »',
    ],
  },
  {
    version: '2.16.0',
    date: '2026-09-20',
    changes: [
      'Tableau de bord : les relances planifiées se filtrent par année et par mois, avec un bouton « Voir toutes les relances » au-delà des 15 premières',
    ],
  },
  {
    version: '2.15.1',
    date: '2026-09-20',
    changes: [
      '« Envoi de candidats » renommé « Envoi de candidature » dans la liste des prochaines actions',
    ],
  },
  {
    version: '2.15.0',
    date: '2026-09-20',
    changes: [
      '« Prochaine action » devient une liste (Relance téléphonique, Relance par mail, Visite, Envoi de candidature, Envoi de proposition, Autre), pré-remplie sur « Relance téléphonique »',
      'Anciennes saisies harmonisées dans la base (« relance tél », « Téléphonique »… → « Relance téléphonique », etc.)',
    ],
  },
  {
    version: '2.14.0',
    date: '2026-09-20',
    changes: [
      'Nouvelle page « Historique » dans le menu : entreprises créées, conversions, actions et RDV pris, sur toute la période',
      'Filtres combinables : année, mois, commercial (direction), secteur, département, type d\'échange, résultat, recherche libre ; totaux par mois ; export Excel du résultat filtré',
      'Un commercial ne voit que son activité et ses entreprises ; la direction voit tout',
      'Les liens « → Historique » des cartes du tableau de bord ouvrent la page sur la bonne vue ; les cartes gardent leurs fenêtres rapides',
    ],
  },
  {
    version: '2.13.0',
    date: '2026-09-20',
    changes: [
      'Champ « Suivi / Contact » retiré des formulaires d\'action (doublon avec résultat, prochaine étape et commentaire) ; les anciennes valeurs restent visibles dans l\'historique et l\'export',
    ],
  },
  {
    version: '2.12.0',
    date: '2026-09-20',
    changes: [
      'Tableau de bord : un commercial ne voit plus que les relances (planifiées et 🔔) des entreprises qui lui sont assignées ; la direction continue de tout voir',
      'Admin : à la désactivation d\'un compte, possibilité de réattribuer en une fois toutes ses entreprises à un autre commercial (tracé dans le journal)',
    ],
  },
  {
    version: '2.11.0',
    date: '2026-09-19',
    changes: [
      '📋 Copier les e-mails (listes prospects et clients) : choisir les adresses parmi la liste filtrée — e-mail de la fiche et des interlocuteurs, sans doublon — puis les copier séparées par « ; » pour un mailing en Cci',
    ],
  },
  {
    version: '2.10.0',
    date: '2026-09-18',
    changes: [
      'Relances planifiées : un résultat "Sans suite", "Refus" ou "Signé" saisi après une relance la fait disparaître du tableau de bord (la dernière action de l\'entreprise fait foi)',
      'Drapeau "À relancer" retiré automatiquement dès qu\'une action "Sans suite", "Refus" ou "Signé" est enregistrée',
      'Nouveau champ "Date de l\'action" à la création et à la modification d\'une action (pré-rempli à aujourd\'hui, pas de date future)',
      'Les fenêtres de saisie ne se ferment plus en cliquant à côté : uniquement via "Annuler" ou la croix',
      'Bouton "Retour" sur les listes prospects/clients vers le tableau de bord ; recherche, filtres et tri de la liste conservés en revenant d\'une fiche',
    ],
  },
  {
    version: '2.9.1',
    date: '2026-03-19',
    changes: [
      'Correction : une seule relance par entreprise dans les relances planifiées (la plus récente)',
      'Reclasser un client : modale avec choix "Ancien client" (saisie date du dernier contrat) ou "Correction d\'erreur" (n\'a jamais été client)',
      'Badge "Ancien client" visible sur les fiches prospects reclassés, avec date du dernier contrat',
      'Nouvelle colonne "Ancien client" dans la vue prospects, triable et filtrable (Oui / Non)',
      'Filtre commercial : ajout du choix "Aucun" pour afficher les entreprises sans commercial assigné',
    ],
  },
  {
    version: '2.9.0',
    date: '2026-03-15',
    changes: [
      'Carte "Actions" : les non-admins ne voient que leurs propres actions (libellé "Mes actions")',
      'Graphique "Activité & Conversions" : modale agrandie (pleine largeur)',
      'Statistiques admin : clic pour agrandir chaque graphique, puis clic sur un mois pour voir le détail',
    ],
  },
  {
    version: '2.8.0',
    date: '2026-03-15',
    changes: [
      'Mention "Historique" déplacée en haut à droite des cartes KPI',
      'Colonne "Date de création" en vue prospects et "Date de conversion" en vue clients, filtrables et triables par mois/année',
      'Graphiques du dashboard cliquables sur toute leur surface pour agrandir',
      'Statistiques admin : 4 graphiques mensuels par utilisateur (entreprises créées, actions, RDV, conversions)',
    ],
  },
  {
    version: '2.7.0',
    date: '2026-03-15',
    changes: [
      'Journal d\'activité en vue tableau triable et filtrable (par type, utilisateur, recherche)',
      'Export Excel (.xlsx) avec noms lisibles au lieu de CSV avec IDs',
      'Nouvel onglet "Statistiques" en admin avec le graphique Performance par utilisateur (déplacé du tableau de bord)',
    ],
  },
  {
    version: '2.6.0',
    date: '2026-03-15',
    changes: [
      'Cartes KPI avec sélecteurs année/mois intégrés (entreprises, conversions, actions, RDV)',
      'Graphique Activité & Conversions : début janv. 2026, agrandissement en modale, mode mensuel/annuel, sélection de période',
      'Graphiques Résultats et Types d\'échange filtrés par année en cours, agrandissement en modale avec sélection période et mode annuel/mensuel',
      'Suppression du graphique "Croissance du portefeuille"',
      'Suppression du graphique "Conversions annuelles"',
    ],
  },
  {
    version: '2.5.0',
    date: '2026-03-13',
    changes: [
      'Nouvelles cartes KPI : Entreprises (total/prospects/clients), Conversions (année/mois), Actions (année/mois), RDV pris (année/mois)',
      'Chaque carte est cliquable : modale avec sélection année/mois et liste détaillée',
      'Les indicateurs année/mois se mettent à jour automatiquement au 1er janvier',
    ],
  },
  {
    version: '2.4.0',
    date: '2026-03-12',
    changes: [
      'Activité récente affiche le journal complet : créations, modifications, suppressions, conversions (Dashboard + Admin)',
      'Nom de l\'utilisateur visible sur chaque événement',
      'Modification d\'une action : crayon visible pour tous (admins sur toutes, commerciaux sur les leurs)',
      'Suppression d\'une action réservée aux admins',
      'Toute modification et suppression d\'action est logguée dans le journal',
    ],
  },
  {
    version: '2.3.0',
    date: '2026-03-12',
    changes: [
      'Suppression de la colonne "Maturité" (retirée du tableau de bord, des fiches et de la vue liste)',
      'Gestion des contacts uniquement via les interlocuteurs (suppression des champs contact/tél/email de la fiche entreprise)',
      'Bouton modifier (crayon) sur les interlocuteurs',
      'Migration automatique des contacts entreprise existants vers des interlocuteurs',
      'Import des données de Christine (48 nouvelles entreprises, 61 actions)',
    ],
  },
  {
    version: '2.2.0',
    date: '2026-03-12',
    changes: [
      'Bouton "Fusionner" (direction) : recherche, comparaison des différences, résolution des conflits, fusion des actions et interlocuteurs',
      'Type d\'échange "Non défini" pour les imports sans type connu',
      'Champ "Description activité / besoin" (renommé)',
      'Filtre et tri par proposition commerciale en vue liste',
    ],
  },
  {
    version: '2.1.0',
    date: '2026-03-12',
    changes: [
      'Rattachement d\'une entreprise à un commercial (affectation)',
      'Les admins peuvent changer l\'affectation depuis la fiche ou le formulaire de modification',
      'Colonne "Commercial" en vue liste affiche le commercial assigné',
      'Suppression de proposition commerciale par un admin (bouton ✕ sur le badge)',
      'Filtre et tri par proposition commerciale (envoyée / signée / aucune) en vue liste',
      'Colonne "Prop." en vue liste avec indicateur visuel',
      'Badges de proposition commerciale redesignés (gradient, icône, date)',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-03-12',
    changes: [
      'Multi-interlocuteurs par entreprise avec fiches individuelles (nom, fonction, tél, email)',
      'Champ "Description de l\'activité" sur les fiches entreprises',
      'Bouton "Proposition commerciale" sur les fiches prospects (envoyée / signée avec date)',
      'Badges proposition visibles sur fiche et en vue liste',
      'La transformation en client efface les badges proposition',
      'Graphique combiné Activité & Conversions avec taux par action',
      'Corrections des dates du changelog',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-03-11',
    changes: [
      'Fonction "Mot de passe oublié" sur l\'écran de connexion',
      'Réinitialisation du mot de passe par email',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-03-11',
    changes: [
      'Boutons "Convertir en client" et "Modifier" accessibles à tous les utilisateurs',
      'Bouton "Supprimer" et "Reclasser" réservés à la direction',
      'Règles de complexité du mot de passe (8 car., majuscule, minuscule, chiffre, spécial)',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-10',
    changes: [
      'Changement de mot de passe obligatoire au premier login',
      'Bouton "Reclasser" (direction) sans impact sur les stats de conversion',
      'Graphiques de taux de conversion mensuel et annuel',
      'Bouton "Nouveau client" sur la page Clients',
      'Bouton "À relancer" visible hors des filtres',
      'Rôle utilisateur "Autre" disponible',
      'Double logo GERMA ETTI + AI',
      'Changelog accessible depuis la page d\'accueil et la sidebar',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-09',
    changes: [
      'Import des 926 entreprises et 875 actions du fichier prospects 67',
      'Tableau de bord avec indicateurs et graphiques',
      'Gestion des prospects et clients avec fiches détaillées',
      'Ajout d\'actions commerciales (Physique, Téléphonique, Mail, Courrier)',
      'Gestion des utilisateurs (Commercial, Direction)',
      'Export CSV, backup/restore JSON',
      'Journal d\'activité',
    ],
  },
]

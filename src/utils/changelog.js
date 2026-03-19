export const APP_DISPLAY_VERSION = '2.9.1'

export const CHANGELOG = [
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

# GermaClients

Application de suivi de prospection commerciale pour **GERMA Emploi ETTI**.

## Stack technique

- **Frontend** : React 18 + Vite + Tailwind CSS
- **Backend** : Supabase (Auth + PostgreSQL + Row Level Security)
- **Déploiement** : Cloudflare Pages (via GitHub)

## Installation

### 1. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor** et exécuter le contenu de `supabase/schema.sql`
3. Dans **Authentication > Settings** :
   - Désactiver "Confirm email" (pour faciliter la création de comptes)
   - Ou utiliser l'API admin pour créer les utilisateurs
4. Récupérer l'URL du projet et la clé `anon` dans **Settings > API**

### 2. Configurer les variables d'environnement

Copier `.env.example` en `.env.local` et remplir :

```
VITE_SUPABASE_URL=https://VOTRE_PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon_ici
```

### 3. Installer et lancer en local

```bash
npm install
npm run dev
```

### 4. Créer le premier compte direction

Option A — via Supabase Dashboard > Authentication > Users > Add User

Option B — via l'interface de l'app (si la confirmation email est désactivée)

### 5. Déployer sur Cloudflare Pages

1. Push le code sur GitHub
2. Dans Cloudflare Pages, connecter le repo GitHub
3. Paramètres de build :
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
   - **Environment variables** : ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`

### 6. Configurer les variables d'environnement sur Cloudflare

Dans Cloudflare Pages > Settings > Environment variables, ajouter :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Structure du projet

```
germaclients/
├── index.html              # Point d'entrée HTML
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example            # Template des variables d'environnement
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx            # Entry point React
│   ├── App.jsx             # Routing
│   ├── index.css           # Styles Tailwind + composants
│   ├── lib/
│   │   └── supabase.js     # Client Supabase
│   ├── contexts/
│   │   └── AuthContext.jsx  # Contexte d'authentification
│   ├── components/
│   │   └── Layout.jsx      # Layout avec sidebar + nav mobile
│   ├── pages/
│   │   ├── Login.jsx       # Page de connexion
│   │   ├── Dashboard.jsx   # Tableau de bord avec statistiques
│   │   ├── Enterprises.jsx # Liste des entreprises + filtres
│   │   ├── EnterpriseDetail.jsx # Fiche entreprise + historique
│   │   └── Admin.jsx       # Administration (direction)
│   └── utils/
│       └── constants.js    # Constantes, enums, helpers
└── supabase/
    └── schema.sql          # Schéma de base de données complet
```

## Fonctionnalités

- **Authentification** : login email/mot de passe via Supabase Auth
- **Dashboard** : KPIs, graphiques (évolution, maturité, par commercial/secteur), relances à venir
- **Gestion entreprises** : création, modification, filtres, recherche
- **Historique actions** : horodatage automatique, infalsifiable (RLS)
- **Conversion prospect → client** : par le commercial, avec traçabilité
- **Admin** : gestion comptes, secteurs, import Excel, export CSV, backup/restore JSON
- **Responsive** : fonctionne sur mobile et desktop

## Sécurité (RLS)

- Les commerciaux peuvent **voir** toutes les données
- Les commerciaux peuvent **créer** des entreprises et des actions
- Les commerciaux **ne peuvent pas** modifier ou supprimer des actions
- Seule la **direction** peut modifier/supprimer des actions et des entreprises
- Seule la **direction** a accès à l'administration

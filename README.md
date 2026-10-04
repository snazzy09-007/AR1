# SNIPER FC — Trade Intelligence

Console web Next.js de pilotage et d’analyse pour un agent Selenium d’achat/revente FUT.

- Stratégies comparables par joueur, rareté, qualité et position
- Analytics : profit, ROI, crédits/heure, concurrence et meilleurs créneaux
- Rotation A/B automatique des stratégies
- Historique des flips et suivi des ventes
- Mode démo sans installation
- Launcher Windows/macOS/Linux auto-configuré en un clic
- PostgreSQL Neon avec Drizzle ORM

> L’automatisation de la Web App EA peut enfreindre ses conditions d’utilisation et entraîner une sanction. Utilisez ce projet à vos risques.

## Stack

- Next.js 16 — App Router
- React 19 / TypeScript / Tailwind CSS
- PostgreSQL Neon / Drizzle ORM
- Framer Motion / Lucide
- Agent Python Selenium

## Déploiement GitHub → Vercel

### 1. Pousser sur GitHub

```bash
git init
git add .
git commit -m "Initial SNIPER FC release"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/TON-REPO.git
git push -u origin main
```

Le fichier `.env` est exclu par `.gitignore`. Vérifiez avant le push :

```bash
git status
git ls-files .env
```

La seconde commande ne doit rien afficher. Si le fichier avait déjà été suivi :

```bash
git rm --cached .env
```

### 2. Importer dans Vercel

1. Ouvrez [vercel.com/new](https://vercel.com/new).
2. Importez le dépôt GitHub.
3. Laissez le framework détecté sur **Next.js**.
4. Ajoutez la variable ci-dessous.
5. Cliquez sur **Deploy**.

Aucun `vercel.json`, changement de build command ou root directory n’est nécessaire.

## Variable Vercel obligatoire

Une seule variable est obligatoire :

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | La chaîne **poolée** Neon complète, avec `?sslmode=require` |

Ajoutez-la dans **Vercel → Project → Settings → Environment Variables**, idéalement pour Production, Preview et Development.

Exemple de format :

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```

### Variables optionnelles

Elles ne sont pas nécessaires au fonctionnement normal :

- `NEXT_PUBLIC_APP_URL` : URL canonique forcée. Sur Vercel, l’URL est détectée automatiquement.
- `AGENT_SECRET` : compatibilité avec un ancien agent configuré manuellement. Les launchers modernes utilisent un token individuel généré en base.

## Base de données

Le schéma actuel est versionné dans `drizzle/` et défini dans `src/db/schema.ts`.

La base Neon déjà configurée contient le schéma. Pour une **nouvelle** base :

```bash
cp .env.example .env
# Remplir DATABASE_URL
npx drizzle-kit push
```

Vous pouvez aussi appliquer la migration SQL présente dans `drizzle/` via l’éditeur SQL Neon.

Ne lancez pas automatiquement `drizzle-kit push` pendant chaque build Vercel : les migrations doivent rester une opération volontaire.

## Développement local

```bash
npm install
cp .env.example .env
# Renseigner DATABASE_URL
npm run dev
```

Puis ouvrez [http://localhost:3000](http://localhost:3000).

## Lancer l’agent

Après le déploiement :

1. Ouvrez le site Vercel.
2. Allez dans **Connexion**.
3. Cliquez sur **Télécharger mon launcher**.
4. Double-cliquez sur `SniperFC_V4.bat` sous Windows, ou exécutez `bash SniperFC_V4.sh` sous macOS/Linux.

Le launcher :

- crée une clé d’appairage unique ;
- embarque automatiquement l’URL du site et la clé ;
- installe `selenium` et `requests` ;
- télécharge puis lance l’agent.

Chrome et Python 3 doivent être installés sur la machine de l’agent. Le navigateur Selenium tourne localement ; Vercel héberge seulement la console et ses API.

## Vérifications avant déploiement

```bash
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run build
```

La route `/api/health` doit répondre :

```json
{"ok":true}
```

## Sécurité

- Ne commitez jamais `.env`.
- Chaque launcher possède un token révocable depuis l’onglet Connexion.
- Aucune clé agent globale par défaut n’est acceptée en production.
- Si une chaîne Neon a été publiée, réinitialisez immédiatement le mot de passe du rôle Neon.

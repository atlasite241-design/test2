# Guide de Déploiement et Nom de Domaine Personnalisé

Ce document explique comment changer l'URL de votre application et la déployer avec un nom de domaine personnalisé (ex: `www.mon-site.com`).

## 1. Pourquoi l'URL actuelle est-elle fixe ?

L'URL actuelle (`https://ais-pre-...run.app`) est générée automatiquement par l'environnement de prévisualisation de Google Cloud Run. Elle est liée à cette session de développement spécifique et ne peut pas être modifiée directement ici.

Pour avoir votre propre nom (comme `mon-super-projet.com`), vous devez **déployer** l'application chez un hébergeur tiers.

## 2. Prérequis

1.  **Acheter un nom de domaine** : Vous pouvez en acheter un chez des registrars comme :
    *   Namecheap
    *   Google Domains
    *   GoDaddy
    *   OVH

2.  **Choisir un hébergeur** : Comme cette application utilise à la fois un frontend (React) et un backend (Express/Node.js), vous avez besoin d'un hébergeur "Full Stack". Les meilleures options gratuites ou peu coûteuses sont :
    *   **Railway** (Recommandé pour la simplicité)
    *   **Render**
    *   **Heroku**
    *   **Fly.io**

## 3. Comment Déployer (Exemple avec Railway ou Render)

### Étape 1 : Récupérer le code
Téléchargez tout le code de cette application sur votre ordinateur.

### Étape 2 : Pousser sur GitHub
Créez un nouveau dépôt (repository) sur GitHub et envoyez-y votre code.

### Étape 3 : Connecter à l'hébergeur
1.  Créez un compte sur [Railway.app](https://railway.app) ou [Render.com](https://render.com).
2.  Cliquez sur "New Project" et sélectionnez "Deploy from GitHub repo".
3.  Choisissez votre dépôt.

### Étape 4 : Configuration
L'hébergeur détectera automatiquement que c'est une application Node.js.
Assurez-vous de configurer les **Variables d'Environnement** dans le tableau de bord de l'hébergeur :

*   `NODE_ENV`: `production`
*   `DATABASE_URL`: Votre URL de connexion PostgreSQL (si vous utilisez une base de données).
*   `VITE_API_URL`: L'URL de votre nouvelle application (ex: `https://mon-app.up.railway.app`).

### Étape 5 : Lier votre Nom de Domaine
Une fois l'application déployée :
1.  Allez dans les "Settings" (Paramètres) de votre projet sur Railway/Render.
2.  Cherchez la section "Custom Domains" (Domaines personnalisés).
3.  Entrez votre nom de domaine (ex: `www.mon-site.com`).
4.  Suivez les instructions pour configurer les enregistrements DNS (CNAME ou A record) chez votre registrar (là où vous avez acheté le domaine).

## 4. Note Importante sur le Code (`config.ts`)

Le fichier `config.ts` contient actuellement une URL par défaut pour l'environnement de test.
Lorsque vous déploierez ailleurs, vous devrez soit :

1.  Définir la variable d'environnement `VITE_API_URL` sur votre hébergeur.
2.  OU modifier le fichier `config.ts` pour utiliser l'URL de votre nouveau site.

```typescript
// Exemple de modification pour config.ts si vous n'utilisez pas de variable d'environnement
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://votre-nouveau-site.com' 
  : ''; 
```

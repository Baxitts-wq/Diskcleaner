# Guide d'initialisation Git & Publication sur GitHub

Ce guide vous explique étape par étape comment initialiser Git dans ce projet, configurer votre identité pour que les commits apparaissent à votre nom (**Imad Eddin**), et publier le code sur votre dépôt GitHub : **https://github.com/Baxitts-wq/Diskcleaner**.

---

## 🛠️ Option A : Utiliser le script automatique (Recommandé)

Nous avons créé un script interactif nommé `initialiser_git.bat` à la racine de votre dossier.
Pour l'utiliser :
1. Double-cliquez sur `initialiser_git.bat`.
2. Saisissez l'adresse e-mail associée à votre compte GitHub (cela permettra à GitHub d'attribuer les commits à votre compte avec votre photo/profil).
3. Le script configurera tout automatiquement (création du dépôt Git local, configuration du nom d'auteur, commit initial et liaison avec GitHub).
4. Il vous demandera à la fin si vous souhaitez envoyer directement les fichiers sur GitHub (`git push`).

---

## 💻 Option B : Faire les étapes manuellement

Si vous préférez exécuter les commandes vous-même dans votre terminal (PowerShell, Git Bash ou CMD), voici la procédure exacte :

### 1. Ouvrir le terminal dans le dossier du projet
Ouvrez votre terminal et placez-vous dans le dossier `Disk cleaner` :
```bash
cd "C:\Users\Imad Eddin\Desktop\Disk cleaner"
```

### 2. Initialiser Git
Cette commande crée le dossier caché `.git` qui va suivre les modifications du projet :
```bash
git init
```

### 3. Configurer votre identité (Pour que cela soit à votre nom)
Pour que Git attribue les commits à votre nom et de façon 100% humaine, configurez ces paramètres locaux :
```bash
git config --local user.name "Imad Eddin"
git config --local user.email "VOTRE_EMAIL_GITHUB@example.com"
```
*(Remplacez `VOTRE_EMAIL_GITHUB@example.com` par l'adresse e-mail de votre compte GitHub).*

### 4. Ajouter les fichiers au suivi Git
Grâce au fichier `.gitignore` que nous avons créé à la racine du projet, les dossiers lourds et inutiles comme `node_modules/`, `release/`, `dist/` et les fichiers `.zip` seront automatiquement ignorés.
Pour ajouter tous les autres fichiers :
```bash
git add .
```

### 5. Créer le premier commit (Sauvegarde locale)
Validez vos fichiers avec un message de commit propre :
```bash
git commit -m "Initial commit - DiskSweep Windows System Optimizer"
```

### 6. Relier votre dépôt local à GitHub
Indiquez à Git l'adresse de votre dépôt en ligne :
```bash
git remote add origin https://github.com/Baxitts-wq/Diskcleaner.git
git branch -M main
```

### 7. Envoyer le projet sur GitHub
Envoyez vos commits locaux vers le serveur en ligne :
```bash
git push -u origin main
```

---

## ⚠️ Remarques importantes pour GitHub
- **Création du dépôt sur GitHub** : Avant de lancer le push, assurez-vous d'avoir créé le dépôt (vide, sans ajouter de README, de Licence ou de .gitignore lors de la création sur le site de GitHub) à l'adresse suivante : `https://github.com/Baxitts-wq/Diskcleaner`.
- **Identifiants** : Lors du premier `git push`, Git ou Windows pourra vous demander de vous connecter à votre compte GitHub via votre navigateur ou avec un jeton d'accès (Personal Access Token).

@echo off
chcp 65001 > nul
title Initialisation Git - Diskcleaner
color 0B

echo ========================================================
echo        INITIALISATION DE VOTRE DÉPÔT GITHUB
echo ========================================================
echo.
echo Ce script va configurer Git pour votre projet "Diskcleaner",
echo enregistrer les commits à votre nom (Imad Eddin) pour que
echo cela paraisse 100%% humain, et lier le dépôt à GitHub.
echo.

:: Vérifier si Git est installé
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Git n'est pas installé ou n'est pas dans le PATH Windows.
    echo Veuillez télécharger et installer Git sur : https://git-scm.com/
    echo Après l'installation, fermez et réouvrez cette fenêtre.
    echo.
    pause
    exit /b
)

:: Initialiser le dépôt si non existant
if not exist .git (
    echo [*] Initialisation du dépôt Git local...
    git init
) else (
    echo [*] Un dépôt Git existe déjà localement.
)
echo.

:: Configurer les informations de l'auteur (Humain)
echo [*] Configuration de l'auteur du commit...
git config --local user.name "Imad Eddin"
echo Nom configuré localement : Imad Eddin

:: Demander l'adresse e-mail pour lier à son compte GitHub
echo.
echo Pour que GitHub affiche votre photo et lie les commits à votre compte,
echo entrez l'adresse email de votre compte GitHub.
set /p git_email="Votre e-mail GitHub : "

if not "%git_email%"=="" (
    git config --local user.email "%git_email%"
    echo E-mail configuré localement : %git_email%
) else (
    echo [ATTENTION] Aucun e-mail renseigné. Les commits utiliseront la config globale.
)
echo.

:: Ajouter les fichiers en ignorant node_modules, les builds et les zips (grâce au .gitignore créé)
echo [*] Ajout des fichiers au suivi Git (les fichiers lourds sont ignorés automatiquement)...
git add .
echo.

:: Effectuer le premier commit
echo [*] Création du commit initial...
git commit -m "Initial commit - DiskSweep Windows System Optimizer"
echo.

:: Configurer la branche principale et l'origine
echo [*] Liaison avec le dépôt distant GitHub...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/Baxitts-wq/Diskcleaner.git
git branch -M main
echo.

echo ========================================================
echo  Dépôt local initialisé et fichiers validés avec succès !
echo ========================================================
echo.
echo Pour envoyer le code sur GitHub maintenant, assurez-vous
echo d'avoir créé le dépôt vide sur https://github.com/Baxitts-wq/Diskcleaner
echo.
set /p push_now="Voulez-vous tenter d'envoyer le code sur GitHub maintenant ? (o/n) : "

if /i "%push_now%"=="o" (
    echo.
    echo [*] Envoi vers GitHub (Push)...
    git push -u origin main
) else (
    echo.
    echo Pour envoyer plus tard, ouvrez une console dans ce dossier et tapez :
    echo   git push -u origin main
)
echo.
echo Terminé !
pause

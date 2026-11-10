DU TEMPS POUR DE MAINS — SITE WEB

FICHIERS
- index.html : page d'accueil
- style.css : design responsive inspiré du visuel validé
- script.js : publication, affichage, filtres et demandes (script fourni)
- ajout-suppression.sql : fonction SQL de suppression transmise
- README.txt : instructions

INSTALLATION
1. Décompressez l'archive.
2. Placez les fichiers dans le dossier racine de votre dépôt GitHub relié à Vercel.
3. Vérifiez que index.html, style.css et script.js sont au même niveau.
4. Envoyez les changements sur GitHub : Vercel déclenchera le déploiement.

SUPABASE — LIMITATION À CONNAÎTRE
Le script fourni se connecte au projet Supabase dont l'URL et la clé publique sont
déjà inscrites dans script.js. Il utilise la table annonces et les fonctions RPC :
publier_annonce, demander_participation, statut_demande, demandes_pour_auteur,
accepter_demande et supprimer_annonce.
Le seul SQL reçu dans cette conversation définit supprimer_annonce. Les autres
fonctions, la table et les politiques RLS ne sont pas incluses dans les fichiers
transmis. Je n'ai pas inventé leur schéma : il faut vérifier/configurer ces éléments
dans Supabase pour que toutes les fonctions marchent.

SÉCURITÉ
Ne mettez jamais une clé Supabase service_role dans le navigateur. La clé anon
publique ne remplace pas les politiques RLS et les contrôles côté base.

LOGO
Aucun fichier logo-dessin.png n'a été transmis. La référence à cette image a été
retirée pour éviter un logo cassé ; l'illustration de la zone d'accueil est créée en CSS.

Specs | Qualification et Accueil Automatique des Nouveaux Prospects BTP
1. Déclencheur & Résultat Attendu
Événement déclencheur (Trigger) : Soumission d'une nouvelle demande de contact ou de devis par un prospect depuis le site web de l'entreprise.

Résultats finaux attendus (Outputs) :

Enregistrement : Les coordonnées complètes du prospect et les détails de sa demande sont automatiquement sauvegardés dans une base de données centralisée (tableur).

Préqualification & Accueil : Un e-mail de bienvenue est immédiatement envoyé au prospect. Cet e-mail contient une présentation de l'entreprise (ex: plaquette) et l'invite à fournir des détails supplémentaires (comme des photos du futur chantier) pour préparer son dossier.

2. Outils & Écosystème (Phase 2)
Stack technique choisie : Outils standards et accessibles.

Acquisition : Formulaire web classique (CMS type WordPress, Webflow, etc.).

Base de données : Tableur type Google Sheets ou Microsoft Excel.

Communication : Messagerie professionnelle classique (Gmail ou Outlook).

État de l'infrastructure : Projet "Page blanche". Tous les environnements (site web, boîtes e-mail professionnelles, tableurs) doivent être créés et configurés de zéro pour ce projet.

3. Contraintes Opérationnelles & Sécurité (Phase 3)
Volume estimé : Inconnu pour le moment (démarrage du projet). L'architecture doit être conçue pour être flexible, sans limites strictes, afin d'encaisser l'augmentation de la charge lors de la croissance de l'entreprise.

Gestion des erreurs (Résilience) : En cas d'échec d'une étape (ex: le serveur d'e-mail ne répond pas), le système est programmé pour effectuer des tentatives de relance automatiques en arrière-plan (ex: toutes les 15 à 30 minutes). Si l'action échoue définitivement, une alerte humaine est déclenchée pour reprendre la main.

Confidentialité des données (RGPD) : S'agissant de données de prospects européens (nom, email, téléphone), le stockage dans le tableur devra respecter les règles de confidentialité standards (accès restreints et mentions légales sur le formulaire d'origine).
# NEW CONCEPT — Simulateur du logiciel de pilotage

Simulateur **100 % statique** (HTML / CSS / JS, sans backend) du futur logiciel de gestion et de pilotage de **SOCIETE NB CONCEPT — NEW CONCEPT Modern Decor** : matériaux de décoration, chantiers, achats & importations, ventes, stock, caisse & banque.

Ce n'est pas une simple maquette figée : **on peut saisir des opérations** et tout le système se recalcule (stock, rentabilité des chantiers, trésorerie, créances, KPI du tableau de bord).

> Données fictives. Les opérations sont enregistrées dans le navigateur (localStorage) — aucune base serveur.

## Ce qu'on peut faire

| Module | Actions simulées |
|---|---|
| **Chantiers** | Créer un chantier · consommer des matériaux (**déduits automatiquement du stock**) · pointer des heures de main-d'œuvre · ajouter des dépenses (transport, sous-traitance… avec décaissement auto) · changer statut / avancement · facturer. Rentabilité calculée en temps réel (CA − matériaux − MO − transport − autres = bénéfice, marge %, prévu vs réel). |
| **Achats** | Créer un bon de commande (local ou import en €, avec frais transport/assurance/douane/transit) · **réceptionner** (entrée en stock + mise à jour du prix d'achat / coût de revient) · **payer** (décaissement caisse ou banque). |
| **Ventes** | Créer devis et factures (articles + prestations libres, TVA 19 %, timbre fiscal) · livraison avec sortie de stock · transformer un devis en facture · **encaisser** (total ou partiel) · facture imprimable avec montant en lettres. |
| **Caisse & Banque** | Encaissements, décaissements, virements internes, soldes et historique avec solde courant. Contrôle de solde insuffisant. |
| **Stock** | Nouvel article · entrées, sorties, inventaire, pertes, retours, transferts · historique complet par article · alertes de stock minimum avec commande directe. |
| **Clients / Employés** | Création de fiches, historique, créances, chantiers liés, heures cumulées. |
| **Paramètres & données** | Export de la base en **JSON**, import d'un JSON, réinitialisation de la démo, journal des opérations (utilisateur · date · heure). |

## Structure

```
index.html        Coquille de l'application (sidebar, topbar, modale)
css/style.css     Styles (charte noyer / or — logo NEW CONCEPT)
js/seed.js        "Base de données" initiale (JSON) — clients, articles, chantiers, BC, factures, caisse…
js/app.js         Store localStorage + calculs + vues + formulaires (actions)
js/logo.js        Logo NEW CONCEPT encodé en base64
```

La "base de données" est un objet JSON : `js/seed.js` au premier lancement, puis l'état courant sauvegardé dans `localStorage` (clé `nbc_sim_v2`). Paramètres → *Exporter* télécharge cet état en `.json`.

## Lancer / déployer

Ouvrir `index.html` dans un navigateur, ou déposer le dossier tel quel sur le serveur :

```bash
# VPS (Nginx)
sudo git clone https://github.com/cheybah/NB_concept.git /var/www/nb_concept
# root /var/www/nb_concept;  index index.html;
```

Dépendances CDN (Internet requis) : Google Fonts (Inter, Montserrat), Chart.js 4.4.1, Lucide 0.400.0.

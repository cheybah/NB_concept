# NB CONCEPT — Maquette logiciel de pilotage

Maquette **100 % statique** (un seul fichier `index.html`) d'un logiciel de gestion et de pilotage pour SOCIETE NB CONCEPT : matériaux de décoration, chantiers, achats/import, caisse & banque.

> Démo visuelle — toutes les données sont fictives. Aucun backend, aucune base de données.

## Vues
- Tableau de bord (KPI, CA 12 mois, rentabilité par chantier, trésorerie, alertes stock)
- Chantiers + fiche chantier (calcul de rentabilité : 10 000 − 4 000 − 1 500 − 300 − 200 = 4 000 DT, 40 %)
- Ventes (circuit Devis → Commande → BL → Facture → Encaissement) + facture imprimable
- Clients + fiche client
- Achats + bon de commande (dont calcul du coût de revient import)
- Stock & articles + fiche article
- Caisse & Banque
- Employés
- Rapports & exports

## Lancer
Ouvrir `index.html` dans un navigateur, ou le déposer tel quel sur un serveur web (Nginx/Apache sur VPS).

Dépendances CDN (connexion Internet requise) : Google Fonts (Inter), Chart.js 4.4.1, Lucide 0.400.0.

```bash
# Exemple VPS (Nginx)
sudo cp index.html /var/www/html/index.html
```

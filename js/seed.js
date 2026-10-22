/* =====================================================================
   NEW CONCEPT — Base de données de démonstration (seed)
   ---------------------------------------------------------------------
   Données fictives initiales. Au premier lancement elles sont copiées
   dans le navigateur (localStorage) : toutes les opérations effectuées
   ensuite (bons, chantiers, caisse, factures…) y sont enregistrées.
   Paramètres → "Réinitialiser" revient à ces données.
   Paramètres → "Exporter" télécharge l'état complet en JSON.
   ===================================================================== */
window.NBC_SEED = {
  version: 2,
  rate: 3.40,            // 1 EUR = 3,400 DT (importations)
  caMoisBase: 186420,    // CA d'octobre avant la simulation
  caJourBase: 3115.5,
  ca12: [142300,168400,121900,134600,158200,176500,203100,221400,197800,149300,212600],
  ach12:[78200,95100,70400,88300,92600,104200,118500,131000,109400,84100,126300],
  seq: { BC:420, FA:234, DV:102, CH:22, C:4, ART:0, E:6 },

  clients: [
    {id:'C001', nom:'Villa Lotfi', contact:'M. Lotfi Ben Ammar', type:'Particulier', ville:'Hammamet', adr:'Route de la Corniche, Hammamet Nord', tel:'+216 98 412 330', mail:'l.benammar@exemple.tn', mf:'—', depuis:'2024'},
    {id:'C002', nom:'Résidence Les Jasmins', contact:'Mme Sonia Khelifi — Promotion Jasmins SARL', type:'Promoteur', ville:'Sousse', adr:'Avenue Hédi Chaker, Sahloul, Sousse', tel:'+216 73 225 140', mail:'achats@jasmins-promo.tn', mf:'1458213/B/A/M/000', depuis:'2023'},
    {id:'C003', nom:'Hôtel Dar Salem', contact:'M. Riadh Salem — Directeur technique', type:'Hôtellerie', ville:'Nabeul', adr:'Zone touristique, Nabeul', tel:'+216 72 286 900', mail:'technique@darsalem.tn', mf:'0987345/C/P/M/000', depuis:'2022'},
    {id:'C004', nom:'Ahmed Trabelsi', contact:'M. Ahmed Trabelsi', type:'Particulier', ville:'La Marsa', adr:'Rue du Lac Biwa, La Marsa', tel:'+216 22 731 905', mail:'a.trabelsi@exemple.tn', mf:'—', depuis:'2026'}
  ],

  fourn: [
    {id:'F01', nom:'Ste Import Céramique', ville:'Sfax', type:'Local', cat:'Carrelage, faïence'},
    {id:'F02', nom:'Matériaux du Sud', ville:'Gabès', type:'Local', cat:'Peinture, plâtrerie, colles'},
    {id:'F03', nom:'Fournisseur France Déco', ville:'Lyon (FR)', type:'Import', cat:'Parquet, luminaires design'},
    {id:'F04', nom:'Sanitaires Méditerranée', ville:'Tunis', type:'Local', cat:'Sanitaire, robinetterie'}
  ],

  articles: [
    {ref:'CAR-6060-BM', des:'Carrelage grès cérame 60×60 Beige marbré', cat:'Carrelage', marque:'Porcelanosa Line', u:'m²', pa:32.5, pv:48, stock:1420, min:150, res:260, f:'F01', dep:'Dépôt Ben Arous', dim:'60×60 cm · ép. 9 mm'},
    {ref:'FAI-3090-BL', des:'Faïence murale 30×90 Blanc mat', cat:'Carrelage', marque:'Cerámica Levante', u:'m²', pa:28, pv:42, stock:85, min:100, res:40, f:'F01', dep:'Dépôt Ben Arous', dim:'30×90 cm · ép. 10 mm'},
    {ref:'PEI-SAT-20', des:'Peinture satinée intérieure 20 L Blanc cassé', cat:'Peinture', marque:'Astral Pro', u:'seau', pa:95, pv:138, stock:64, min:20, res:12, f:'F02', dep:'Showroom', dim:'Seau 20 L'},
    {ref:'PEI-FAC-15', des:'Peinture façade siloxane 15 L', cat:'Peinture', marque:'Astral Pro', u:'seau', pa:118, pv:169, stock:0, min:10, res:0, f:'F02', dep:'Showroom', dim:'Seau 15 L'},
    {ref:'SAN-WCS-01', des:'WC suspendu céramique + bâti-support', cat:'Sanitaire', marque:'Geberit Duofix', u:'u', pa:410, pv:590, stock:18, min:5, res:4, f:'F04', dep:'Showroom', dim:'53×36 cm'},
    {ref:'SAN-MIT-03', des:'Mitigeur lavabo chromé', cat:'Sanitaire', marque:'Grohe Eurosmart', u:'u', pa:78, pv:125, stock:46, min:15, res:6, f:'F04', dep:'Showroom', dim:'H. 16 cm'},
    {ref:'LUM-SPT-12', des:'Spot LED encastrable 12 W blanc chaud', cat:'Luminaire', marque:'Philips', u:'u', pa:14.5, pv:24, stock:310, min:100, res:40, f:'F03', dep:'Dépôt Ben Arous', dim:'Ø 9 cm'},
    {ref:'LUM-SUS-07', des:'Suspension laiton design', cat:'Luminaire', marque:'Atelier Lyon', u:'u', pa:205.4, pv:320, stock:12, min:4, res:2, f:'F03', dep:'Showroom', dim:'Ø 45 cm'},
    {ref:'PAR-CHE-14', des:'Parquet contrecollé chêne 14 mm', cat:'Parquet', marque:'Panaget', u:'m²', pa:70.6, pv:98, stock:140, min:60, res:20, f:'F03', dep:'Dépôt Ben Arous', dim:'Lames 1200×190 mm'},
    {ref:'PLA-BA13-S', des:'Plaque de plâtre BA13 standard', cat:'Plâtrerie', marque:'Placo', u:'u', pa:12.8, pv:18.5, stock:520, min:200, res:120, f:'F02', dep:'Dépôt Ben Arous', dim:'250×120 cm'},
    {ref:'COL-C2-25', des:'Colle carrelage C2 25 kg', cat:'Consommables', marque:'Weber', u:'sac', pa:23, pv:34, stock:260, min:80, res:30, f:'F02', dep:'Dépôt Ben Arous', dim:'Sac 25 kg'}
  ],

  employes: [
    {id:'E01', nom:'Karim Mejri', poste:"Chef d'équipe", taux:15, h:168, hs:12, pres:98, ch:'CH-2026-017', col:'#8B5E3C'},
    {id:'E02', nom:'Sami Gharbi', poste:'Carreleur', taux:12.5, h:172, hs:16, pres:100, ch:'CH-2026-019', col:'#2458B8'},
    {id:'E03', nom:'Walid Ayari', poste:'Plombier', taux:15, h:154, hs:6, pres:94, ch:'CH-2026-019', col:'#7C4DCC'},
    {id:'E04', nom:'Hichem Belhadj', poste:'Peintre', taux:10, h:160, hs:8, pres:96, ch:'CH-2026-021', col:'#B8862F'},
    {id:'E05', nom:'Nadia Hamdi', poste:'Commerciale showroom', taux:9.5, h:176, hs:0, pres:100, ch:'—', col:'#C2362F'},
    {id:'E06', nom:'Mourad Jlassi', poste:'Magasinier', taux:8.5, h:176, hs:4, pres:97, ch:'—', col:'#3A4048'}
  ],

  /* mats: {ref, prev, reel, pu}  (pu = prix d'achat au moment de la consommation)
     mo:   {nom, poste, hPrev, h, taux}
     autres: {type, lib, prev, reel} */
  chantiers: [
    {id:'CH-2026-014', nom:'Chantier Villa Lotfi — Hammamet', court:'Villa Lotfi', client:'C001', adr:'Route de la Corniche, Hammamet Nord', debut:'01/09/2026', fin:'15/10/2026', resp:'Karim Mejri', statut:'Terminé', devis:'DV-2026-081', vente:10000, avancement:100, margePrev:38,
     desc:'Rénovation salle de bain + séjour (carrelage, sanitaire, éclairage, peinture)',
     mats:[{ref:'CAR-6060-BM',prev:45,reel:46,pu:32.5},{ref:'FAI-3090-BL',prev:28,reel:30,pu:28},{ref:'SAN-WCS-01',prev:1,reel:1,pu:410},{ref:'SAN-MIT-03',prev:2,reel:2,pu:78},{ref:'LUM-SPT-12',prev:24,reel:24,pu:14.5},{ref:'PEI-SAT-20',prev:6,reel:5,pu:95},{ref:'COL-C2-25',prev:12,reel:12,pu:23}],
     mo:[{nom:'Karim Mejri',poste:"Chef d'équipe",hPrev:42,h:40,taux:15},{nom:'Sami Gharbi',poste:'Carreleur',hPrev:40,h:36,taux:12.5},{nom:'Walid Ayari',poste:'Plombier',hPrev:18,h:18,taux:15},{nom:'Hichem Belhadj',poste:'Peintre',hPrev:20,h:18,taux:10}],
     autres:[{type:'Transport',lib:'Transport matériaux Ben Arous → Hammamet (3 rotations)',prev:300,reel:300},{type:'Carburant',lib:"Carburant véhicule chef d'équipe",prev:150,reel:120},{type:'Location',lib:'Location disqueuse & échafaudage roulant',prev:100,reel:80}]},
    {id:'CH-2026-017', nom:'Rénovation Hôtel Dar Salem', court:'Hôtel Dar Salem', client:'C003', adr:'Zone touristique, Nabeul', debut:'08/09/2026', fin:'30/11/2026', resp:'Karim Mejri', statut:'En cours', devis:'DV-2026-064', vente:68500, avancement:72, margePrev:30,
     desc:"Rénovation hall d'accueil et 12 chambres — sols, éclairage, peinture",
     mats:[{ref:'CAR-6060-BM',prev:500,reel:520,pu:32.5},{ref:'LUM-SPT-12',prev:380,reel:380,pu:14.5},{ref:'LUM-SUS-07',prev:24,reel:24,pu:205.4},{ref:'PEI-SAT-20',prev:40,reel:42,pu:95}],
     mo:[{nom:'Karim Mejri',poste:"Chef d'équipe",hPrev:150,h:160,taux:15},{nom:'Sami Gharbi',poste:'Carreleur',hPrev:210,h:220,taux:12.5},{nom:'Walid Ayari',poste:'Plombier',hPrev:140,h:140,taux:15},{nom:'Hichem Belhadj',poste:'Peintre',hPrev:180,h:190,taux:10},{nom:'Équipe électricité (2)',poste:'Électriciens',hPrev:280,h:280,taux:11}],
     autres:[{type:'Transport',lib:'Transport matériaux (6 rotations)',prev:1800,reel:1800},{type:'Sous-traitance',lib:'Sous-traitance courant faible',prev:3600,reel:3600},{type:'Location',lib:'Location échafaudage',prev:500,reel:650},{type:'Carburant',lib:'Carburant',prev:200,reel:240}]},
    {id:'CH-2026-019', nom:'Résidence Les Jasmins — Bloc B', court:'Les Jasmins Bloc B', client:'C002', adr:'Sahloul, Sousse', debut:'15/07/2026', fin:'20/12/2026', resp:'Sami Gharbi', statut:'En cours', devis:'DV-2026-047', vente:124000, avancement:81, margePrev:14,
     desc:'Finitions 16 appartements — carrelage, faïence, sanitaire, cloisons',
     mats:[{ref:'CAR-6060-BM',prev:1200,reel:1260,pu:32.5},{ref:'FAI-3090-BL',prev:520,reel:560,pu:28},{ref:'SAN-WCS-01',prev:16,reel:16,pu:410},{ref:'SAN-MIT-03',prev:32,reel:32,pu:78},{ref:'PLA-BA13-S',prev:380,reel:410,pu:12.8}],
     mo:[{nom:'Équipe carrelage (3)',poste:'Carreleurs',hPrev:820,h:900,taux:12.5},{nom:'Walid Ayari',poste:'Plombier',hPrev:400,h:420,taux:15},{nom:'Équipe plâtrerie',poste:'Plaquistes',hPrev:700,h:760,taux:11},{nom:'Karim Mejri',poste:"Chef d'équipe",hPrev:240,h:260,taux:15}],
     autres:[{type:'Transport',lib:'Transport matériaux (13 rotations)',prev:3600,reel:3900},{type:'Sous-traitance',lib:'Sous-traitance étanchéité',prev:5200,reel:5200},{type:'Location',lib:'Location monte-charge',prev:1400,reel:1600},{type:'Achats supp.',lib:'Achats complémentaires quincaillerie',prev:300,reel:640}]},
    {id:'CH-2026-021', nom:'Cuisine & séjour — Ahmed Trabelsi', court:'Trabelsi — La Marsa', client:'C004', adr:'Rue du Lac Biwa, La Marsa', debut:'29/09/2026', fin:'05/11/2026', resp:'Hichem Belhadj', statut:'En cours', devis:'DV-2026-095', vente:7800, avancement:64, margePrev:22,
     desc:'Pose parquet séjour, éclairage et peinture cuisine',
     mats:[{ref:'PAR-CHE-14',prev:38,reel:48,pu:70.6},{ref:'LUM-SPT-12',prev:16,reel:18,pu:14.5},{ref:'LUM-SUS-07',prev:2,reel:2,pu:205.4},{ref:'PEI-SAT-20',prev:6,reel:8,pu:95}],
     mo:[{nom:'Hichem Belhadj',poste:'Peintre',hPrev:60,h:70,taux:10},{nom:'Sami Gharbi',poste:'Poseur parquet',hPrev:52,h:64,taux:12.5},{nom:'Karim Mejri',poste:"Chef d'équipe",hPrev:30,h:40,taux:15}],
     autres:[{type:'Transport',lib:'Transport matériaux (2 rotations)',prev:200,reel:400},{type:'Achats supp.',lib:'Plinthes & barres de seuil (non prévues)',prev:0,reel:520},{type:'Carburant',lib:'Carburant',prev:60,reel:90}]},
    {id:'CH-2026-022', nom:'Appartement témoin — Les Jasmins', court:'Appart. témoin Jasmins', client:'C002', adr:'Sahloul, Sousse', debut:'03/11/2026', fin:'28/11/2026', resp:'Karim Mejri', statut:'En attente', devis:'DV-2026-102', vente:15200, avancement:0, margePrev:32,
     desc:"Aménagement complet de l'appartement témoin (démarrage après validation devis)", mats:[], mo:[], autres:[]}
  ],

  /* lignes: {ref, q, pu}  — pour les imports, pu en EUR + frais en DT */
  achats: [
    {id:'BC-2026-0420', f:'F01', date:'21/10/2026', statut:'En attente', lignes:[{ref:'FAI-3090-BL',q:600,pu:28}], note:'Réapprovisionnement faïence (stock bas)'},
    {id:'BC-2026-0418', f:'F02', date:'19/10/2026', statut:'En attente', lignes:[{ref:'PEI-FAC-15',q:40,pu:118},{ref:'PLA-BA13-S',q:240,pu:12.8}], note:'Rupture peinture façade'},
    {id:'BC-2026-0415', f:'F03', date:'09/10/2026', statut:'Reçu', import:true, lignes:[{ref:'PAR-CHE-14',q:300,pu:16.5},{ref:'LUM-SUS-07',q:40,pu:48}], frais:{transport:1850,assurance:240,douane:3270,transit:680}, note:'Importation conteneur groupage Marseille → Radès'},
    {id:'BC-2026-0412', f:'F01', date:'06/10/2026', statut:'Reçu', lignes:[{ref:'CAR-6060-BM',q:760,pu:32.5}], note:'Stock carrelage chantiers Q4'},
    {id:'BC-2026-0409', f:'F04', date:'03/10/2026', statut:'Payé', lignes:[{ref:'SAN-WCS-01',q:20,pu:410},{ref:'SAN-MIT-03',q:40,pu:78}], note:'Sanitaires Résidence Les Jasmins'}
  ],

  docs: [
    {num:'FA-2026-0234', type:'Facture', client:'COMPTOIR', date:'22/10/2026', ttc:1245, paye:1245, statut:'Payée'},
    {num:'FA-2026-0233', type:'Facture', client:'C004', date:'21/10/2026', ttc:4200, paye:2000, statut:'Partielle', chantier:'CH-2026-021'},
    {num:'DV-2026-102', type:'Devis', client:'C002', date:'20/10/2026', ttc:18089, statut:'Envoyé', chantier:'CH-2026-022'},
    {num:'FA-2026-0231', type:'Facture', client:'C001', date:'20/10/2026', ttc:11901, paye:6000, statut:'Partielle', chantier:'CH-2026-014', bl:'BL-2026-0309', devis:'DV-2026-081', echeance:'19/11/2026',
      lignes:[
        {ref:'CAR-6060-BM', des:'Carrelage grès cérame 60×60 Beige marbré — fourniture', u:'m²', q:46, pu:48},
        {ref:'FAI-3090-BL', des:'Faïence murale 30×90 Blanc mat — fourniture', u:'m²', q:30, pu:42},
        {ref:'SAN-WCS-01', des:'WC suspendu céramique + bâti-support Geberit', u:'u', q:1, pu:590},
        {ref:'SAN-MIT-03', des:'Mitigeur lavabo chromé Grohe', u:'u', q:2, pu:125},
        {ref:'LUM-SPT-12', des:'Spot LED encastrable 12 W blanc chaud', u:'u', q:24, pu:24},
        {ref:'PEI-SAT-20', des:'Peinture satinée intérieure 20 L Blanc cassé', u:'seau', q:5, pu:138},
        {ref:'COL-C2-25', des:'Colle carrelage C2 25 kg', u:'sac', q:12, pu:34},
        {ref:'MO-FORF', des:"Main-d'œuvre : pose carrelage & faïence, plomberie, peinture", u:'forfait', q:1, pu:3618},
        {ref:'TR-LIV', des:'Transport & livraison chantier Hammamet', u:'forfait', q:1, pu:400}
      ],
      reglements:[{date:'21/10/2026', mode:'Chèque n° 4471209', compte:'banque', amt:6000}]},
    {num:'FA-2026-0230', type:'Facture', client:'C002', date:'30/09/2026', ttc:47600, paye:0, statut:'Échue', chantier:'CH-2026-019'},
    {num:'FA-2026-0228', type:'Facture', client:'C003', date:'19/10/2026', ttc:25000, paye:25000, statut:'Payée', chantier:'CH-2026-017'},
    {num:'BL-2026-0318', type:'Bon de livraison', client:'C004', date:'14/10/2026', ttc:3920, statut:'Livré'},
    {num:'BL-2026-0309', type:'Bon de livraison', client:'C001', date:'08/10/2026', ttc:5982, statut:'Livré'},
    {num:'CMD-2026-077', type:'Commande', client:'C003', date:'06/10/2026', ttc:21420, statut:'Confirmée'},
    {num:'FA-2026-0219', type:'Facture', client:'C003', date:'15/09/2026', ttc:35701, paye:20000, statut:'Partielle', chantier:'CH-2026-017'},
    {num:'DV-2026-095', type:'Devis', client:'C004', date:'22/09/2026', ttc:9283, statut:'Accepté'},
    {num:'CMD-2026-071', type:'Commande', client:'C001', date:'26/09/2026', ttc:11901, statut:'Confirmée'},
    {num:'DV-2026-081', type:'Devis', client:'C001', date:'19/09/2026', ttc:11901, statut:'Accepté'},
    {num:'FA-2026-0225', type:'Facture', client:'C002', date:'29/08/2026', ttc:59501, paye:59501, statut:'Payée'},
    {num:'FA-2026-0156', type:'Facture', client:'C001', date:'14/06/2026', ttc:2784.6, paye:2784.6, statut:'Payée'}
  ],

  /* mouvements du plus récent au plus ancien ; amt signé */
  caisse: {nom:'Caisse Showroom', solde:8745.5, mvts:[
    {date:'22/10/2026', lib:'Ventes comptoir — FA-2026-0234', cat:'Vente', amt:1245},
    {date:'22/10/2026', lib:'Fournitures de bureau', cat:'Dépense', amt:-85},
    {date:'21/10/2026', lib:'Acompte espèces Ahmed Trabelsi — FA-2026-0233', cat:'Encaissement client', amt:2000},
    {date:'21/10/2026', lib:'Carburant chantier Villa Lotfi (CH-2026-014)', cat:'Dépense chantier', amt:-120},
    {date:'20/10/2026', lib:'Versement espèces → Compte bancaire', cat:'Virement interne', amt:-5000},
    {date:'20/10/2026', lib:'Ventes comptoir journée', cat:'Vente', amt:1870.5},
    {date:'19/10/2026', lib:'Avance sur salaire — Sami Gharbi', cat:'Salaire', amt:-300},
    {date:'18/10/2026', lib:'Ventes comptoir journée', cat:'Vente', amt:2215}
  ]},
  banque: {nom:'Compte Bancaire', solde:142380.25, mvts:[
    {date:'22/10/2026', lib:'Virement reçu Hôtel Dar Salem — FA-2026-0228', cat:'Encaissement client', amt:25000},
    {date:'21/10/2026', lib:'Chèque n° 4471209 Villa Lotfi — FA-2026-0231', cat:'Encaissement client', amt:6000},
    {date:'21/10/2026', lib:'Paiement Sanitaires Méditerranée — BC-2026-0409', cat:'Paiement fournisseur', amt:-11320},
    {date:'20/10/2026', lib:'Versement espèces Caisse Showroom', cat:'Virement interne', amt:5000},
    {date:'18/10/2026', lib:'Cotisations CNSS — T3 2026', cat:'Charges sociales', amt:-3420},
    {date:'17/10/2026', lib:'Frais transitaire import — BC-2026-0415', cat:'Frais import', amt:-680},
    {date:'15/10/2026', lib:'Loyer dépôt Ben Arous — octobre', cat:'Charges fixes', amt:-2500},
    {date:'12/10/2026', lib:'Virement reçu Résidence Les Jasmins — FA-2026-0225', cat:'Encaissement client', amt:18000}
  ]},

  log: [
    {date:'22/10/2026', t:'09:12', user:'Nadia H.', icon:'receipt', msg:'a créé la facture FA-2026-0234', sub:'Vente comptoir'},
    {date:'22/10/2026', t:'08:40', user:'Karim M.', icon:'clock', msg:'a pointé 8 h', sub:'CH-2026-017 Hôtel Dar Salem'},
    {date:'22/10/2026', t:'03:00', user:'Système', icon:'hard-drive', msg:'Sauvegarde automatique terminée', sub:'Serveur local + copie externe'}
  ]
};

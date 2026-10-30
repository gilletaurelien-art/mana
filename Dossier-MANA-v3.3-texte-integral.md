# DOSSIER INSTITUTIONNEL MANA — L'énergie du territoire
## Version 3.3 · Texte complet : 6 corrections tranchées + note de faisabilité code (Mistral / Claude)
### Octobre 2026 — Gelée pour circulation de travail

---

# PARTIE 0 · LES SIX CORRECTIONS TRANCHÉES (v3.2 → v3.3)

**Correction 1 — Trois niveaux d'horodatage (séparation des propriétaires).** Le `last_synced_at` n'appartient pas à l'artefact — il varie par appareil et vit dans le terminal. Texte : *Métadonnées de l'artefact (fichier) : `generated_at`, `sources_verified_at`, `couverture[]` · État local du terminal (navigateur) : `last_synced_at` · État réglementaire calculé (exécution) : comparaison fraîcheur/couverture/règles. La fraîcheur se calcule sur `sources_verified_at` — jamais sur la génération ni le téléchargement.*

**Correction 2 — Trois régimes d'appels réseau (frontière de l'endpoint).** *Navigation/composition/guidage : fichiers statiques, aucun endpoint · Mise à jour des données : distribution de fichiers, aucune donnée ne remonte · Mesure facultative : un endpoint dédié, isolé, recevant exclusivement les lots agrégés prévus — et rien d'autre. Aucun endpoint ne reçoit de position ni de parcours. « Pas d'API métier » = aucun endpoint fonctionnel de navigation/compte/service ; le point de collecte est un endpoint technique dédié, documenté, dans le périmètre RGPD.*

**Correction 3 — Rétention stricte (option A, tranchée).** *Les lots non transmis expirent à `RETENTION_LOCALE` (30 jours) et sont supprimés — un client resté hors ligne au-delà ne renvoie pas : sa contribution est perdue, la sous-comptabilisation honnête s'applique aussi à la panne. Le test « longue interruption » est redéfini : lot déjà accepté par le serveur avant expiration, renvoyé par conservation défensive, ne doit jamais recompter (la rétention serveur des identifiants > rétention locale + marge couvre ce cas). La minimisation prime sur la complétude ; limite documentée et affichée au rapport annuel.*

**Correction 4 — Dénominateurs A1/A3 : sessions observées.** *A1 : compositions lancées parmi les sessions observées (utilisateurs ayant activé la mesure) · A3 : guidages activés parmi les sessions observées ayant ouvert une fiche · Rappel en tête de famille A : ces chiffres représentent les sessions observées parmi les activations — pas l'ensemble des utilisateurs de MANA.*

**Correction 5 — Anti-réidentification étendue aux combinaisons et au niveau serveur.** *L'analyse porte explicitement sur les combinaisons d'arêtes et de créneaux, pas seulement sur les cellules publiées individuellement — et vérifie que les données intermédiaires conservées par le serveur ne permettent pas une reconstitution que les rapports publics empêchent : la protection du niveau serveur au moins égale à celle du niveau publication.*

**Correction 6 — Protocole de vérification des sources (7 champs).** *Chaque vérification enregistre : autorité/gestionnaire · source consultée · date de consultation effective · périmètre géographique vérifié · catégories recherchées · résultat · zones non couvertes. Une vérification qui ne couvre pas une autorité ou une zone ne peut pas rendre cette zone `valid`. La couverture est la somme documentée des vérifications — rien d'autre.*

---
---

# PARTIE 1 · LIVRE BLANC — MANA, l'énergie du territoire

## 1. La source — 62 % de Français en marche, un accueil qui s'arrête au parking

Il y a en France une énergie qui ne se stocke pas : celle des pas. **62 % des Français** ont marché pour le plaisir au cours des douze derniers mois — **près de 30 millions de personnes**, 3 millions de plus qu'en 2021 *(Union Sport & Cycle pour la FFRandonnée, mai 2025)*. La randonnée pédestre au sens strict — à distinguer de la balade — touche **35 %** des Français (+8 points depuis 2021), la vague la plus forte venant des **18-34 ans**. La marche est la première famille d'activités physiques du pays : 32 % de pratique hebdomadaire en 2025, contre 25 % en 2018 *(INJEP)*. Le réseau qui la porte existe : **226 000 km de sentiers**, 9 500 bénévoles baliseurs.

Ces marcheurs sont équipés : **47 % d'entre eux utilisent une application dédiée** (33 % en 2021). Le numérique est devenu le compagnon central de la marche : choisir en amont, guider en cours, garder trace ensuite.

Mais l'énergie ne circule pas jusqu'à ceux qui devraient l'accueillir. Selon une donnée largement reprise par le réseau des offices de tourisme *(source régionale, à dater et confirmer avant diffusion)*, **la majorité des visiteurs — possiblement sept à neuf sur dix — n'entreraient jamais dans un office pendant leur séjour**. Paris a fermé en janvier 2025 son accueil Spot24, dernier point d'accueil physicalisé exploité par l'office parisien *(fait vérifié)* ; la question « à quoi sert un bureau ? » monte dans toutes les collectivités *(Etourisme.info, 2025)*. Pendant ce temps, les offices du réseau — environ **1 400** *(à confirmer auprès d'ADN Tourisme)* — se voient confier par leur référentiel **Destination d'Excellence** (2024, *texte à vérifier*) des missions nouvelles : l'« accueil **en mobilité** », la « gestion des flux », le « tourisme durable ».

La mission est écrite. **L'infrastructure intégrée pour la remplir manque au réseau** — diagnostic assumé : des accueils hors les murs existent, des applications existent ; aucune ne réunit la composition depuis la position, le respect des arrêtés dans le graphe, le hors-ligne et l'observation anonyme des usages.

**La source déborde, et le courant s'arrête au parking.** Une falaise s'effondre en février, l'arrêté ferme le sentier, le bandeau VIGILANCE du site ne rejoint pas celui qui a chargé le GPX en juillet et marche aujourd'hui. Et l'autre coupure : **les territoires ne disposent pas d'une lecture consolidée de la marche** — les compteurs renseignent des points, les services privés gardent leurs observations, personne ne restitue une lecture territoriale agrégée, homogène et maîtrisée.

> **Votre site s'arrête au téléchargement. Votre accueil s'arrête au parking. MANA commence là.**

## 2. Le courant — composer la promenade, pas la consulter

MANA ne refait pas les topoguides. **On dit ce qu'on croise en chemin** — le sentier n'est **qu'**un moyen de relier des lieux remarquables ; la fin est la marche, le dehors, le vivant. L'objet est **le compositeur** : *« je suis ici, j'ai deux heures, qu'est-ce que je peux faire à pied ? »*

- **Si c'est listé, on passe devant** — tampon de **150 m** (mesuré) ;
- **On sélectionne par priorité, on affiche dans l'ordre de marche** — jamais triés par distance ;
- **Le plus court chemin est le moins intéressant** — l'agrément gouverne la génération ; **3–5 propositions distinctes : la diversité vise des alternatives et une meilleure répartition des usages ; cette dispersion effective sera évaluée, jamais présumée** ;
- **Les fermetures réglementaires sont prioritaires sur tout** — provenance juridique visible ; **l'alerte ne prévient pas seulement : elle empêche d'y aller** ; circuits importés affectés signalés ; **données absentes/invalides/obsolètes : jamais une incertitude transformée en certitude** ;
- **On n'affiche pas la précision métrique comme décor** — la position d'un lieu est un ordre de rencontre, jamais une distance garantie (détail en annexe technique).

La promenade est **accompagnée** : GPS, boussole, alerte hors-tracé, profil d'altitude, export GPX, préparation d'un SMS de secours — **hors réseau** une fois la page ouverte. Et le courant produit un troisième effet : **l'observation** (§4).

## 3. La grille — cinq fondations techniques

**1. Trois régimes d'appels réseau, aucun API métier.** Navigation/composition/guidage : fichiers statiques, aucun endpoint · mise à jour : distribution de fichiers, rien ne remonte · mesure facultative : un endpoint dédié, isolé, recevant exclusivement les lots agrégés prévus. Aucun endpoint ne reçoit de position individuelle ni de parcours. **Aucun service exploité par MANA ne reçoit la position individuelle ni le parcours du marcheur. La position est traitée localement. Une exception, extérieure à l'infrastructure MANA : l'utilisateur peut choisir de transmettre volontairement sa dernière position par SMS à un destinataire qu'il a désigné.** Seuls les comptages agrégés, calculés sur le terminal après activation explicite, peuvent être transmis (§4).

**2. La composition et la navigation se font dans le navigateur** — la position ne quitte pas l'appareil dans le cadre des services MANA, hors transmission volontaire du SMS. Quelques dizaines de millisecondes par composition.

**3. OpenStreetMap comme matière première** (ODbL), attribution portée dans chaque artefact, pipeline reproductible.

**4. Le hors-ligne comme propriété première — avec fraîcheur explicite.** Chaque artefact réglementaire porte `generated_at`, `sources_verified_at`, `couverture[]` ; le terminal conserve `last_synced_at` ; **la fraîcheur se calcule sur la vérification des sources, jamais sur le téléchargement** ; date affichée en permanence ; avertissement au-delà de `FRAICHEUR_MAX`. **L'absence de fermeture dans un fichier obsolète n'est jamais une garantie de praticabilité.**

**5. La sobriété chiffrée** : ~13 Ko CSS, ~55 Ko JS gzip, zéro dépendance UI, polices OFL ; graphe Crozon : 2,36 Mo brut / ~600 Ko gzip, 64 028 nœuds, 13 265 arêtes, 339 lieux.

## 4. Le compteur — mesurer sans surveiller

> **MANA n'a pas besoin de connaître un parcours individuel pour mesurer les usages du territoire.**

- **Aucun compte** — une application qui réduit structurellement la collecte n'a pas besoin de compenser par des promesses de confidentialité.
- **La mesure est désactivée par défaut**, activée explicitement, révocable, expliquée — portée exacte : locaux supprimés ; lots non partis annulés ; lot en cours non garanti annulable ; **transmis non retirable individuellement — limite dite avant l'activation**.
- **L'agrégation se fait sur le terminal** — des **traversées observées**, jamais des individus ; jamais de séquence transmise ; jamais d'interpolation (sous-comptabilisation honnête) ; **rétention stricte : les contributions des longues pannes sont perdues, limite documentée**.
- **Seuils minimaux de publication** — seuil de volume statistique, pas une garantie d'anonymat ; **anti-reconstruction avant toute restitution publique, analyse étendue aux combinaisons et au niveau serveur**.
- **Quatre catégories factuelles** (position locale / agrégées terminal / transmises / publiables) ; **qualification juridique arrêtée par le responsable de traitement après avis du DPO** — « agrégées », jamais « anonymes » avant qualification.
- **Code ouvert, version déployée identifiable** (empreinte, registre) ; examen RGPD sur le périmètre complet : application, journaux du proxy, hébergement, diffusion — avant toute saison, renouvelé.

> Chaque territoire conserve la **maîtrise** de ses données territoriales ; MANA mutualise la technologie, **jamais les données** ; aucun partage inter-territoires sans mandat explicite.
>
> **L'énergie du territoire appartient au territoire. MANA la mesure, la met en scène, la laisse circuler — jamais ne la capte.**

## 5. Le réseau — la relation aux offices de tourisme

MANA **prolonge l'accueil** de l'office auprès des visiteurs qui ne fréquentent jamais ses espaces physiques : GPX → parcours accompagné ; fermetures → descendent dans l'app, provenance visible, bloquent le compositeur ; éditorial → dans l'oreille (MANAradio) ; entrées de bureaux → complétées par l'observation agrégée des usages ; saturation → levier de dispersion, **effet évalué, jamais présumé**. Trois langages : office (accueil augmenté) / OTB (mutualisation) / ADN Tourisme (réponse aux enjeux écrits). Et : **le territoire peut reprendre l'accueil numérique de son territoire sans dépendre de MANA.**

> **On ne vend pas une application aux offices de tourisme. On construit une infrastructure qu'ils peuvent s'approprier pour être présents là où sont leurs visiteurs.**

## 6. La transmission — Crozon, OTB, ADN Tourisme

**Preuve** (Crozon 2027-2028 : GR34 fermé février 2026, trois pointes saturées — Pen-Hir 256 345, Cap de la Chèvre 200 241 passages 2024 —, OGS en cours ; protocole arrêté avant la saison, résultats publiés y compris non concluants ; fonctionnement annuel < 2 % de la taxe de séjour 2025 — 756 846 € —, rapprochement d'ordre de grandeur, jamais une économie démontrée) → **Validation régionale** (OTB, avec des chiffres) → **Mutualisation** (ADN Tourisme) → **Déploiement** (une même fondation, des univers distincts).

## 7. Le contraire de l'énergie

Pas de compte · pas de publicité ni revente · pas de catalogue concurrent · pas d'urgence artificielle, compteur factice ni carrousel auto · **aucune donnée inventée** · pas d'encadrement (balisage officiel prévalant) · pas de prestataire verrouillé.

## 8. Sources

FFRandonnée/USC 2025 (62 %, ~30 M, 35 %, 47 % d'apps, GR® 72 %) · INJEP 2025 · Contentsquare 2025 · Raffour 2025 · Mona NA (*à confirmer*) · FNOTSI 2018 (*à confirmer*) · Destination d'Excellence (*à vérifier*) · Spot24 2025 · comcom-crozon.com (GR34 2026, incendie 2026, OGS, comptages 2024) · OT PCAM 2025 (63 401 accueils, 1,3 M vues, Rando 35 %, taxe 756 846 €) · mesures internes (graphe, tampon 150 m, ordre vérifié 0 inversion/199).

---
---

# PARTIE 2 · CONVENTION DE PILOTE (référence : texte intégral v3.2 + les 6 corrections)

**Articles clés corrigés v3.3 :** 2.2 (trois fonctions du circuit d'alertes, provenance juridique visible) · 3 (aucun profil individuel ; traitements strictement nécessaires encadrés) · 4.1/4.4 (garantie sur fermetures connues de la version locale ; matrice d'états ; circuits affectés) · 6 (maîtrise territoriale, mandat explicite, restitution avec typologie à préciser) · **7.2 (révocation en 4 états, limite dite avant activation)** · **7.4 (quatre catégories factuelles, qualification par le responsable de traitement après avis DPO)** · 7.5 (versions déployées identifiées, examen périmètre complet) · **8.3 (aucune restitution publique avant l'anti-reconstruction validé)** · 10 (sortie au 30 septembre de la saison en cours ; document de reprise) · **Annexe 1 (11 points : traversées, activation, détection avec état transitoire écrasé, idempotence, rétention stricte option A, seuil N + anti-reconstruction + combinaisons + niveau serveur, quatre catégories, examen DPO, matrice REGULATORY_DATA_STATUS avec couverture 7 champs pour `valid`, trois niveaux d'horodatage)** · Annexe 2 (22-32 k€ sur 2 saisons ≈ 3-4 % de la taxe ; fonctionnement annuel < 2 % ; visiteur gratuit) · Annexe 3 (sortie).

*Arbitrages avant signature : personnalité juridique · commande publique · qualifications RGPD · document de reprise · licence du code nommée.*

---
---

# PARTIE 3 · PROTOCOLE D'ÉVALUATION 2027-2028 (référence : v3.2 + corrections)

> **généré → délivré → reçu → compris.** Quatre niveaux indépendants.

**A — Usage (v3.3 : sessions observées).** A1 compositions/sessions observées · A2 ouvertures de fiche/sessions observées · A3 guidages activés/sessions observées ayant ouvert une fiche (activation de l'accompagnement, pas les promenades réalisées) · A4 hors-ligne constaté par le navigateur (approximatif) · **rappel en tête : ces chiffres = sessions observées parmi les activations, pas l'ensemble des utilisateurs.**

**B — Service.** B1 quatre niveaux (générée sur `sources_verified_at` / délivrée constatée dans le cache / reçue en session / comprise sondée) · B2 délai arrêté→intégré (dépassements publiés) · B3 parcours protégés.

**C — Connaissance.** C1 traversées observées (seuil N, après activation — double limite : utilisateurs seulement, activations seulement) · C2 dispersion observée (**évolution documentée, cause jamais imputée**, facteurs externes consignés) · C3 complémentarité aux compteurs.

**D — Utilité.** D1 entretiens OT · D2 compréhension sondée · D3 partenaires · **D4 décisions locales documentées — la donnée qui sert à décider**.

**Seuils** : N = 10 traversées (avec DPO — seuil de publication, pas garantie) · **anti-reconstruction arrêté et implémenté avant la première restitution publique** · rapport annuel à format fixe · **rapport de fin pouvant recommander de ne pas continuer**.

---
---

# PARTIE 4 · CAHIER DES CHARGES v3.3 — LE PROMPT COMPLET

## PROMPT — Instance territoriale MANA · presqu'île de Crozon

*Version 3.3. À donner à l'assistant de réalisation. Copier intégralement.*

---

Tu réalises l'instance territoriale MANA pour la presqu'île de Crozon – Aulne maritime, destinée à l'Office de tourisme et à la Communauté de communes. Ce n'est pas une application touristique générique : c'est **l'infrastructure d'accueil territorial en mobilité** décrite par le dossier institutionnel MANA (les pièces 1 à 3 en font partie intégrante). Tu respectes sa doctrine à la lettre — elle est contractuelle, et le dossier sera relu par un juriste en droit public, un DPO et des élus.

**Deux règles de conduite, au-dessus de tout le reste :**

> **Chaque garantie que tu implémentes doit être exactement celle que le dossier promet — jamais plus.**

> **Toute ambiguïté technique ayant une incidence sur une garantie institutionnelle doit être signalée avant implémentation. Ne jamais arbitrer silencieusement en faveur de la simplicité de développement.** Zones de signalement obligatoire : fermetures réglementaires, mesure d'usage, données personnelles, fraîcheur des données, idempotence, révocation. Si le présent prompt est incomplet ou contradictoire sur l'un de ces points, tu t'arrêtes et tu poses la question — tu ne choisis pas à la place du dossier.

## 0. ÉTAPE 0 — AUDIT AVANT TOUT CODE

**Avant toute modification du code existant, tu produis un rapport d'audit :**
1. **Lecture complète du dépôt** : structure, modules, dépendances, points d'entrée.
2. **Rapport d'écarts** point par point : conforme / non conforme / manquant / à supprimer (notamment `src/lib/mapRoute.ts`, client Valhalla non branché — §3.1).
3. **Validation topologique du graphe réel** (pas synthétique) : composantes connexes ; arêtes orientées ; raccordement des lieux ; existence réelle de boucles ; arêtes interdites ; comportement sans boucle possible.
4. **Stabilité et distinctivité du DFS** : compositions répétées sur des points variés, taux de candidats valides, diversité réelle des propositions (200 candidats ≠ 200 promenades valides et distinctes).
5. **Toute anomalie ou contradiction est signalée avant correction.**

Le rapport d'audit est le premier livrable. Le chantier ne commence qu'après sa remise.

## 1. L'objet

Une PWA qui : **compose** des promenades depuis la position (boucle 2–15 km, par les chemins, devant les lieux remarquables) ; **accompagne la marche** (GPS, boussole, alerte hors-tracé 50 m, profil d'altitude, export GPX, préparation d'un SMS — tracé, GPS et profil hors réseau) ; **descend les fermetures** avec provenance juridique visible (garantie exacte §5.5) ; **ingère les circuits de l'OT** (affectés signalés) ; **mesure les usages — uniquement après activation explicite** (§6.1), sans jamais suivre les personnes.

## 2. Le territoire et les données

**Graphe piéton** (fourni : 64 028 nœuds, 13 265 arêtes, 339 lieux, ~2,36 Mo brut / ~600 Ko gzip). JSON compact. **Le graphe porte les altitudes des nœuds.**

**Fermetures** (fichier fourni, **métadonnées d'artefact**) : GR34 Aber–Postolonnec (arrêté municipal, février 2026, « jusqu'à nouvel ordre ») ; Porzh Leon et La Source fragilisés ; interdiction horaire incendie (12h–20h en période d'arrêté, landes/forêts et 200 m). Chaque fermeture : `{id, type, référence, autorité, dates_validité, plage_horaire?, périmètre, source_url}` ; le fichier : `{generated_at, sources_verified_at, couverture[]}` — **chaque entrée de couverture enregistre 7 champs** : autorité/gestionnaire · source consultée · date de consultation effective · périmètre vérifié · catégories recherchées · résultat · zones non couvertes.

**Provenance juridique** affichée telle quelle, jamais reformulée. **Une fermeture réglementaire n'est pas une information touristique ordinaire.**

## 3. Le compositeur — règles produit non négociables

**3.1 — Architecture tranchée.** DFS stochastique à budget sur le graphe territorial — **remplace** tout moteur externe (**Valhalla n'est pas employé** ; `mapRoute.ts` supprimé ou archivé). Graphe élagué à la construction ; agrément dans les poids d'arêtes — jamais de plus court chemin générique.

**3.2** : échantillonnage `exp(score/T)`, élagage, 50–200 candidats, timeout.

**3.3** : score = couverture des lieux (tampon 150 m — **si c'est listé, on passe devant**) + erreur de longueur + agréments + pénalité de répétition. **3–5 boucles distinctes** — dispersion effective évaluée (C2), jamais présumée.

**3.4** : ordre de marche, **jamais triés par distance**.

**3.5 — Trois niveaux d'horodatage, états explicites, vérification en 7 champs.**

- **Métadonnées de l'artefact** : `generated_at`, `sources_verified_at`, `couverture[]` ;
- **État local du terminal** : `last_synced_at` — *n'appartient pas à l'artefact, varie par appareil* ;
- **État réglementaire calculé** : comparaison fraîcheur/couverture/règles.

**La fraîcheur se calcule sur `sources_verified_at` — un téléchargement récent ne rajeunit pas des sources anciennes.**

| État | Signification | Comportement |
|---|---|---|
| `valid` | Lisible, frais, **couverture documentée** (somme des vérifications 7 champs) | Composition autorisée sous réserve des fermetures connues — **sans couverture, `valid` ne peut pas être attesté** |
| `stale` | Sources > `FRAICHEUR_MAX` | Avertissement daté sur `sources_verified_at` ; restrictions selon périmètre incertain ; fermetures connues exclues |
| `invalid` | Corrompu, illisible, incohérent | **Composition interdite dans les zones non vérifiables** |
| `unavailable` | Fichier absent | Jamais assimilé à « ouvert » ; **zones non vérifiables indéterminables → composition interdite sur l'ensemble du périmètre** |

**Une information réglementaire illisible ne devient jamais une autorisation implicite.** Règle tranchée par le dossier — tu l'implémentes, tu ne la choisis pas.

**3.6 — Interdictions horaires : l'heure est une estimation, pas une garantie.** À la composition : heure de passage estimée (longueur / **vitesse prudente configurable** + **marge temporelle configurable**) ; chevauchement possible avec la plage interdite → **exclusion** (11h30 → 12h15 en zone interdite ne sort pas). En marche : recalcul régulier ; incompatibilité → alerte + solution sûre, **sans faire croire à un changement de tracé hors réseau**. Interdiction ininterprétable → passage non proposé.

**3.7 — Repli honnête** : pas de boucle possible → aller-retour pénalisé, annoncé — jamais une boucle fabriquée. Vérifié sur le graphe réel.

## 4. Architecture — cinq fondations

**4.1 — Trois régimes d'appels réseau.** Navigation/composition/guidage : fichiers statiques, **aucun endpoint** · mise à jour : distribution de fichiers, **rien ne remonte** · mesure : **un endpoint dédié, isolé, recevant exclusivement les lots agrégés prévus — et rien d'autre** (spécification §6.5). Aucun endpoint ne reçoit de position ni de parcours. Fond de carte par relais proxy sans clé dans le JS.

**4.2 — Composition et navigation dans le navigateur.** **Aucun service exploité par MANA ne reçoit la position individuelle ni le parcours. Exception extérieure à l'infrastructure : transmission volontaire du SMS par l'utilisateur à un destinataire qu'il a désigné.**

**4.3 — Attribution ODbL dans chaque artefact** (graphe, fiches, chaque GPX exporté).

**4.4 — Hors-ligne premier, fraîcheur explicite** : shell cache-first (assets hashés) ; données en stale-while-revalidate ; **`sources_verified_at` affiché en permanence** ; `FRAICHEUR_MAX` (hypothèse 14 jours). Mode avion : tracé, GPS, profil, SMS préparé ; fond absent → **schéma SVG sur fond encre**.

**4.5 — Sobriété** : TypeScript + Vite, zéro dépendance UI, polices OFL, CSS < 20 Ko, JS < 60 Ko gzip. Charte « Terre, Mer & Lumière » (encre `#1b2a4a`, or `#c9a227`, sable `#faf8f3`, bulles blanches bordées or, header pilule flottante en bas) ; zéro emoji UI, zéro carrousel auto, zéro compteur factice.

## 5. Précisions fonctionnelles

**5.4 — SMS** : préparation (coordonnées, lien, précision, horodatage) + composeur natif ; **destinataire fourni ou choisi par l'utilisateur, aucun numéro par défaut** ; envoi dépend de la couverture et de l'utilisateur — « préparé, envoyé par vous ».

**5.5 — Garantie sur les fermetures** : parmi les fermetures connues de la version locale — **quand l'app ne sait pas, elle le dit et elle restreint ou interdit, elle ne devine pas.**

**5.6 — Mention obligatoire** : *« Itinéraire indicatif, établi à partir des informations vérifiées le [sources_verified_at]. Le balisage et la signalétique officiels prévalent. »*

**5.7 — Altitude** : profil depuis le graphe (fiable, hors ligne) vs altitude instantanée du terminal (si fiable, avec sa qualité, sinon absente) — deux sources, deux promesses.

## 6. La mesure d'usage

> **MANA n'a pas besoin de connaître un parcours individuel pour mesurer les usages du territoire.**

**6.1 — Activation explicite, révocable, expliquée — limites de la révocation dites avant activation.**

| État | À la révocation |
|---|---|
| Agrégats locaux non transmis | **Suppression immédiate** |
| Lots non partis | **Annulation et suppression** |
| Lot en cours | **Annulation non garantie si le serveur l'a reçu** |
| Données intégrées au serveur | **Pas de retrait individuel possible** |

Modalités soumises à l'**avis DPO + décision formalisée du responsable de traitement** ; module isolé. Après activation, transmissions automatiques dans ce cadre. **On ne promet jamais une suppression rétroactive que l'architecture rend impossible.**

**6.2 — L'unité : la TRAVERSÉE.** Jamais des individus distincts — par conception. Vocabulaire : **« traversées observées »**. Données « agrégées » — jamais « anonymes » avant qualification.

**6.3 — Trois niveaux.** Parcours proposé (mémoire de session, navigation — jamais un historique des déplacements réels) · **état transitoire du détecteur** (mémoire vive, seules observations nécessaires, **écrasé au fil des observations, ni persisté ni transmis, jamais une séquence exploitable**) · compteur `{arête, créneau}` — **seul élément autorisé dans le pipeline ; jamais une liste, jamais un ordre.**

**6.4 — Détection sur événement observé** : tolérance GPS configurable, règle de doublons locaux (hystérésis, à documenter), gestion des sauts. **Événement ambigu → non compté : sous-comptabilisation honnête, jamais l'interpolation.**

**6.5 — Pipeline (rétention stricte — option A tranchée)** :
- Comptage local `{arête, créneau ≥ 2h}` — sans séquence ;
- Persistance IndexedDB, sans identifiant ni séquence, **`RETENTION_LOCALE` = 30 jours stricte : au-delà, suppression — la contribution d'une longue panne est perdue, limite documentée** ;
- **Transmission idempotente** : lots avec identifiant aléatoire à usage unique (**mécanisme technique, pas un identifiant de personne**) ; reconnaissance serveur > `RETENTION_LOCALE` + marge, trace durable documentée ; **atomicité** (contrainte de base, pas seulement un test) ; scénarios : confirmation perdue → compté une fois ; **lot accepté avant expiration renvoyé par conservation défensive → jamais recompté** ; navigateur fermé pendant l'envoi → lot en attente (jusqu'à rétention), compté une fois ;
- **Endpoint dédié, isolé, ne sachant répondre à rien d'autre que l'ingestion des lots prévus** ;
- Confirmation → purge locale ; échec → conservation jusqu'à rétention puis suppression.

**6.6 — Seuil et anti-reconstruction.** **N = 10 traversées** (hypothèse, avis DPO) — **seuil de publication, pas une garantie d'anonymat** ; cellules < N jamais publiées ; **mécanisme anti-reconstruction défini avec DPO et responsable de traitement et implémenté AVANT la première restitution publique — tant qu'il n'est pas arrêté, aucune restitution ne sort** ; analyse sur les **combinaisons d'arêtes/créneaux** et vérifiant que **les données intermédiaires du serveur ne permettent pas une reconstitution que les rapports publics empêchent** ; cellules singulières regroupées/supprimées même ≥ N ; vocabulaire public : « données agrégées ».

**6.7 — Cohérence protocole** : A1/A3 = **sessions observées** (activations de mesure), même pipeline ; B1 quatre niveaux indépendants ; C1 double limite (utilisateurs seulement, activations seulement).

**6.8 — Version identifiée** : empreinte affichée et transmise ; registre public.

**Documentation publique de la mesure livrée avec l'app** (unités, activation, limites de révocation, détection et état transitoire, rétention stricte, endpoint, seuils, anti-reconstruction).

## 7. Interdits et garde-fous

**Interdits absolus** : comptes · traceurs · suivi individuel/profilage · **toute séquence réelle enregistrée à des fins de mesure, persistée ou transmise** · **interpolation** · précision métrique comme positionnement · boucles fabriquées · données inventées · carrousels · comptes à rebours · **numéros d'urgence par défaut**.

**Traitements encadrés** (avis DPO + décision responsable de traitement) : position locale pour la marche · mesure après activation révocable · SMS transmis par l'utilisateur · journaux techniques du proxy et de l'hébergement (configuration minimale, **durées, accès, sous-traitants et journaux automatiques du fournisseur documentés**) · trace de déduplication des lots.

**Formulation partout** : « hors ligne pour le tracé, en ligne pour les mises à jour » · « préparé, envoyé par vous » · « traversées observées, pas des individus » · « mesuré uniquement si vous l'avez activé » · **« une fois transmis, un agrégat ne peut plus être retiré individuellement — cette limite vous a été présentée avant l'activation ».**

## 8. Livrables

1. **Rapport d'audit initial (§0)** — premier livrable ;
2. Dépôt commenté (mesure, détection, compositeur, fermetures horaires, états, horodatages, fraîcheur, idempotence, révocation) ;
3. Pipeline d'ingestion (GPX → fiches ; fermetures avec couverture 7 champs → graphe ; graphe → fichier servi) ;
4. Documentation de reprise (art. 10.3) — **l'OT doit pouvoir reprendre sans nous** ;
5. Documentation publique de la mesure ;
6. Registre public des versions ;
7. **Tests obligatoires** :
   - **Aber–Postolonnec : jamais dans aucune boucle** ;
   - **11h30 → 12h15 (avec marge) : exclu** ;
   - **un test par état réglementaire** — `invalid` : composition refusée dans les zones non vérifiables ; `unavailable` : interdite sur tout le périmètre si zones indéterminables ; `stale` : avertissement sur `sources_verified_at` ; `valid` : exclusion garantie — **sans couverture, pas de `valid`** ;
   - **horodatages : fichier récent aux sources anciennes = `stale` ; un artefact ne porte jamais `last_synced_at`** ;
   - **graphe réel : repli honnête + stabilité/distinctivité du DFS** ;
   - **détection : ambigu → non compté ; doublon local → compté une fois** ;
   - **idempotence : confirmation perdue → une fois ; lot accepté renvoyé par conservation défensive → jamais recompté ; concurrence → un incrément ; navigateur fermé → en attente, une fois** ;
   - **rétention stricte : agrégat non transmis > 30 jours → supprimé, jamais renvoyé** ;
   - **révocation : aucun envoi après, y compris lot en attente ; écran d'activation mentionne la limite** ;
   - **endpoint : refuse tout ce qui n'est pas un lot prévu (test de refus)** ;
   - mode avion ; obsolète simulée ; désactivée par défaut (test réseau) ; revue « aucune séquence réelle dans le pipeline » — **et recherche explicite par motif : `history`, `buffer`, `trail`, `push(`**.

## 9. La phrase qui guide chaque choix

> **« Ne jamais demander au réseau de croire ce que nous pouvons lui démontrer. »**

MANA ne promet pas de tout savoir du territoire. **Il promet de connaître ses limites, de les rendre visibles et de ne jamais transformer une incertitude en certitude.** Quand tu hésites entre deux implémentations, choisis celle qu'on peut montrer à un office de tourisme, à un DPO et à un élu — les trois lisent le même dépôt.

---
---

# PARTIE 5 · NOTE DE FAISABILITÉ CODE — MISTRAL / CLAUDE

## Verdict global

**Le cahier des charges v3.3 est réalisable par les deux assistants.** Aucun module ne relève de la recherche — tout est de l'ingénierie connue. La difficulté n'est pas algorithmique mais **disciplinaire** : la valeur est dans les ~25 tests et les interdits, et un assistant peut passer tous les tests fonctionnels en violant la doctrine dans un coin d'implémentation. **L'étape 0 et la revue de code doctrinale sont le vrai produit du chantier.**

| Module | Claude | Mistral | Difficulté réelle |
|---|---|---|---|
| Audit initial (étape 0) | ✅ point fort | ✅ bonne | discipline de lecture |
| DFS stochastique à budget | ✅ standard | ✅ standard | moyenne — le réglage |
| Détection de traversée sans séquence | ✅ faisable | ✅ faisable | **haute — le point délicat** |
| États réglementaires + horodatages | ✅ simple | ✅ simple | basse — du modèle de données |
| Interdictions horaires | ✅ faisable | ✅ faisable | moyenne — les marges |
| Idempotence serveur | ✅ standard | ✅ standard | basse — pattern connu |
| Anti-reconstruction statistique | ⚠️ à spécifier avec humain | ⚠️ à spécifier avec humain | **haute — statistique, pas code** |
| Hors-ligne SW + fraîcheur | ✅ standard | ✅ standard | moyenne — cache-first vs SWR |
| Endpoint « ne répond à rien d'autre » | ✅ simple | ✅ simple | basse |

## Module par module — où ça coince

**a) Compositeur DFS (les deux le font ; le risque est le réglage).** Difficultés réelles : la **distinctivité** des 3–5 boucles (pénalité entre candidats, pas seulement dans un candidat) ; la couverture des lieux sans exploser le temps ; la **stabilité** (deux compositions au même point ne doivent pas diverger sans raison). *L'indicateur de diversité de l'audit §0.4 est l'outil — impose-le avant d'accepter le compositeur.*

**b) Détection de traversée (le plus délicat, pour les deux).** La contrainte « état transitoire en mémoire vive, écrasé au fil des observations, jamais une séquence » est fine. Implémentation honnête : **fenêtre glissante stricte** — garder seulement la dernière observation qualifiée + l'arête en cours (hystérésis), supprimer l'état dès l'événement compté ou invalidé. *Piège classique des deux assistants : un tableau d'historique de positions « pour fiabiliser » — exactement la séquence interdite. La revue doit le chercher par motif (`history`, `buffer`, `trail`, `push(`) ; le test « ambigu → non compté » ne suffit pas à le révéler.*

**c) Interdictions horaires (faisable ; le piège est la promesse).** Le calcul d'heure estimée est simple. Pièges : oublier le **recalcul en marche** ; proposer un changement de tracé en mode avion ; intégrer la marge à la composition mais pas à l'alerte temps réel. *Les deux feront le calcul correct au premier essai et le recalcul au deuxième — impose les deux d'emblée.*

**d) Idempotence (pattern standard ; exiger l'atomicité réelle).** Identifiant de lot + contrainte d'unicité (clé primaire / upsert) : connu des deux. Piège : l'atomicité en concurrence exige une **contrainte de base de données**, pas un test séquentiel. *Exige l'implémentation avec contrainte + test de concurrence réelle.*

**e) Anti-reconstruction (la limite des deux — c'est humain).** Le mécanisme est un choix **statistique** dépendant des volumes réels : aucun assistant ne peut l'arrêter sans données. *L'assistant implémente le mécanisme choisi par le DPO et le responsable de traitement, il ne le choisit pas — le cahier des charges (§6.6) le dit déjà ; maintiens-le.*

**f) Service worker (standard, une vigilance).** Cache-first shell + SWR données : connus. Vigilance : **l'avertissement de fraîcheur dans les deux mondes** (frais = discret ; périmé = visible), testé en avion. *Piège historique du projet : un cache-first trop large qui fige les utilisateurs — déjà arrivé sur le site vitrine ; garde le SWR sur toutes les données.*

**g) Endpoint « qui ne sait rien faire d'autre » (simple, exigez le test de refus).** Validation stricte du schéma, rejet sinon. *Le genre de garantie qu'un assistant oublie parce que « ça marche » sans elle — le test de refus est dans la liste v3.3, exige-le formellement.*

**h) Audit étape 0 (point fort de Claude en particulier).** Lecture de dépôt, rapport d'écarts, validation topologique (64 028 nœuds : l'analyse programmatique est triviale, la manuelle impossible). *La bonne première tâche : elle calibre tout le reste.*

## Différences pratiques

**Claude** — point fort : audit longue-contexte, cohérence multi-fichiers (dossier entier en contexte du code), discipline sur instructions longues et contraignantes. À surveiller : rien de spécifique — la revue doctrinale reste indispensable.

**Mistral** — équivalent sur la majorité des modules (DFS, idempotence, SW, endpoint). À surveiller : les tableaux de comportement (matrice d'états) exigent une vérification complète post-génération — **chaque état de la matrice doit avoir son test**, pas seulement un code qui compile. Sur la détection : même discipline — chercher le tableau d'historique caché.

**Recommandation d'emploi** : **Claude pour l'ensemble du chantier** (l'étape 0 et la cohérence doctrine-code sont le cœur de la valeur) ; **Mistral en relecteur indépendant** — cahier des charges + code produit, sans contexte de rédaction, avec mandat de rapport de conformité point par point. *Deux lectures indépendantes des mêmes exigences : ne jamais demander de croire ce qu'on peut démontrer — et deux démos valent mieux qu'une.*

## Les trois pièges transversaux (les mêmes pour les deux)

1. **Le tableau d'historique caché** — la violation la plus probable de la doctrine : un `_history`, un `positions[]`, un buffer de débruitage qui persiste. Revue par motif en plus des tests.
2. **L'avertissement générique au lieu du comportement** — pour `invalid`/`unavailable`, l'assistant sera tenté d'afficher un bandeau et de continuer à composer. Les tests doivent vérifier **que la composition est refusée**, pas que le bandeau s'affiche.
3. **La réussite fonctionnelle sans la preuve** — tous les tests passent, mais personne n'a vérifié que seuil N et anti-reconstruction s'appliquent réellement dans le pipeline de publication. *Exige un test de bout en bout : données de test → pipeline → restitution, avec des cellules sous le seuil qui ne sortent jamais.*

---

# ÉTAT FINAL — v3.3

| Pièce | État |
|---|---|
| 1. Livre blanc | Circulation de travail — 3 sources à vérifier |
| 2. Convention | Négociation juridique — arbitrages en liste |
| 3. Protocole | Prêt à arrêter — A1/A3 corrigés, anti-reconstruction avant première restitution |
| 4. Cahier des charges v3.3 | Prêt à transmettre — 6 corrections intégrées, audit d'abord |
| 5. Note de faisabilité | Réalisable par les deux — Claude chantier, Mistral relecture indépendante |

**Le 6 novembre** : une promenade composée · une fermeture qui l'empêche d'aller sur le GR34 · le réseau coupé · ce qui continue à fonctionner. Le dossier explique pourquoi, la démonstration montre que c'est vrai.

**MANA — l'énergie du territoire. Une même fondation. Des univers distincts. Une promesse claire pour chacun.**

> **MANA ne promet pas de tout savoir du territoire. Il promet de connaître ses limites, de les rendre visibles et de ne jamais transformer une incertitude en certitude.** ❤️

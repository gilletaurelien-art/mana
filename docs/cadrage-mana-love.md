# CADRAGE mana.love — v2, mesuré et corrigé

> **Objet** : définir la nouvelle application mana.love, dont le code de
> référence est `gilletaurelien-art/mana.love`. L'ancien site mana.love,
> toujours servi, porte des fonctionnalités à reprendre — mais la nouvelle
> version se veut un code propre, pas une migration.
>
> **v1 écrite le 3/11/2026, réécrite le même jour** après vérification en
> éventail : 11 agents, 40 affirmations testées, **13 à corriger**.

---

## 0 · Ce que cette v2 corrige — et pourquoi ça compte

🔴 **La v1 affirmait « périmée de 8 commits ». C'est 11.**
`git rev-list --left-right --count 8090298...0eee0b6` rend `0  11`. Le chiffre
8 ne tombe sous aucun mode de comptage.
⭐ **C'était le seul 🔴 du document, et il commettait le défaut que la phrase
suivante reprochait au dépôt** : un chiffre présenté comme mesuré qui ne
l'est pas. Un cadrage n'est pas dispensé de sa propre règle.

Les autres corrections sont réparties dans le document, signalées **⟲**. Les
plus lourdes :

| la v1 disait | mesuré |
|---|---|
| « un « où » saisissable — Nominatim le fait déjà » | **faux** — seul `/reverse` existe, aucun `/search` |
| « ✅ un lieu : alimenté en réel par Overpass » | **la requête ne demande que des `node`** |
| « rayon borné à 5 000 m (défaut 3 000) » | **figé à 3 000 m**, le plafond est inatteignable |
| « repli silencieux sur le français » | le dictionnaire EN est **complet** ; **onze écrans n'ont aucune clé** |
| « mana.bzh a déjà résolu ce problème exact » | **non** — il a résolu une fuite d'IP, pas un volume |
| « reste à faire : garantir que chat.ts ne journalise rien » | **déjà vrai** ; le vrai défaut est ailleurs et il est présent |
| « garde-fou à tenir » (dépendance, au futur) | **déjà livré, et à l'écran** |

⚠️ **Et un angle mort que personne n'a comblé : rien n'a été exécuté.** Ni la
v1, ni l'éventail n'ont émis une seule requête Overpass, ouvert l'app, ou
regardé un écran. Tout est lecture de source. Le dépôt mana écrit pourtant
`scripts/carte-style.mjs:13-19` : *« ON LIT LE SERVEUR, PAS L'AMONT […] la
copie embarquée pourrait diverger de ce qui est SERVI »*. Ici on a lu la copie
embarquée. §8 dit quoi mesurer, et pourquoi c'est le prochain geste.

---

## 1 · La décision du fondateur : **le compte dès la v1**

Arbitrage rendu le 3/11/2026. ⭐ **Ma recommandation était l'inverse** — tenir
l'architecture locale et différer le compte — et elle est consignée ici pour
mémoire, pas pour être rejouée : le fondateur a tranché, et ce document suit
sa décision.

Ce que le compte emporte, et qui n'est pas négociable une fois le choix fait :

1. **La suppression côté serveur se livre AVEC le compte**, pas après.
   `PrivacyScreen.tsx:36-44` promet déjà : *« quand un backend sera en place,
   la suppression s'étendra aux données serveur »*. Cette phrase arrive à
   terme le jour du compte.
2. **Le registre de progression devient autoritaire.** Le README le liste en
   attente n° 3 : aujourd'hui `localStorage` est un cache client, donc les
   points sont falsifiables depuis la console.
3. **Les obligations du §6 s'appliquent en entier**, parce que des
   conversations intimes stockées chez nous sont des données de l'article 9.

⚠️ **Ce que le compte n'achète PAS : l'intimité.** La compagne se souvient
déjà — `useConversations` (`persistence.ts:109`) relit
`mana.love.conversations.v1` au démarrage. Le compte achète la **continuité
entre appareils** et la survie à un vidage de cache. Ce qui l'empêche de se
souvenir *de ce qui compte* est ailleurs : `server/chat.ts:74` ne lui envoie
que `history.slice(-20)`. **Une fenêtre de 20 messages.** Le compte ne la lève
pas ; il faut une couche de synthèse. Les deux chantiers sont distincts.

⭐ Et le ton est un troisième axe, gratuit : `systemPrompt.ts:13` pose le
vouvoiement par défaut. Le rendre proche est une ligne de prompt, pas une
architecture.

---

## 2 · L'état réel du code, mesuré

Sur `gilletaurelien-art/mana.love`, branche **`main`** (`0eee0b6`), 76 fichiers.

🔴 **La branche par défaut du dépôt est `vibe/mana-love-app-foundation-a324c7`,
11 commits derrière `main`.** Qui clone reçoit l'ancien code, sans signal.
⟲ La v1 ajoutait « et le Panthéon » à la liste de ce que `main` apporte :
**faux**, `PantheonScreen.tsx` existe déjà sur la branche par défaut (le diff
est `M`, pas `A`). Et la descendance passe par un **merge** (`213c740` a deux
parents), pas par une chaîne linéaire.

| ce qui existe | où | état mesuré |
|---|---|---|
| Conversation | `src/features/chat/`, `server/chat.ts` | proxy Mistral, clé côté serveur ; bannière de mode démo **réellement affichée** (`ChatScreen.tsx:152-157`) |
| Exploration | `server/geo.ts` | Overpass + Nominatim **`/reverse` seulement** |
| Panthéon / canon | `src/domain/canon.ts`, `figuresRegistry.ts` | quatre registres qui ne se mélangent pas |
| Progression | `src/domain/progression.ts` | **44 points/jour** réels (`radio:listened` est une règle morte) |
| Langues | `src/i18n/index.ts` | `fr` + `en`, **30 clés chacune, aucune manquante** |

🔴 **En production, la conversation ne fonctionne pas.** `/api/*` est monté par
un plugin Vite (`server/index.ts:12-21`, `vite.config.ts:10`) : développement
seulement. Le déploiement est GitHub Pages, statique. Aucun arbitrage n'est
livrable sans un runtime Node.

### 2.1 — Trois gardes qui n'existent pas

⭐ C'est la trouvaille la plus utile de l'éventail, parce qu'elle change ce
qu'on peut *s'autoriser à croire* du dépôt.

⛔ **Le vouvoiement n'est verrouillé par aucun test.** `systemPrompt.test.ts`
assertе six sous-chaînes — « Tu es MANA », « jamais de jalousie », « tu es une
IA », les traits, « français », « aimer la vie ». **Jamais le vouvoiement.** On
peut supprimer entièrement `systemPrompt.ts:13` : les trois tests restent
verts. *Le garde-fou le plus fort contre le glissement vers l'intime est le
seul que rien ne tient.* Écrire ce test est un préalable, pas une conséquence.

⛔ **La promesse de progression est annoncée comme testée, et ne l'est pas.**
`README.md:170-175` écrit : *« Les récompenses ne récompensent jamais le volume
de messages, le temps d'écran ni la réouverture de l'app […] Testé dans
`progression.test.ts` »*. Aucune des 133 lignes de ce fichier ne porte sur le
contenu de `RewardableAction` : ajouter `chat:message-sent` ne ferait rougir
aucun test. Le fichier contient même un test qui teste **l'inverse de son
titre** (`it("throws when asking for an unknown action")` passe une action
**connue** et assertе `not.toThrow()`).

⛔ **La CI ne vérifie que la moitié du garde d'origines.**
`.github/workflows/ci.yml:19` lance `node scripts/check-origins.mjs src`, sans
`--app` et **jamais sur `server/`**, alors que `package.json:14` définit la
paire `src --app && server --serveur`. ⚠️ Précision : la CI lance bien le
linter (`npx eslint .`, ligne 21) — ce qui lui échappe est la **seconde moitié
du garde d'origines**, celle qui couvre `api.mistral.ai`, `overpass-api.de` et
`nominatim.openstreetmap.org` (`check-origins.mjs:37-41`). **Une fuite
d'origine côté serveur passerait au vert.**

---

## 3 · « Des sorties dans le monde entier » — ce que le code permet

### 3.1 — Non pas trois objets, mais **quatre**

⟲ La v1 en posait trois. Il en manque un, et il change l'arbitrage.

| forme | type | état mesuré |
|---|---|---|
| **un lieu** | `Place` | ⚠️ voir 3.2 — la case ✅ de la v1 était trop forte |
| **une sortie écrite** | `Experience` | données de démonstration, **câblées comme bouton principal de l'accueil** |
| **un évènement daté** | — | n'existe pas, aucune source |
| **une boucle calculée** | `promenade.ts` | ⭐ **implémentée** : Dijkstra maison (197-241), `composerBoucle` (264-301), Naismith (309-315) |

⭐ **La boucle calculée est la seule qui produit une sortie sans éditorial ni
source datée.** `promenade.ts:5-6` l'énonce en doctrine : *« le produit n'est
pas les sentiers, c'est la promenade : on COMPOSE, on ne consulte pas un
catalogue »*. La question n'est donc plus « laquelle des trois promet-on » mais
**« compose-t-on, ou catalogue-t-on ? »** — et le code a déjà répondu.

⚠️ Deux réserves sur cette quatrième voie. Elle consomme **un fichier de graphe
par territoire** (`GrapheTerritoire.territoire`, `promenade.ts:62-63`) et
**zéro territoire existe** : le seul fichier non-code du dépôt est
`public/mana.svg`. Et c'est un **emprunt incompatible** à mana.bzh : mana.love
attend 10 champs avec `maree` à l'index 9 (`promenade.ts:83-106`), le
générateur de mana.bzh émet 8 champs (`graphe-signaux.py:109`) et relit la
marée à l'index 7 (`composition.ts:404`). Elle porte la dette conceptuelle de
mana.bzh **sans pouvoir consommer ses données**.

### 3.2 — ⟲ La seule case ✅ de la v1 était une inférence, pas une mesure

`server/geo.ts:109-112` n'interroge que des **`node`** — aucun `way`, aucune
`relation`, aucun `nwr`. Or `natural=wood|water|beach`, `leisure=park|garden`
et `highway=footway` sont presque toujours des **ways** dans OSM. En pratique,
seuls les **sommets et les belvédères** remonteraient.

⭐ La preuve de l'intention manquée est dans le code lui-même : la sortie est
`out center 60` (`geo.ts:114`) — et `center` ne sert **qu'aux ways**.

Trois bornes que la v1 ne disait pas : plafond dur de **60 éléments** par
requête, **rejet de tout lieu sans tag `name`** (`geo.ts:64-65`), et retombée
sur `"landscape"` pour tout le reste (`PlaceKind` n'admet que cinq valeurs).

⛔ **Rien de tout ceci n'a été exécuté** — voir §8.

### 3.3 — « Monde entier » : deux verrous de **type**, pas de donnée

⭐ C'est la correction la plus structurante de cette v2. La v1 déclinait
« monde entier » en technique / éditorial / linguistique, et ne voyait pas que
le modèle de données l'interdit déjà.

⛔ **Un code INSEE n'existe qu'en France.** `communes.ts:12-13` documente
`code: string` comme *« Code INSEE — identifiant stable »*, dans le fichier que
son propre en-tête appelle *« le point d'entrée réel des visiteurs »*. Le test
verrouille même le libellé : `expect(libelleCommune(COMMUNES[1])).toBe("Brest
(29019)")`.

⛔ **La recherche est structurellement aveugle à toute écriture non latine.**
`normaliserRequete` (`communes.ts:31-37`) supprime tout caractère hors
`[a-z0-9]`. Exécuté : « 東京 » → `""`, « Αθήνα » → `""`, « Москва » → `""`,
« القاهرة » → `""`, « 서울 » → `""`. **Page vide pour la majorité des toponymes
du monde.**

Et trois hypothèses linguistiques en dur : `accept-language=fr` dans l'URL de
reverse-geocoding (`geo.ts:168`), et la prose par défaut de chaque lieu en
français littéral (`geo.ts:73`).

⟲ **Le vrai défaut d'i18n n'est pas le repli.** Le dictionnaire anglais est
**complet** (30 clés sur 30) : le repli de `i18n/index.ts:132` ne se déclenche
jamais. Le défaut est que **onze écrans n'ont aucune clé** — `ExploreScreen`,
`PlaceDetail`, `ExperienceDetail`, `Privacy`, `Pantheon`, `Sleep`, `Action`,
`Radio`, `Footer`, `TopBar`, `MobileNav` : **zéro** `t("`. Basculer l'app en
anglais ne traduit pas une ligne de l'exploration. Et `systemPrompt.ts:17`
ordonne *« Réponds en français »*, **verrouillé par un test**
(`systemPrompt.test.ts:22-25`) : en interface anglaise, la compagne répond
quand même en français.

### 3.4 — ⚠️ L'app promet aujourd'hui **l'inverse**

`i18n:60` intitule la porte « Explorer le monde » / « Explore the world », mais
`i18n:61` la décrit « Des lieux et des expériences, **près de chez vous** » /
« **near you** », repris par `ExploreScreen` (« autour de moi »). **Annoncer
« le monde entier » n'est pas un ajout au discours : c'est son remplacement.**

### 3.5 — ⟲ Overpass et Nominatim : plus dur que ce que la v1 disait

La v1 écrivait que mana.bzh *« a déjà résolu ce problème exact »*. **Faux** :
mana.bzh a résolu une **fuite d'IP**, pas un **volume**, en mettant en miroir
un **instantané statique et daté** de la planète. Overpass est une API vivante,
et un relais ne réduit pas le volume amont — il change l'IP qui frappe.

⛔ **Pour Nominatim, ce n'est pas un seuil : c'est une porte fermée.** La
politique (citée par recherche, page non lue) plafonne à **1 requête/seconde
par application, tous utilisateurs confondus**, limite à un seul thread, et
assimile les requêtes périodiques d'une app à du *bulk geocoding « strongly
discouraged »*. **Le facteur d'échelle est la concurrence, pas le volume par
personne.**

Et `server/geo.ts` est en écart sur un point précis : la politique exige
littéralement que l'app puisse changer de service *« without requiring a
software update »*, or `OVERPASS_URL` et `NOMINATIM_URL` sont des **constantes
de module en dur** (`geo.ts:12-13`). Aucun limiteur de débit n'existe dans
`server/`.

---

## 4 · Ce qui est **déjà livré** et contredit la promesse publiée

⭐ La v1 rangeait la dépendance dans un « garde-fou à tenir » pour plus tard.
Mesure : **elle est à l'écran aujourd'hui.**

- compteur de points sur **toutes** les pages (`TopBar.tsx:52-57`, monté par
  `PageShell.tsx:24`) ;
- barre de progression sur l'accueil, `aria-valuemax` = le seuil de la déesse
  (`HomeScreen.tsx:70-92`) ;
- la chaîne **« Prochaine rencontre : {nom} · {points} points »**
  (`i18n:66`, `en:100` « Next meeting ») ;
- compagnes verrouillées **affichées avec leur prix dans le chat lui-même**
  (`ChatScreen.tsx:113-125`, « 🔒 {threshold} points ») ;
- **44 points/jour** de plafond réel contre un seuil de 140 : Éos est
  inatteignable avant **quatre jours calendaires distincts**.

⛔ `PrivacyScreen.tsx:29` promet de ne pas récompenser *« la réouverture
répétée de l'app »*. **Un plafond journalier combiné à un seuil cumulatif ne
récompense pas la réouverture : il l'EXIGE.**

### 4.1 — Deux phrases publiées que le code contredit

Ce ne sont pas des arbitrages. Ce sont des faussetés d'aujourd'hui.

1. `PrivacyScreen.tsx:18` : *« Aucune donnée n'est envoyée vers un serveur tant
   qu'aucun backend n'est configuré »* — **faux dès que `MISTRAL_API_KEY`
   existe** : `chat.ts:74-78` envoie les 20 derniers messages à
   `api.mistral.ai`. Le mot « backend » est équivoque.
2. `README.md:148-149` : *« Aucune donnée de localisation n'est stockée »* —
   les coordonnées GPS brutes sont écrites en `mana.love.explore.coords.v1`
   (`persistence.ts:23`).

### 4.2 — Zéro modération, zéro chemin de crise

`grep` exhaustif sur `src`, `server`, `README.md`, `.github` et les configs :
**aucune** occurrence de modération, vérification d'âge, signalement, détresse,
crise ou numéro d'urgence — trois faux positifs seulement.

⟲ La v1 rangeait la modération dans la seule colonne « érotique ». **Faux : la
détresse est une fonction de la confidence, pas de l'érotisme.** L'app invite
déjà à déposer ce qui pèse, le soir (`SleepScreen`). Le chemin de crise
appartient donc à **la v1 que le fondateur a choisie**, pas à un hypothétique
palier ultérieur.

### 4.3 — Ce qui est **rassurant**, et mesuré

- ⭐ **`avatar.ts` est neutre.** `type Incarnation` n'a aucun champ de vêtement,
  de nudité, de pose ni de registre de ton ; **aucun mot sensuel dans ses 119
  lignes**. Le « corps » est une référence de modèle `.vrm`, rien de plus. Et
  rien n'est rendu : pas de three.js au `package.json`, `avatar.ts` n'est
  importé par aucun composant. **L'arbitrage visuel est encore entièrement
  gratuit.**
- **`server/` ne journalise rien** : zéro `console.` dans tout le dossier, les
  cinq chemins d'erreur sont des chaînes fixes. Reste à vérifier ce que
  journalise l'hébergeur — c'est hors du fichier.
- Le `slice(-20)` est revendiquable comme **mesure de minimisation**.

⚠️ Mais `figuresRegistry.ts:48` porte déjà Inanna, *« associée à l'amour et à
la guerre »*, avec son registre `aujourdHui` à `null` — **l'emplacement exact
où s'écrirait un registre érotique.** Le canon ne l'interdit pas ; il laisse la
place vide.

---

## 5 · Ce que le compte impose — conformité

⚠️ **Informatif, jamais juridique.** Les textes primaires n'ont **pas** pu
être lus : `eur-lex.europa.eu`, `cnil.fr`, `legifrance.gouv.fr`, `arcom.fr`,
`ofcom.org.uk` ne résolvent pas depuis cette session. Tout ce qui suit vient de
sources secondaires relayées par recherche. **Certitude moyenne**, et rien ici
ne remplace un avocat ou un DPO.

### 5.1 — L'article 9 s'applique, et pas seulement à l'érotisme

⟲ La v1 rangeait l'article 9 dans la seule lecture « érotique ». **Il se
déclenche par la mémoire persistante, sans aucune intention érotique.**

⭐ **L'article 9 qualifie la DONNÉE, pas le formulaire.** Il n'y a aucune
condition du type « l'utilisateur a coché une case », et sa portée couvre les
données **déduites**. Champ de saisie libre + ton de confidence = données de
l'article 9 **par construction**. *On ne choisit pas de ne pas traiter de
données sensibles ; on choisit seulement si on s'y prépare.*

### 5.2 — La liste, puisque le compte est décidé

| obligation | déclencheur |
|---|---|
| contrat de sous-traitance (art. 28) | dès que `/api/chat` tourne en production |
| information (art. 13) **nommant le destinataire** | idem |
| base légale (art. 6) **PLUS** consentement explicite (art. 9 §2 a) | contenu sensible |
| registre des traitements (art. 30), sécurité (art. 32) | le compte |
| **AIPD (art. 35)** | par **présomption** — données sensibles + usage innovant |
| **ePrivacy — art. 82 loi Informatique et Libertés** | ⭐ absent de la v1 : l'écriture en `localStorage` est du stockage sur terminal, donc consentement sauf stricte nécessité. **S'applique même en 100 % local.** |

⚠️ **Trois pièces à obtenir de Mistral avant de présenter son européanité
comme un avantage** : le DPA signé, l'endpoint UE confirmé (un endpoint US
existe), la liste des sous-traitants et la rétention. ⛔ **Le « Zero Data
Retention » n'est PAS le défaut** : il s'obtient sur demande motivée,
approuvée ou refusée à la discrétion du fournisseur.

### 5.3 — ⛔ La politique d'usage de Mistral : **INVÉRIFIABLE**

Point décisif, et honnêtement non tranché. `mistral.ai`, `docs.mistral.ai` et
`legal.mistral.ai` sont tous refusés par le proxy. Seule la recherche passe, et
elle a signalé ses extraits **tronqués avant la liste des restrictions de
contenu**.

Trois interdits semblent hors de discussion et valent pour **toutes** les
lectures : **CSAM (tolérance zéro)**, **images intimes non consenties**, et
**contournement des filtres de sécurité**.

Rien trouvé contre une compagne « proche » — mais rien ne l'autorise non plus :
zéro clause sur les compagnons virtuels. ⚠️ Pour un dossier de conformité, un
extrait d'index de recherche ne vaut rien : il faut une **réponse écrite du
support Mistral** sur ce cas d'usage précis.

À noter : `server/chat.ts:84-95` n'envoie **aucun `safe_prompt`**. C'est un
réglage à ajouter, pas à défaire.

### 5.4 — ⟲ Vérification d'âge : la v1 était imprécise là où ça décide

- **Le déclencheur est le contenu pornographique diffusé**, pas « selon le
  contenu » tout court. L'application de SREN à un chat textuel génératif est
  une **question ouverte** — aucune décision ARCOM trouvée. ⛔ L'inverse
  (« donc ça ne s'applique pas ») est tout aussi interdit : l'art. 227-24 du
  code pénal vise un « message » quel que soit le support, et précise depuis
  2020 qu'une simple déclaration d'âge ne suffit pas.
- ⟲ **« Plusieurs régimes européens » entretenait un flou.** Le DSA art. 28
  vise les « plateformes en ligne » (hébergement **et** diffusion au public) :
  un chat 1-à-1 n'en est probablement pas une.
- ⛔ **Le Royaume-Uni manquait, et c'est le régime le plus net** : l'Online
  Safety Act et l'exigence d'*highly effective age assurance* se déclenchent
  sur la **capacité** du service à produire du contenu pornographique, pas sur
  sa catégorie déclarée. ⭐ **« Monde entier » engage donc le dossier UK** —
  ou impose une géo-restriction assumée.
- ⭐ **Un garde-fou anti-pornographie efficace est l'argument de sortie de
  champ**, pas seulement une position éthique.
- Si une vérification devient nécessaire, le **double anonymat** est le seul
  schéma compatible avec la page confidentialité déjà publiée.

---

## 6 · Ce qui n'a jamais été mesuré — le prochain geste

⛔ **Aucune de ces questions ne se répond en lisant du code.** Elles exigent
que le réseau soit ouvert (§7).

1. **Combien de lieux Overpass rend-il réellement ?** Une requête pour une
   coordonnée bretonne et une coordonnée urbaine étrangère, comptée et datée.
   C'est le fondement de l'arbitrage « sortie » et il est aujourd'hui *estimé*.
2. **Combien de requêtes amont un parcours utilisateur émet-il ?** Le chiffre
   qui décide de l'échelle face à la limite de 1 req/s par application.
3. **Ce que l'ancien site mana.love sert aujourd'hui**, et ce qui doit survivre
   dans la nouvelle version.
4. **Les textes primaires** du §5, et la politique d'usage de Mistral.

---

## 7 · Les domaines à autoriser dans le réseau de la session

Réglages de l'environnement cloud → Edit → Network access → Allowed domains.

```
mana.love
gilletaurelien-art.github.io
legal.mistral.ai
docs.mistral.ai
eur-lex.europa.eu
www.cnil.fr
www.legifrance.gouv.fr
www.arcom.fr
www.ofcom.org.uk
operations.osmfoundation.org
overpass-api.de
nominatim.org
wiki.openstreetmap.org
```

---

## 8 · Ce qu'il reste à décider

Le compte est tranché (§1). Restent :

1. **La boucle calculée ou le catalogue ?** (§3.1) — le code a déjà répondu
   « on compose », mais zéro territoire existe.
2. **« Monde entier » : on lève les deux verrous de type, ou on assume une
   promesse régionale ?** (§3.3) INSEE et l'aveuglement non-latin sont de
   l'architecture, pas du contenu.
3. **L'économie de points : on la garde ?** (§4) ⭐ Cet arbitrage **précède**
   tous les autres, parce qu'il est déjà livré et qu'il contredit une promesse
   publiée.
4. **Le chemin de crise : livré avec la v1, ou on n'ouvre pas la confidence ?**
   (§4.2)
5. **Le corps** (§4.3) — gratuit aujourd'hui, et il déplace le dossier bien
   plus qu'un texte.
6. **Combien de territoires, lesquels, dans quel ordre, et qui les écrit ?**
7. **Géo-restriction, ou dossier UK ?** (§5.4)

Et trois réparations qui ne demandent **aucun arbitrage** : le test du
vouvoiement, la CI du garde d'origines côté `server/`, et les deux phrases
publiées du §4.1.

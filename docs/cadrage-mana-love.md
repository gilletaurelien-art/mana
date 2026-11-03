# CADRAGE — « sorties dans le monde entier » & « chat intime »

> **Ce document ne décide rien. Il nomme ce que chaque mot coûte**, pour que
> l'arbitrage se fasse avant le code et non après.
>
> Rédigé le 3/11/2026, à la demande du fondateur, avant toute ligne de code.
> Les deux promesses à cadrer sont les siennes, telles qu'énoncées :
> *« mana.love offre des sorties dans le monde entier »* et
> *« mana.love offre un module de chat intime »*.

---

## 0 · Pourquoi ce document vit dans le dépôt `mana` (et pas dans `mana.love`)

Parce que cette session n'a l'accès GitHub qu'en **lecture** sur
`gilletaurelien-art/mana.love`. Le cadrage se versionne tout de suite — la
leçon de `docs/chiffres-du-dossier.md` : *« un livrable destiné à un
rendez-vous n'est pas un fichier de travail »*. Il **déménagera** dans
`mana.love/docs/` dès que l'écriture y sera ouverte.

⚠️ **Deux choses que je n'ai PAS pu vérifier, et il faut le savoir en lisant.**

1. **Le site `mana.love` en ligne.** La politique réseau de l'environnement
   refuse `mana.love` et `gilletaurelien-art.github.io` (403 du proxy). Tout
   ce qui suit décrit le **code du dépôt**, jamais le site servi. Le
   fondateur dit que mana.love « existe déjà » **en ligne** : ce qui tourne
   là-bas n'est donc pas forcément ce dépôt, et §5 liste ce qu'il faut
   relever pour le savoir.
2. **Les politiques d'usage des tiers** (Mistral, Overpass, boutiques
   d'applications, processeurs de paiement). Elles changent, et §3 dit où
   regarder plutôt que d'affirmer de mémoire.

---

## 1 · L'état réel du code, mesuré

Relevé sur `gilletaurelien-art/mana.love`, branche **`main`**, 76 fichiers.

🔴 **La branche par défaut du dépôt est `vibe/mana-love-app-foundation-a324c7`,
périmée de 8 commits.** `main` en descend et ajoute le design V2 « Lune sur
l'océan », la fondation internationale (i18n), le ton éditorial et le
Panthéon. **Qui clone mana.love reçoit l'ancien code, sans aucun signal.**
⭐ C'est le même défaut muet que ce dépôt-ci traque partout : une vérité
recopiée en deux endroits dont un seul est à jour. À repointer sur `main`.

| ce qui existe | où | état |
|---|---|---|
| Conversation | `src/features/chat/`, `server/chat.ts` | proxy Mistral, clé côté serveur ; sans clé → mode démo annoncé |
| Exploration | `src/features/explore/`, `server/geo.ts` | Overpass + Nominatim, attribution ODbL |
| Panthéon / canon | `src/domain/canon.ts`, `figuresRegistry.ts` | quatre registres qui ne se mélangent pas |
| Progression | `src/domain/progression.ts` | registre idempotent, plafonds journaliers |
| Confidentialité | `src/features/privacy/` | suppression réelle des clés `mana.love.*` |
| Langues | `src/i18n/index.ts` | **`fr` et `en` seulement**, repli sur le français |

🔴 **En production, la conversation ne fonctionne pas.** Les routes `/api/*`
sont servies par un **plugin Vite** (`manaApiPlugin` dans `vite.config.ts`),
donc **en développement seulement**. Le déploiement est GitHub Pages —
statique. Le workflow l'écrit lui-même : *« GitHub Pages est statique : les
routes `/api/*` n'y existent pas ; l'app bascule honnêtement en mode démo »*.
Le README le liste en attente n° 4. **Aucun arbitrage de ce document n'est
livrable sans un runtime Node** qui réutilise `server/chat.ts` et
`server/geo.ts`.

⛔ **Et il y a une position éditoriale déjà écrite, qu'aucun des deux mots à
cadrer ne peut contourner en silence.** `src/features/privacy/PrivacyScreen.tsx`
affiche aujourd'hui, en toutes lettres :

> *« Nous ne concevons pas de mécaniques de dépendance, de culpabilisation ou
> de jalousie artificielle. »*
> *« Nous ne récompensons ni le temps d'écran, ni le volume de messages, ni la
> réouverture répétée de l'app. »*

Et `src/domain/systemPrompt.ts` la met en œuvre : vouvoiement par défaut
(*« le tutoiement ne s'obtient que si la personne le demande — jamais tu ne le
décides »*), *« jamais de jalousie, de culpabilisation ou de pression
artificielle »*, *« tu n'es pas un être surnaturel : tu es une IA »*.

⭐ **Le chat d'aujourd'hui est donc délibérément NON intime.** « Intime » n'est
pas un réglage à pousser : c'est un arbitrage **contre une promesse publiée**.
Soit on la révise explicitement, soit on définit « intime » d'une façon qui la
respecte — §3 montre qu'il existe une lecture qui la respecte, et deux qui ne
la respectent pas.

---

## 2 · « Sorties dans le monde entier »

### 2.1 — « Sortie » : trois objets différents, un seul existe vraiment

`src/domain/exploration.ts` porte déjà deux formes, et il en manque une
troisième :

| forme | type | état |
|---|---|---|
| **un lieu** | `Place` (`kind`, `location?`, `practical?`) | ✅ alimenté en réel par Overpass |
| **une sortie** | `Experience` (`durationMinutes`, `intensity`) | ⚠️ le type existe, les données sont **de démonstration** (`SAMPLE_EXPERIENCES`) |
| **un évènement daté** | — | ⛔ n'existe pas, et n'a **aucune source** |

⭐ La distinction tranche le projet. Un **lieu** se moissonne (OSM le donne).
Une **sortie** s'écrit (durée, intensité, meilleur moment : c'est de
l'éditorial). Un **évènement** se *source* — et sans source il faudrait
l'inventer, ce que la maison interdit : `canon.ts` pose déjà la ligne rouge
*« jamais inventer un lien historique pour enjoliver une balade »*.

**→ Arbitrage 1 : laquelle des trois promet-on ?**

### 2.2 — « Monde entier » : trois sens, trois coûts

| sens | aujourd'hui | ce qu'il faut |
|---|---|---|
| **technique** | Overpass couvre la planète, mais la requête est bornée à **5 000 m** (défaut 3 000) autour de la position | lever la borne, et un « où » saisissable — Nominatim le fait déjà |
| **éditorial** | le canon est breton + démonstration ; `ame` et les registres valent `null` = « à écrire » | écrire, région par région. Non automatisable |
| **linguistique** | **`fr` + `en`**, repli silencieux sur le français | chaque langue est un dictionnaire complet à tenir |

🔴 **Et une limite d'infrastructure, pas de code.** `server/geo.ts` interroge
`overpass-api.de` — un service **gratuit et partagé**, avec une politique
d'usage (cache de 10 min et User-Agent conforme sont déjà en place, et c'est
bien). « Des sorties dans le monde entier pour tout le monde » n'est pas un
volume qu'on prend sur un service communautaire.
⭐ **Ce dépôt-ci a déjà résolu ce problème exact** : le fond de carte de
mana.bzh est relayé par nous depuis OpenFreeMap, *« l'IP du promeneur ne sort
pas vers un tiers »*. La même réponse vaut ici : instance propre, ou offre
payante, avant l'échelle.

**→ Arbitrage 2 : lequel des trois sens annonce-t-on,** sachant que l'annoncer
en français à quelqu'un qui cherche à 5 km serait exactement la promesse que
ce dépôt refuse d'écrire ailleurs.

---

## 3 · « Chat intime »

Le mot porte **trois produits différents**. Ils ne diffèrent pas par le degré
mais par la nature : l'un est presque construit, l'un demande un serveur,
l'un demande un dossier de conformité.

### A. Intime = **confidentiel** — « ce que je dis ne va nulle part »

- **Déjà vrai à 80 %** : aucun compte, historique en `localStorage`,
  suppression réelle sur `/confidentialite`.
- **Reste à faire** : garantir que `server/chat.ts` ne **journalise** aucun
  message, et l'écrire. Le texte transite par l'API Mistral — donc la
  politique de rétention du fournisseur fait partie de la promesse, et doit
  être citée, pas supposée.
- **Coût** : faible. **Compatible avec la position publiée** — c'est même sa
  formulation la plus forte.

### B. Intime = **proche** — tutoiement, mémoire de ce qui compte pour moi

- **Demande** : une mémoire persistante → donc un **compte**, donc un
  **backend autoritaire** (le README le liste déjà en attente n° 3), donc des
  données de conversation **hors de l'appareil**.
- **Une échéance, pas une collision.** ⭐ La page confidentialité a été écrite
  en prévision de ce jour : *« Dans cette **première version**, tout reste sur
  votre appareil […] **tant qu'aucun backend n'est configuré** »*, et la note
  sur la suppression ajoute *« quand un backend sera en place, la suppression
  s'étendra aux données serveur »*. Rien à renier, donc — mais ces deux
  promesses **arrivent à terme** le jour du compte, et la suppression côté
  serveur doit être livrée **avec** lui, pas après.
- **Garde-fou à tenir** : une compagne qui se souvient est aussi celle qui
  peut manquer. C'est le mécanisme de dépendance que la maison s'interdit. Le
  prompt système devra l'interdire *explicitement* — pas de relance, pas de
  reproche d'absence, pas de rareté artificielle.
- **Coût** : moyen. **Révise la promesse publiée.**

### C. Intime = **érotique / sexuel**

Produit légitime pour un public adulte. Mais il déplace mana.love d'une
catégorie dans une autre, et ce qui suit n'est pas une opinion :

| obligation | pourquoi |
|---|---|
| **Vérification d'âge** | la loi française (SREN, 2024) et plusieurs régimes européens imposent une vérification robuste selon le contenu — pas une case « j'ai 18 ans » |
| **RGPD article 9** | la vie sexuelle et l'orientation sexuelle sont des **données sensibles** : consentement explicite, minimisation, et très probablement une **AIPD** (art. 35) |
| **Modération** | contenus illicites, mineurs, et le cas suicidaire/détresse — un chat intime les reçoit |
| **Politique du fournisseur de modèle** | ⚠️ **à vérifier avant tout code** : si l'usage de Mistral l'exclut, `/api/chat` tombe, et avec lui tout l'édifice |
| **Boutiques & paiement** | les boutiques d'applications restreignent le contenu sexuel, et les processeurs de paiement aussi. ⭐ **En PWA, la question des boutiques ne se pose pas** — c'est un argument réel pour rester web |

- **Coût** : élevé, et surtout **séquencé** : la conformité d'abord, le produit
  ensuite. **Révise la promesse publiée, et inverse le prompt système.**

**→ Arbitrage 3 : A, B ou C ?** Ce sont trois feuilles de route, pas trois
tailles de la même.

---

## 4 · Ce que je recommande

1. **Deux dépôts, deux applications.** `mana` est statique, sans backend, sans
   compte, et en fait une position publique ; `mana.love` a besoin d'un
   serveur et de clés. Les fusionner forcerait mana.bzh à renier sa promesse.
   ⛔ Et ne pas créer de **troisième** dépôt : `gilletaurelien-art/mana.love`
   existe et il est bon.
2. **Repointer la branche par défaut sur `main`** — un clic, et ça supprime un
   piège muet.
3. **Donner un serveur de production à `/api/*`** avant toute promesse
   nouvelle. Rien de ce document n'est livrable sans lui.
4. **Commencer « intime » par A (confidentiel).** C'est la seule lecture qui
   *renforce* ce qui est déjà écrit au lieu de le contredire, et elle est
   presque construite.
5. **Ne rien annoncer sur mana.bzh** avant que mana.love le fasse vraiment.
   Un lien vers une promesse non tenue abîme les deux sites.

---

## 5 · Ce qu'il me manque — et qui ne peut venir que du fondateur

Le site `mana.love` en ligne m'est inaccessible depuis cette session (403 du
proxy sur `mana.love` **et** `gilletaurelien-art.github.io`). Pour la suite,
trois relevés :

1. **Ce que `https://mana.love/` affiche aujourd'hui** — ce dépôt, autre
   chose, ou les « 4 533 pages » que le workflow de déploiement dit de ne pas
   percuter ? Le bloc Caddy de `mana` confirme que le domaine est partagé avec
   `mana.bzh` et `manafamily.org`, et que seul `host mana.bzh` l'en protège.
2. **Où ce site est hébergé**, et s'il exécute du Node — c'est la réponse au
   point 3 du §4. ⚠️ **Un indice dit qu'il existe peut-être déjà** :
   `scripts/check-origins.mjs` autorise `/api/chat` en le commentant
   *« proxy serveur → ask-mana / mana-chat »*. **Ces deux noms n'apparaissent
   nulle part ailleurs** dans le dépôt — aucun code ne les implémente. Soit
   c'est une intention, soit ces services tournent déjà hors du dépôt, et dans
   ce cas ils sont la pièce manquante du point 3.
3. **Les trois arbitrages** : §2.1, §2.2, §3.

⭐ Et si le site en ligne est une **autre** base de code que ce dépôt, c'est le
premier sujet, avant les deux mots à cadrer : on aurait deux sources de
vérité, et c'est le défaut que tout ce dépôt-ci passe son temps à chasser.

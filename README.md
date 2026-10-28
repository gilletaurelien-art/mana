# MANA.bzh

Promenades & découvertes en Bretagne : parcours hors ligne (PWA), GPS
et sécurité sur le littoral, audio-guide du patrimoine, export GPX —
avec **MANAradio**, la voix du territoire, au centre du site.

## Développement

React/TS + Vite, zéro dépendance UI, routeur maison.

```bash
npm install
npm run dev      # dev local
npm run build    # build dans site/
```

## Déploiement

Auto à chaque push sur `main` → https://gilletaurelien-art.github.io/mana/

- `vite.config.ts` : `base: "/mana/"` (obligatoire, sinon page blanche)
- Le hack liens profonds (`404.html = index.html`) se fait dans le
  workflow `.github/workflows/deploy.yml`, jamais en build local.
- Service worker : network-first sur le HTML (les mises à jour sont
  visibles au rechargement), cache-first sur les assets.

## Les tracés — d'où ils viennent

Les parcours de `src/walks.ts` sont **réels** : OpenStreetMap, via notre table
`public.sentiers_traces`, sous licence **ODbL** — attribution affichée sur la
carte et sur chaque fiche.

✅ **Quatre promenades de la presqu'île de Crozon.** Le 28/10 au matin il n'y
en avait AUCUNE d'affichable : les morceaux des sentiers étaient concaténés
sans remise en ordre, et les **132 tracés du Finistère échouaient tous** au
contrôle. Après réparation de la moisson, la presqu'île en porte **16**, dont
15 à **zéro** point répété.

⛔ **Ne jamais ajouter un tracé sans le passer à `verifierTrace()`.**
`src/walks.test.ts` l'exécute sur chaque promenade livrée, et `npm run build`
lance les tests : un tracé abîmé fait échouer le déploiement.

⭐ **Mais ce contrôle est un détecteur de fumée, pas une preuve.** L'invariant
qui tranche — **longueur = somme des ways** — n'existe qu'À LA MOISSON, là où
les chemins ont encore leur identité. Cette app n'a que la polyligne.

🔴 **Le seuil de saut a été retourné (150 → 600 m).** Un chemin porte
légitimement des segments droits jusqu'à ~308 m. À 150 m, le garde refusait
les tracés **réparés** et faisait échouer le déploiement sur de la bonne
donnée. ⭐ Un garde calibré sur des données malades prend la guérison pour une
panne. Et le seuil de points répétés reste **généreux à dessein** : un circuit
parfaitement recollé en porte 326 (aller-retour vers une pointe).

🔴 **LE NUMÉRO DE PORTION N'EST PAS UNE IDENTITÉ.** `source_ref` finit par
`#<n>`, et ce n vient du découpage, donc de la longueur, donc de l'état de la
moisson. La réparation a fait passer `12981381` de 5 à 10 portions : les
anciens `#4`/`#5` **existent toujours** et désignent un AUTRE tronçon.
**Choisir un tronçon par sa géométrie, jamais par son numéro** — et un lien
vers un slug disparu est tenu par un test qui LIT les sources.

## La carte — nos tuiles, et une liste blanche

Le fond vient de `https://mana.bzh/carte/`, relayé par nous depuis OpenFreeMap :
l'IP du promeneur ne sort pas vers un tiers.

⚠️ **L'origine du site est dans une liste blanche CORS côté serveur**
(`Caddyfile`, trois blocs `/carte/*`). `gilletaurelien-art.github.io` et
`http://localhost:517x` y ont été ajoutés le 28/10/2026. **Servie depuis une
autre origine, la carte reste blanche sans aucune erreur à l'écran** — seule
la console le dit.

⚠️ `maplibre-gl` est chargée **à la demande** (`lazy`) : importée normalement,
elle partait dans le bundle d'accueil — 1,29 Mo au premier écran pour une
carte que l'accueil n'affiche pas.

⚠️ `npm install` exige `--legacy-peer-deps` avec npm 10 (bug de résolution des
pairs optionnels de vitest). `.npmrc` le pose, pour que la CI fasse pareil.

## Charte « Terre & Lumière »

Source de vérité : manahome-app. Polices self-hostées (Marelle Bâton 2,
Rubik — OFL), palette encre/sable/or, système bulle. Budget CSS < 20 Ko,
zéro dépendance UI.

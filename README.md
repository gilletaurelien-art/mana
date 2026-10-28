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

## Les tracés — d'où ils viennent, et pourquoi il n'y en a que deux

Les parcours de `src/walks.ts` sont **réels** : OpenStreetMap, via notre table
`public.sentiers_traces` (moisson du 25/10/2026), sous licence **ODbL** —
l'attribution est affichée sur la carte et sur chaque fiche.

🔴 **Sur 6 554 tracés en base, 299 seulement sont géométriquement sains
(4,6 %).** Ailleurs, les morceaux du sentier sont recollés sans être remis
dans l'ordre : cordes droites de 400 m, coordonnées répétées. En Bretagne,
**deux** tracés passent le contrôle — ce sont ceux d'ici. En Finistère :
**aucun sur 132**, d'où l'absence de la presqu'île de Crozon.

⛔ **Ne jamais ajouter un tracé sans le passer à `verifierTrace()`.**
`src/walks.test.ts` l'exécute sur chaque promenade livrée, et `npm run build`
lance les tests avant de construire : un tracé abîmé fait échouer le
déploiement.

⭐ **Et ne pas se contenter de vérifier la LONGUEUR.** Le moissonneur coupe
déjà tout saut de plus de 500 m : les tracés abîmés sortent donc avec une
longueur parfaitement plausible et passent tout contrôle de distance. Le
verdict porte sur les **points exactement répétés** — un sentier parcouru dans
l'ordre ne repasse pas par la même coordonnée.

🔴 **Le seuil de saut a été RETOURNÉ le 28/10 au soir.** Il refusait au-delà
de 150 m ; mesure sur la donnée OSM brute : un chemin porte légitimement des
segments droits jusqu'à ~308 m (ligne droite en pleine lande). Le garde aurait
refusé des tracés **parfaits** dès l'arrivée de la moisson réparée — et, comme
il tourne dans `npm run build`, il aurait fait échouer le déploiement **sur de
la bonne donnée**. ⭐ Un garde calibré sur des données malades prend la
guérison pour une panne.

⏳ **Les deux tracés livrés sont encore imparfaits, et un test le dit** : issus
de la moisson du 25/10, ils portent 3,1 % et 5,1 % de points répétés, soit
~2,7 % de longueur fantôme sur le Cap Fréhel (260 m de cordes sur 9,5 km).
Quand le test « à resserrer après la remoisson » échouera, c'est que la donnée
réparée sera arrivée : resserrer alors le seuil vers 1 % et RETOURNER le test
plutôt que le supprimer.

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

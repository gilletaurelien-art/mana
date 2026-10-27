# MANA.bzh

La porte d'entrée de l'écosystème MANA en Bretagne : vitrine territoriale
bretonne vers [manahome.org](https://manahome.org/), [mana.love](https://mana.love/)
et [manafrance.org](https://manafrance.org/).

## Développement

React/TS + Vite, zéro dépendance UI, routeur maison (~15 lignes).

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

## Charte « Terre & Lumière »

Source de vérité : manahome-app. Polices self-hostées (Marelle Bâton 2,
Rubik — OFL), palette encre/sable/or, système bulle. Budget CSS < 20 Ko,
zéro dépendance UI.

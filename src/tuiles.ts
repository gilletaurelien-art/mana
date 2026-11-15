// QUELLES TUILES POUR CE CADRE — la part calculable de la carte du monde.
//
// ⭐ SÉPARÉ DE `CarteMonde.tsx` POUR POUVOIR L'ÉPROUVER. Le rendu WebGL est
//    l'affaire de maplibre ; ce qui peut être FAUX de notre côté, c'est
//    l'arithmétique des tuiles — et elle se teste sans navigateur, donc sans
//    dépendre d'un volet qui dessine.
// 🔴 Vécu le 14/11/2026 : le volet d'aperçu était masqué, `visibilityState`
//    valait « hidden », maplibre ne peignait pas, son événement `load` n'est
//    jamais arrivé et ZÉRO tuile n'a été demandée. L'écran était noir sans
//    qu'une seule ligne de ce fichier soit en cause. ⛔ Un banc qui fabrique
//    le symptôme interdit de conclure ; il n'interdit pas de vérifier
//    autrement.

/** Le zoom des tuiles produites par `scripts/sites-monde.mjs`. */
export const Z = 8;

/**
 * LE QUADRILLAGE DES SERVICES ET COMMERCES — plus fin, et pour une raison
 * MESURÉE, pas par goût.
 *
 * 🔴 15/11/2026. Le gisement des dix familles (commerces, restauration,
 *    services publics, écoles, santé…) compte **1 846 439 fiches**. Au
 *    quadrillage z8 partagé, elles tiennent dans **93 tuiles**, dont une à
 *    **208 439 fiches** : sous le plafond de 1 500, on n'en poserait que
 *    **109 400 — 6 %**.
 *
 * ⛔ ET L'ÉCRÊTAGE SE FAIT PAR ORDRE ALPHABÉTIQUE (`ORDER BY n`). Ce ne sont
 *    donc pas « quelques fiches en moins » : ce sont des VILLES ENTIÈRES qui
 *    disparaissent, sans que rien ne le dise. Pour les sites remarquables, où
 *    l'écrêtage touche 567 tuiles sur 11 717, le compromis se défend. Ici il
 *    serait majoritaire.
 *
 * ⭐ MESURÉ À QUATRE QUADRILLAGES AVANT DE CHOISIR :
 *
 *      z8      93 tuiles · médiane ~1 500 · max 208 439 →   109 400 posées (6 %)
 *      z10    952 tuiles · médiane  1 005 · max 149 121 →   910 293 posées (49 %)
 *      z11  3 411 tuiles · médiane    213 · max 100 611 → 1 285 318 posées (70 %)
 *      z12 12 783 tuiles · médiane     41 · max  37 101 → 1 500 953 posées (81 %)
 *
 *    z11 retenu : z12 gagne 11 points pour quatre fois plus de fichiers, et
 *    `TUILES_MAX` y rendrait le calque invisible jusqu'au zoom « quartier ».
 *
 * ⚠️ CONSÉQUENCE VOULUE, ET C'EST UNE BONNE NOUVELLE : à quadrillage plus fin,
 *    un même cadre demande plus de tuiles, donc `TUILES_MAX` refuse plus tôt.
 *    Les commerces n'apparaissent qu'au zoom « ville » — exactement le moment
 *    où on les cherche. Une carte de France couverte d'épingles de boulangerie
 *    ne servirait personne.
 */
export const Z_SERVICES = 11;
/** En deçà, on ne charge rien : le monde entier ferait 11 721 fichiers. */
export const ZOOM_MINIMAL = 7;
/** Au-delà, on refuse plutôt que d'inonder le réseau — et on le DIT. */
export const TUILES_MAX = 24;

export const xDe = (lon: number, z = Z) => Math.floor(((lon + 180) / 360) * 2 ** z);
export const yDe = (lat: number, z = Z) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

/**
 * COMBIEN DE SITES LE MONDE PORTE, pour pouvoir le DIRE au lieu de laisser
 * une carte vide sans explication.
 *
 * ⚠️ C'EST UNE VALEUR RELEVÉE, PAS CALCULÉE — et elle vieillira. Relevée le
 *    14/11/2026 sur les tuiles produites : 11 717 fichiers, 4 213 106 sites
 *    au gisement, 2 384 329 posés (le reste est écrêté dans 567 tuiles
 *    denses). ⛔ Une application statique ne peut pas la recompter : elle ne
 *    voit que les tuiles qu'elle a chargées. On l'écrit donc une fois, avec
 *    sa date, et on la RECOMPTE à chaque moisson plutôt que de la croire :
 *
 *      node -e 'const g=require("glob");…'  — ou plus simplement, le
 *      récapitulatif qu'affiche `node scripts/sites-monde.mjs` en fin de
 *      passage, qui dit exactement ces deux nombres.
 */
export const SITES_POSES = 2_384_329;

export type Cadre = { ouest: number; est: number; nord: number; sud: number };

/**
 * Les tuiles d'un cadre, ou le motif du refus.
 *
 * ⚠️ `trop` N'EST PAS UNE ERREUR : c'est une réponse. L'écran doit pouvoir
 *    dire « approchez encore » plutôt que rester vide sans raison — ce dépôt
 *    paie assez cher les écrans muets.
 */
export function tuilesDuCadre(
  c: Cadre, zoom: number, grille: number = Z,
): { etat: "ok"; tuiles: [number, number][] } | { etat: "loin" | "trop"; combien: number } {
  if (zoom < ZOOM_MINIMAL) return { etat: "loin", combien: 0 };
  /* 🔴 `grille` EXISTE PARCE QUE CE CALCUL IGNORAIT SON PROPRE PARAMÈTRE.
     `xDe`/`yDe` acceptent un zoom depuis toujours — personne ne le leur
     passait, et les trois calques étaient donc figés à z8 sans qu'aucune
     ligne ne le dise. ⚠️ Le défaut n'était pas le z8 (juste pour les sites) :
     c'était qu'on ne POUVAIT pas en sortir sans récrire la fonction.
     ⛔ Le défaut vaut `Z` : les calques sites et hébergements ne bougent pas,
        et un appelant qui oublie la grille retombe sur l'ancien comportement
        plutôt que sur un quadrillage surprise. */
  const x0 = xDe(c.ouest, grille), x1 = xDe(c.est, grille);
  const y0 = yDe(c.nord, grille), y1 = yDe(c.sud, grille);
  const combien = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (combien > TUILES_MAX || combien < 1) return { etat: "trop", combien };
  const tuiles: [number, number][] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) tuiles.push([x, y]);
  return { etat: "ok", tuiles };
}

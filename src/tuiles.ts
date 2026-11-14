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
  c: Cadre, zoom: number,
): { etat: "ok"; tuiles: [number, number][] } | { etat: "loin" | "trop"; combien: number } {
  if (zoom < ZOOM_MINIMAL) return { etat: "loin", combien: 0 };
  const x0 = xDe(c.ouest), x1 = xDe(c.est);
  const y0 = yDe(c.nord), y1 = yDe(c.sud);
  const combien = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (combien > TUILES_MAX || combien < 1) return { etat: "trop", combien };
  const tuiles: [number, number][] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) tuiles.push([x, y]);
  return { etat: "ok", tuiles };
}

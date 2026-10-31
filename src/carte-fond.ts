/**
 * LE FOND DE CARTE — une seule adresse, deux lecteurs.
 *
 * ⭐ `CarteReelle` (la fiche) et `CarteFondOT` (le jeu de cartes) chargent le
 *    MÊME style. Le recopier dans le second, c'est accepter qu'une des deux
 *    cartes pointe un jour sur un jeu de tuiles retiré pendant que l'autre va
 *    bien — et que personne ne le voie, puisqu'une carte muette ressemble à
 *    une carte qui charge.
 *
 * ⚠️ Le style est SERVI AVEC L'APP et non relayé : voir la longue note de
 *    `CarteReelle.tsx`. Les tuiles, elles, restent relayées par mana.bzh en
 *    URLs absolues — c'est ce qui empêche l'IP du promeneur de sortir.
 */
export const STYLE_CARTE = `${import.meta.env.BASE_URL}carte-style.json`;

/**
 * ⛔ L'ATTRIBUTION VOYAGE AVEC LA CARTE, PAS SEULEMENT AVEC LA PAGE. L'ODbL
 *    l'exige partout où la donnée s'affiche. `attributionControl: false` la
 *    retire de maplibre : c'est alors à l'écran de la porter, et c'est
 *    pourquoi elle est ici plutôt que recopiée dans chaque composant.
 */
export const ATTRIBUTION_OSM = "© OpenStreetMap — ODbL";

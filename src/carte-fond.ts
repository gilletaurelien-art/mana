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
 * LE FOND AÉRIEN — l'orthophotographie de l'IGN, relayée par nous.
 *
 * ⭐ DÉRIVÉ DU STYLE PLAN, pas écrit à côté : `scripts/carte-ortho.mjs` en
 *    reprend les sources et les 25 couches d'étiquettes, et n'ajoute que la
 *    couche raster, dessous. Quand le jeu de tuiles de la planète change
 *    d'horodatage, celui-ci suit par construction.
 * ⛔ Aucun remplissage n'est conservé : on aurait payé une photographie
 *    aérienne pour la cacher sous un dessin.
 */
export const STYLE_ORTHO = `${import.meta.env.BASE_URL}carte-ortho.json`;

export type Fond = "plan" | "ortho";
export const STYLES: Record<Fond, string> = { plan: STYLE_CARTE, ortho: STYLE_ORTHO };

/**
 * ⛔ L'ATTRIBUTION DÉPEND DU FOND AFFICHÉ, et c'est tout l'intérêt de la
 *    nommer ici. Créditer OpenStreetMap sous une photographie de l'IGN serait
 *    faux dans les deux sens : on citerait qui n'a rien fourni, et on
 *    tairait qui a fourni.
 */
export const ATTRIBUTION: Record<Fond, string> = {
  plan: "© OpenStreetMap — ODbL",
  ortho: "vue aérienne © IGN · étiquettes © OpenStreetMap, ODbL",
};

const CLEF = "mana.fond.v1";

/** ⚠️ `localStorage` LÈVE, il ne rend pas simplement vide (Safari privé). */
export function lireFond(): Fond {
  try { return localStorage.getItem(CLEF) === "ortho" ? "ortho" : "plan"; }
  catch { return "plan"; }
}
export function poserFond(f: Fond): void {
  try { localStorage.setItem(CLEF, f); } catch { /* la visite reste cohérente */ }
}

/**
 * ⛔ L'ATTRIBUTION VOYAGE AVEC LA CARTE, PAS SEULEMENT AVEC LA PAGE. L'ODbL
 *    l'exige partout où la donnée s'affiche. `attributionControl: false` la
 *    retire de maplibre : c'est alors à l'écran de la porter, et c'est
 *    pourquoi elle est ici plutôt que recopiée dans chaque composant.
 */
export const ATTRIBUTION_OSM = "© OpenStreetMap — ODbL";

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
/* ⭐ LE NOM DU FICHIER EST SÉPARÉ DE SON ADRESSE — 1/11. L'adresse dépend du
   préfixe de service (`/mana/` sur GitHub Pages, `/` sur mana.bzh) ; le NOM,
   lui, ne dépend de rien, et trois autres endroits en ont besoin tel quel :
   le bloc Caddy qui dit « ce fichier est à nous », le service worker qui le
   garde, et le routeur. ⚠️ Les exporter permet de ne pas les RECOPIER là-bas
   — un garde de ce dépôt refuse justement une seconde copie de cette
   adresse, et il avait raison de crier. */
export const NOM_STYLE_PLAN = "carte-style.json";
export const NOM_STYLE_ORTHO = "carte-ortho.json";

export const STYLE_CARTE = `${import.meta.env.BASE_URL}${NOM_STYLE_PLAN}`;

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
export const STYLE_ORTHO = `${import.meta.env.BASE_URL}${NOM_STYLE_ORTHO}`;

export type Fond = "plan" | "ortho";

/**
 * 🔴 LE NOM DE LA SOURCE QUI PORTE LE FOND — et c'est un garde, pas une
 *    commodité.
 *
 * Le compteur de tuiles acceptait N'IMPORTE QUELLE source. Mesuré en
 * développement, fond « plan » : zéro tuile vectorielle arrivée (la liste
 * blanche du relais ne connaît pas `localhost` pour `planet`), et le fond se
 * déclarait quand même prêt — il recouvrait la silhouette, qui est VRAIE, par
 * une carte vide, qui ne l'est pas.
 *
 * ⭐ « Des tuiles sont arrivées » ne veut rien dire si ce ne sont pas CELLES
 *    QUI PEIGNENT LE SOL. Un ombrage de relief ou un jeu de sprites suffisait
 *    à satisfaire la question mal posée.
 */
export const SOURCE_DE_BASE: Record<Fond, string> = {
  plan: "openmaptiles",
  ortho: "ortho",
};
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

/**
 * 🔴 LE PLAN EST LE DÉFAUT DEPUIS LE 12/11/2026 — décision du fondateur,
 *    « affichage de la carte par défaut = la vue plan ». Elle RENVERSE celle
 *    du 31/10, qui ouvrait sur la photographie aérienne.
 *
 * ⭐ L'ARGUMENT D'ALORS N'EST PAS DEVENU FAUX, et on le garde écrit : la
 *    photographie dit où l'on met les pieds — les haies, le sable, la lande.
 *    C'est la DEMANDE qui a changé, pas le raisonnement. Ce dépôt a déjà
 *    effacé une doctrine en la renversant ; on ne recommence pas. La vue
 *    aérienne reste à un geste, dans les réglages comme sur la carte.
 *
 * ⚠️ AUCUNE MIGRATION DE CLEF, ET C'EST MESURÉ PAR LA FORME DE LA LECTURE :
 *    on teste désormais `=== "ortho"`. Qui avait CHOISI la vue aérienne la
 *    garde ; qui avait choisi le plan la garde ; qui n'a jamais choisi passe
 *    au plan. Le renversement ne défait donc aucun choix explicite — c'est
 *    exactement ce qu'un défaut doit faire quand il change.
 *
 * ⚠️ `localStorage` LÈVE, il ne rend pas simplement vide (Safari privé) — et
 *    le repli doit alors être le DÉFAUT, pas l'autre valeur : sans ce soin,
 *    une partie des visiteurs aurait silencieusement l'autre fond, et
 *    personne ne saurait pourquoi la carte n'a pas la même tête chez eux.
 */
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

/**
 * LE ZOOM MAPLIBRE POUR UNE ÉCHELLE DONNÉE — 4/11/2026.
 *
 * 🔴 ÉCRITE PARCE QU'ELLE S'EST TROMPÉE D'UN FACTEUR DEUX. `Territoire2030`
 *    superpose un canvas (projection maison, échelle en mètres par pixel) et
 *    une carte maplibre qu'il recale à chaque image. Le zoom se calculait sur
 *    place avec la constante 156543,03392 — qui vaut `2πR / 256`, l'échelle
 *    du monde des tuiles de 256 px (Google, Leaflet, la plupart des
 *    calculateurs de « ground resolution » qu'on trouve en ligne). MapLibre
 *    GL rend en tuiles de 512 : le fond satellite sortait exactement deux
 *    fois trop grand.
 * ⭐ CE QUE ÇA COÛTAIT, MESURÉ le 4/11 sur les 593 sites nommés de l'emprise :
 *    89 px d'écart MOYEN entre la pastille dessinée et l'endroit où le clic
 *    la cherchait, 157 px au pire — pour une tolérance de 16 px. Après
 *    correction : 0,02 px de moyenne, 0,06 px au pire, aucun site hors
 *    tolérance.
 * ⚠️ ET L'ERREUR ÉTAIT INVISIBLE AU CENTRE. Une erreur d'ÉCHELLE laisse le
 *    point central exact et croît avec la distance à lui : la vérification
 *    faite plus tôt dans la journée (« l'anneau tombe sur la pastille »)
 *    avait eu lieu au milieu de l'écran, le seul endroit où ce défaut-là ne
 *    peut pas se voir. ⭐ Un contrôle qui réussit sur le seul point où le
 *    défaut est impossible endort mieux qu'un contrôle absent.
 *
 * @param metresParPixel l'échelle voulue, au sol
 * @param latitude là où cette échelle doit être vraie (Mercator étire vers
 *                 les pôles : une échelle n'a de sens qu'à une latitude)
 */
export const TUILE_MAPLIBRE_PX = 512;
export const RAYON_TERRE_M = 6378137;
export function zoomMaplibrePour(metresParPixel: number, latitude: number): number {
  const metresParPixelALEquateur = (2 * Math.PI * RAYON_TERRE_M) / TUILE_MAPLIBRE_PX;
  return Math.log2(
    (metresParPixelALEquateur * Math.cos((latitude * Math.PI) / 180)) / metresParPixel,
  );
}

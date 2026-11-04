/**
 * LE CADRAGE DE LA CARTE DESSINÉE — où tombe un point, et ce que montre le fond.
 *
 * 🔴 POURQUOI CE FICHIER EXISTE : LE CADRE SE MESURAIT SUR LE GRAPHE, LE
 *    CONTENU SUR L'EMPRISE — 4/11/2026.
 *
 *    `Territoire2030.tsx` relevait l'étendue de la vue en parcourant
 *    `graphe.n`, les 186 506 nœuds du réseau. Les PASTILLES, elles, sont
 *    filtrées sur `terr.emprise` (`sitesIci`). Deux référentiels pour une
 *    seule image, et aucun des deux ne se plaignait :
 *
 *    ⛔ 1. RIEN NE S'AFFICHAIT AVANT LE GRAPHE. Sans étendue, pas de
 *          projection ; sans projection, pas de recalage du fond satellite.
 *          L'inventaire des lieux (110 Ko, prêt en moins d'une seconde)
 *          attendait donc 2,2 Mo de réseau compressé — pour une carte qui
 *          n'a besoin du graphe QUE pour proposer des promenades.
 *    ⛔ 2. ET C'ÉTAIT UN PARCOURS PAR IMAGE. `dessiner()` tourne sur un
 *          `ResizeObserver` et à chaque geste : 186 506 itérations pour
 *          recalculer un rectangle qui ne bouge jamais.
 *
 * ⭐ L'EMPRISE DÉCLARÉE EST LE BON RÉFÉRENTIEL, et pas seulement parce
 *    qu'elle est connue d'avance. C'est EXACTEMENT la boîte sur laquelle le
 *    contenu est filtré : un site hors emprise n'est pas dans `sitesIci`,
 *    donc cadrer sur l'emprise ne peut pas laisser un site hors de l'image.
 *    Cadrer sur le graphe, si : il DÉBORDE l'emprise moissonnée de 1,5 km à
 *    l'est et 1,2 km au nord (relevé le 4/11 sur les deux fichiers), parce
 *    qu'un chemin coupé par la limite garde ses nœuds d'au-delà.
 * ⚠️ CONSÉQUENCE ASSUMÉE, MESURÉE : la vue est 3,8 % plus serrée qu'avant et
 *    décalée de ~6 px sur un téléphone. Rien ne sort du cadre — les sites
 *    sont dans l'emprise par construction — et le cadrage ne bouge plus
 *    quand la moisson est refaite.
 *
 * ⭐ ET C'EST TESTABLE, CE QUI N'ÉTAIT PAS LE CAS : la projection vivait dans
 *    une fermeture à l'intérieur d'un `useEffect`, derrière un canvas et un
 *    contexte WebGL. `cadrage.test.ts` croise maintenant `X`/`Y` avec leur
 *    inverse (`centreLon`/`centreLat`) — les deux étaient écrits à la main,
 *    l'un sous l'autre, sans que rien ne vérifie qu'ils se correspondent.
 */

/** mètres par degré de latitude */
export const R_LAT = 111_320;

/** [ouest, sud, est, nord] */
export type Emprise = readonly [number, number, number, number];

/**
 * Le zoom gagné à la main par-dessus le cadrage de départ.
 * `k` = facteur d'échelle, `px`/`py` = glissement en pixels.
 */
export interface Vue {
  k: number;
  px: number;
  py: number;
}

export interface Cadrage {
  /** longitude → pixel X dans la boîte */
  X: (lon: number) => number;
  /** latitude → pixel Y dans la boîte */
  Y: (lat: number) => number;
  /** la longitude au centre de la boîte — l'inverse de `X` en `W / 2` */
  centreLon: number;
  /** la latitude au centre de la boîte — l'inverse de `Y` en `H / 2` */
  centreLat: number;
  /** de quoi déduire le zoom du fond (voir `zoomMaplibrePour`) */
  metresParPixel: number;
  /** le cosinus de la latitude moyenne — un degré de longitude y vaut moins */
  kLon: number;
}

/**
 * Cadrer `emprise` dans une boîte de `W` × `H` pixels, vue à `vue`.
 *
 * ⭐ LA VUE S'APPLIQUE DANS LA PROJECTION, PAS EN `ctx.transform`. Une
 *    transformation du contexte mettrait aussi les TRAITS à l'échelle : à ×8,
 *    un chemin de 1 px deviendrait un ruban de 8 px et la carte se
 *    boucherait. Ici seules les POSITIONS bougent ; les épaisseurs, les
 *    pastilles et les étiquettes gardent leur taille — c'est ce qui fait
 *    qu'un zoom révèle du détail au lieu de grossir une image.
 */
export function cadrer(
  emprise: Emprise,
  W: number,
  H: number,
  vue: Vue,
  marge = 18,
): Cadrage {
  const [loMin, laMin, loMax, laMax] = emprise;
  const kLon = Math.cos((((laMin + laMax) / 2) * Math.PI) / 180);
  const larM = (loMax - loMin) * R_LAT * kLon;
  const hauM = (laMax - laMin) * R_LAT;
  const ech = Math.min((W - 2 * marge) / larM, (H - 2 * marge) / hauM);
  const dx = (W - larM * ech) / 2;
  const dy = (H - hauM * ech) / 2;
  const { k, px, py } = vue;
  const cxv = W / 2, cyv = H / 2;

  return {
    X: (lon) => cxv + ((dx + (lon - loMin) * R_LAT * kLon * ech) - cxv) * k + px,
    Y: (lat) => cyv + ((dy + (laMax - lat) * R_LAT * ech) - cyv) * k + py,
    /* ⭐ L'INVERSE DE X/Y AU CENTRE DU CADRE. `X`/`Y` sont affines en
       lon/lat ; résoudre `X(lon) = cxv` donne le lon du centre écran, et
       `Y(lat) = cyv` son lat. Pas d'approximation : ce sont les MÊMES
       coefficients que ceux qui placent le réseau et les sites. */
    centreLon: loMin + (cxv - px / k - dx) / (R_LAT * kLon * ech),
    centreLat: laMax - (cyv - py / k - dy) / (R_LAT * ech),
    metresParPixel: 1 / (ech * k),
    kLon,
  };
}

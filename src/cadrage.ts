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

/** La vue au repos : tout le territoire, rien de gagné à la main. */
export const VUE_REPOS: Vue = { k: 1, px: 0, py: 0 };

/** Le zoom ne descend jamais sous le territoire entier. */
export const ZOOM_MIN = 1;

/**
 * 🔴 LE PLAFOND EST PASSÉ DE 12 À 64 — 5/11/2026, et c'était LUI la vraie
 *    limite du recadrage, pas le calcul.
 *
 * `12` vivait dans `Territoire2030.tsx` et n'a jamais été discuté : il date
 * du canvas qui dessinait le réseau en traits, où douze fois le territoire
 * suffisait largement à lire un chemin vectoriel. Le fond est une
 * orthophotographie depuis le 3/11, et sa source IGN porte des tuiles
 * jusqu'au zoom 19.
 *
 * ⭐ MESURÉ SUR UN TÉLÉPHONE DE 375 px, et c'est ce qui tranche :
 *      k =  1 → 131,8 m/px — l'écran couvre 49,4 km (zoom maplibre 9,6)
 *      k = 12 →  11,0 m/px — 4,12 km             (13,2)
 *      k = 64 →   2,1 m/px — 0,77 km             (15,6)
 *    Pour « Menhirs de Kerziou » et ses trois promenades, le cadrage idéal
 *    demande **k = 24,3**. Au plafond de 12, les quatre points tenaient dans
 *    146 × 159 px — mieux que les 12 × 13 px du repos, mais moins de la
 *    moitié de l'écran, et la moitié du cadrage demandé restait coupée.
 * ⚠️ 64 et pas 128 : à 2,1 m/px on est au zoom maplibre 15,6, loin sous le 19
 *    de la source — donc jamais d'image étirée. Au-delà, on grossit surtout
 *    la possibilité de se perdre, et c'est le bouton « recadrer » qui
 *    paierait.
 * ⛔ IL VIT ICI ET PLUS DANS L'ÉCRAN parce que `vuePour` en a besoin aussi.
 *    Deux plafonds, l'un pour la main et l'autre pour le recadrage
 *    automatique, c'est la porte ouverte à un cadrage qui vise une vue que
 *    le pincement ne peut pas tenir.
 */
export const ZOOM_MAX = 64;

export interface Options {
  /** pixels gardés libres autour de ce qu'on cadre */ marge?: number;
  /**
   * 🔴 CE QUI EST RECOUVERT N'EST PAS DE LA PLACE — 5/11/2026.
   *
   * La carte occupe tout l'écran, mais l'encadré du lieu choisi en mange le
   * bas (trois propositions = ~45 % d'un téléphone) et la recherche le haut.
   * Cadrer « au centre de l'écran » posait donc les tracés derrière
   * l'encadré : relevé sur « Menhirs de Kerziou », deux pastilles sur trois
   * à la limite du bord supérieur de la boîte.
   * ⭐ C'est le défaut que le recadrage lui-même FABRIQUE : tant que la carte
   *    montrait tout le territoire, aucun cadrage ne visait quoi que ce soit,
   *    donc rien ne pouvait tomber derrière rien.
   */
  /** pixels recouverts en haut (la recherche) */ haut?: number;
  /** pixels recouverts en bas (l'encadré du lieu) */ bas?: number;
  /**
   * pixels recouverts à droite (la colonne de commandes)
   * ⚠️ Trouvé APRÈS `haut` et `bas`, en regardant l'écran : le premier
   *    tracé passait derrière les boutons de zoom. Trois bords sur quatre,
   *    et le quatrième n'a rien dessus — on ne pose pas `gauche` « au cas
   *    où » : un paramètre que personne n'emploie est un paramètre que
   *    personne ne vérifie.
   */
  droite?: number;
  /** le zoom ne descend pas sous ça — 1 = tout le territoire */ kMin?: number;
  /** ni au-dessus */ kMax?: number;
  /** on ne serre jamais plus qu'une boîte de cette taille, en mètres */ spanMinM?: number;
}

/**
 * QUELLE VUE MONTRE CES POINTS-LÀ.
 *
 * 🔴 ELLE EXISTE PARCE QUE CHERCHER UN LIEU NE RECADRAIT RIEN — 5/11/2026.
 *    On tapait « Menhirs de Kerziou », l'écran nommait le lieu, listait trois
 *    promenades avec leurs distances, et la carte restait sur tout le
 *    territoire : 45 km de large pour des tracés de 1 à 2 km. Les trois fils
 *    faisaient **trois pixels**. Tout était juste et rien ne se voyait.
 * ⭐ C'EST L'INVERSE DE `cadrer()`, ET C'EST POUR ÇA QUE LES DEUX VIVENT ICI.
 *    `cadrer()` demande « où tombe ce point ? » ; celle-ci demande « quelle
 *    vue fait tomber ces points DANS la boîte ? ». Écrire la seconde ailleurs
 *    qu'à côté de la première, c'est recopier une projection — le défaut que
 *    `proj.current` évite déjà pour le pointage, trente lignes plus haut dans
 *    l'écran.
 *
 * ⚠️ LE RÉSULTAT EST DÉJÀ LÉGAL : `k` est borné et le glissement serré comme
 *    le fait `serrer()` dans l'écran, pour que la fenêtre ne sorte jamais du
 *    cadre de départ. Rendre une vue qu'il faudrait corriger après coup
 *    rouvrirait la porte à deux règles de bornage qui divergent.
 * ⚠️ ET `spanMinM` N'EST PAS UN CONFORT. Sans lui, un seul point donne une
 *    boîte de taille nulle, donc un zoom infini — ramené à `kMax`, c'est-à-dire
 *    la vue la plus serrée possible sur un lieu dont on ne verrait plus
 *    l'entourage. Un cadrage doit montrer la chose ET ce qu'il y a autour.
 * 🔴 ET SA VALEUR A DÛ MONTER AVEC LE PLAFOND, le même soir. À 500 m elle
 *    suffisait tant que `kMax` valait 12 : le plafond bornait avant elle.
 *    Passé à 64, un lieu seul se retrouvait cadré sur 770 m — le menhir plein
 *    écran, sans la côte ni le hameau qui disent OÙ il est. ⭐ Deux bornes qui
 *    se recouvraient, dont une seule mordait : relever celle qui mord déplace
 *    le défaut sur l'autre, qui n'avait jamais été éprouvée. 1 200 m donne
 *    1,5 km d'écran sur un téléphone — on reconnaît l'endroit.
 */
export function vuePour(
  emprise: Emprise,
  points: readonly (readonly [number, number])[],
  W: number,
  H: number,
  { marge = 40, haut = 0, bas = 0, droite = 0,
    kMin = ZOOM_MIN, kMax = ZOOM_MAX, spanMinM = 1200 }: Options = {},
): Vue {
  if (points.length === 0) return VUE_REPOS;

  /* Les points, mesurés dans les pixels DU CADRE AU REPOS : c'est le repère
     dans lequel `k`, `px` et `py` s'expriment. */
  const base = cadrer(emprise, W, H, VUE_REPOS);
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const [lon, lat] of points) {
    const x = base.X(lon), y = base.Y(lat);
    if (x < xMin) xMin = x; if (x > xMax) xMax = x;
    if (y < yMin) yMin = y; if (y > yMax) yMax = y;
  }
  if (!Number.isFinite(xMin) || !Number.isFinite(yMin)) return VUE_REPOS;

  /* La boîte ne descend pas sous `spanMinM`, convertie en pixels du repos. */
  const minPx = spanMinM / base.metresParPixel;
  const etaler = (a: number, b: number): [number, number] => {
    const manque = minPx - (b - a);
    return manque > 0 ? [a - manque / 2, b + manque / 2] : [a, b];
  };
  [xMin, xMax] = etaler(xMin, xMax);
  [yMin, yMax] = etaler(yMin, yMax);

  /* La place VRAIMENT disponible : l'écran moins les marges, moins ce que
     les panneaux recouvrent. Et son centre n'est plus celui de l'écran. */
  const dispoX = Math.max(1, W - 2 * marge - droite);
  const dispoY = Math.max(1, H - 2 * marge - haut - bas);
  const k = Math.min(kMax, Math.max(kMin, Math.min(dispoX / (xMax - xMin), dispoY / (yMax - yMin))));

  /* Amener le centre de la boîte au centre de la place LIBRE : la projection
     vaut `cv + (p0 - cv) * k + p`, qu'on résout en `p` pour qu'elle rende la
     cible. Puis on serre, comme l'écran le fait après chaque geste. */
  const cxv = W / 2, cyv = H / 2;
  const cibleX = (W - droite) / 2;
  const cibleY = haut + (H - haut - bas) / 2;
  const serrer = (v: number, borne: number) => Math.min(borne, Math.max(-borne, v));
  return {
    k,
    px: serrer(cibleX - cxv - ((xMin + xMax) / 2 - cxv) * k, (W * (k - 1)) / 2),
    py: serrer(cibleY - cyv - ((yMin + yMax) / 2 - cyv) * k, (H * (k - 1)) / 2),
  };
}

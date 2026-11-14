// QUELS LIEUX PROPOSER SUR CE TERRITOIRE — et pourquoi ce n'est pas toujours
// l'inventaire.
//
// 🔴 CE MODULE NAÎT D'UN TROU MESURÉ LE 14/11/2026, LE LENDEMAIN DU JOUR OÙ
//    LE MULLERTHAL EST ENTRÉ DANS L'APP :
//
//        territoire   arêtes   lieux DANS le graphe   spots cliquables
//        presquile    16 210   495                    409
//        aulne        20 779   280                    280
//        mullerthal   15 970   335                    ZÉRO
//
//    Le Mullerthal a un graphe complet, 163 lieux nommés, et le compositeur
//    n'avait RIEN à proposer. Parce que les spots viennent de `lieux.json`,
//    qui est breton — emprise −4,82 → −4,00, soit 400 km à l'ouest. Quelqu'un
//    à Echternach arrivait sur un écran de choix vide, sans un mot.
//
// ⭐ ET LE DÉFAUT ÉTAIT UNE BONNE DÉCISION DEVENUE FAUSSE. `Composer.tsx` a
//    délibérément quitté `graphe.l` pour l'inventaire d'exécution le 2/11 :
//    l'accrochage à l'exécution met 330 lieux sur le réseau là où la moisson
//    n'en accrochait que 162 — le double. Ce choix était juste, et il reste
//    juste en Bretagne. Il supposait seulement, sans le dire, que
//    l'inventaire couvre le territoire affiché. Le premier territoire hors de
//    Bretagne a cassé l'hypothèse, pas la décision.
//
// ⛔ ET « LE SITE REMARQUABLE LE PLUS PROCHE » N'EST PAS LA RÉPONSE ICI. Au
//    Mullerthal, le plus proche que l'inventaire connaisse est en Bretagne.
//    Un repli « le plus proche » aurait rendu une réponse absurde avec
//    l'aplomb d'une réponse juste. Ce qu'il faut, c'est la source que le
//    territoire porte DÉJÀ : les lieux de son propre graphe.

import type { Graphe } from "./composition";
import type { Inventaire, Lieu } from "./lieux";
import { plat } from "./recherche";

export interface SourceDesLieux {
  /** les lieux proposables, déjà filtrés */
  lieux: Lieu[];
  /**
   * 🔴 LA LISTE ENTIÈRE — et elle n'est PAS `lieux`, pour une raison mesurée.
   *    Ce qu'on PROPOSE se choisit dans une liste : les lieux sans nom en
   *    sont écartés, sinon on offre douze « Plage ». Ce qu'on CROISE se
   *    compte sur le tracé : un lavoir sans nom reste un lavoir qu'on passe
   *    devant, et il se dit par le libellé de sa catégorie.
   * ⛔ Compter les rencontres sur la liste FILTRÉE sous-compterait — c'est
   *    exactement le défaut du 2/11 (1,47 annoncé contre 4,20 mesurés, et
   *    27 % de « 0 lieu » tous faux), que le garde de `navigation.test.ts`
   *    tient depuis. Deux usages, deux listes, un seul choix de source.
   */
  tous: Lieu[];
  libelles: Record<string, string>;
  /** ⭐ D'OÙ ILS VIENNENT, parce que l'écran doit pouvoir le dire. Servir une
   *  source de second rang sans le nommer, c'est le genre de silence que ce
   *  dépôt paie cher. */
  origine: "inventaire" | "graphe";
  /** ce que chaque source aurait offert — pour expliquer le choix */
  compte: { inventaire: number; graphe: number };
}

/**
 * CE QUI SE CHOISIT DANS UNE LISTE — la règle vivait en ligne dans
 * `Composer.tsx`, elle vit ici pour n'exister qu'une fois.
 *
 * ⛔ Les lieux SANS NOM ne se choisissent pas : une liste de douze « Plage »
 *    ne se choisit pas, et l'inventaire en porte 734.
 * 🔴 ET LE DRAPEAU `anonyme` NE COUVRE PAS TOUT — vu en production le 2/11 :
 *    la recherche proposait « Calvaire », un nom qui EST sa catégorie. Quand
 *    une donnée ne porte pas la distinction qu'on cherche, on ne la suppose
 *    pas : on en dérive une qu'on peut contrôler.
 */
export function choisissables(
  lieux: readonly Lieu[], libelles: Record<string, string>,
): Lieu[] {
  const vus = new Set<string>();
  return lieux.filter((l) => {
    if (!l.n) return false;
    if (plat(l.n) === plat(libelles[l.c] ?? l.c)) return false;
    if (vus.has(l.n)) return false;
    vus.add(l.n); return true;
  });
}

/** L'emprise d'un graphe : [ouest, sud, est, nord]. */
export function emprise(g: Graphe): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of g.n) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

/** Les lieux que le graphe porte lui-même, rendus sous la forme d'un `Lieu`.
 *  ⚠️ `anonyme` ⇒ `n: null` : `LieuAccroche.n` porte le LIBELLÉ de la
 *     catégorie quand le lieu n'a pas de nom, et le laisser tel quel ferait
 *     passer « Grotte » pour un toponyme. */
export function lieuxDuGraphe(g: Graphe): Lieu[] {
  return g.l.map((l, i) => ({
    c: l.c,
    n: l.anonyme ? null : l.n,
    g: l.g,
    // ⚠️ Pas d'identifiant OSM dans un graphe : on en fabrique un STABLE pour
    //    servir de clé React, et on le marque pour qu'il ne soit jamais pris
    //    pour une référence remontable à la source.
    osm: `g${g.territoire}:${i}`,
  }));
}

/**
 * LA SOURCE À PROPOSER, ET LE CHOIX EST MESURÉ, PAS DEVINÉ.
 *
 * ⭐ LA RÈGLE EST « CELLE QUI EN OFFRE LE PLUS DANS L'EMPRISE », et non
 *    « le graphe seulement si l'inventaire est vide ». Les deux règles donnent
 *    le MÊME résultat sur les trois territoires d'aujourd'hui (409/160,
 *    280/109, 0/156) — mais la seconde n'aurait rien dit d'un territoire à
 *    moitié couvert, où trois lieux d'inventaire auraient gagné contre cent
 *    soixante du graphe. On ne choisit pas une règle qui se taira au premier
 *    cas qu'on n'a pas encore.
 *
 * ⚠️ ET LE COMPTE SE FAIT DANS L'EMPRISE, LA SOURCE RENDUE NON. En Bretagne,
 *    l'inventaire entier est passé à l'accrochage d'exécution — y compris les
 *    lieux du territoire voisin, qui tombent légitimement sur le réseau
 *    d'ici. Restreindre la source à l'emprise réduirait la couverture bretonne
 *    sans raison : l'emprise sert à DÉCIDER, pas à élaguer.
 */
export function lieuxDuTerritoire(
  inventaire: Inventaire | null,
  graphe: Graphe | null,
  libellesDeSecours: Record<string, string>,
): SourceDesLieux | null {
  if (!graphe) {
    if (!inventaire) return null;
    const lieux = choisissables(inventaire.lieux, inventaire.libelles);
    return { lieux, tous: inventaire.lieux, libelles: inventaire.libelles,
             origine: "inventaire", compte: { inventaire: lieux.length, graphe: 0 } };
  }

  const [x0, y0, x1, y1] = emprise(graphe);
  const dedans = (inventaire?.lieux ?? []).filter(
    (l) => l.g[0] >= x0 && l.g[0] <= x1 && l.g[1] >= y0 && l.g[1] <= y1);
  const nInventaire = choisissables(dedans, inventaire?.libelles ?? {}).length;

  const tousDuGraphe = lieuxDuGraphe(graphe);
  const duGraphe = choisissables(tousDuGraphe, libellesDeSecours);
  const compte = { inventaire: nInventaire, graphe: duGraphe.length };

  if (inventaire && nInventaire >= duGraphe.length) {
    return { lieux: choisissables(inventaire.lieux, inventaire.libelles),
             tous: inventaire.lieux,
             libelles: inventaire.libelles, origine: "inventaire", compte };
  }
  // ⚠️ Les libellés du graphe sont ceux de l'écran (`LIBELLE`), pas ceux de
  //    l'inventaire : un graphe porte `source`, `chateau`, `chapelle`, que
  //    `inventaire.libelles` ne nomme pas. Mesuré : les douze catégories des
  //    trois graphes sont toutes couvertes par `LIBELLE`.
  return { lieux: duGraphe, tous: tousDuGraphe,
           libelles: libellesDeSecours, origine: "graphe", compte };
}

// Quel graphe charger, et pourquoi il y en a deux.
//
// ⭐ DEUX FICHIERS, CHARGÉS À LA DEMANDE. La communauté de communes fait
//    955 km² contre 517 pour la seule presqu'île. Un graphe unique pèserait
//    ~1,5 Mo gzip, et la promesse « ouvrez la fiche avant de partir »
//    deviendrait « ouvrez-la et attendez ». Personne ne compose une boucle à
//    Pont-de-Buis et au Cap de la Chèvre dans la même sortie.
//
// ⚠️ LES EMPRISES SE CHEVAUCHENT, ET CE N'EST PAS UNE NÉGLIGENCE. Sans
//    recouvrement, un chemin coupé par la frontière finirait en cul-de-sac
//    dans les DEUX fichiers — un mur invisible au milieu d'Argol. Les 4,5 km
//    communs font qu'on compose des deux côtés de la limite.
//    Ce qui reste impossible, et qui est le prix assumé du découpage :
//    composer une boucle qui TRAVERSE la frontière.

export interface Territoire {
  /** le nom du fichier servi, sans extension */ slug: string;
  nom: string;
  /** [ouest, sud, est, nord] — l'emprise moissonnée */
  emprise: [number, number, number, number];
}

export const TERRITOIRES: Territoire[] = [
  { slug: "presquile", nom: "Presqu'île de Crozon",
    emprise: [-4.6240, 48.1673, -4.2554, 48.3374] },
  { slug: "aulne", nom: "Aulne maritime",
    emprise: [-4.3200, 48.1673, -4.0210, 48.3520] },
];

/**
 * ⚠️ LA COUTURE EST AU MILIEU DU RECOUVREMENT, pas à son bord. Posée à
 *    −4,2554 (le bord est de la presqu'île), quelqu'un situé à −4,26 basculerait
 *    sur l'Aulne alors qu'il a tout le réseau de la presqu'île autour de lui.
 *    Au milieu, chacun garde le graphe où il est le mieux entouré.
 */
const COUTURE = -4.2877;

export const DEFAUT = TERRITOIRES[0];

/** Le territoire d'une position, ou `null` si elle est hors des deux. */
export function territoireDe(lon: number, lat: number): Territoire | null {
  const dedans = TERRITOIRES.filter(
    (t) => lon >= t.emprise[0] && lon <= t.emprise[2] && lat >= t.emprise[1] && lat <= t.emprise[3],
  );
  if (dedans.length === 0) return null;
  if (dedans.length === 1) return dedans[0];
  // dans le recouvrement : la couture tranche
  return lon < COUTURE ? TERRITOIRES[0] : TERRITOIRES[1];
}

/** L'URL du graphe d'un territoire, sous la base donnée. */
export const urlGraphe = (base: string, t: Territoire) => `${base}/${t.slug}.json`;

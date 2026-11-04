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
  /** ⭐ L'ARTICLE VIT AVEC LE NOM, PAS DANS LA PHRASE QUI L'EMPLOIE.
   *  « À la découverte de » + « Presqu'île de Crozon » donne « de Presqu'île
   *  de Crozon » — vu en production le 1/11. Et aucune règle automatique ne
   *  s'en sort : il faudrait « de la Presqu'île » mais « de l'Aulne », et
   *  demain un territoire masculin voudra « du ». ⛔ Deviner le genre d'un
   *  toponyme est une heuristique qui se trompe en silence. On l'écrit. */
  avecArticle: string;
  /** [ouest, sud, est, nord] — l'emprise moissonnée */
  emprise: [number, number, number, number];
}

export const TERRITOIRES: Territoire[] = [
  { slug: "presquile", nom: "Presqu'île de Crozon",
    avecArticle: "la presqu'île de Crozon",
    emprise: [-4.6240, 48.1673, -4.2554, 48.3374] },
  { slug: "aulne", nom: "Aulne maritime",
    avecArticle: "l'Aulne maritime",
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

/**
 * 🔴 TOUT LE TERRITOIRE MOISSONNÉ, PAR DÉFAUT — 4/11/2026, demande du
 * fondateur : plus de bascule à faire avant de voir « le reste ».
 *
 * ⚠️ CE N'EST PAS UN TROISIÈME GRAPHE : il n'existe pas de fichier
 *    `tout.json` — la moisson ne couvre QUE la presqu'île et l'Aulne
 *    maritime, pas le Finistère entier. `TOUT` désigne l'UNION des deux
 *    emprises moissonnées ; `Territoire2030.tsx` charge les deux fichiers et
 *    les fusionne en mémoire (voir `fusionnerGraphes`) plutôt que d'en
 *    attendre un troisième qui n'a jamais été produit.
 * ⭐ `slug: "tout"` ne sert PAS à `urlGraphe` — un seul appel ne suffit plus
 *    à charger ce territoire, le chargeur le sait et prend un autre chemin.
 */
export const TOUT: Territoire = {
  slug: "tout",
  nom: "Le territoire",
  avecArticle: "le territoire",
  emprise: [
    Math.min(...TERRITOIRES.map((t) => t.emprise[0])),
    Math.min(...TERRITOIRES.map((t) => t.emprise[1])),
    Math.max(...TERRITOIRES.map((t) => t.emprise[2])),
    Math.max(...TERRITOIRES.map((t) => t.emprise[3])),
  ],
};

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

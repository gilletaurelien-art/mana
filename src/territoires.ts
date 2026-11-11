// Quel graphe charger, et pourquoi il y en a deux.
//
// ⭐ DEUX FICHIERS, CHARGÉS À LA DEMANDE — et la raison n'est pas celle qui
//    était écrite ici.
//
// 🔴 « LA COMMUNAUTÉ DE COMMUNES FAIT 955 km² CONTRE 517 POUR LA SEULE
//    PRESQU'ÎLE » : les deux nombres sont justes et la phrase est fausse. Ce
//    sont les aires des RECTANGLES moissonnés, pas des territoires. Mesuré le
//    11/11/2026 sur `commune_contours` : CCPCAM fait **280 km²** (10 communes)
//    et la presqu'île **195 km²** (7 communes) ; les boîtes font 920 et 518.
//    ⭐ Une emprise n'est pas un territoire — le rectangle qui contient la
//    presqu'île contient aussi de la mer et le voisin. Le territoire était
//    annoncé 3,4 fois plus grand qu'il n'est.
//
// 🔴 ET « UN GRAPHE UNIQUE PÈSERAIT ~1,5 Mo GZIP » EST DÉMENTI PAR LA MESURE.
//    Produit le 11/11 sur l'union exacte des deux emprises, le fichier unique
//    pèse **1,92 Mo gzip / 1,24 Mo brotli** — contre 2,05 / 1,32 pour la
//    PAIRE. Il est donc plus LÉGER que les deux qu'il remplacerait, parce que
//    le recouvrement de 4,5 km n'est plus payé deux fois.
//
// ⭐ CE QUI RESTE VRAI, ET C'EST LA SEULE RAISON DE GARDER DEUX FICHIERS :
//    l'usage. Personne ne compose une boucle à Pont-de-Buis et au Cap de la
//    Chèvre dans la même sortie, et une emprise = un interlocuteur (un office
//    de tourisme, une intercommunalité). Le découpage est un choix de PRODUIT,
//    pas une contrainte de poids — et il vaut mieux le dire, sinon on le
//    défend avec un argument que la première mesure renverse.
//
// ⚠️ LES EMPRISES SE CHEVAUCHENT, ET CE N'EST PAS UNE NÉGLIGENCE. Sans
//    recouvrement, un chemin coupé par la frontière finirait en cul-de-sac
//    dans les DEUX fichiers — un mur invisible au milieu d'Argol. Les 4,5 km
//    communs font qu'on compose des deux côtés de la limite.
//
// 🔴 « CE QUI RESTE IMPOSSIBLE : COMPOSER UNE BOUCLE QUI TRAVERSE LA
//    FRONTIÈRE » — cette phrase vivait ici et elle est FAUSSE depuis le
//    4/11/2026. Elle décrivait un écran qui chargeait UN fichier ; `/carte`
//    les charge tous les deux et les SOUDE (`fusionnerGraphes`), donc le
//    réseau est continu d'un bout à l'autre du territoire.
// ⭐ Elle était juste le jour où on l'a écrite, et elle a survécu à sa cause
//    — exactement ce que la première règle de CLAUDE.md annonce. Pire : elle
//    énonçait la limite comme un « prix assumé », c'est-à-dire comme une
//    décision, ce qui décourage d'aller voir. Un inconvénient présenté comme
//    un choix ne se rouvre pas.
// ⚠️ CE QUI RESTE VRAI : les écrans qui ne chargent QU'UN fichier (voir
//    `territoireDe` plus bas) gardent la limite. Elle tient au CHARGEUR, pas
//    au découpage.

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

/**
 * D'OÙ L'ON PART, QUAND PLUSIEURS SOURCES LE DISENT — et c'est ce point qui
 * décide du graphe à télécharger (`territoireDe` ci-dessus).
 *
 * 🔴 CETTE FONCTION EXISTE PARCE QUE L'ORDRE A ÉTÉ FAUX PENDANT TROIS JOURS.
 *    `/promenades` initialisait sa position avec `lon`/`lat` OU le repli
 *    Crozon, en ignorant le lieu visé — alors que depuis l'arbitrage du
 *    2/11/2026 c'est le lieu visé qui est le point de DÉPART (« j'aime ce
 *    coin » d'abord, MANA propose où aller ensuite). Conséquence mesurée :
 *    197 des 624 sites nommés, soit 32 %, faisaient télécharger le graphe de
 *    la presqu'île pour un lieu de l'Aulne — et 129 d'entre eux affichaient
 *    en plus un refus FAUX (« Aucun chemin ne passe devant Ménez-Hom, le
 *    plus proche en reste à 956 m » : il passe à 0 m) avant de se réparer
 *    tout seul en retéléchargeant 4 Mo.
 *
 * ⭐ L'ORDRE EST LA RÈGLE, ET IL SE JUSTIFIE LIGNE À LIGNE :
 *    1. `mesuree` — la position du GPS, accordée par la personne. Qui est
 *       dehors part d'où il est, pas du menhir qu'il regarde sur l'écran.
 *    2. `visee` — le lieu repéré sur la carte. C'est le sens du 2/11.
 *    3. `repli` — Crozon, et seulement quand on ne sait rien.
 * ⛔ Elle SEEDE une position de départ, elle n'épingle rien : la position
 *    bouge ensuite librement, et le graphe la suit. Faire dépendre le
 *    territoire du lieu visé — qui n'est jamais remis à null — l'aurait figé
 *    pour toute la session.
 */
export function positionDeDepart(
  mesuree: [number, number] | null | undefined,
  visee: [number, number] | null | undefined,
  repli: [number, number],
): [number, number] {
  return mesuree ?? visee ?? repli;
}

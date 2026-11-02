import type { Lieu } from "./lieux";

/**
 * LES SITES QUE LE CHEMIN LONGE — ce que MANA sait et que la fiche ignore.
 *
 * ⛔ « À PROXIMITÉ » N'EST PAS « SUR LE CHEMIN ». Un lieu qui demande un
 *    détour annoncé comme étant sur le parcours envoie quelqu'un le chercher
 *    là où il n'est pas. Le seuil est donc SERRÉ et il est DIT à l'écran :
 *    150 m, soit deux minutes de marche, soit la largeur d'une plage.
 *
 * ⭐ C'EST LA SEULE LIGNE DE CES CARTES QUI NE VIENNE PAS DE L'OFFICE. Leur
 *    fiche donne la distance, la durée, le dénivelé ; elle ne dit pas que le
 *    circuit passe au pied d'un alignement de menhirs et de deux fontaines.
 *    L'inventaire, lui, le sait — c'est pour ça qu'il a été bâti.
 */
const R = 111_320;
const SEUIL_M = 150;

/**
 * Distance d'un point à un segment, en mètres, à la latitude locale — ET la
 * fraction `t` du segment où tombe la projection.
 *
 * ⭐ `t` ÉTAIT DÉJÀ CALCULÉ ET JETÉ, et son absence rendait fausse une promesse
 *    écrite juste à côté. Sans lui, un lieu est situé au DÉBUT du segment le
 *    plus proche : tous ceux qui partagent un segment reçoivent la même
 *    position, alors que la docstring de `rencontresLeLong` déclare
 *    explicitement que deux lieux « ne partagent pas une position ». Les ex
 *    aequo retombaient alors sur le tri amont — qui est celui de la PROXIMITÉ
 *    AU CHEMIN, exactement la faute que cette fonction existe pour corriger.
 */
function versSegment(
  p: [number, number], a: [number, number], b: [number, number],
): { m: number; t: number } {
  const k = Math.cos((a[1] * Math.PI) / 180);
  const px = (p[0] - a[0]) * k * R, py = (p[1] - a[1]) * R;
  const dx = (b[0] - a[0]) * k * R, dy = (b[1] - a[1]) * R;
  const L2 = dx * dx + dy * dy;
  const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / L2));
  return { m: Math.hypot(px - t * dx, py - t * dy), t };
}

/**
 * Rend les lieux NOMMÉS à moins de 150 m du tracé, les plus proches d'abord.
 *
 * ⚠️ UN PRÉ-FILTRE PAR BOÎTE, SINON C'EST 1 358 × 270 SEGMENTS À CHAQUE CARTE.
 *    La boîte est élargie du seuil : la rogner au tracé écarterait un lieu
 *    situé à 100 m à l'extérieur, qui est précisément un lieu qu'on cherche.
 */
export function lieuxProches(
  trace: [number, number][],
  lieux: Lieu[],
  max = 4,
): { l: Lieu; m: number }[] {
  return proches(trace, lieux, max).map(({ l, m }) => ({ l, m }));
}

/**
 * LES MÊMES, DANS L'ORDRE DE MARCHE — avec leur position le long du tracé.
 *
 * 🔴 CE QUI A IMPOSÉ CETTE FONCTION, LE 2/11, EST UN SOUS-COMPTAGE DE DEUX
 *    TIERS SUR LA SEULE CHOSE QUE MANA APPORTE. L'écran lisait les lieux que
 *    la MOISSON avait accrochés à une arête au moment de la construction du
 *    graphe — 24 % des lieux nommés. Mesuré : **1,47** lieu annoncé par
 *    promenade contre **4,20** réellement à moins de 150 m du tracé, et
 *    **27 % des promenades annonçaient « 0 lieu »** alors qu'AUCUNE n'en avait
 *    vraiment zéro.
 *
 * ⭐ Le bon instrument était là depuis le début : il mesure sur le TRACÉ,
 *    contre l'inventaire ENTIER, au seuil que ce fichier porte déjà. Il
 *    manquait seulement l'ORDRE — et l'ordre est ce qui rend la liste
 *    honnête, parce qu'une liste intitulée « ce que vous croiserez » mais
 *    triée par proximité au chemin est un mensonge qui ne se signale jamais :
 *    il se vérifie en marchant.
 *
 * ⚠️ `ordre` EST UNE FRACTION DU PARCOURS, pas un rang — la position du lieu
 *    PROJETÉ sur le tracé, cumul du segment plus la part parcourue dessus.
 * ⚠️ ET DEUX LIEUX PEUVENT LÉGITIMEMENT LA PARTAGER : de part et d'autre du
 *    chemin, ou groupés autour d'un même point, ils sont au même endroit DE LA
 *    MARCHE. Mesuré le 2/11 : 20 % des paires voisines sont ex aequo, et
 *    c'est juste.
 *    ⭐ Cette ligne disait le contraire — « ils ne partagent pas une
 *       position » — et elle avait raison contre le CODE de l'époque, qui
 *       situait chaque lieu au DÉBUT de son segment : les ex aequo y étaient
 *       une quantification, pas un fait. La promesse était écrite, le calcul
 *       ne la tenait pas, et c'est la promesse qu'on a crue. Une fois le
 *       calcul juste, c'est la promesse qui devient fausse : un ex aequo
 *       n'est plus un défaut, c'est une information.
 */
export function rencontresLeLong(
  trace: [number, number][],
  lieux: readonly Lieu[],
  max = 12,
): { l: Lieu; m: number; ordre: number }[] {
  const trouves = proches(trace, lieux as Lieu[], max);
  if (!trouves.length) return [];
  /* Les longueurs cumulées, une fois pour tous les lieux. */
  const cumul: number[] = [0];
  for (let i = 1; i < trace.length; i++) {
    const k = Math.cos((trace[i - 1][1] * Math.PI) / 180);
    cumul.push(cumul[i - 1] + Math.hypot(
      (trace[i][0] - trace[i - 1][0]) * k * R, (trace[i][1] - trace[i - 1][1]) * R));
  }
  const total = Math.max(cumul[cumul.length - 1], 1);
  return trouves
    /* La position VRAIE : le cumul jusqu'au début du segment, PLUS la part de
       ce segment parcourue avant d'arriver au droit du lieu. */
    .map(({ l, m, i, t }) => ({
      l, m, ordre: (cumul[i] + t * (cumul[i + 1] - cumul[i])) / total,
    }))
    .sort((a, b) => a.ordre - b.ordre);
}

/** Le cœur commun : l'écart ET le segment qui le réalise.
 *  ⚠️ `i` est l'indice du point de DÉBUT du segment le plus proche — c'est ce
 *     qui permet de situer le lieu le long de la marche. Le laisser tomber
 *     obligerait à refaire la boucle ailleurs, et deux parcours du même tracé
 *     divergeraient le jour où l'un des deux change de seuil. */
function proches(
  trace: [number, number][],
  lieux: Lieu[],
  max: number,
): { l: Lieu; m: number; i: number; t: number }[] {
  if (trace.length < 2) return [];
  let loMin = Infinity, loMax = -Infinity, laMin = Infinity, laMax = -Infinity;
  for (const [lo, la] of trace) {
    if (lo < loMin) loMin = lo; if (lo > loMax) loMax = lo;
    if (la < laMin) laMin = la; if (la > laMax) laMax = la;
  }
  const dLa = SEUIL_M / R;
  const dLo = dLa / Math.cos(((laMin + laMax) / 2 * Math.PI) / 180);
  loMin -= dLo; loMax += dLo; laMin -= dLa; laMax += dLa;

  const trouves: { l: Lieu; m: number; i: number; t: number }[] = [];
  for (const l of lieux) {
    // ⛔ Les lieux SANS NOM ne sont pas cités : « Fortification » sous un
    //    circuit n'apprend rien, et il y en a 734 dans l'inventaire.
    if (!l.n) continue;
    const [lo, la] = l.g;
    if (lo < loMin || lo > loMax || la < laMin || la > laMax) continue;
    let d = Infinity, oui = 0, part = 0;
    for (let i = 1; i < trace.length; i++) {
      const x = versSegment(l.g, trace[i - 1], trace[i]);
      if (x.m < d) { d = x.m; oui = i - 1; part = x.t; }
      /* ⚠️ LE COURT-CIRCUIT GARDE LE SEGMENT QUI A RÉALISÉ LE MINIMUM, pas le
         suivant : on sort APRÈS avoir enregistré, jamais avant. */
      if (d <= 1) break;
    }
    if (d <= SEUIL_M) trouves.push({ l, m: Math.round(d), i: oui, t: part });
  }
  trouves.sort((a, b) => a.m - b.m);
  /* ⚠️ UN NOM NE SE CITE QU'UNE FOIS. « Chemins de l'écrivain » est un même
     parcours d'œuvres relevé en plusieurs objets OSM : le tracé en longe deux,
     et la ligne annonçait deux fois la même chose. ⭐ On compte des SUJETS ici,
     pas des objets — l'inverse exact de la règle de l'inventaire, où deux
     étiquettes sur un même fort ne font qu'un lieu. */
  const vus = new Set<string>();
  return trouves.filter((t) => !vus.has(t.l.n!) && vus.add(t.l.n!)).slice(0, max);
}

export const SEUIL_PROCHES = SEUIL_M;

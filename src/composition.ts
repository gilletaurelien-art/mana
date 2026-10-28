// Composer une promenade — une boucle de longueur voulue, depuis où l'on est.
//
// ⛔ CE FICHIER S'APPELLE `composition.ts`, PAS `composer.ts`, ET C'EST UN
//    GARDE. `Composer.tsx` vit à côté : deux fichiers qui ne diffèrent que par
//    la CASSE se résolvent au hasard sur un système insensible à la casse
//    (macOS par défaut), et le build casse ailleurs que sur la machine qui l'a
//    écrit — jamais sur celle-là. ⭐ TROISIÈME exemplaire du même piège dans
//    l'écosystème en vingt-quatre heures : `pros.ts`/`Pros.tsx` dans
//    manahome-app, `promenades.ts`/`Promenades.tsx` ici, puis celui-ci.
//    Connaître un piège ne protège pas d'y tomber. Seuls protègent un nom qui
//    le rend impossible, et un TEST qui le refuse — voir composition.test.ts,
//    « aucun fichier de src/ ne diffère d'un autre par la seule casse ».
//
// ⭐ POURQUOI CE CALCUL VIT DANS LE NAVIGATEUR, ET PAS SUR UN SERVEUR.
//    La propriété qu'on protège n'est pas « aucun serveur » : c'est **aucun
//    appel qui reçoive quelque chose de quelqu'un**. Un service de routage
//    reçoit la position GPS d'une personne qui est dehors, à cet instant —
//    la même classe de défaut que les quatre fonctions publiques qui
//    rendaient des adresses de domicile, fermées le 28/10/2026.
//    Ici la position ne quitte jamais le téléphone. Il n'y a rien à appeler.
//
// ⭐ ET CE N'EST PAS UN MOTEUR DE ROUTAGE PORTÉ. Un Dijkstra sur le graphe
//    d'un territoire — 13 265 arêtes pour toute la presqu'île de Crozon — est
//    une affaire de quelques centaines de lignes, pas de WebAssembly. Le
//    moteur continental serait l'outil d'un autre problème.

export interface Graphe {
  genere: string;
  territoire: string;
  attribution: string;
  /** nœuds : [lon, lat] */
  n: [number, number][];
  /** arêtes : [nœudA, nœudB, m, agrément, points, dist. mer, dénivelé, marée]
   *  ⚠️ La distance à la mer est STOCKÉE en plus d'être fondue dans
   *  l'agrément : sans elle, impossible de VÉRIFIER que le bonus littoral
   *  change le parcours, ni de dire au promeneur « au bord de mer sur 2 km ».
   *  `null` au-delà de 2 km — et absente sur un graphe bâti sans littoral.
   *  Le dénivelé est celui du sens a→b ; `marée` vaut 1 sur un passage qui
   *  dépend de l'heure de la mer. */
  a: [number, number, number, number, number[],
      (number | null)?, (number | null)?, (0 | 1)?][];
  /** lieux : accrochés à une arête, avec leur fraction le long d'elle */
  l: LieuAccroche[];
}

export interface LieuAccroche {
  /** index de l'arête */ a: number;
  /** ⚠️ CLÉ D'ORDRE le long de l'arête, JAMAIS une distance */ f: number;
  /** catégorie */ c: string;
  /** nom, ou le libellé de la catégorie s'il est anonyme */ n: string;
  anonyme?: boolean;
  /** [lon, lat] */ g: [number, number];
  /** écart au chemin, en mètres — pour le build, pas pour l'écran */ d: number;
}

export interface Boucle {
  aretes: number[];
  metres: number;
  agrement: number;
  partRepetee: number;
  /** mètres parcourus à moins de 60 m du trait de côte */
  bordDeMer: number;
  /** dénivelé POSITIF cumulé, en mètres — la descente ne compte pas */
  montee: number;
  /** distance à plat équivalente, montée comprise (règle de Naismith) */
  ressentie: number;
  /** quotient isopérimétrique : 1 = cercle, 0 = aller-retour aplati */
  etalement: number;
  /** mètres de passage dépendant de la marée — 0 si la boucle n'en a aucun */
  marees: number;
  /** les points du parcours, dans l'ordre de marche */
  contour: [number, number][];
  lieux: LieuVu[];
  score: number;
}

/** À moins de ça, on marche VRAIMENT au bord — mesuré : 11 % du réseau. */
export const BORD_DE_MER_M = 60;

/**
 * ⭐ LE DÉNIVELÉ N'EST PAS UN DÉSAGRÉMENT, C'EST DE L'EFFORT — et c'est ce qui
 *    décide où il agit. On pourrait croire qu'une côte raide rend une
 *    promenade moins plaisante : c'est faux, le point de vue est en haut.
 *    Ce que la montée change vraiment, c'est le TEMPS. Elle n'a donc rien à
 *    faire dans l'agrément : elle vit dans la durée, et elle raccourcit la
 *    boucle quand le terrain monte — ce qui est exactement ce qu'on veut
 *    quand quelqu'un dit « j'ai deux heures ».
 *
 * ⚠️ RÈGLE DE NAISMITH, ET C'EST UNE CONVENTION, PAS UN RELEVÉ : une heure de
 *    marche à plat vaut 3 km ; une heure de montée vaut 600 m de dénivelé.
 *    Donc **un mètre de montée coûte cinq mètres de plat**. Elle ignore la
 *    descente (qui fatigue pourtant) et la condition physique de chacun. On
 *    l'affiche comme une estimation, jamais comme une promesse.
 */
export const COUT_MONTEE = 5;

/** Distance « à plat équivalente » : c'est elle qui tient le budget de temps. */
export function distanceRessentie(metres: number, montee: number): number {
  return metres + COUT_MONTEE * montee;
}

/**
 * ⭐ ON DÉTECTE LA MARÉE, ON N'EN ANNONCE PAS L'HEURE. La doctrine du produit
 *    le dit depuis le début : « marées et météo, renvoi systématique vers les
 *    sources officielles, aucune donnée simulée ». Prédire une marée demande
 *    un modèle harmonique ou les données du SHOM ; inventer une prédiction
 *    serait pire que se taire — quelqu'un s'y fierait.
 *
 * ⛔ ET ON N'ÉVITE PAS CES CHEMINS. À marée basse, un estran est souvent le
 *    plus beau morceau de la promenade. Les écarter appauvrirait le produit
 *    pour s'épargner un avertissement. On avertit ; le marcheur décide.
 *
 * Mesuré sur Crozon : 30 arêtes, 1,9 km, 0,2 % du réseau — rare, et ce sont
 * exactement les endroits où l'on se fait piéger.
 */
export const SOURCE_MAREES = "https://maree.shom.fr/";

/**
 * 🔴 UNE BOUCLE PEUT NE RIEN RÉPÉTER ET RESTER UN ALLER-RETOUR. Mesuré sur
 *    Crozon : deux boucles de 8,9 km, toutes deux à 0 % d'arêtes répétées,
 *    l'une étalée à 0,53, l'autre aplatie à 0,14. Partir et revenir par deux
 *    chemins parallèles distants de cinquante mètres ne répète aucune arête —
 *    et donne pourtant l'impression de refaire le trajet.
 *    ⭐ Le compteur de répétition ne voit pas ce défaut : il faut une mesure
 *       de FORME, pas de recouvrement.
 *
 * Quotient isopérimétrique : `4πA / P²`. Vaut 1 pour un cercle et tend vers 0
 * quand la boucle s'aplatit. Relevé réel sur 14 boucles de Crozon : de 0,083
 * à 0,542 — il discrimine, et il est DÉCORRÉLÉ de la part répétée.
 *
 * ⚠️ Une boucle qui se croise (en huit) voit ses deux lobes se compenser
 *    partiellement dans l'aire : elle paraît moins étalée qu'elle ne l'est.
 *    C'est rare, et ça penche du bon côté — on ne promet jamais mieux que ce
 *    qu'on a.
 */
export function etalementDe(contour: [number, number][], perimetre: number): number {
  if (contour.length < 3 || perimetre <= 0) return 0;
  // projection locale : à cette latitude et sur quelques kilomètres, l'erreur
  // est négligeable devant ce que la mesure sert à distinguer.
  const kx = Math.cos((contour[0][1] * Math.PI) / 180) * 111320;
  const ky = 111320;
  let deux = 0;
  for (let i = 0; i < contour.length; i++) {
    const p = contour[i], q = contour[(i + 1) % contour.length];
    deux += p[0] * kx * (q[1] * ky) - q[0] * kx * (p[1] * ky);
  }
  return (4 * Math.PI * Math.abs(deux / 2)) / (perimetre * perimetre);
}

/**
 * ⭐ ON NOMME LA FORME, ON NE CACHE PAS L'ALLER-RETOUR. Si le terrain n'offre
 *    qu'un aller-retour — une pointe, un cul-de-sac côtier — on le dit. Ce
 *    qu'on affiche dit ce qu'on promet : annoncer « boucle » pour un
 *    aller-retour est un mensonge qui se vérifie en marchant.
 */
export function formeDeLaBoucle(etalement: number): "ample" | "boucle" | "aller-retour" {
  if (etalement >= 0.35) return "ample";
  if (etalement >= 0.15) return "boucle";
  return "aller-retour";
}

export interface LieuVu {
  categorie: string;
  nom: string;
  anonyme: boolean;
  position: [number, number];
  /** ⚠️ CLÉ D'ORDRE sur la boucle entière, de 0 au départ à 1 au retour.
   *  Jamais une distance : l'écart métrique d'une fraction calculée en degrés
   *  atteint 258 m sur 12 km (mesuré le 28/10), mais l'ORDRE est exact. */
  ordre: number;
}

export interface Index {
  adj: Map<number, [number, number][]>;   // nœud → [arête, voisin]
  lieuxParArete: Map<number, LieuAccroche[]>;
}

export function indexer(g: Graphe): Index {
  const adj = new Map<number, [number, number][]>();
  const pousser = (n: number, v: [number, number]) => {
    const l = adj.get(n);
    if (l) l.push(v); else adj.set(n, [v]);
  };
  g.a.forEach(([a, b], i) => {
    pousser(a, [i, b]);
    pousser(b, [i, a]);
  });
  const lieuxParArete = new Map<number, LieuAccroche[]>();
  for (const L of g.l ?? []) {
    const l = lieuxParArete.get(L.a);
    if (l) l.push(L); else lieuxParArete.set(L.a, [L]);
  }
  return { adj, lieuxParArete };
}

const R = 6371000;
export function metres(p: [number, number], q: [number, number]): number {
  const la1 = (p[1] * Math.PI) / 180, la2 = (q[1] * Math.PI) / 180;
  const dLa = la2 - la1, dLo = ((q[0] - p[0]) * Math.PI) / 180;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * 🔴 ON NE CHERCHE QUE PARMI LES NŒUDS QUI PORTENT UNE ARÊTE, ET C'EST UN
 *    CORRECTIF, PAS UNE OPTIMISATION.
 *
 * Le graphe stocke **64 028 points** mais seuls **10 601** sont des jonctions :
 * les autres ne servent qu'à dessiner la courbe d'une arête. Chercher parmi
 * tous rendait un point sans aucune arête — et la composition rendait ZÉRO
 * boucle, en silence.
 *
 * Mesuré le 28/10 : depuis Morgat, le bourg le plus fréquenté de la presqu'île,
 * le point le plus proche était à 262 m, portait 0 arête, et sa « composante
 * connexe » faisait 1 nœud. Quatre durées essayées, quatre fois rien.
 * ⭐ Le bourg de Crozon tombait sur une jonction PAR CHANCE : le défaut se
 *    cachait dans le régime que je ne regardais pas.
 */
export function noeudLePlusProche(g: Graphe, ix: Index, lon: number, lat: number): number {
  let best = -1, bd = Infinity;
  for (const i of ix.adj.keys()) {
    const d = metres(g.n[i], [lon, lat]);
    if (d < bd) { bd = d; best = i; }
  }
  // ⚠️ Un graphe sans aucune arête n'a pas de départ : on le dit par -1
  //    plutôt que de rendre 0, qui serait un nœud comme un autre.
  return best;
}

/**
 * ⚠️ `+40` AU DÉNOMINATEUR, ET CE N'EST PAS UN RÉGLAGE : sans lui une arête
 *    d'agrément 0 coûte l'infini et le graphe se disloque en îlots. Une
 *    départementale est désagréable, elle n'est pas interdite — ce qui est
 *    vraiment interdit a été ÉCARTÉ à la construction, jamais pénalisé ici.
 *
 * ⭐ Et malgré le Dijkstra, ceci n'est pas un plus court chemin : le coût est
 *    la longueur DIVISÉE par l'agrément. Un sentier côtier de 300 m coûte
 *    moins cher qu'une départementale de 200 m. On minimise de la peine.
 */
function cout(m: number, agrement: number, lieux: number, penalite: number): number {
  // ⚠️ Le bonus plafonne à 3 lieux : sans plafond, une arête de bourg qui
  //    porte huit calvaires devient gratuite et aspire tous les parcours.
  return (m / (agrement + 40 + 55 * Math.min(lieux, 3))) * penalite;
}

/** Tas binaire minimal — `Array.sort` à chaque extraction coûte 20× plus. */
class Tas {
  private d: [number, number][] = [];
  get taille() { return this.d.length; }
  pousser(cle: number, val: number) {
    this.d.push([cle, val]);
    let i = this.d.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.d[p][0] <= this.d[i][0]) break;
      [this.d[p], this.d[i]] = [this.d[i], this.d[p]]; i = p;
    }
  }
  tirer(): [number, number] | undefined {
    if (!this.d.length) return undefined;
    const haut = this.d[0], dernier = this.d.pop()!;
    if (this.d.length) {
      this.d[0] = dernier;
      let i = 0;
      for (;;) {
        const g = 2 * i + 1, dr = g + 1;
        let m = i;
        if (g < this.d.length && this.d[g][0] < this.d[m][0]) m = g;
        if (dr < this.d.length && this.d[dr][0] < this.d[m][0]) m = dr;
        if (m === i) break;
        [this.d[m], this.d[i]] = [this.d[i], this.d[m]]; i = m;
      }
    }
    return haut;
  }
}

function dijkstra(
  g: Graphe, ix: Index, source: number,
  penalisees: Set<number> | null, plafondM: number
) {
  const dist = new Map<number, number>([[source, 0]]);
  const lon = new Map<number, number>([[source, 0]]);
  const prec = new Map<number, [number, number]>();
  const tas = new Tas();
  tas.pousser(0, source);
  for (;;) {
    const t = tas.tirer();
    if (!t) break;
    const [d, n] = t;
    if (d > (dist.get(n) ?? Infinity) + 1e-9) continue;
    for (const [ei, suiv] of ix.adj.get(n) ?? []) {
      const ar = g.a[ei];
      const nl = (lon.get(n) ?? 0) + ar[2];
      if (nl > plafondM) continue;
      const nd = d + cout(ar[2], ar[3], ix.lieuxParArete.get(ei)?.length ?? 0,
                          penalisees?.has(ei) ? 14 : 1);
      if (nd < (dist.get(suiv) ?? Infinity)) {
        dist.set(suiv, nd); lon.set(suiv, nl); prec.set(suiv, [ei, n]);
        tas.pousser(nd, suiv);
      }
    }
  }
  return { lon, prec };
}

function remonter(prec: Map<number, [number, number]>, source: number, cible: number) {
  const chemin: number[] = [];
  let n = cible;
  while (n !== source) {
    const p = prec.get(n);
    if (!p) return null;
    chemin.push(p[0]); n = p[1];
  }
  return chemin.reverse();
}

/**
 * 🔴 LE POINT LOINTAIN EST UN LIEU, PAS UN NŒUD AU HASARD — et c'est une
 *    mesure qui l'impose, pas un goût. À 4,5 km à pied du centre de Crozon,
 *    32 lieux sont atteignables, mais ils ne vivent que sur **36 arêtes sur
 *    2 791** (1,3 %). Une boucle tirée au hasard n'en croise presque jamais,
 *    et un simple bonus d'arête n'y change rien : il faut viser.
 *    ⭐ Le lieu n'est pas la récompense du parcours, c'est son PRÉTEXTE.
 *
 * ⛔ NI TSP, NI MARCHE ALÉATOIRE. Le TSP enchaîne des plus courts chemins —
 *    le syndrome de la départementale. La marche aléatoire pondérée par
 *    l'agrément n'a aucune mémoire de direction : mesurée le 28/10, elle
 *    rendait des boucles portant **44 à 122 arêtes répétées**. Elle erre
 *    localement au lieu de s'éloigner puis de revenir.
 */
export function composer(
  g: Graphe, ix: Index, depart: number, cibleM: number,
  { candidats = 8, graine = 1 } = {}
): Boucle[] {
  const demi = cibleM / 2;
  const { lon: lonAller, prec: precAller } = dijkstra(g, ix, depart, null, cibleM * 0.68);

  // 🔴 ON VISE L'ARÊTE, PAS LE NŒUD — et c'est un test qui l'a imposé le
  //    28/10. Viser le nœud au bout de l'arête porteuse ne garantit RIEN :
  //    le parcours peut arriver à ce nœud et repartir ailleurs. Il passe
  //    alors À CÔTÉ du lieu, pas DEVANT — l'exact contraire de la règle
  //    produit « si c'est listé, on passe devant ».
  //    ⭐ On construit donc la boucle en TROIS morceaux : aller jusqu'au
  //       premier bout, TRAVERSER l'arête porteuse, revenir depuis l'autre
  //       bout. La traversée est une donnée de la construction, pas un espoir.
  const parLieu: [number, number, number][] = [];   // [arête, entrée, sortie]
  for (const [ei, lieux] of ix.lieuxParArete) {
    if (!lieux.length) continue;
    const [x, y] = [g.a[ei][0], g.a[ei][1]];
    const lx = lonAller.get(x), ly = lonAller.get(y);
    // on entre par le bout le plus proche, on ressort par l'autre
    const paires: [number, number, number | undefined][] = [[x, y, lx], [y, x, ly]];
    for (const [entree, sortie, L] of paires) {
      if (L !== undefined && L >= demi * 0.72 && L <= demi * 1.12) {
        parLieu.push([ei, entree, sortie]);
        break;
      }
    }
  }
  // 🔴 LA COURONNE NUE N'EST PAS UN REPLI « SI AUCUN LIEU N'EST VISIBLE »,
  //    C'EST UN REPLI « SI VISER UN LIEU N'A RIEN DONNÉ ». La nuance a été
  //    trouvée par un test le 28/10 : des lieux existaient à bonne distance,
  //    aucune boucle valide n'en sortait, et le compositeur rendait le VIDE.
  //    ⭐ Une dépendance absente doit DÉGRADER, pas éteindre — et c'est vrai
  //       aussi d'une dépendance PRÉSENTE qui n'aboutit pas.
  const couronneNue: number[] = [];
  for (const [n, L] of lonAller) {
    if (L >= demi * 0.85 && L <= demi * 1.1) couronneNue.push(n);
  }

  // Mélange déterministe : une même position rend la même proposition, ce qui
  // permet de la partager par un lien et de la retrouver.
  let s = graine >>> 0 || 1;
  const alea = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const melanger = (t: number[]) => {
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(alea() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
  };

  const vues = new Set<string>();
  const boucles: Boucle[] = [];
  // On vise les lieux d'abord ; la couronne nue ne sert que si rien n'en sort.
  const melangerT = (t: [number, number, number][]) => {
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(alea() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
  };
  const tentatives: [number | null, number, number][][] = [
    melangerT([...parLieu]),
    melanger([...couronneNue]).map((n) => [null, n, n] as [null, number, number]),
  ];
  for (const cibles of tentatives) {
   if (boucles.length) break;
   for (const [areteLieu, entree, sortie] of cibles.slice(0, candidats * 5)) {
    const versEntree = remonter(precAller, depart, entree);
    if (!versEntree) continue;
    // La traversée de l'arête porteuse est INSÉRÉE : on passe devant.
    const aller = areteLieu === null ? versEntree : [...versEntree, areteLieu];
    const loin = sortie;
    // ⚠️ PLAFOND SUR LE RETOUR AUSSI. Sans lui, le Dijkstra explore les
    //    13 265 arêtes à chaque candidat : 12 secondes mesurées le 28/10.
    const { prec: precRetour } = dijkstra(g, ix, loin, new Set(aller), cibleM * 0.85);
    const retour = remonter(precRetour, loin, depart);
    if (!retour) continue;

    const total = [...aller, ...retour];
    const m = total.reduce((t, e) => t + g.a[e][2], 0);
    // ⚠️ Pré-filtre large : la vraie borne porte sur la distance RESSENTIE,
    //    qu'on ne connaît qu'après avoir compté la montée. Sans ce garde-fou
    //    lâche, on calculerait le dénivelé de boucles manifestement hors sujet.
    if (m < cibleM * 0.45 || m > cibleM * 1.15) continue;

    const uniques = [...new Set(total)].sort((x, y) => x - y);
    const cle = uniques.join(",");
    if (vues.has(cle)) continue;

    const compte = new Map<number, number>();
    for (const e of total) compte.set(e, (compte.get(e) ?? 0) + 1);
    const mRepetee = total.reduce((t, e) => t + (compte.get(e)! > 1 ? g.a[e][2] : 0), 0);
    const partRepetee = mRepetee / Math.max(m, 1);
    const agrement = total.reduce((t, e) => t + g.a[e][3] * g.a[e][2], 0) / Math.max(m, 1);
    const bordDeMer = uniques.reduce((t, e) => {
      const d = g.a[e][5];
      return t + (d != null && d <= BORD_DE_MER_M ? g.a[e][2] : 0);
    }, 0);
    // ⚠️ LA MONTÉE SE COMPTE DANS LE SENS DE MARCHE. Une arête prise à
    //    l'envers descend ; sommer des valeurs absolues doublerait le
    //    dénivelé d'une boucle, qui monte et redescend toujours autant.
    let montee = 0;
    let nMarche = depart;
    const contour: [number, number][] = [];
    for (const e of total) {
      const ar = g.a[e];
      const aLEndroit = ar[0] === nMarche;
      const dz = ar[6];
      if (dz != null) montee += Math.max(0, aLEndroit ? dz : -dz);
      const suite = aLEndroit ? ar[4] : [...ar[4]].reverse();
      for (const pt of suite) contour.push(g.n[pt]);
      nMarche = aLEndroit ? ar[1] : ar[0];
    }
    const ressentie = distanceRessentie(m, montee);
    const etalement = etalementDe(contour, m);
    const marees = uniques.reduce((t, e) => t + (g.a[e][7] === 1 ? g.a[e][2] : 0), 0);

    // ⭐ ON SÉLECTIONNE PAR PRIORITÉ, ON AFFICHE DANS L'ORDRE DE MARCHE.
    //    Deux étapes, jamais confondues. Une liste intitulée « ce que vous
    //    croiserez » mais triée par proximité au chemin est un mensonge
    //    discret : il ne se signale jamais, il se vérifie en marchant.
    //    (Vécu le 27/10 : le menhir annoncé en tête se croisait au km 10,7
    //    sur 12, et la batterie reléguée en 5ᵉ était le point de départ.)
    const vusLieux = new Map<string, LieuVu>();
    let parcouru = 0;
    let nAvant = depart;
    for (const e of total) {
      const ar = g.a[e];
      // sens de traversée : l'arête peut être prise dans un sens ou l'autre
      const aLEndroit = ar[0] === nAvant;
      for (const L of ix.lieuxParArete.get(e) ?? []) {
        const cle = `${L.c}|${L.n}`;
        if (vusLieux.has(cle)) continue;   // on garde la PREMIÈRE rencontre
        const f = aLEndroit ? L.f : 1 - L.f;
        vusLieux.set(cle, {
          categorie: L.c, nom: L.n, anonyme: !!L.anonyme, position: L.g,
          ordre: (parcouru + f * ar[2]) / Math.max(m, 1),
        });
      }
      parcouru += ar[2];
      nAvant = aLEndroit ? ar[1] : ar[0];
    }
    if (ressentie < cibleM * 0.8 || ressentie > cibleM * 1.15) continue;
    vues.add(cle);
    boucles.push({
      aretes: total, metres: m, agrement, partRepetee, bordDeMer, montee, ressentie,
      etalement, contour, marees,
      lieux: [...vusLieux.values()].sort((x, y) => x.ordre - y.ordre),
      score: agrement + 14 * vusLieux.size
             - 220 * Math.abs(ressentie - cibleM) / cibleM
             - 200 * partRepetee,
    });
    if (boucles.length >= candidats) break;
   }
  }
  return boucles.sort((a, b) => b.score - a.score);
}

/** La géométrie à dessiner : un trait par arête, jamais une ligne unique. */
export function traits(g: Graphe, b: Boucle): [number, number][][] {
  return b.aretes.map((e) => g.a[e][4].map((p) => g.n[p]));
}

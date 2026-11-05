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
   *  dépend de l'heure de la mer.
   *
   *  🔴 LA CASE 8 EXISTE PARCE QUE LE dz NE SUFFIT PAS — mesuré le 29/10 côté
   *  pipeline : sur la boucle de l'Arrée, la montée réelle le long de la
   *  géométrie vaut 242 m quand la somme des dz d'arêtes n'en rend que 137.
   *  Le net ignore chaque bosse INTÉRIEURE à l'arête — 43 % de la montée
   *  perdus sur le chiffre que la personne lit pour décider de partir.
   *  `montée a→b` est la grimpe cumulée en marchant l'arête à l'endroit ;
   *  dans l'autre sens elle vaut EXACTEMENT `montée − dz` (ce qui se descend
   *  à l'aller moins le net est ce qui se grimpe au retour). Vérifié en
   *  force brute sur les 36 769 arêtes posées : zéro écart. */
  a: [number, number, number, number, number[],
      (number | null)?, (number | null)?, (0 | 1)?, (number | null)?][];
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

/**
 * CE QUI SE MESURE DE N'IMPORTE QUEL PARCOURS — une suite d'arêtes marchée
 * depuis un nœud, qu'elle se referme ou non.
 *
 * ⭐ LA BOUCLE N'EST PLUS LA SEULE FORME DE PROMENADE (2/11, arbitrage du
 *    fondateur) : on va d'un lieu à un autre, et la boucle devient l'option.
 *    Tout ce qui se compte — les mètres, la montée dans le sens de marche, le
 *    bord de mer, les lieux dans l'ordre où on les croise — se compte
 *    identiquement dans les deux cas. Ce qui ne se compte pas pareil, c'est
 *    ce qui PARLE de fermeture : il vit sur `Boucle`, pas ici.
 */
export interface Parcours {
  aretes: number[];
  metres: number;
  agrement: number;
  /** part des mètres parcourus deux fois ou plus */
  partRepetee: number;
  /** mètres parcourus à moins de 60 m du trait de côte */
  bordDeMer: number;
  /** dénivelé POSITIF cumulé, en mètres — la descente ne compte pas */
  montee: number;
  /** distance à plat équivalente, montée comprise (règle de Naismith) */
  ressentie: number;
  /** mètres de passage dépendant de la marée — 0 s'il n'en a aucun */
  marees: number;
  /** les points du parcours, dans l'ordre de marche */
  contour: [number, number][];
  lieux: LieuVu[];
}

export interface Boucle extends Parcours {
  /** quotient isopérimétrique : 1 = cercle, 0 = aller-retour aplati
   *  ⛔ N'A DE SENS QUE FERMÉ : il compare une aire à un périmètre. */
  etalement: number;
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

/**
 * ⭐ `interdites` RETIRE L'ARÊTE DE LA CARTE D'ADJACENCE — elle ne la pénalise
 *    pas. Le Dijkstra sait pénaliser (× 14 sur un passage déjà emprunté), mais
 *    une pénalité est une PRÉFÉRENCE : elle se franchit dès que le reste coûte
 *    plus cher. Une interdiction par arrêté municipal n'est pas une
 *    préférence. Absente de l'adjacence, l'arête est hors d'atteinte du
 *    calcul — il n'y a aucun réglage qui puisse la rouvrir par accident.
 *    ⚠️ Conséquence assumée : si les fermetures coupent la presqu'île en deux,
 *    la composition rendra moins de boucles, ou aucune. C'est le bon sens de
 *    l'erreur — on préfère ne rien proposer que proposer une falaise fermée.
 */
export function indexer(g: Graphe, interdites?: ReadonlySet<number>): Index {
  const adj = new Map<number, [number, number][]>();
  const pousser = (n: number, v: [number, number]) => {
    const l = adj.get(n);
    if (l) l.push(v); else adj.set(n, [v]);
  };
  g.a.forEach(([a, b], i) => {
    if (interdites?.has(i)) return;
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

/**
 * La composante connexe de `depart` atteint-elle `seuil` nœuds ?
 *
 * ⭐ ON MESURE LA CONNEXITÉ, PAS LE DEGRÉ — et c'est une distinction qui m'a
 *    coûté une fausse conclusion le 30/10. À Postolonnec, après fermeture du
 *    GR34, la jonction la plus proche garde UNE arête : par le degré, elle a
 *    l'air saine. Sa composante tombe pourtant de 9 670 nœuds à 2. Un nœud de
 *    degré 1 au bout d'un moignon détaché est indiscernable, par le degré
 *    seul, d'un nœud de degré 1 au bord d'un réseau entier.
 *
 * ⚠️ Parcours BORNÉ : on s'arrête dès que le seuil est atteint. Sans borne, la
 *    question « suis-je isolé ? » coûterait un parcours des 64 028 nœuds à
 *    chaque composition.
 */
export function composanteAtteint(ix: Index, depart: number, seuil: number): boolean {
  if (depart < 0) return false;
  const vus = new Set<number>([depart]);
  const pile = [depart];
  while (pile.length) {
    if (vus.size >= seuil) return true;
    const n = pile.pop()!;
    for (const [, v] of ix.adj.get(n) ?? []) {
      if (!vus.has(v)) { vus.add(v); pile.push(v); }
    }
  }
  return vus.size >= seuil;
}

const R = 6371000;
/* ⚠️ `readonly` DES DEUX CÔTÉS : la fonction ne fait que LIRE, et la refuser
   à un tuple immuable obligeait l'appelant à écrire un `as [number, number]`
   — c'est-à-dire à mentir au vérificateur pour contourner une promesse trop
   étroite. Un paramètre en lecture seule accepte aussi les tuples mutables ;
   aucun appelant existant ne change. */
export function metres(p: readonly [number, number], q: readonly [number, number]): number {
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
 * MESURER UN PARCOURS — les mètres, la montée, le bord de mer, la marée, et
 * les lieux dans l'ordre où on les croise.
 *
 * ⭐ PURE, ET C'EST TOUT L'OBJET. Ce calcul vivait dans la boucle de
 *    sélection de `composer()` : pour l'éprouver il fallait composer une
 *    boucle entière, donc disposer d'un graphe, d'un départ et d'une cible
 *    cohérents. Ici une suite d'arêtes suffit, et une mutation du sens de
 *    marche tombe sur un carré de quatre nœuds.
 *
 * ⚠️ `depart` N'EST PAS DÉCORATIF : il donne le SENS. La même suite d'arêtes
 *    parcourue à l'envers n'a pas la même montée ni le même ordre de lieux.
 *    C'est le nœud d'où l'on part, pas le premier bout de la première arête.
 */
export function mesurer(
  g: Graphe, ix: Index, aretes: number[], depart: number,
): Parcours {
  const m = aretes.reduce((t, e) => t + g.a[e][2], 0);
  /* ⚠️ DÉDOUBLONNÉ POUR LE BORD DE MER ET LA MARÉE, PAS POUR LES MÈTRES.
     Marcher deux fois la même arête littorale ne met pas deux fois la mer à
     côté de soi — mais ça fait bien deux fois les mètres. */
  const uniques = [...new Set(aretes)];
  const compte = new Map<number, number>();
  for (const e of aretes) compte.set(e, (compte.get(e) ?? 0) + 1);
  const mRepetee = aretes.reduce((t, e) => t + (compte.get(e)! > 1 ? g.a[e][2] : 0), 0);
  const agrement = aretes.reduce((t, e) => t + g.a[e][3] * g.a[e][2], 0) / Math.max(m, 1);
  const bordDeMer = uniques.reduce((t, e) => {
    const d = g.a[e][5];
    return t + (d != null && d <= BORD_DE_MER_M ? g.a[e][2] : 0);
  }, 0);
  const marees = uniques.reduce((t, e) => t + (g.a[e][7] === 1 ? g.a[e][2] : 0), 0);

  // ⚠️ LA MONTÉE SE COMPTE DANS LE SENS DE MARCHE. Une arête prise à
  //    l'envers descend ; sommer des valeurs absolues doublerait le
  //    dénivelé d'une boucle, qui monte et redescend toujours autant.
  let montee = 0;
  let nMarche = depart;
  const contour: [number, number][] = [];
  for (const e of aretes) {
    const ar = g.a[e];
    const aLEndroit = ar[0] === nMarche;
    const dz = ar[6];
    const grimpe = ar[8];
    if (grimpe != null && dz != null) {
      // ⭐ La montée LE LONG DE LA GÉOMÉTRIE, pas le net entre extrémités —
      //    le net perdait 43 % de la montée réelle (242 m → 137 m, mesuré
      //    sur l'Arrée). À l'envers : ce qui se descendait se grimpe,
      //    soit exactement `grimpe − dz`. Le max(0) n'est qu'une ceinture
      //    contre l'arrondi à 0,1 m près des deux champs.
      montee += Math.max(0, aLEndroit ? grimpe : grimpe - dz);
    } else if (dz != null) {
      // Repli pour un graphe qui ne porterait que le net : approximation
      // ASSUMÉE basse — jamais au-dessus du vrai, souvent en dessous.
      montee += Math.max(0, aLEndroit ? dz : -dz);
    }
    const suite = aLEndroit ? ar[4] : [...ar[4]].reverse();
    for (const pt of suite) contour.push(g.n[pt]);
    nMarche = aLEndroit ? ar[1] : ar[0];
  }

  // ⭐ ON SÉLECTIONNE PAR PRIORITÉ, ON AFFICHE DANS L'ORDRE DE MARCHE.
  //    Deux étapes, jamais confondues. Une liste intitulée « ce que vous
  //    croiserez » mais triée par proximité au chemin est un mensonge
  //    discret : il ne se signale jamais, il se vérifie en marchant.
  //    (Vécu le 27/10 : le menhir annoncé en tête se croisait au km 10,7
  //    sur 12, et la batterie reléguée en 5ᵉ était le point de départ.)
  const vusLieux = new Map<string, LieuVu>();
  let parcouru = 0;
  let nAvant = depart;
  for (const e of aretes) {
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

  return {
    aretes, metres: m, agrement, partRepetee: mRepetee / Math.max(m, 1),
    bordDeMer, montee, ressentie: distanceRessentie(m, montee), marees, contour,
    lieux: [...vusLieux.values()].sort((x, y) => x.ordre - y.ordre),
  };
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
  { candidats = 8, graine = 1, vise }:
    { candidats?: number; graine?: number; vise?: ReadonlySet<number> } = {}
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
  /* ⭐ VISER L'ARÊTE QU'ON DÉSIGNE, ET PAS SEULEMENT CELLES QUI PORTENT UN
     LIEU. Sans `vise`, les prétextes possibles sont les arêtes qui portent
     un lieu, et le compositeur choisit parmi elles. Avec `vise`, c'est
     quelqu'un qui a choisi — et ce qu'il a désigné sur la carte n'est pas
     forcément accroché à une arête par la moisson.
     🔴 MESURÉ LE 1/11, ET C'EST CE QUI A CHANGÉ CETTE API : sur les 583 lieux
        nommés que la carte affiche, **139 seulement (24 %)** sont accrochés à
        une arête du graphe. En accrochant à l'exécution — l'arête la plus
        proche du point —, **469 (80 %)** tombent sous la règle des 150 m.
        Viser par clé aurait refusé trois lieux sur quatre, et le refus aurait
        eu l'air d'un défaut du moteur. */
  for (const ei of vise ?? ix.lieuxParArete.keys()) {
    if (vise === undefined && !(ix.lieuxParArete.get(ei)?.length)) continue;
    const [x, y] = [g.a[ei][0], g.a[ei][1]];
    const lx = lonAller.get(x), ly = lonAller.get(y);
    // on entre par le bout le plus proche, on ressort par l'autre
    const paires: [number, number, number | undefined][] = [[x, y, lx], [y, x, ly]];
    for (const [entree, sortie, L] of paires) {
      /* 🔴 LA COURONNE NE S'APPLIQUE QU'À « SURPRENDS-MOI ». Elle choisit un
         point de demi-tour au bon rayon pour que la boucle fasse la longueur
         demandée — c'est un critère de SÉLECTION parmi des prétextes
         équivalents. Quand quelqu'un désigne SON lieu, il n'y a plus de
         sélection à faire : le lieu est à la distance où il est.
         ⚠️ Avec la couronne, viser un calvaire à 300 m rendait « aucune
            boucle » — un refus pour cause de proximité, que rien n'explique
            à qui regarde la carte et le voit juste là. */
      const dansLaCouronne = L !== undefined && L >= demi * 0.72 && L <= demi * 1.12;
      if (vise !== undefined ? L !== undefined : dansLaCouronne) {
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
  // 🔴 ⛔ PAS DE REPLI QUAND ON VISE. La couronne nue est le bon repli pour
  //    « surprends-moi » — une boucle sans prétexte vaut mieux que le vide.
  //    Elle serait un MENSONGE pour « emmène-moi au menhir » : on rendrait
  //    une boucle qui ne passe pas devant, sous un titre qui le promet.
  //    ⭐ Un repli n'est légitime que s'il sert encore la demande. Celui-ci
  //       sert l'autre demande — et c'est exactement ce qui le rend invisible.
  if (vise === undefined) {
    for (const [n, L] of lonAller) {
      if (L >= demi * 0.85 && L <= demi * 1.1) couronneNue.push(n);
    }
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

    /* ⭐ LA MESURE EST SORTIE D'ICI — voir `mesurer()`. Tant qu'elle vivait
       dans cette boucle de sélection, elle n'était pas vérifiable : aucune
       mutation du comptage de la montée ou de l'ordre des lieux ne pouvait
       tomber sans qu'une boucle entière soit composée d'abord. C'est la leçon
       de `fondreRencontres` (1/11) appliquée une couche plus bas. */
    const p = mesurer(g, ix, total, depart);
    const { agrement, partRepetee, ressentie } = p;
    /* ⛔ L'ÉTALEMENT, LUI, RESTE ICI. Il compare une aire à un périmètre :
       il ne veut rien dire d'un trajet qui ne se referme pas, et
       `formeDeLaBoucle()` appellerait « aller-retour » une ligne droite —
       un mot juste pour une boucle aplatie, faux pour un A→B. */
    const etalement = etalementDe(p.contour, m);
    /* ⭐ QUAND ON VISE, LE BUDGET DEVIENT UN PLAFOND, PLUS UNE CIBLE. « Deux
       heures » dit alors « pas plus de deux heures » : c'est le LIEU qui est
       la demande, la durée n'était qu'une enveloppe. Rendre le vide parce
       qu'une boucle vers le calvaire ne dure que 50 minutes, c'est refuser
       pour cause d'excès de bonne nouvelle.
       ⚠️ Le plafond haut, lui, ne bouge pas : dépasser le temps annoncé n'est
          pas une bonne nouvelle, c'est quelqu'un surpris par la nuit. */
    const planchier = vise === undefined ? 0.8 : 0.4;
    if (ressentie < cibleM * planchier || ressentie > cibleM * 1.15) continue;
    vues.add(cle);
    boucles.push({
      ...p, etalement,
      score: agrement + 14 * p.lieux.length
             - 220 * Math.abs(ressentie - cibleM) / cibleM
             - 200 * partRepetee,
    });
    if (boucles.length >= candidats) break;
   }
  }
  return boucles.sort((a, b) => b.score - a.score);
}

/* ════════════════════════════════════════════════════════════════════════
   COMPOSER *VERS* UN LIEU — « j'ai repéré le menhir, emmène-moi »
   ════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ DEUX DEMANDES OPPOSÉES, UN SEUL MOTEUR. « Autour de moi » dit : je suis
 *    ici, j'ai deux heures, surprends-moi. « Vers ce lieu » dit : j'ai vu ça
 *    sur la carte, emmène-moi. La première laisse le prétexte au calcul ; la
 *    seconde le reçoit de quelqu'un. Le reste — traverser l'arête porteuse,
 *    revenir par ailleurs, compter la montée dans le sens de marche — ne
 *    change pas d'un mot, parce que c'était déjà le bon geste.
 *
 * 🔴 ET CE QUI COMPTE ICI N'EST PAS LA BOUCLE, C'EST LE REFUS. Une boucle
 *    réussie se voit ; un refus mal fait ne se voit pas — il ressemble à une
 *    boucle. Les façons d'échouer sont donc NOMMÉES et SÉPARÉES, parce
 *    qu'elles appellent des gestes différents :
 *      · `ecarte`      — aucun chemin ne passe assez près : on y mène du
 *                        regard, pas du pied (une baie, un cap, une épave)
 *      · `ferme`       — le chemin qui y mène est sous arrêté municipal
 *      · `hors-reseau` — aucun chemin CONNU DE NOUS n'y relie le départ
 *      · `trop-loin`   — il y mène, mais pas dans le temps demandé
 *      · `aucune-boucle` — à portée, mais aucune boucle valide n'en sort
 *    « Je ne peux pas » n'est pas une réponse.
 */
export type Visee =
  | {
      etat: "ok"; boucles: Boucle[]; metresAller: number; ecart: number;
      /** ⭐ Parallèle à `boucles` : où, le long de chacune, on passe au plus
       *  près du point visé — et à combien de mètres. Sans ça, l'écran
       *  intitule « Aller vers le menhir » une fiche dont la liste « ce que
       *  vous croiserez » ne nomme PAS le menhir : trois lieux de la carte sur
       *  quatre ne sont accrochés à aucune arête, donc la boucle ne peut pas
       *  les citer d'elle-même. Un titre que le contenu ne confirme pas est
       *  la même faute qu'une liste triée autrement qu'elle ne s'annonce. */
      approches: { ordre: number; metres: number }[];
    }
  | { etat: "ecarte"; ecart: number }
  | { etat: "ferme"; ecart: number }
  | { etat: "hors-reseau"; ecart: number }
  | { etat: "trop-loin"; metresAller: number; metresMinimum: number; ecart: number }
  | { etat: "aucune-boucle"; metresAller: number; ecart: number };

/**
 * ⚠️ LE MÊME 150 m QUE `proches.ts`, ET CE N'EST PAS UNE COÏNCIDENCE À
 *    ENTRETENIR À LA MAIN. La règle produit est unique : « si c'est listé, on
 *    passe devant » — un lieu qu'on annonce sur le parcours est un lieu qu'on
 *    croise, pas un lieu qu'on devine au loin. Deux nombres écrits séparément
 *    divergeraient, et la divergence rendrait l'une des deux surfaces
 *    menteuse sans que rien ne le signale.
 */
export { SEUIL_PROCHES as ECART_MAX_M } from "./proches";
import { SEUIL_PROCHES } from "./proches";

/** Toutes les arêtes qui passent à moins de `ECART_MAX_M` du point, la plus
 *  proche en tête — et l'écart de cette première. */
function aretesAutour(g: Graphe, cible: [number, number]) {
  let ecart = Infinity;
  const dedans: number[] = [];
  for (let ei = 0; ei < g.a.length; ei++) {
    let d = Infinity;
    for (const pi of g.a[ei][4]) {
      const m = metres(cible, g.n[pi]);
      if (m < d) d = m;
    }
    if (d < ecart) ecart = d;
    if (d <= SEUIL_PROCHES) dedans.push(ei);
  }
  return { dedans, ecart };
}

/**
 * ⚠️ `lieuxParArete` EST BÂTI SANS LES FERMETURES — volontairement : un lieu
 *    reste un lieu quand le chemin qui y mène ferme. C'est ici qu'il faut
 *    donc redemander si l'arête est encore sur la carte d'adjacence, sinon on
 *    confondrait « sous arrêté » et « introuvable », qui ne se disent pas
 *    pareil au promeneur.
 */
function areteOuverte(g: Graphe, ix: Index, ei: number): boolean {
  return (ix.adj.get(g.a[ei][0]) ?? []).some(([e]) => e === ei);
}

export function composerVers(
  g: Graphe, ix: Index, depart: number, cibleM: number, cible: [number, number],
  { candidats = 8, graine = 1 } = {}
): Visee {
  const { dedans, ecart } = aretesAutour(g, cible);

  /* 🔴 LE PREMIER REFUS EST LE PLUS IMPORTANT, ET C'EST UNE RÈGLE DE PRODUIT,
     pas une limite technique. Au-delà de 150 m, le chemin le plus proche ne
     passe pas DEVANT le lieu — il passe à côté. Y mener quelqu'un en disant
     « votre balade vers la Baie de Dinan », c'est exactement ce que le dépôt
     s'interdit : présenter un lieu qui demande un détour comme étant sur le
     parcours.
     ⚠️ Et ces lieux-là ne sont pas des accidents de donnée : mesuré le 1/11,
        les 114 lieux nommés au-delà de 150 m sont des baies, des caps, des
        îles, des épaves — des choses qu'on REGARDE. Le refus dit donc ce
        qu'il en est, il ne s'excuse pas. */
  if (!dedans.length) return { etat: "ecarte", ecart: Math.round(ecart) };

  const ouvertes = new Set(dedans.filter((ei) => areteOuverte(g, ix, ei)));
  if (!ouvertes.size) return { etat: "ferme", ecart: Math.round(ecart) };

  /* ⭐ LA MESURE DE L'ÉLOIGNEMENT SE PAIE SEULEMENT QUAND ON REFUSE. Le
     premier Dijkstra porte le plafond habituel : s'il atteint le lieu, on
     compose et on n'explore rien de plus. Le second, large, ne tourne que
     pour répondre « à quelle distance, alors ? » — une question qu'on ne pose
     qu'après avoir échoué, et jamais plus d'une fois par clic.
     ⚠️ Sans ce second passage, « trop loin » et « hors réseau » rendraient le
        même silence : le promeneur ne saurait pas s'il doit prévoir plus de
        temps ou renoncer. */
  const plusCourt = (lon: Map<number, number>) => {
    let m: number | undefined;
    for (const ei of ouvertes) {
      for (const n of [g.a[ei][0], g.a[ei][1]]) {
        const L = lon.get(n);
        if (L !== undefined && (m === undefined || L < m)) m = L;
      }
    }
    return m;
  };

  const e = Math.round(ecart);
  const aPortee = plusCourt(dijkstra(g, ix, depart, null, cibleM * 0.68).lon);
  if (aPortee !== undefined) {
    const brutes = composer(g, ix, depart, cibleM, { candidats, graine, vise: ouvertes });

    /* 🔴 LA PROMESSE EST MÉTRIQUE, DONC ON LA VÉRIFIE AU MÈTRE — et ce n'est
       pas une ceinture de plus : viser une ARÊTE ne suffit pas quand le point
       tombe sur une JONCTION. Toutes les arêtes qui s'y rejoignent sont alors
       « à moins de 150 m », le parcours en traverse une, et la construction
       est satisfaite — sans que rien ne garantisse qu'on soit passé près du
       point. C'est le même défaut que ce fichier documente depuis le 28/10
       (« on vise l'arête, pas le nœud »), revenu par la porte de
       l'accrochage à l'exécution.
       ⭐ Le seul énoncé qui ne puisse pas glisser est celui du promeneur :
          « je passerai à moins de 150 m de ce point ». Il se mesure sur le
          CONTOUR de la boucle rendue, après coup, et il ne dépend d'aucune
          hypothèse sur la façon dont elle a été construite. */
    const approche = (b: Boucle) => {
      let d = Infinity, i = 0;
      b.contour.forEach((p, k) => {
        const m = metres(cible, p);
        if (m < d) { d = m; i = k; }
      });
      /* ⚠️ `ordre` EST UNE CLÉ D'ORDRE, JAMAIS UNE DISTANCE — même convention
         que `LieuVu.ordre`, et pour la même raison : la fraction d'un indice
         de contour n'est pas la fraction d'un kilométrage, mais l'ORDRE de
         rencontre qu'elle donne est exact, et c'est tout ce dont la liste a
         besoin. */
      return { metres: Math.round(d), ordre: i / Math.max(b.contour.length - 1, 1) };
    };
    const tenues = brutes
      .map((b) => ({ b, a: approche(b) }))
      .filter((x) => x.a.metres <= SEUIL_PROCHES);
    if (tenues.length) {
      return {
        etat: "ok",
        boucles: tenues.map((x) => x.b),
        approches: tenues.map((x) => x.a),
        metresAller: aPortee,
        ecart: Math.min(...tenues.map((x) => x.a.metres)),
      };
    }
    return { etat: "aucune-boucle", metresAller: aPortee, ecart: e };
  }

  const loin = plusCourt(dijkstra(g, ix, depart, null, Math.max(cibleM * 4, 30000)).lon);

  /* 🔴 « HORS RÉSEAU » NE DIT PAS « IL N'Y A PAS DE CHEMIN » — il dit « nous
     n'en connaissons pas ». Mesuré le 1/11 : le graphe de la presqu'île porte
     **115 composantes**, celle de Crozon en fait 10 595 nœuds, et 34 lieux
     nommés vivent dans d'autres — dont 25 dans une composante de 1 349 nœuds
     à 16-19 km, de l'autre côté de l'eau.
     ⭐ Un graphe ne distingue pas « la route n'existe pas » de « la route est
        hors de ce que j'ai moissonné ». Le texte montré au promeneur doit
        donc porter NOTRE limite, jamais une affirmation sur le monde. */
  if (loin === undefined) return { etat: "hors-reseau", ecart: e };

  /* ⚠️ `metresMinimum` EST UN PLANCHER, PAS UNE ESTIMATION. C'est l'aller-
     retour à plat par le plus court chemin : le vrai parcours montera, et une
     montée ne fait qu'AJOUTER (règle de Naismith, voir `distanceRessentie`).
     On annonce donc « au moins », jamais « environ » — un promeneur qui part
     sur une estimation basse arrive à la nuit. */
  return { etat: "trop-loin", metresAller: loin, metresMinimum: 2 * loin, ecart: e };
}

/**
 * ⭐ RENTRER — ET C'EST LA FONCTION LA PLUS IMPORTANTE DE CE FICHIER.
 *
 * Le vent se lève, la pluie commence à tomber. Ce que quelqu'un veut à cet
 * instant, ce n'est pas un décompte de ce qu'il lui reste à faire : c'est le
 * chemin du retour. Une application qui tient les gens à leur plan n'est pas
 * un compagnon, c'est un contremaître.
 * ⭐ **Une app qui est cool, c'est une app qui rend l'abandon facile.** Pas de
 *    série à ne pas rompre, pas de « vous y êtes presque », pas de parcours
 *    « incomplet ». On propose, on accompagne, on raccompagne.
 *
 * 🔴 ET LA FONCTION DE COÛT S'INVERSE ICI, CE N'EST PAS UN DÉTAIL. Composer
 *    une promenade minimise de la PEINE : la longueur divisée par l'agrément,
 *    si bien qu'un sentier côtier de 300 m coûte moins qu'une départementale
 *    de 200. Rentrer sous la pluie minimise la DISTANCE, et rien d'autre : on
 *    ne fait pas flâner quelqu'un qui veut rentrer. Le même graphe, deux
 *    coûts opposés, parce que ce sont deux intentions opposées.
 */
export interface Retour {
  aretes: number[];
  metres: number;
  contour: [number, number][];
}

export function cheminDeRetour(
  g: Graphe, ix: Index, depuis: number, vers: number
): Retour | null {
  if (depuis === vers) return { aretes: [], metres: 0, contour: [] };
  const dist = new Map<number, number>([[depuis, 0]]);
  const prec = new Map<number, [number, number]>();
  const tas = new Tas();
  tas.pousser(0, depuis);
  for (;;) {
    const t = tas.tirer();
    if (!t) break;
    const [d, n] = t;
    if (n === vers) break;
    if (d > (dist.get(n) ?? Infinity) + 1e-9) continue;
    for (const [ei, suiv] of ix.adj.get(n) ?? []) {
      // ⚠️ Le coût est la LONGUEUR NUE. Pas d'agrément, pas de bonus de
      //    littoral, pas de lieux : le plus court, point.
      const nd = d + g.a[ei][2];
      if (nd < (dist.get(suiv) ?? Infinity)) {
        dist.set(suiv, nd); prec.set(suiv, [ei, n]);
        tas.pousser(nd, suiv);
      }
    }
  }
  const aretes = remonter(prec, depuis, vers);
  if (!aretes) return null;
  const contour: [number, number][] = [];
  let n = depuis;
  for (const e of aretes) {
    const ar = g.a[e];
    const aLEndroit = ar[0] === n;
    for (const pt of aLEndroit ? ar[4] : [...ar[4]].reverse()) contour.push(g.n[pt]);
    n = aLEndroit ? ar[1] : ar[0];
  }
  return { aretes, metres: dist.get(vers) ?? 0, contour };
}

/** La géométrie à dessiner : un trait par arête, jamais une ligne unique.
 *  ⭐ Prend un `Parcours`, pas une `Boucle` : la fonction ne lit que les
 *     arêtes, et une promenade d'un lieu à un autre se dessine exactement
 *     pareil. Exiger une boucle ici aurait interdit le A→B sans raison. */
export function traits(g: Graphe, b: Parcours): [number, number][][] {
  return b.aretes.map((e) => g.a[e][4].map((p) => g.n[p]));
}

/**
 * 🔴 FONDRE LE LIEU VISÉ DANS CE QU'ON CROISERA — et c'est une fonction PURE
 *    parce que, tant qu'elle vivait dans le composant, aucune mutation ne
 *    pouvait la faire tomber. Mesuré le 1/11 : supprimer l'insertion laissait
 *    les 230 tests au vert. ⭐ Une règle logée dans un rendu n'est pas tenue,
 *    elle est espérée.
 *
 * ⚠️ TROIS SURFACES LA LISENT — le décompte, la liste numérotée, les étapes
 *    posées sur la carte. Vérifié en production ce jour-là : le lieu visé
 *    inséré dans UNE des trois donnait un écran intitulé « Aller vers le
 *    Menhir de Crozon » dont la liste citait l'église Saint-Pierre.
 *
 * ⭐ ET IL ENTRE PAR SON ORDRE, pas en tête. Il est le motif du départ, pas la
 *    première chose qu'on croise : le mettre en tête serait le même mensonge
 *    discret qu'une liste « ce que vous croiserez » triée par proximité au
 *    chemin — elle ne se signale jamais, elle se vérifie en marchant.
 */
export interface Rencontre {
  ordre: number;
  nom: string;
  anonyme: boolean;
  /** ce qu'on écrit après le nom — vide pour un lieu anonyme */
  libelle: string;
  lat: number;
  lon: number;
}

export function fondreRencontres(
  lieux: readonly LieuVu[],
  libelleDe: (categorie: string) => string,
  visee?: { nom: string; g: [number, number]; approche?: { ordre: number; metres: number } },
): Rencontre[] {
  const l: Rencontre[] = lieux.map((x) => ({
    ordre: x.ordre, nom: x.nom, anonyme: x.anonyme,
    libelle: x.anonyme ? "" : libelleDe(x.categorie),
    lat: x.position[1], lon: x.position[0],
  }));
  if (visee?.approche) {
    /* ⚠️ L'ÉCART MESURÉ PLUTÔT QUE « SUR LE CHEMIN » QUAND IL NE L'EST PAS.
       À 90 m, le lieu est sous la règle des 150 m — on passe bien devant —
       mais écrire « sur le chemin » laisserait croire qu'on le touche. Le
       nombre dit ce qu'il en est sans rien promettre. */
    l.push({
      ordre: visee.approche.ordre,
      nom: visee.nom,
      anonyme: false,
      libelle: visee.approche.metres > 0
        ? `à ${visee.approche.metres} m du chemin`
        : "sur le chemin",
      lat: visee.g[1], lon: visee.g[0],
    });
  }
  return l.sort((x, y) => x.ordre - y.ordre);
}

/* ════════════════════════════════════════════════════════════════════════
   DIRE UNE BOUCLE — un intitulé et une phrase, tirés de la mesure
   ════════════════════════════════════════════════════════════════════════ */

/**
 * 🔴 TOUT CE QUI EST ÉCRIT ICI EST UNE MESURE REFORMULÉE, JAMAIS UNE PROMESSE.
 *    « Une boucle vers la mer » se dit parce que `bordDeMer` dépasse un
 *    kilomètre, pas parce que ça sonne bien. « Un détour par les chemins » se
 *    dit quand rien ne distingue ce parcours — et c'est une information, pas
 *    un remplissage.
 *
 * ⛔ AUCUN ADJECTIF TOURISTIQUE. Pas de « magnifique », pas de
 *    « incontournable », pas de « sauvage ». Nous n'avons pas marché ce
 *    parcours : il a été calculé il y a trois secondes. Le qualifier serait
 *    exactement la fabrication documentaire que ce dépôt s'interdit pour les
 *    photographies — en plus discret, donc en pire.
 *
 * ⚠️ ET LES TROIS PROPOSITIONS DOIVENT SE DISTINGUER. Le rang entre dans le
 *    choix : à égalité de traits mesurés, deux boucles porteraient le même
 *    intitulé, et l'écran donnerait l'impression de proposer deux fois la
 *    même chose alors qu'elles diffèrent.
 */
/* ⚠️ `candidats`, PAS `traits` — `traits()` existe déjà dans ce fichier et
   découpe le tracé d'une boucle en segments. Deux fonctions du même nom
   dans un module, c'est la seconde qui gagne en silence à l'exécution ;
   TypeScript l'a refusé, et il a eu raison avant moi. */
/**
 * ⏸️ DORMANT DEPUIS LE 2/11, ET C'EST ÉCRIT PLUTÔT QUE SUPPRIMÉ.
 *
 *    `candidatsIntitule`, `intitules`, `intitule` et `descriptif` nommaient
 *    une boucle qui n'allait nulle part en particulier. Depuis le pivot A→B,
 *    l'écran nomme la promenade par le LIEU où elle mène : plus rien ne les
 *    appelle, et neuf tests les gardent.
 *
 * ⛔ ON NE LES SUPPRIME PAS : le fondateur a tranché que le moteur de boucles
 *    est « le coup d'après ». Le jour où la boucle redevient une forme à part
 *    entière, elle aura besoin d'un intitulé, et celui-ci est mesuré et
 *    éprouvé.
 * ⚠️ MAIS DU CODE MORT NON DÉCLARÉ SE LIT COMME DU CODE VIVANT, et ses gardes
 *    donnent l'impression de tenir l'écran. Les deux sont faux. C'est écrit
 *    ici pour que la prochaine lecture le sache sans avoir à le mesurer.
 * ⚠️ ET LE GARDE « AUCUN ADJECTIF TOURISTIQUE » A DÛ CHANGER DE CIBLE : il ne
 *    lisait que ces fonctions-ci, donc il protégeait du dormant pendant que le
 *    texte VIVANT de `Composer.tsx` n'était tenu par rien. Il lit les deux.
 */
function candidatsIntitule(b: Boucle): string[] {
  const forme = formeDeLaBoucle(b.etalement);
  const c: string[] = [];
  if (b.bordDeMer > 1000) c.push("Une boucle vers la mer");
  if (forme === "aller-retour") c.push("Un aller et retour");
  if (b.lieux.length >= 4) c.push("Un chemin de rencontres");
  if (forme === "ample") c.push("Une boucle plus ample");
  if (b.bordDeMer > 300) c.push("Un passage au bord de l'eau");
  c.push("Une boucle par les chemins", "Un détour par les chemins", "Un autre tour");
  return c;
}

/**
 * 🔴 LES TROIS INTITULÉS SE CHOISISSENT ENSEMBLE, PAS CHACUN DE SON CÔTÉ.
 *    Vu en production le 1/11 : deux propositions sur trois affichaient
 *    « Un chemin de rencontres ». Elles différaient pourtant de 800 m et de
 *    l'ordre des lieux — mais l'écran donnait l'impression de proposer deux
 *    fois la même chose, ce qui est le contraire exact de ce que ces trois
 *    cartes servent à dire.
 * ⭐ Un intitulé calculé isolément décrit SA boucle ; trois intitulés
 *    calculés ensemble décrivent le CHOIX. C'est le choix qu'on affiche.
 * ⚠️ Chaque boucle prend son trait le plus distinctif encore libre — jamais
 *    un trait qu'elle n'a pas : on descend sa propre liste, on ne pioche pas
 *    dans celle d'une autre.
 */
export function intitules(bs: readonly Boucle[]): string[] {
  const pris = new Set<string>();
  return bs.map((b) => {
    const choix = candidatsIntitule(b).find((t) => !pris.has(t)) ?? "Un autre tour";
    pris.add(choix);
    return choix;
  });
}

/** Une seule boucle, hors contexte — le premier de ses traits. */
export function intitule(b: Boucle): string {
  return candidatsIntitule(b)[0];
}

/**
 * La phrase sous l'intitulé : ce que la boucle TRAVERSE, dans l'ordre de
 * marche, et rien d'autre.
 *
 * ⭐ ON NOMME LES LIEUX PLUTÔT QUE DE LES COMPTER quand ils sont peu
 *    nombreux : « la chapelle, puis le calvaire » dit où l'on va ; « 2 lieux
 *    remarquables » dit qu'on a compté. ⚠️ Au-delà de trois, l'énumération
 *    devient une liste de courses : on compte.
 * ⛔ Et un lieu ANONYME ne se nomme pas — son libellé est sa catégorie, donc
 *    « Plage, puis Plage » serait le résultat. Ils se comptent.
 */
export function descriptif(b: Boucle): string {
  const nommes = b.lieux.filter((l) => !l.anonyme).map((l) => l.nom);
  const bouts: string[] = [];

  if (nommes.length > 0 && nommes.length <= 3) {
    bouts.push(nommes.length === 1 ? `Passe devant ${nommes[0]}.`
      : `Passe devant ${nommes.slice(0, -1).join(", ")} et ${nommes[nommes.length - 1]}.`);
  } else if (b.lieux.length > 0) {
    bouts.push(`${b.lieux.length} lieux remarquables sur le chemin.`);
  } else {
    bouts.push("Aucun lieu remarquable recensé sur ce tracé.");
  }

  /* 🔴 LE BORD DE MER N'EST PLUS DIT ICI — vu en production le 1/11 : la
     ligne de faits annonçait « 610 m au bord de l'eau » et la phrase
     juste dessous « 0.6 km au bord de l'eau ». Le même fait, deux fois,
     dans deux unités. ⭐ C'est la faute de ce matin sous une autre forme :
     un résumé qui redit son propre détail. La ligne de faits le porte,
     avec son picto ; cette phrase dit ce qu'elle seule sait — les lieux
     NOMMÉS, et la répétition d'un tronçon. */
  if (b.partRepetee > 0.1) {
    bouts.push("Une portion se parcourt deux fois.");
  }
  return bouts.join(" ");
}

/* ════════════════════════════════════════════════════════════════════════
   LA PROMENADE D'UN LIEU À UN AUTRE — « j'aime ce coin, où va-t-on ? »
   ════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ QUATRE NOMBRES, ET AUCUN N'EST UN GOÛT — mesurés le 2/11 sur les deux
 *    graphes réels, fermetures en vigueur, sur les 648 lieux NOMMÉS que la
 *    carte affiche (et non les 273 accrochés au graphe).
 *
 * `AUTOUR_MIN_M` — ⛔ « les 3 plus proches » ne marche pas : un tiers des
 *    voisins immédiats sont à moins de 500 m, soit la traversée d'un parking.
 * `AUTOUR_MAX_M` — au-delà, « le spot d'à côté » est une heure de marche.
 *    La bande 600–4 000 m donne 3 propositions à 83 % des spots de la
 *    presqu'île et 88 % de l'Aulne, aucune à 15 % et 3 %.
 * `DETOUR_MAX` — le genou de la courbe : +3 % de longueur pour +24 % de lieux
 *    croisés et +27 % de bord de mer. À ×1,4 puis ×1,7, on ne gagne plus rien
 *    (1,86 lieu dans les deux cas) et on marche plus loin pour rien.
 * `BOUCLE_PAR_ALLER` — 95 % / 94 % de boucles trouvées. À ×2,2 on tombe à
 *    68 %, à ×3 on gagne 3 points mais les boucles de l'Aulne passent à
 *    5,5 km de médiane.
 *
 * 🔴 ET CE DERNIER NOMBRE EST LA LEÇON DU JOUR. La même fonction
 *    `composerVers`, le même graphe, mesurée à **58 %** le 1/11 et à **95 %**
 *    ici : la différence n'est pas le code, c'est que la cible se DÉRIVE
 *    maintenant de l'aller au lieu d'être un budget décidé d'avance. Un échec
 *    que j'avais porté au débit de la donnée était causé par un paramètre que
 *    j'avais choisi moi-même.
 */
export const AUTOUR_MIN_M = 600;
export const AUTOUR_MAX_M = 4000;
export const DETOUR_MAX = 1.2;
export const BOUCLE_PAR_ALLER = 2.6;

/**
 * 🔴 DEUX DESTINATIONS NE SONT PAS DEUX CHOIX SI C'EST LE MÊME ENDROIT —
 *    5/11/2026, et le nombre est mesuré comme les quatre d'au-dessus.
 *
 * Le défaut s'est signalé par un détail de dessin : depuis « Menhirs de
 * Kerziou », les pastilles 2 et 3 se recouvraient sur la carte. Mesuré :
 * leurs destinations — « Leitstand I » et « Belvédère de Kerdéniel » — sont
 * à **14 m** l'une de l'autre. Ce n'était pas deux pastilles mal placées,
 * c'était la même promenade proposée deux fois sous deux noms.
 *
 * ⭐ ET CE N'ÉTAIT PAS UN CAS ISOLÉ. Sur un échantillon de 83 sites (1 sur
 *    5, graphes réels soudés, fermetures en vigueur) :
 *      deux destinations à moins de  50 m : **9,6 %** des sites
 *                                   100 m : 20,5 %
 *                                   200 m : 32,5 %
 *                                   300 m : 47,0 %
 *    Les plus serrées sont sans appel : « Per Guillou » et « Jude Le
 *    Paboul » à 5 m, « Musée Breizh Odyssée » et « Anne de Bretagne » à
 *    11 m, « Grotte du Grand Hôtel de la Mer » et « Grotte de Roméo » à
 *    49 m. Un site sur cinq promettait trois endroits et en offrait deux.
 *
 * ⚠️ 150 m, ET LE SEUIL SE PAIE EN RIEN. Au-delà de 150 m on retire des
 *    destinations qui SONT distinctes (les deux bouts d'une plage) ; en
 *    dessous de 100 m on laisse passer le même carrefour. Et surtout : la
 *    bande 600–4 000 m contient largement de quoi repêcher — mesuré sur
 *    l'échantillon, **aucun site** ne perd sa troisième proposition. Le
 *    remplaçant est simplement le suivant dans l'ordre des distances.
 * ⛔ L'ÉCART SE MESURE ENTRE LES LIEUX, PAS ENTRE LES CHEMINS. Deux
 *    destinations voisines peuvent s'atteindre par deux routes opposées —
 *    ça reste un seul endroit où aller, et c'est l'endroit qu'on propose.
 */
export const PROPOSITIONS_ECART_MIN_M = 150;

/**
 * OÙ UN POINT DU MONDE TOUCHE LE RÉSEAU.
 *
 * 🔴 L'ÉCART SE MESURE AU CHEMIN, PAS AU NŒUD — et l'écart entre les deux
 *    mesures est énorme. Sur la presqu'île, l'écart médian d'un lieu au
 *    NŒUD le plus proche est de 44 m mais son p90 de 305 m : un lieu posé au
 *    milieu d'une arête de 2 km est à 1 km de ses deux bouts tout en étant
 *    SUR le chemin. Trier par la distance au nœud écartait 22 % des lieux
 *    nommés, dont beaucoup qu'on longe.
 *
 * ⚠️ `noeud` RESTE LE POINT DE MARCHE, parce qu'un graphe ne se parcourt que
 *    de nœud en nœud — mais ce n'est pas lui qui décide si le lieu est
 *    atteignable. Les deux rôles étaient confondus ; ils sont séparés ici.
 */
export interface Accroche {
  /** le nœud d'où l'on part réellement marcher */
  noeud: number;
  /** distance du point au chemin le plus proche, en mètres */
  ecart: number;
  /**
   * distance du point au NŒUD de marche — les mètres que la personne fait
   * avant que le tracé ne commence.
   *
   * 🔴 DEUX ÉCARTS, PARCE QU'IL Y A DEUX EXIGENCES, ET LES CONFONDRE FAIT
   *    MENTIR L'ÉCRAN. Être une DESTINATION demande qu'un chemin passe
   *    devant (`ecart` ≤ 150 m) ; être un DÉPART demande de pouvoir
   *    commencer à marcher (`ecartNoeud`). Mesuré le 2/11 : médiane 30 m,
   *    p90 124 m, max 381 m — assez petit pour qu'on ne change pas
   *    d'ancrage (le meilleur nœud possible ne descend qu'à 223 m), assez
   *    grand pour qu'un parcours mesuré depuis le nœud rende 418 m là où la
   *    bande en exigeait 600, et même des trajets PLUS COURTS que le vol
   *    d'oiseau — ce qui est impossible et le disait.
   */
  ecartNoeud: number;
  /** les arêtes à moins de `ECART_MAX_M` du point, la plus proche en tête */
  aretes: number[];
  /**
   * l'écart de CHAQUE arête au point, dans le même ordre — parallèle à `aretes`.
   *
   * 🔴 SANS CE TABLEAU, LE TRACÉ PASSE LOIN D'UN LIEU DEVANT LEQUEL IL
   *    POUVAIT PASSER. Mesuré le 2/11 : en choisissant la traversée qui
   *    minimise la LONGUEUR, 78 % des propositions de la presqu'île passaient
   *    plus de 20 m plus loin que nécessaire — écart médian réel 114 m quand
   *    15 m était disponible, et 119 cas à plus de 60 m alors qu'un chemin
   *    passait à moins de 30.
   * ⭐ Le minimum global ne suffisait pas : il dit qu'UNE arête passe près,
   *    pas LAQUELLE. Savoir laquelle est ce qui permet d'y aller.
   */
  ecarts: number[];
}

/** Le point est-il sur le réseau au sens de la règle produit ? */
export const accroche = (a: Accroche) => a.ecart <= SEUIL_PROCHES && a.aretes.length > 0;

/**
 * ACCROCHER TOUT UN INVENTAIRE EN UNE PASSE.
 *
 * 🔴 UNE PASSE, ET PAS UNE PAR LIEU. Accrocher un seul point coûte un
 *    parcours des 16 210 arêtes et de leurs ~78 000 points de forme ; le
 *    faire pour les 407 lieux d'un territoire, c'est 32 millions de distances
 *    — une à deux secondes à chaque clic. On range donc les lieux dans une
 *    grille au pas du seuil, et chaque point de forme ne regarde que les neuf
 *    cases autour de lui. Même résultat, une passe.
 *
 * ⚠️ LE PAS DE LA GRILLE EST LE SEUIL, ET C'EST CE QUI REND LES NEUF CASES
 *    SUFFISANTES. Changer l'un sans l'autre ferait manquer des lieux en
 *    silence — un voisin à 150 m tomberait deux cases plus loin.
 */
export function accrocherTous(
  g: Graphe, ix: Index, points: readonly (readonly [number, number])[],
  /**
   * ⭐ L'ÉCART VRAI DES LIEUX HORS RÉSEAU SE PAIE SEULEMENT QUAND ON REFUSE —
   *    comme le second Dijkstra de `composerVers`. Le calculer demande de
   *    comparer le lieu à TOUS les nœuds de jonction : mesuré le 2/11, c'est
   *    1,1 s sur la presqu'île et 2,9 s sur l'Aulne pour l'inventaire entier,
   *    parce que les ~250 lieux de l'AUTRE territoire y passent tous. Sur le
   *    fil principal, c'est l'écran qui se figent.
   * ⚠️ Avec `false`, un lieu hors réseau garde `ecart: Infinity` : `accroche()`
   *    le refuse correctement, mais on ne peut pas DIRE « à 400 m du chemin ».
   *    Pour l'écrire, rappeler `accrocherUn` sur ce seul lieu — un point, un
   *    parcours de nœuds, quelques millisecondes.
   */
  { ecartSiLoin = true } = {},
): Accroche[] {
  const res: Accroche[] = points.map(() =>
    ({ noeud: -1, ecart: Infinity, ecartNoeud: Infinity, aretes: [], ecarts: [] }));
  if (!points.length || !g.n.length) return res;

  /* 🔴 UNE SEULE LATITUDE DE RÉFÉRENCE POUR TOUTE LA PROJECTION — et c'est le
     défaut qui a mordu le 2/11. Première version : chaque point projetait sa
     longitude avec le cosinus de SA latitude. À −4,5° de longitude, 0,1° de
     latitude d'écart déplace la case de 660 m — plus que la case entière.
     Le même lieu tombait donc dans des cases différentes selon le point de
     forme qui le regardait, et 39 écarts sur 50 divergeaient de la force
     brute. ⭐ Le symptôme était muet : la COUVERTURE restait juste (83 %),
     seuls les écarts étaient faux. Un nombre d'ensemble peut rester vrai
     pendant qu'on mesure mal chaque cas.
     ⚠️ Les cases ne sont donc pas carrées en mètres — elles le sont en
        degrés, à une latitude près. Le voisinage 3×3 couvre quand même plus
        de 150 m dans les deux axes, ce que la dimension de la case garantit. */
  const M_PAR_DEGRE_LAT = 111_320;
  let laSomme = 0;
  for (const [, la] of g.n) laSomme += la;
  const latRef = laSomme / g.n.length;
  const dLa = SEUIL_PROCHES / M_PAR_DEGRE_LAT;
  const dLo = dLa / Math.max(Math.cos((latRef * Math.PI) / 180), 0.05);
  const caseDe = (lo: number, la: number) =>
    `${Math.floor(lo / dLo)}|${Math.floor(la / dLa)}`;

  const grille = new Map<string, number[]>();
  points.forEach(([lo, la], i) => {
    const k = caseDe(lo, la);
    const c = grille.get(k); if (c) c.push(i); else grille.set(k, [i]);
  });

  /* L'arête qui réalise l'écart minimal, par lieu — pour la mettre en tête. */
  const meilleure = new Int32Array(points.length).fill(-1);

  for (let ei = 0; ei < g.a.length; ei++) {
    for (const pi of g.a[ei][4]) {
      const [lo, la] = g.n[pi];
      const cx = Math.floor(lo / dLo), cy = Math.floor(la / dLa);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        for (const i of grille.get(`${cx + dx}|${cy + dy}`) ?? []) {
          const d = metres(points[i] as [number, number], g.n[pi]);
          if (d > SEUIL_PROCHES) continue;
          const a = res[i];
          /* ⚠️ ON COMPARE À CHAQUE POINT DE FORME, SANS COURT-CIRCUIT. La
             première version inscrivait l'arête puis sautait ses points
             suivants : l'écart retenu était celui du PREMIER point sous le
             seuil, pas du plus proche. Le plus proche arrive souvent après. */
          if (d < a.ecart) { a.ecart = d; meilleure[i] = ei; }
          /* Les arêtes sont parcourues dans l'ordre : l'arête courante est
             déjà inscrite si et seulement si elle est en queue de liste. */
          if (a.aretes[a.aretes.length - 1] !== ei) { a.aretes.push(ei); a.ecarts.push(d); }
          else if (d < a.ecarts[a.ecarts.length - 1]) a.ecarts[a.ecarts.length - 1] = d;
        }
      }
    }
  }

  points.forEach((p, i) => {
    const a = res[i];
    if (a.aretes.length) {
      /* La plus proche en tête — c'est elle que `promenadeVers` traverse en
         premier choix et c'est son bout qui sert de point de marche. */
      /* Trier ensemble, par écart croissant : la plus proche en tête, et
         `ecarts[k]` reste bien l'écart de `aretes[k]`.
         ⚠️ DEUX TABLEAUX PARALLÈLES SE DÉSALIGNENT DÈS QU'ON EN TRIE UN SEUL.
            On trie donc les INDICES, et on reconstruit les deux. */
      const ordre = a.aretes.map((_, k) => k).sort((x, y) => a.ecarts[x] - a.ecarts[y]);
      a.aretes = ordre.map((k) => a.aretes[k]);
      a.ecarts = ordre.map((k) => a.ecarts[k]);
      const b = a.aretes[0];
      a.noeud = bout(g, ix, b, p as [number, number]);
      a.ecartNoeud = metres(p as [number, number], g.n[a.noeud]);
      return;
    }
    /* Il faut pouvoir DIRE « à 400 m du chemin » : ces lieux sont 18 % sur
       la presqu'île, et ce sont des baies, des caps, des épaves — des choses
       qu'on regarde. Mais seulement quand quelqu'un en a choisi un. */
    if (!ecartSiLoin) return;
    let d = Infinity, n = -1;
    for (const j of ix.adj.keys()) {
      const m = metres(g.n[j], p as [number, number]);
      if (m < d) { d = m; n = j; }
    }
    a.ecart = d; a.noeud = n; a.ecartNoeud = d;
  });
  return res;
}

/** Accrocher UN point — pour le pin de localisation, qui bouge. */
export function accrocherUn(g: Graphe, ix: Index, point: [number, number]): Accroche {
  return accrocherTous(g, ix, [point], { ecartSiLoin: true })[0];
}

/** Le bout de l'arête le plus proche du point : c'est de là qu'on marche. */
function bout(g: Graphe, ix: Index, ei: number, p: [number, number]): number {
  const [x, y] = [g.a[ei][0], g.a[ei][1]];
  const dx = ix.adj.has(x) ? metres(g.n[x], p) : Infinity;
  const dy = ix.adj.has(y) ? metres(g.n[y], p) : Infinity;
  return dx <= dy ? x : y;
}

/** Dijkstra à COÛT NU — la longueur, point. Il sert à mesurer le plancher
 *  d'un trajet avant d'autoriser un détour d'agrément au-dessus.
 *  ⚠️ Jumeau de `dijkstra`, PAS une variante paramétrée : fondre les deux
 *     derrière un drapeau mettrait le coût d'agrément et la longueur nue sous
 *     le même nom, et c'est exactement la confusion que `cheminDeRetour`
 *     documente — deux intentions opposées sur le même graphe. */
function dijkstraNu(g: Graphe, ix: Index, source: number) {
  const lon = new Map<number, number>([[source, 0]]);
  const prec = new Map<number, [number, number]>();
  const tas = new Tas();
  tas.pousser(0, source);
  for (;;) {
    const t = tas.tirer();
    if (!t) break;
    const [d, n] = t;
    if (d > (lon.get(n) ?? Infinity) + 1e-9) continue;
    for (const [ei, suiv] of ix.adj.get(n) ?? []) {
      const nd = d + g.a[ei][2];
      if (nd < (lon.get(suiv) ?? Infinity)) {
        lon.set(suiv, nd); prec.set(suiv, [ei, n]); tas.pousser(nd, suiv);
      }
    }
  }
  return { lon, prec };
}

export type Promenade =
  | {
      etat: "ok";
      /** ce qui se marche SUR le réseau : c'est lui qu'on dessine */
      parcours: Parcours;
      /** le plus court chemin possible, pour situer le détour d'agrément */
      minimum: number;
      /** mètres du lieu de départ au début du tracé */
      approche: number;
      /** mètres de la fin du tracé au lieu visé */
      sortie: number;
      /**
       * ⭐ LE TOTAL, ET C'EST LUI QU'ON AFFICHE. `parcours.metres` ne compte
       *    que le réseau : annoncer ce nombre-là taisait jusqu'à 381 m de
       *    marche d'un côté et 150 m de l'autre. Mesuré le 2/11, c'est ce qui
       *    rendait des promenades de 418 m sous un plancher de 600 et, pire,
       *    des trajets plus courts que le vol d'oiseau — une impossibilité
       *    géométrique qui signalait la mesure, pas le moteur.
       *    ⚠️ Avec les deux bouts, `metres ≥ vol d'oiseau` redevient un
       *       INVARIANT (inégalité triangulaire), donc un test et non un espoir.
       */
      metres: number;
    }
  | { etat: "ecarte"; ecart: number }
  | { etat: "ferme"; ecart: number }
  | { etat: "hors-reseau"; ecart: number }
  | { etat: "sur-place" };

/**
 * LA PROMENADE D'UN POINT À UN AUTRE.
 *
 * ⭐ C'EST LA FORME PRINCIPALE DEPUIS LE 2/11, et la boucle devient l'option.
 *    Personne ne choisit plus la distance : deux lieux la déterminent. La
 *    boucle reste disponible — `composerVers` avec une cible dérivée de
 *    l'aller — mais ce n'est plus elle qu'on génère par défaut.
 *
 * 🔴 LE PARCOURS TRAVERSE L'ARÊTE DU LIEU, il ne rejoint pas son nœud. C'est
 *    la même exigence que `composer` tient depuis le 28/10 et pour la même
 *    raison : arriver au nœud au bout de l'arête porteuse ne garantit RIEN —
 *    on peut y arriver et repartir ailleurs, donc passer À CÔTÉ du lieu. La
 *    traversée est ici une donnée de la construction (on concatène l'arête),
 *    et elle est VÉRIFIÉE AU MÈTRE ensuite, parce que la construction ne
 *    suffit pas quand le point tombe sur une jonction.
 *
 * ⚠️ DEUX DIJKSTRA, ET LE PREMIER N'EST PAS DU LUXE. Le plus court donne le
 *    PLANCHER ; le second cherche le plus agréable sous un plafond de
 *    `DETOUR_MAX` fois ce plancher. Sans plancher, un plafond absolu serait un
 *    nombre inventé — exactement ce que ce parcours vient de supprimer.
 */
export function promenadeVers(
  g: Graphe, ix: Index, depuis: Accroche, vers: Accroche, point: [number, number],
): Promenade {
  const e = Math.round(vers.ecart);
  if (!accroche(vers)) return { etat: "ecarte", ecart: e };
  const ouvertes = vers.aretes.filter((ei) => areteOuverte(g, ix, ei));
  if (!ouvertes.length) return { etat: "ferme", ecart: e };

  /**
   * LE MEILLEUR (ARÊTE, BOUT D'ENTRÉE) ATTEIGNABLE.
   *
   * 🔴 `parProximite` CHANGE LA PROMESSE, PAS LA PERFORMANCE. Mesuré le 2/11
   *    en minimisant la seule LONGUEUR : 78 % des propositions de la
   *    presqu'île et 83 % de l'Aulne passaient plus de 20 m plus loin que
   *    nécessaire — médiane 114 m là où 15 m était disponible. La cause est
   *    simple et muette : l'arête qu'on atteint le plus VITE n'est pas celle
   *    qui passe DEVANT le lieu, et rien ne le signalait puisque les deux
   *    restent sous les 150 m qui autorisent la phrase « vous passez devant ».
   * ⭐ Le budget de détour tranche l'arbitrage sans qu'on ait à inventer un
   *    poids : dans la longueur qu'on s'autorise DÉJÀ, on passe aussi près
   *    que possible. Hors de ce budget, on ne paie pas la proximité.
   */
  const viser = (lon: Map<number, number>, parProximite: boolean) => {
    let choix: { m: number; ei: number; entree: number; ecart: number } | null = null;
    for (const ei of ouvertes) {
      const ecart = vers.ecarts[vers.aretes.indexOf(ei)] ?? vers.ecart;
      for (const entree of [g.a[ei][0], g.a[ei][1]]) {
        const L = lon.get(entree);
        if (L === undefined) continue;
        const total = L + g.a[ei][2];
        const mieux = !choix ? true
          : parProximite
            // ⚠️ L'écart se compare au MÈTRE PRÈS : départager deux arêtes
            //    pour 40 cm d'écart ferait choisir au bruit de la donnée.
            ? (Math.round(ecart) < Math.round(choix.ecart)
               || (Math.round(ecart) === Math.round(choix.ecart) && total < choix.m))
            : total < choix.m;
        if (mieux) choix = { m: total, ei, entree, ecart };
      }
    }
    return choix;
  };

  const nu = dijkstraNu(g, ix, depuis.noeud);
  const plancher = viser(nu.lon, false);
  if (!plancher) return { etat: "hors-reseau", ecart: e };

  /* Le trajet d'agrément, plafonné. S'il n'atteint pas le lieu sous ce
     plafond — le plus court est alors le seul chemin —, on garde le plus
     court : il n'est jamais pire, et le refuser serait refuser pour cause
     d'absence d'alternative. */
  const ag = dijkstra(g, ix, depuis.noeud, null, plancher.m * DETOUR_MAX);
  /* ⭐ La carte de longueurs du second passage est DÉJÀ bornée par le plafond :
     tout candidat qu'on y trouve tient dans le budget, et on peut donc y
     choisir le plus PROCHE du lieu sans arbitrage supplémentaire. */
  const choisi = viser(ag.lon, true) ?? plancher;
  const prec = choisi === plancher ? nu.prec : ag.prec;

  const avant = remonter(prec, depuis.noeud, choisi.entree);
  if (!avant) return { etat: "hors-reseau", ecart: e };
  const aretes = [...avant, choisi.ei];
  const parcours = mesurer(g, ix, aretes, depuis.noeud);
  if (!parcours.metres) return { etat: "sur-place" };

  /* 🔴 LA PROMESSE EST MÉTRIQUE, DONC ON LA VÉRIFIE AU MÈTRE. Voir
     `composerVers` : quand le point tombe sur une JONCTION, toutes les arêtes
     qui s'y rejoignent sont « à moins de 150 m », le parcours en traverse une,
     et la construction est satisfaite sans qu'on soit passé près du point. */
  let auPlusPres = Infinity;
  for (const q of parcours.contour) {
    const d = metres(point, q);
    if (d < auPlusPres) auPlusPres = d;
    if (auPlusPres <= 1) break;
  }
  if (auPlusPres > SEUIL_PROCHES) return { etat: "ecarte", ecart: Math.round(auPlusPres) };

  const approche = Math.round(depuis.ecartNoeud);
  const sortie = Math.round(auPlusPres);
  return {
    etat: "ok", parcours, minimum: Math.round(plancher.m),
    approche, sortie, metres: approche + parcours.metres + sortie,
  };
}

/** Une proposition de promenade : le spot visé et le trajet pour y aller. */
export interface Proposition<T> {
  spot: T;
  /** l'index dans l'inventaire reçu — pour remonter au lieu */
  i: number;
  parcours: Parcours;
  /** le plus court chemin possible, pour situer le détour d'agrément */
  minimum: number;
  /** ⭐ CE QU'ON AFFICHE : le réseau PLUS les deux bouts hors réseau */
  metres: number;
  approche: number;
  sortie: number;
}

/**
 * LES TROIS SPOTS QU'ON PROPOSE AUTOUR D'UN SPOT CHOISI.
 *
 * ⛔ PAS « LES TROIS PLUS PROCHES » — mesuré le 2/11 : un tiers des voisins
 *    immédiats de la presqu'île sont à moins de 500 m à pied, et p10 tombe à
 *    82 m à vol d'oiseau. Proposer ça, c'est proposer de traverser un
 *    parking. La sélection se fait dans la bande `AUTOUR_MIN_M`–`AUTOUR_MAX_M`,
 *    et le voisinage se mesure PAR LE CHEMIN, jamais à vol d'oiseau : le
 *    détour médian est de ×1,27 mais il monte à ×16 — un spot à 200 m de
 *    l'autre côté d'une anse coûte 3 km à pied.
 *
 * ⭐ LA DISTANCE RENDUE EST CELLE QU'ON MARCHERA, pas l'estimation qui a servi
 *    à trier. La bande présélectionne sur la distance au NŒUD ; chaque
 *    proposition retenue est ensuite composée pour de vrai, et c'est son
 *    `parcours.metres` qu'on affiche. Deux nombres pour une même promesse
 *    divergeraient, et l'écran annoncerait 1,2 km pour une marche de 1,4.
 */
export function propositionsAutour<T>(
  g: Graphe, ix: Index,
  depuis: Accroche,
  spots: readonly T[], positions: readonly (readonly [number, number])[],
  accroches: readonly Accroche[],
  {
    combien = 3, min = AUTOUR_MIN_M, max = AUTOUR_MAX_M,
    /**
     * ⭐ LE LIEU D'OÙ L'ON VIENT N'EST PAS UNE PROPOSITION. En chaînant une
     *    promenade — A vers B, puis depuis B —, le premier voisin de B est
     *    presque toujours A : c'est vrai, c'est à la bonne distance, et c'est
     *    inutile, parce que « revenir sur ses pas » est déjà offert juste
     *    au-dessus avec sa distance. Vérifié à l'écran le 2/11 : depuis le
     *    Manoir de Goandour, la première carte proposait le Menhir de Crozon,
     *    qu'on venait de quitter.
     * ⛔ UN SEUL PAS EN ARRIÈRE, ET RIEN NE S'ACCUMULE. Garder tout l'
     *    historique serait garder la trace de ce que quelqu'un a marché — ce
     *    que cette application ne fait pas. Un pas suffit à retirer la
     *    redondance ; au-delà, repasser par un lieu vu il y a une heure est un
     *    choix légitime.
     */
    sauf,
    /** voir `PROPOSITIONS_ECART_MIN_M` — deux destinations trop proches sont
     *  le même endroit, donc une seule proposition */
    ecartMin = PROPOSITIONS_ECART_MIN_M,
  }: { combien?: number; min?: number; max?: number; sauf?: number; ecartMin?: number } = {},
): Proposition<T>[] {
  if (!accroche(depuis)) return [];
  const { lon } = dijkstraNu(g, ix, depuis.noeud);

  const bande: { i: number; estime: number }[] = [];
  for (let i = 0; i < spots.length; i++) {
    const a = accroches[i];
    if (i === sauf) continue;
    if (!accroche(a) || a.noeud === depuis.noeud) continue;
    const L = lon.get(a.noeud);
    if (L === undefined || L < min || L > max) continue;
    bande.push({ i, estime: L });
  }
  bande.sort((x, y) => x.estime - y.estime);

  /* ⚠️ ON EN COMPOSE PLUS QU'ON N'EN GARDE. Un spot de la bande peut être
     refusé à la composition — son arête sous arrêté, ou la vérification
     métrique qui tombe sur une jonction. S'arrêter aux trois premiers
     rendrait alors deux propositions là où le territoire en portait trois. */
  const out: Proposition<T>[] = [];
  for (const { i } of bande) {
    /* ⛔ ÉCARTÉ AVANT D'ÊTRE COMPOSÉ, et c'est l'ordre qui compte : une
       destination trop proche d'une déjà retenue n'a pas besoin qu'on lui
       calcule un chemin pour être refusée. Un `metres()` contre deux
       voisins, au lieu d'un Dijkstra complet. */
    if (out.some((q) => metres(positions[i], positions[q.i]) < ecartMin)) continue;
    const p = promenadeVers(g, ix, depuis, accroches[i], positions[i] as [number, number]);
    if (p.etat !== "ok") continue;
    /* ⚠️ LA BANDE SE JUGE SUR LE TOTAL, PAS SUR LA PRÉSÉLECTION. Le filtre
       d'au-dessus trie sur la distance au NŒUD, qui est une estimation ; le
       plancher, lui, est une promesse — « ce n'est pas la traversée d'un
       parking » — et une promesse se tient sur le nombre qu'on affiche. */
    if (p.metres < min) continue;
    out.push({
      spot: spots[i], i, parcours: p.parcours, minimum: p.minimum,
      metres: p.metres, approche: p.approche, sortie: p.sortie,
    });
    if (out.length >= combien) break;
  }
  return out;
}

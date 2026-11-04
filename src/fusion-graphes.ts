import type { Graphe, LieuAccroche } from "./composition";

/**
 * RECOUDRE PLUSIEURS GRAPHES EN UN SEUL, EN MÉMOIRE.
 *
 * ⭐ POURQUOI UNE FONCTION, ET PAS DIX LIGNES DANS L'EFFET QUI CHARGE. Elle y
 *    a vécu du 4 au 4/11/2026, et pendant ce temps elle portait DEUX défauts
 *    que personne ne pouvait voir : un `useEffect` qui `fetch` deux fichiers
 *    de 3 Mo ne se teste pas, et ce qui ne se teste pas se relit — c'est-à-dire
 *    se croit. Ici, trois fixtures de six nœuds suffisent à faire échouer les
 *    deux.
 * ⚠️ `territoires.ts` renvoyait DÉJÀ à « voir `fusionnerGraphes` » quand la
 *    fonction n'existait nulle part. Une note qui désigne du vide se lit comme
 *    une note qui désigne quelque chose.
 *
 * ────────────────────────────────────────────────────────────────────────
 * 🔴 CE QUI SE DÉCALE, ET CE QUI NE SE DÉCALE PAS — 4/11/2026.
 *
 * Un graphe ne porte pas de coordonnées dans ses arêtes : il porte des INDEX.
 * Les recoudre demande donc de retraduire tout index du second graphe dans le
 * repère du premier. Trois porteurs d'index, et ils ne pointent pas la même
 * table :
 *
 *   arête[0], arête[1]  → des NŒUDS
 *   arête[4]            → des NŒUDS (les points intermédiaires du tracé)
 *   lieu.a              → une ARÊTE   ⟵ celui-ci était oublié
 *
 * ⛔ `lieu.a` A ÉTÉ RECOUSU SANS DÉCALAGE PENDANT UNE JOURNÉE, et un
 *    commentaire absolvait l'oubli : « `l` n'est plus lu par cet écran ». Il
 *    l'est — `indexer()` en bâtit `lieuxParArete`, que le Dijkstra d'agrément
 *    divise dans `cout()` pour préférer les chemins qui passent près de
 *    quelque chose. Mesuré sur les fichiers réels : 218 des 280 accroches de
 *    l'Aulne retombaient sur une arête de la presqu'île, 279 lieux sur 775 à
 *    plus de 150 m de l'arête qu'ils déclaraient, le pire à 43 km.
 * ⭐ C'est le cas d'école de la description fidèle qui occupe la place de la
 *    vérification : le commentaire était exact sur les PASTILLES (elles
 *    viennent de `lieux.json`) et faux sur le GRAPHE. Assez vrai pour qu'on
 *    passe.
 *
 * ────────────────────────────────────────────────────────────────────────
 * 🔴 ET LES DEUX EMPRISES SE CHEVAUCHENT, DONC RECOUDRE NE SUFFIT PAS : IL
 *    FAUT SOUDER.
 *
 * `territoires.ts` fait exprès déborder les deux emprises de 4,5 km, pour
 *    qu'un chemin coupé par la frontière ne finisse pas en cul-de-sac dans
 *    les deux fichiers. Conséquence : 19 869 nœuds existent DEUX FOIS, aux
 *    mêmes coordonnées au centimètre. Concaténés, ils restent deux nœuds
 *    distincts — et les deux moitiés du territoire forment alors DEUX
 *    composantes qui ne se touchent nulle part.
 * ⛔ CE N'ÉTAIT PAS UN GASPILLAGE DE MÉMOIRE, C'ÉTAIT UNE PERTE DE RÉSEAU.
 *    `accrocherTous` tranche les égalités au premier arrivé, donc toujours
 *    la copie « presqu'île » — celle qui est TRONQUÉE à −4,2554. 44 lieux de
 *    la bande commune changeaient ainsi de réseau et perdaient tout l'est :
 *    « Chapelle Sainte-Anne de Troaon » tombait à ZÉRO lieu atteignable,
 *    donc aucune proposition, sur un écran qui en promet trois.
 * ⭐ Souder répare plus que ça : composer une promenade qui TRAVERSE la
 *    frontière devient possible. C'était le « prix assumé » du découpage en
 *    deux fichiers ; il ne se paie plus.
 *
 * ⚠️ ON DÉDOUBLONNE LES NŒUDS, PAS LES ARÊTES, et c'est délibéré. Les nœuds
 *    se fondent sans rien décaler d'autre (la table `remap` s'en charge) ;
 *    dédoublonner les arêtes décalerait TOUS les `lieu.a` et demanderait un
 *    second remap — plus de surface pour un gain de mémoire seul. Il reste
 *    donc ~3 900 arêtes en double, qui sont des doublons de TRAJET : pour un
 *    Dijkstra, une arête en double est un choix redondant au même coût, pas
 *    une erreur.
 * ⚠️ L'ÉGALITÉ DES COORDONNÉES EST STRICTE, et ça aussi est voulu. Ces
 *    doublons sont le MÊME objet OpenStreetMap moissonné deux fois : leurs
 *    coordonnées sont identiques bit à bit. Une tolérance souderait des
 *    nœuds réellement distincts — deux chemins qui se frôlent sans se
 *    croiser deviendraient un carrefour qui n'existe pas sur le terrain.
 */
export function fusionnerGraphes(graphes: Graphe[], territoire: string): Graphe {
  if (graphes.length === 0) throw new Error("fusionnerGraphes : aucun graphe");
  if (graphes.length === 1) return { ...graphes[0], territoire };

  const n: [number, number][] = [];
  /**
   * 🔴 DEUX `Map` IMBRIQUÉES, PAS UNE CLEF `"lon,lat"` — 4/11/2026, et c'est
   *    une mesure, pas un goût. Souder 186 506 nœuds par clef-chaîne coûtait
   *    **530 ms** sur ce Mac ; par lon puis par lat, **293 ms**. La soudure
   *    est le plus gros bloc de calcul synchrone de l'écran : à ~3× sur un
   *    téléphone, 1,6 s de fil principal gelé au lieu de 0,9.
   * ⭐ CE N'ÉTAIT PAS LA RECHERCHE QUI COÛTAIT, C'ÉTAIT LA FABRICATION DE LA
   *    CLEF. Chaque nœud créait une chaîne de ~22 caractères, à jeter aussitôt
   *    — 186 506 chaînes pour 19 871 soudures. Les nombres sont déjà des clefs
   *    de `Map` valides.
   * ⚠️ L'ÉGALITÉ RESTE EXACTEMENT LA MÊME, bit à bit, et c'est ce qui rend ce
   *    changement sûr : `Map` compare ses clefs en SameValueZero, comme
   *    `${lon},${lat}` comparait les siennes. Vérifié sur les fichiers réels
   *    — 166 635 nœuds dans les deux cas, au nœud près.
   * ⛔ UNE VARIANTE DEUX FOIS PLUS RAPIDE A ÉTÉ MESURÉE PUIS ÉCARTÉE
   *    (89 ms) : n'indexer que la bande de recouvrement, puisqu'un jumeau ne
   *    peut venir que de là. Elle rend **166 637** nœuds — deux de plus. Les
   *    deux manquants sont des doublons INTERNES à `presquile.json` (78 363
   *    nœuds, 78 361 coordonnées distinctes), hors bande, que la soudure
   *    exhaustive fond et que la bande laisse. ⭐ Un gain de 200 ms qui change
   *    la réponse sur deux nœuds sur 166 635 : l'écart est négligeable, le
   *    fait qu'on ne l'ait vu qu'en comparant les COMPTES ne l'est pas. Un
   *    chronomètre seul l'aurait expédié. À rouvrir hors veille de démo —
   *    avec la vraie question dessous : `/promenades`, qui ne soude rien,
   *    garde ces deux doublons.
   */
  const vus = new Map<number, Map<number, number>>();
  const a: Graphe["a"] = [];
  const l: LieuAccroche[] = [];

  for (const g of graphes) {
    /* ⚠️ RELEVÉ AVANT D'AJOUTER LES ARÊTES DE CE GRAPHE : c'est le rang de sa
       première arête dans la table fusionnée, donc exactement ce qu'il faut
       ajouter à ses `lieu.a`. Relevé après, il vaudrait le rang de la
       DERNIÈRE — et tous les lieux pointeraient au-delà de leur arête. */
    const decalageArete = a.length;

    /* La table locale → fusionnée. Un nœud déjà vu rend son rang d'origine :
       c'est la soudure. */
    const remap = g.n.map(([lon, lat]) => {
      let parLat = vus.get(lon);
      if (parLat === undefined) {
        parLat = new Map();
        vus.set(lon, parLat);
      } else {
        const deja = parLat.get(lat);
        if (deja !== undefined) return deja;
      }
      parLat.set(lat, n.length);
      n.push([lon, lat]);
      return n.length - 1;
    });

    for (const ar of g.a) {
      const copie = [...ar] as Graphe["a"][number];
      copie[0] = remap[ar[0]];
      copie[1] = remap[ar[1]];
      copie[4] = ar[4].map((i) => remap[i]);
      a.push(copie);
    }

    for (const li of g.l) l.push({ ...li, a: li.a + decalageArete });
  }

  return {
    ...graphes[0],
    /* ⚠️ LA PLUS ANCIENNE DES DATES, pas celle du premier fichier. Un graphe
       fusionné n'est à jour que de sa moitié la plus vieille ; annoncer la
       plus récente promettrait une fraîcheur que la moitié d'en face n'a
       pas. */
    genere: graphes.map((g) => g.genere).sort()[0],
    territoire,
    n, a, l,
  };
}

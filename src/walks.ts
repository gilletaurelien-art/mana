// Données des promenades — RÉELLES, extraites de notre base le 28/10/2026
// APRÈS la réparation du recollement des sentiers (moisson du jour même).
//
// Source : OpenStreetMap, via public.sentiers_traces, sous licence ODbL —
// l'attribution est affichée sur la carte et sur chaque fiche.
//
// ✅ QUATRE PROMENADES DE LA PRESQU'ÎLE DE CROZON. Le 28/10 au matin il n'y en
// avait AUCUNE d'affichable : les morceaux des sentiers étaient concaténés sans
// remise en ordre, et les 132 tracés du Finistère échouaient tous au contrôle.
// Après réparation, la presqu'île en porte 16, dont 15 à ZÉRO point répété.
//
// ⚠️ LE NUMÉRO DE PORTION N'EST PAS UNE IDENTITÉ. `source_ref` finit par
// `#<n>`, et ce n vient du découpage, donc de la longueur, donc de l'état de
// la moisson. Après la réparation, `12981381` est passée de 5 à 10 portions :
// les anciens `#4`/`#5` EXISTENT TOUJOURS et désignent un AUTRE tronçon.
// 🔴 Une page qui cite un numéro affiche donc un autre endroit SANS ERREUR —
//    pire qu'une page cassée, puisque rien ne la dénonce.
//    CHOISIR UN TRONÇON PAR SA GÉOMÉTRIE (ce qu'il traverse), jamais par son n°.
//
// CE QU'ON N'AFFICHE PAS, FAUTE DE LE SAVOIR :
//   · l'altitude — aucun relief en base, donc aucun profil (il serait inventé) ;
//   · la difficulté, l'accès poussette/PMR, les chiens — absents d'OSM ;
//   · la durée est une ESTIMATION à 3,5 km/h, annoncée comme telle.

/** Au-delà, c'est certainement une corde : le moissonneur découpe déjà à 500 m. */
const SAUT_MAX_M = 600;
/** Part de points répétés tolérée — voir verifierTrace(). */
const PART_REPETES_MAX = 0.08;

export interface WalkPoint { lat: number; lon: number }

export interface Etape {
  nom: string;
  categorie: string;
  /** Position LE LONG du chemin, de 0 (départ) à 1 (arrivée). */
  pos: number;
  lat: number;
  lon: number;
}

/**
 * ⚠️ AU-DELÀ DE HUIT HEURES, ON COMPTE EN JOURS.
 *
 * « 58 h de marche » pour le Chemin des Douaniers Morlaix–Portsall est juste et
 * inutilisable : personne ne marche cinquante-huit heures d'affilée. Base de
 * six heures par jour — une convention, pas un relevé, et elle est DITE.
 *
 * ⭐ Cette fonction vit ici, et pas dans chacune des deux pages, parce que le
 *    défaut a été vu d'abord sur la liste, corrigé là, puis retrouvé identique
 *    sur la fiche. Une règle d'affichage recopiée se corrige une fois sur deux.
 */
/** ⚠️ VIRGULE DÉCIMALE, PAS POINT. `${3.5}` rend « 3.5 » : la notation
 *  anglaise, sur un site en français qui nomme des lieux bretons. Le défaut
 *  est invisible à la relecture du code et saute aux yeux à l'écran. */
const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export function effortLisible(km: number): string {
  const h = km / 3.5;
  if (h <= 8) return `≈ ${fr(Math.round(h * 2) / 2)} h de marche`;
  return `≈ ${Math.ceil(h / 6)} jours de marche (6 h/jour)`;
}

/**
 * ⛔ QUI RÉPOND DE CE TRACÉ — et ce n'est pas une étiquette décorative.
 *
 * Les trois rangs ne disent pas la même chose, et la confusion a un coût qui
 * n'est pas esthétique : quelqu'un qui suit une boucle NON BALISÉE sur le
 * sentier côtier doit le savoir avant de partir, pas le découvrir à une
 * bifurcation, de nuit, au-dessus d'une falaise.
 *
 * · `ot`      — balisé et entretenu par l'Office de tourisme. Il y a des
 *               marques sur les poteaux. ⛔ Ce rang exige LEURS tracés : un
 *               tracé redessiné « d'après » un balisage n'est pas le balisage,
 *               et il fait quitter le chemin marqué à la première imprécision
 *               — sous un libellé qui dit « balisé ».
 * · `mana`    — parcouru et vérifié par nous. Pas de balisage promis.
 * · `osm`     — relation nommée dans OpenStreetMap. 🔴 CE RANG A ÉTÉ AJOUTÉ
 *               PARCE QUE LE TYPE L'A EXIGÉ : les 1 032 itinéraires bretons
 *               du catalogue ne rentraient dans aucun des trois autres. Ils
 *               sont souvent balisés — par une commune, une fédération — mais
 *               nous ne savons PAS par qui, et nous ne les avons pas
 *               parcourus. Les ranger en `ot` aurait été la faute exacte que
 *               ce champ existe pour empêcher.
 *               ⭐ Un champ obligatoire ne sert pas qu'à remplir des cases :
 *                  il a trouvé une catégorie que je n'avais pas vue, à
 *                  l'endroit où le compilateur a refusé de deviner.
 * · `compose` — fabriqué par le moteur depuis une position. Aucune marque sur
 *               le terrain, aucun passage humain.
 *
 * ⭐ ET LE LIBELLÉ DIT UN FAIT, PAS UN AVIS. « L'office de tourisme
 *    recommande » affirme que l'Office adoube MANA : c'est une affirmation sur
 *    un tiers, elle se retire, et elle vieillit mal. « Balisé par l'Office de
 *    tourisme » se constate sur un poteau.
 */
export type Provenance = "ot" | "mana" | "osm" | "compose";

export const MENTION: Record<Provenance, string> = {
  ot: "Itinéraire balisé par l'Office de tourisme",
  mana: "Vérifié sur le terrain par MANA",
  osm: "Tracé relevé dans OpenStreetMap — balisage non vérifié",
  compose: "Composé par MANA — non balisé",
};

export interface Walk {
  slug: string;
  /** Qui répond de ce tracé. ⚠️ Pas optionnel : un itinéraire sans rang
   *  déclaré s'afficherait sans mention, et l'absence de mention se lit comme
   *  « c'est balisé » — le défaut dans le sens le plus coûteux. */
  provenance: Provenance;
  titre: string;
  lieu: string;
  resume: string;
  distanceKm: number;
  /** Marche à 3,5 km/h — une estimation, jamais un relevé. */
  dureeEstimeeH: number;
  /**
   * Montée cumulée en mètres, le long de la géométrie. ⚠️ OPTIONNELLE, et
   * l'absence est une information : un itinéraire de l'Office porte le
   * relevé que l'Office a mesuré au sol, pas le nôtre, et une promenade
   * bâtie sur un graphe sans altitude n'en a aucune. ⛔ Ne jamais la
   * remplacer par 0 — un zéro se lit « c'est plat ».
   */
  monteeM?: number;
  /**
   * 🔴 LES DEUX BOUTS QUI NE SONT PAS SUR LE TRACÉ DESSINÉ — et sans eux, la
   *    progression mélange deux référentiels. `distanceKm` compte le réseau
   *    PLUS la marche du lieu de départ jusqu'au premier chemin, et du
   *    dernier chemin jusqu'au lieu visé ; `points`, lui, ne dessine que le
   *    réseau. Multiplier l'un par une fraction de l'autre annonce des
   *    kilomètres faux aux deux bouts — jusqu'à 381 m d'un côté et 150 de
   *    l'autre, mesuré le 2/11.
   * ⚠️ OPTIONNELS : un itinéraire du catalogue commence et finit SUR son
   *    tracé, il n'a aucun bout hors réseau. Leur absence vaut zéro ici,
   *    et c'est le seul cas où une absence vaut zéro dans ce fichier —
   *    parce qu'elle décrit une géométrie, pas une mesure manquante.
   */
  approcheM?: number;
  sortieM?: number;
  boucle: boolean;
  osmUrl: string;
  osmRef: string;
  points: WalkPoint[];
  /**
   * ⛔ LES MORCEAUX, QUAND L'ITINÉRAIRE N'EST PAS CONTINU — et c'est un garde,
   *    pas un raffinement.
   *
   * Un itinéraire breton est stocké en portions de ~12 km. Mesuré le
   * 28/10/2026 sur la Bretagne : 123 jointures sur 575 ont un écart de plus de
   * 50 m, **jusqu'à 83 km**. Les concaténer en une seule ligne dessinerait une
   * droite à travers la Bretagne — et elle aurait l'air d'un sentier.
   *
   * ⭐ On ne fabrique pas la continuité qu'on n'a pas mesurée. Quand `traits`
   *    est présent, la carte dessine un sous-chemin par morceau ; `points`
   *    reste le tout-venant à plat, pour le cadrage et les repères.
   */
  traits?: WalkPoint[][];
  etapes: Etape[];
}


/**
 * ── CE QUE LE PRODUIT MONTRE ─────────────────────────────────────────────
 *
 * 🔴 LES QUATRE PROMENADES MANA SONT PARTIES LE 12/11/2026 — arbitrage du
 *    fondateur : « on ne garde que les balades de l'OT et notre compositeur
 *    interactif de promenade ». L'offre tient désormais en DEUX choses, et
 *    celle-ci n'en était pas.
 *
 * ⚠️ CE N'EST PAS LE RETRAIT DU 31/10, ET LA DIFFÉRENCE EST TOUT LE SUJET.
 *    Ce jour-là, `VITRINE` avait été vidée : les quatre ne s'affichaient plus
 *    dans aucune liste, mais `/promenade/forts-du-goulet` répondait encore,
 *    avec sa carte, ses étapes et son GPX. Six semaines durant, le produit a
 *    donc porté un troisième contenu que plus rien ne nommait. Vider une
 *    vitrine ne retire pas la marchandise de la réserve.
 *
 * ⛔ ET LEURS ADRESSES MEURENT AVEC, C'EST MESURÉ, PAS SUPPOSÉ. Les quatre
 *    identifiants ont été sondés sur le catalogue distant avant le retrait —
 *    `https://mana.bzh/bretagne/t/<slug>.json` rend **404** pour les quatre.
 *    Il n'y a donc pas de repli : la fiche dira « cette promenade n'existe
 *    pas », ce qui est devenu vrai. (Trois des quatre tracés existent côté
 *    OSM sous d'AUTRES identifiants, dans l'index des 1 032 — ce sont les
 *    mêmes relations, pas les mêmes fiches, et sans la mention « vérifié sur
 *    le terrain ».)
 *
 * ⭐ LES DONNÉES NE SONT PAS PERDUES, ELLES SONT DANS L'HISTOIRE. Les quatre
 *    tracés (1 774 points), leurs résumés et leurs étapes vivaient ici ;
 *    `git show <avant ce commit>:src/walks.ts` les rend intacts. Les remettre
 *    se fait au même endroit qu'avant : en reposant `WALKS`.
 *
 * ⚠️ `WALKS` RESTE LA SOURCE DES ROUTES, et c'est pour ça qu'elle reste
 *    ÉCRITE plutôt que supprimée : six écrans la lisent (`FichePromenade`,
 *    `Promenade`, `EnChemin`, `Rencontres`, `Espace`, `Territoire2030`) et
 *    la traitent tous comme « promenade embarquée, sinon catalogue
 *    distant ». Vide, ils basculent tous sur le catalogue — ils ne cassent
 *    pas. ⛔ SAUF LE CARNET : `Espace.tsx` ne lit QUE `WALKS`, donc « Mes
 *    promenades » est désormais vide pour tout le monde, quoi qu'on ait mis
 *    en marque-page. C'est une conséquence, pas une intention.
 */
export const VITRINE: Walk[] = [];

/** ⛔ VIDE PAR DÉCISION — voir le bloc ci-dessus. Pas un oubli, pas un
 *  chargement en attente : le produit ne porte plus de promenade à lui. */
export const WALKS: Walk[] = [];

// ─────────────────────────────────────────────────────────────────────────
//  Géo-outils maison (zéro dépendance).
// ─────────────────────────────────────────────────────────────────────────

export function bbox(points: WalkPoint[]) {
  let latMin = Infinity, latMax = -Infinity, lonMin = Infinity, lonMax = -Infinity;
  for (const p of points) {
    latMin = Math.min(latMin, p.lat); latMax = Math.max(latMax, p.lat);
    lonMin = Math.min(lonMin, p.lon); lonMax = Math.max(lonMax, p.lon);
  }
  return { latMin, latMax, lonMin, lonMax };
}

/** Distance entre deux points GPS (mètres) — formule de l'haversine. */
export function distM(a: WalkPoint, b: WalkPoint): number {
  const R = 6371000;
  const la = (a.lat * Math.PI) / 180, lb = (b.lat * Math.PI) / 180;
  const dLat = lb - la, dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance d'un point au tracé (mètres) : minimum sur les segments. */
export function distAuTrace(p: WalkPoint, trace: WalkPoint[]): number {
  let best = Infinity;
  for (let i = 1; i < trace.length; i++) {
    const a = trace[i - 1], b = trace[i];
    const ab = distM(a, b) || 1;
    const ap = distM(a, p), bp = distM(b, p);
    const t = Math.max(0, Math.min(1, (ap * ap - bp * bp + ab * ab) / (2 * ab * ab)));
    best = Math.min(best, distM(p, { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t }));
  }
  return best;
}

/** Saut maximal entre deux points consécutifs (mètres). */
export function sautMax(trace: WalkPoint[]): number {
  let max = 0;
  for (let i = 1; i < trace.length; i++) max = Math.max(max, distM(trace[i - 1], trace[i]));
  return max;
}

/** Nombre de points EXACTEMENT répétés. */
export function pointsRepetes(trace: WalkPoint[]): number {
  return trace.length - new Set(trace.map((p) => `${p.lat},${p.lon}`)).size;
}

/**
 * ⛔ LE CONTRÔLE D'ADMISSION D'UN TRACÉ — en code, pas en commentaire.
 *
 * Le 28/10/2026 la page affichait un parcours INVENTÉ présenté comme le GR34,
 * et la plupart des tracés RÉELS de la base étaient des morceaux de sentier
 * concaténés sans remise en ordre, donc traversés de cordes droites.
 *
 * ⭐ LA LONGUEUR NE DÉTECTE RIEN. Le moissonneur coupait tout saut de plus de
 * 500 m : les tracés abîmés sortaient avec une longueur plausible et passaient
 * tout contrôle de distance.
 *
 * 🔴 LE SEUIL DE SAUT A ÉTÉ RETOURNÉ (150 m → 600 m). Mesure sur la donnée OSM
 * brute : un chemin porte légitimement des segments droits allant jusqu'à
 * ~308 m — une ligne droite en pleine lande. À 150 m, ce garde aurait refusé
 * les tracés RÉPARÉS, et comme il tourne dans `npm run build`, il aurait fait
 * échouer le déploiement SUR DE LA BONNE DONNÉE.
 * ⭐ Un garde calibré sur des données malades prend la guérison pour une panne.
 *
 * ⭐ ET CE CONTRÔLE EST UN DÉTECTEUR DE FUMÉE, PAS UNE PREUVE. L'invariant qui
 * tranche — longueur = somme des ways — n'existe QU'À LA MOISSON, là où les
 * ways ont encore leur identité. Cette app n'a que la polyligne : elle ne peut
 * pas le recalculer. Ne pas lui demander de certifier ce qu'elle ne voit pas.
 */
export function verifierTrace(trace: WalkPoint[]): string[] {
  const maux: string[] = [];
  if (trace.length < 2) maux.push("tracé vide ou réduit à un point");

  const saut = sautMax(trace);
  if (saut > SAUT_MAX_M) maux.push(`saut de ${Math.round(saut)} m entre deux points consécutifs`);

  // ⛔ SEUIL GÉNÉREUX, À NE PAS RESSERRER. Un sentier repasse LÉGITIMEMENT par
  //    un même nœud : une antenne aller-retour vers une pointe revient par le
  //    même chemin. Mesuré sur un circuit PARFAITEMENT recollé (« La Vallée de
  //    la Laïta », longueur exactement égale à la somme de ses ways) : 326
  //    points répétés. Un seuil serré l'aurait refusé.
  const rep = pointsRepetes(trace);
  if (rep / trace.length > PART_REPETES_MAX)
    maux.push(`${rep} points répétés sur ${trace.length} — morceaux recollés dans le désordre`);

  return maux;
}

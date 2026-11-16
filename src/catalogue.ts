// Les sentiers de randonnée de BRETAGNE — servis en fichiers par mana.bzh.
//
// ⭐ POURQUOI DES FICHIERS, ET PAS LA BASE. Cette application n'appelle AUCUNE
//    fonction de la base MANA : zéro `supabase`, zéro `rpc(` dans tout `src/`.
//    Elle lit un index et un tracé. Ce n'est pas une économie de moyens, c'est
//    une propriété : le 28/10/2026, quatre fonctions publiques de l'ancienne
//    app rendaient des adresses de domicile à qui les appelait. Ici, **il n'y a
//    rien à appeler.**
//
// ⭐ ET LA DONNÉE N'EST PAS DANS CE DÉPÔT : elle change au rythme de la
//    MOISSON, le code au rythme des déploiements. Les réunir obligerait à un
//    commit de plusieurs mégaoctets à chaque récolte.
//    Engendrée par `~/export-bretagne/export-bzh.sql`, servie depuis
//    `/bretagne/`, exactement comme les tuiles depuis `/carte/`.
//
// ⚠️ L'ORIGINE DE CETTE PAGE EST DANS UNE LISTE BLANCHE CÔTÉ SERVEUR. Servie
//    depuis une origine absente de cette liste, la page ne rend RIEN et
//    **aucune erreur ne s'affiche** : seule la console parle.
//
// ⛔ CE FICHIER NE S'APPELLE PAS `promenades.ts` : `Promenades.tsx` existe, et
//    deux fichiers qui ne diffèrent que par la CASSE se résolvent au hasard sur
//    macOS. Déjà vécu deux fois dans l'écosystème.

import type { Walk, WalkPoint, Etape } from "./walks";

const BASE = "https://mana.bzh/bretagne";
/** Les communes de France servent au seul usage de la recherche par proximité. */
const COMMUNES = "https://mana.bzh/promenades/communes.json";

/** Ce que porte l'index : de quoi lister et chercher, sans la géométrie. */
export interface Fiche {
  /** slug */ s: string;
  /** nom de l'itinéraire */ n: string;
  /** longueur en km */ k: number;
  /** commune de départ */ d: string | null;
  /** commune d'arrivée */ a: string | null;
  /** nombre de communes traversées */ c: number;
  /** nombre de morceaux stockés */ p: number;
  /** longitude du départ */ x: number;
  /** latitude du départ */ y: number;
  /** boucle — MESURÉ : départ et arrivée à moins de 300 m */ o: boolean;
  /** plus grand écart entre deux morceaux consécutifs, en mètres */ j: number;
}

/**
 * ⚠️ AU-DESSUS DE CE SEUIL, ON NE PROMET PLUS D'ARRIVÉE.
 *
 * L'arrivée stockée est la fin du DERNIER MORCEAU, pas celle du parcours. Sur
 * « De Douarnenez à Redon », dont les morceaux sont séparés de 83 km, elle
 * tombe à Saint-Jean-Brévelay — et la page afficherait « Douarnenez →
 * Saint-Jean-Brévelay » juste sous un titre qui annonce Redon.
 * ⭐ Ce qu'on affiche dit ce qu'on promet : un itinéraire morcelé se présente
 *    « au départ de », jamais « de … à … ».
 */
export const SAUT_TOLERE_M = 50;

export const estContinu = (f: Fiche): boolean => f.j < SAUT_TOLERE_M;

/** Comment nommer le trajet d'une fiche, sans rien promettre de faux. */
export function trajet(f: Fiche): string {
  if (f.o && f.d) return `boucle au départ de ${f.d}`;
  if (estContinu(f) && f.d && f.a && f.d !== f.a) return `${f.d} → ${f.a}`;
  if (f.d) return `au départ de ${f.d}`;
  return `${f.c} commune${f.c > 1 ? "s" : ""} traversée${f.c > 1 ? "s" : ""}`;
}

let index: Promise<Fiche[]> | null = null;

/** L'index complet — 1 032 itinéraires, ~160 Ko, une fois par visite. */
export function chargerIndex(): Promise<Fiche[]> {
  // ⚠️ On mémorise la PROMESSE, pas le résultat : deux composants qui
  //    demandent l'index en même temps ne doivent pas le télécharger deux fois.
  if (!index) {
    index = fetch(`${BASE}/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`index: HTTP ${r.status}`);
        return r.json();
      })
      .catch((e) => {
        index = null; // un échec ne se mémorise pas : on pourra réessayer
        throw e;
      });
  }
  return index;
}

interface ItineraireDistant extends Fiche {
  rel: string;
  b: [number, number, number, number];
  g: { type: string; coordinates: [number, number][][] };
}

/**
 * ⛔ « ABSENT » ET « PAS PU LIRE » NE SONT PAS LA MÊME RÉPONSE — 16/11/2026.
 *
 * 🔴 Cette fonction rendait `null` pour TOUT `!r.ok`. Un 502 du relais, un 504
 *    à froid, une coupure : l'écran répondait « Cette promenade n'existe pas.
 *    Aucun parcours ne porte le nom « … ». Il a peut-être été renommé. »
 *    ⭐ Ce sont les 69 liens de la liste « promenades au départ de Brest terres
 *    océanes », montrée aux intercommunalités. Un produit qui accuse sa propre
 *    donnée d'être absente alors qu'elle est là coûte plus cher qu'un produit
 *    qui dit « je n'ai pas pu lire » : on ne rouvre pas une certitude.
 *
 * ⚠️ SEUL LE 404 EST UNE ABSENCE. Tout le reste LÈVE, et l'appelant décide quoi
 *    en dire. `points.length === 0` reste une absence : le fichier est là, il
 *    ne contient pas de chemin — l'écran n'a rien à montrer et le dire autrement
 *    serait inventer une panne.
 */
export class PromenadeIllisible extends Error {
  constructor(public readonly statut: number) {
    super(`la promenade n'a pas pu être lue (HTTP ${statut})`);
    this.name = "PromenadeIllisible";
  }
}

/** Un itinéraire complet, géométrie comprise. */
export async function chargerItineraire(slug: string): Promise<Walk | null> {
  const r = await fetch(`${BASE}/t/${encodeURIComponent(slug)}.json`);
  if (r.status === 404) return null;
  if (!r.ok) throw new PromenadeIllisible(r.status);
  const d: ItineraireDistant = await r.json();

  // ⛔ LES MORCEAUX RESTENT DES MORCEAUX. On les expose en `traits` ; `points`
  //    n'est que leur concaténation à plat, pour le cadrage et les repères.
  //    La carte dessine `traits`, donc rien ne relie deux morceaux disjoints.
  const traits: WalkPoint[][] = (d.g?.coordinates ?? []).map((ligne) =>
    ligne.map(([lon, lat]) => ({ lon, lat }))
  );
  const points: WalkPoint[] = traits.flat();
  if (points.length === 0) return null;

  const etapes: Etape[] = [];
  return {
    // relation OSM nommée : balisée par on ne sait qui, non parcourue
    provenance: "osm" as const,
    slug: d.s,
    titre: d.n,
    lieu: d.d ?? "Bretagne",
    resume: "",
    distanceKm: d.k,
    // Marche à 3,5 km/h — une estimation, jamais un relevé.
    dureeEstimeeH: Math.round((d.k / 3.5) * 2) / 2,
    boucle: d.o,
    osmUrl: `https://www.openstreetmap.org/${d.rel.replace("osm:", "").replace(":", "/")}`,
    osmRef: d.rel,
    points,
    traits,
    etapes,
  };
}

/** Une commune : [nom, lon, lat]. Le point est au centre du territoire. */
export type Commune = [string, number, number];

let communes: Promise<Commune[]> | null = null;

export function chargerCommunes(): Promise<Commune[]> {
  if (!communes) {
    communes = fetch(COMMUNES)
      .then((r) => {
        if (!r.ok) throw new Error(`communes: HTTP ${r.status}`);
        return r.json();
      })
      .catch((e) => {
        communes = null;
        throw e;
      });
  }
  return communes;
}

const sansAccent = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Distance approchée en km — suffisante pour trier des voisinages. */
function km(aLon: number, aLat: number, bLon: number, bLat: number): number {
  const dLat = (bLat - aLat) * 111;
  const dLon = (bLon - aLon) * 111 * Math.cos((aLat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/**
 * ⛔ LA RECHERCHE NE SE FAIT PAS SUR LE NOM DE COMMUNE RATTACHÉ.
 *
 * Mesuré le 28/10/2026 sur le catalogue France : chercher « Bayonne » rendait
 * **zéro** alors que 19 parcours passaient à moins de 12 km. Un sentier porte
 * une commune, pas les trente qu'il traverse.
 * ⭐ « Aucun sentier à Bayonne » était une réponse CONFIANTE ET FAUSSE — pire
 *    qu'une absence de réponse, parce qu'on ne rouvre pas une certitude.
 *
 * On résout donc la localité en COORDONNÉES, puis on cherche autour du DÉPART.
 *
 * ⚠️ Ça reste une approximation assumée : on compare au point de départ, pas au
 *    tracé. Un GR de 200 km qui passe à Quimper sans en partir ne sortira pas
 *    sur « Quimper ». Le dire dans l'interface, ne pas le cacher.
 */
export function chercher(
  fiches: Fiche[],
  q: string,
  lieux: Commune[] | null,
  rayonKm = 20
): Fiche[] {
  const m = sansAccent(q.trim());
  if (!m) return [];

  const lieu =
    lieux?.find((c) => sansAccent(c[0]) === m) ??
    lieux?.find((c) => sansAccent(c[0]).startsWith(m));

  if (lieu) {
    const [, lon, lat] = lieu;
    const proches = fiches
      .map((f) => ({ f, d: km(lon, lat, f.x, f.y) }))
      .filter((o) => o.d <= rayonKm)
      .sort((a, b) => a.d - b.d)
      .map((o) => o.f);
    // ⚠️ Une commune bretonne sans sentier au départ existe : on retombe alors
    //    sur le texte plutôt que de rendre une liste vide trompeuse.
    if (proches.length > 0) return proches;
  }

  return fiches.filter(
    (f) =>
      sansAccent(f.n).includes(m) ||
      sansAccent(f.d ?? "").includes(m) ||
      sansAccent(f.a ?? "").includes(m)
  );
}

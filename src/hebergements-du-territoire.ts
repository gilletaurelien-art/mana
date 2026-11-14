/**
 * LES HÉBERGEMENTS D'UN TERRITOIRE — le type, le chargement, et la règle de
 * fusion, en un seul endroit.
 *
 * 🔴 ÉCRIT LE 15/11/2026 PARCE QUE LA RÈGLE DE FUSION ALLAIT EXISTER EN DEUX
 *    EXEMPLAIRES. `scripts/hebergements.ts` dédoublonne À L'EXPORT, par
 *    « même nom ET moins de 200 m » — mesuré : « Altes Zollhaus » apparaît
 *    deux fois dans le Mullerthal, à 20 m d'écart, parce que deux sources
 *    décrivent le même hôtel de part et d'autre d'une frontière.
 *
 * ⛔ ET CETTE RÈGLE REDEVIENT NÉCESSAIRE À L'AFFICHAGE, pour une raison que
 *    l'export ne peut pas couvrir : il dédoublonne DANS un territoire, et la
 *    carte du territoire en charge DEUX. Or les emprises de la presqu'île et
 *    de l'Aulne se recouvrent de 4,5 km — à dessein, pour qu'un chemin coupé
 *    par la frontière ne finisse pas en cul-de-sac. Un hôtel de ce
 *    recouvrement est donc dans les deux fichiers, et deux épingles
 *    superposées à 2 px l'une de l'autre, ce dépôt les a déjà payées :
 *    « une superposition de 2 px cachait 1 site sur 5 ».
 * ⭐ La règle vit donc ICI, et le script d'export l'importe. Une seule
 *    définition, deux emplois — plutôt que deux définitions qui divergeront
 *    à la première retouche, en silence, puisque chacune reste juste seule.
 */
import { metres } from "./composition";
import { urlHebergements, type Territoire } from "./territoires";

/** Ce que porte le fichier — voir `scripts/hebergements.ts`. */
export interface Hebergement {
  n: string;
  t: string | null;
  c: string | null;
  lits?: number;
  ch?: number;
  g: [number, number];
}

/** ⭐ Au-delà, deux lieux de même nom sont deux lieux : un camping municipal
 *  n'est pas celui de la commune voisine. En deçà, c'est le même, décrit
 *  deux fois. Il faut les DEUX conditions — la distance seule fondrait un
 *  hôtel et le camping d'en face. */
export const MEME_LIEU_M = 200;

/**
 * Fond les descriptions multiples d'un même hébergement.
 * ⭐ On garde la ligne la PLUS RENSEIGNÉE : entre deux descriptions du même
 *    lieu, celle qui porte les couchages vaut mieux que l'autre.
 */
export function fusionner(bruts: readonly Hebergement[]): Hebergement[] {
  const out: Hebergement[] = [];
  for (const x of bruts) {
    const jumeau = out.find((y) => y.n === x.n && metres(y.g, x.g) < MEME_LIEU_M);
    if (!jumeau) { out.push(x); continue; }
    if ((x.lits ?? 0) + (x.ch ?? 0) > (jumeau.lits ?? 0) + (jumeau.ch ?? 0)) {
      out[out.indexOf(jumeau)] = x;
    }
  }
  return out;
}

/** Ce qu'un chargement a rendu — et ce qu'il n'a PAS pu rendre. */
export interface Chargement {
  hebergements: Hebergement[];
  /** Les territoires dont le fichier n'a pas répondu. */
  manquants: string[];
}

/**
 * Charge les hébergements de plusieurs territoires et les fond.
 *
 * ⛔ UN FICHIER QUI NE RÉPOND PAS N'EST PAS UN TERRITOIRE SANS HÉBERGEMENT.
 *    `Hebergements.tsx` porte déjà la leçon : « nous n'en connaissons aucun
 *    ici » et « je n'ai pas pu demander » ne se disent pas pareil, et les
 *    confondre fait croire à un territoire désert. On rend donc les deux —
 *    ce qu'on a, et ce qui manque — et l'écran décide quoi en dire.
 */
export async function chargerHebergements(
  base: string, territoires: readonly Territoire[],
): Promise<Chargement> {
  const manquants: string[] = [];
  const lots = await Promise.all(territoires.map(async (t) => {
    try {
      const r = await fetch(urlHebergements(base, t));
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { h?: Hebergement[] };
      return j.h ?? [];
    } catch {
      manquants.push(t.slug);
      return [] as Hebergement[];
    }
  }));
  return { hebergements: fusionner(lots.flat()), manquants };
}

/**
 * ⚠️ LES TYPES VIENNENT D'OSM ET DE PORTAILS RÉGIONAUX, EN PLUSIEURS LANGUES.
 *    « Vakantiewoning », « Locazioni tur. non imprenditoriali » : les afficher
 *    tels quels donnerait une liste qu'on ne peut pas lire.
 * ⛔ Et on ne traduit QUE ce qu'on connaît : un type absent d'ici se montre
 *    tel quel plutôt que de devenir « Hébergement », qui effacerait une
 *    information au lieu de l'avouer.
 */
export const TYPES: Record<string, string> = {
  hotel: "Hôtel", Hotel: "Hôtel", motel: "Motel",
  guest_house: "Chambre d'hôtes", Guesthouse: "Chambre d'hôtes",
  hostel: "Auberge de jeunesse", chalet: "Chalet",
  camp_site: "Camping", caravan_site: "Aire de camping-car",
  apartment: "Appartement", alpine_hut: "Refuge", wilderness_hut: "Refuge",
  SelfCateringAccommodation: "Meublé", Vakantiewoning: "Meublé",
};

export const direLeType = (t: string | null) => (t ? TYPES[t] ?? t : null);

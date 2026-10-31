/**
 * LES FERMETURES OFFICIELLES — et pourquoi elles ne ressemblent à rien d'autre
 * dans ce fichier-ci.
 *
 * 🔴 UNE FERMETURE N'EST PAS UNE MARÉE. `composition.ts` porte déjà un danger,
 *    le champ `marée` de l'arête, et sa doctrine est explicite : « ON N'ÉVITE
 *    PAS CES CHEMINS » — à marée basse un estran est souvent le plus beau
 *    passage, donc on avertit et on laisse choisir. Une marée est une
 *    condition qui se résout d'elle-même deux fois par jour.
 *    Un arrêté municipal, non. C'est une interdiction, prise par une autorité,
 *    après des effondrements de falaise. On évite ET on avertit.
 *
 * ⭐ ET ON ÉVITE PAR ABSENCE, PAS PAR PÉNALITÉ. Le Dijkstra sait pénaliser une
 *    arête (× 14 pour les passages déjà empruntés) — une pénalité reste une
 *    préférence, et une préférence se franchit quand le reste coûte plus cher.
 *    Une arête fermée n'entre pas dans la carte d'adjacence : le calcul ne
 *    peut PAS la traverser. C'est la règle du dépôt appliquée ici : on
 *    supprime le chemin, on ne l'interdit pas par une note.
 *
 * ⚠️ LA PORTÉE EXACTE N'EST PAS DANS L'ARRÊTÉ. Celui-ci nomme des secteurs —
 *    « Postolonnec, Porzh Leon, Porzh Louz, Pen Hat et la Source » — sans
 *    donner de bornes. Le rayon posé ici est donc une APPROXIMATION, déclarée
 *    comme telle dans les données, et volontairement généreuse : sur une
 *    interdiction, l'erreur par excès ferme un chemin praticable, l'erreur par
 *    défaut envoie quelqu'un sur une falaise instable. Les deux ne se valent
 *    pas. La portée juste viendra de l'office de tourisme, et c'est
 *    précisément ce que le dispositif lui demande de fournir.
 *
 * ⛔ ON NE DEVINE AUCUNE COORDONNÉE. Les quatre secteurs câblés sont ceux dont
 *    le toponyme existe dans le graphe OpenStreetMap. « Porzh Louz », nommé par
 *    l'arrêté, n'y figure pas : il est déclaré dans le fichier avec
 *    `geometrie: null` et n'influence aucun calcul. Un secteur qu'on ne sait
 *    pas situer se dit ; il ne s'invente pas.
 */

import type { Graphe } from "./composition";

/** Où les fermetures se publient. Fichier SÉPARÉ du graphe, à dessein :
 *  le graphe est reconstruit par un pipeline lourd, une fermeture se publie
 *  en une minute — et c'est l'office de tourisme qui doit pouvoir la publier,
 *  pas nous. */
export const FICHIER_FERMETURES = "fermetures.json";

export type Effet =
  /** interdiction par arrêté : le calcul ne traverse pas */ "interdit"
  /** recommandation d'une autorité : on le dit, on ne décide pas */ | "avertir";

export interface Fermeture {
  id: string;
  libelle: string;
  /** communes concernées, telles que l'autorité les nomme */
  communes: string[];
  effet: Effet;
  motif: string;
  /** qui l'a décidé — jamais « MANA » */
  autorite: string;
  /** l'adresse publique où la décision se lit */
  source: string;
  /** date portée par la source elle-même, pas celle de notre relevé */
  publie_le: string;
  releve_le: string;
  /** points nommés par la décision, résolus depuis OpenStreetMap.
   *  `null` quand le toponyme n'a pas été trouvé : le secteur est alors
   *  déclaré mais n'influence rien. */
  geometrie: { nom: string; g: [number, number] }[] | null;
  /** rayon d'application autour de chaque point, en mètres — APPROXIMATION */
  rayon_m?: number;
  /** ne ferme que ce qui longe la mer : un arrêté sur le sentier côtier ne
   *  ferme pas la route du bourg qui passe à cent mètres. `null` pour ne pas
   *  filtrer. */
  distance_mer_max_m?: number | null;
  /** vrai tant que la portée exacte n'a pas été fournie par l'autorité */
  portee_approximative: boolean;
}

export interface Fermetures {
  version: number;
  mis_a_jour_le: string;
  territoire: string;
  fermetures: Fermeture[];
}

const R = 6371000;

/** distance en mètres entre deux points géographiques */
function metres(p: [number, number], q: [number, number]): number {
  const la1 = (p[1] * Math.PI) / 180, la2 = (q[1] * Math.PI) / 180;
  const dLa = la2 - la1, dLo = ((q[0] - p[0]) * Math.PI) / 180;
  const a = Math.sin(dLa / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface Touchees {
  /** arêtes que le calcul ne doit pas traverser */
  interdites: Set<number>;
  /** arêtes signalées mais praticables */
  averties: Set<number>;
  /** fermetures qui ont réellement mordu, pour l'affichage */
  actives: Fermeture[];
  /** déclarées par l'autorité mais non situées — à dire, pas à taire */
  nonSituees: Fermeture[];
}

/**
 * Quelles arêtes du graphe une liste de fermetures touche-t-elle ?
 *
 * ⚠️ On teste TOUS les points du tracé d'une arête (`ar[4]`), pas ses deux
 *    extrémités. Une arête de 556 m dont seul le milieu passe à la falaise
 *    serait sinon déclarée libre.
 */
export function aretesTouchees(g: Graphe, f: Fermetures | null): Touchees {
  const vide: Touchees = {
    interdites: new Set(), averties: new Set(), actives: [], nonSituees: [],
  };
  if (!f?.fermetures?.length) return vide;

  const interdites = new Set<number>();
  const averties = new Set<number>();
  const actives: Fermeture[] = [];
  const nonSituees: Fermeture[] = [];

  for (const ferm of f.fermetures) {
    if (!ferm.geometrie?.length) { nonSituees.push(ferm); continue; }
    const rayon = ferm.rayon_m ?? 300;
    const seuilMer = ferm.distance_mer_max_m;
    const cible = ferm.effet === "interdit" ? interdites : averties;
    let mordu = false;

    for (let i = 0; i < g.a.length; i++) {
      if (interdites.has(i)) continue;          // déjà fermée, rien à ajouter
      const ar = g.a[i];

      // ── le filtre littoral, quand la décision ne vise que le sentier côtier
      if (seuilMer != null) {
        const dm = ar[5];
        if (dm == null || dm > seuilMer) continue;
      }

      const points = ar[4] ?? [];
      let touche = false;
      for (const ni of points) {
        const p = g.n[ni];
        if (!p) continue;
        for (const { g: centre } of ferm.geometrie) {
          if (metres(p, centre) <= rayon) { touche = true; break; }
        }
        if (touche) break;
      }
      if (touche) { cible.add(i); mordu = true; }
    }
    if (mordu) actives.push(ferm);
  }

  // ⚠️ Une arête interdite ne reste pas dans « averties » : l'interdiction
  //    l'emporte, et un même tronçon ne doit pas être compté deux fois.
  for (const i of interdites) averties.delete(i);

  return { interdites, averties, actives, nonSituees };
}

/** Charge les fermetures. ⚠️ Une absence de fichier n'est PAS une erreur
 *  fatale — mais elle n'est pas non plus un succès silencieux : on rend
 *  `null`, et l'appelant doit le DIRE à l'écran. Une app qui route sans
 *  connaître les fermetures doit l'annoncer. */
export async function chargerFermetures(base: string): Promise<Fermetures | null> {
  try {
    const r = await fetch(`${base}/${FICHIER_FERMETURES}`, { cache: "no-cache" });
    if (!r.ok) return null;
    const j = (await r.json()) as Fermetures;
    return Array.isArray(j?.fermetures) ? j : null;
  } catch {
    return null;
  }
}

/**
 * ── CE QUI TOUCHE UN PARCOURS DONNÉ ──────────────────────────────────────
 * ⭐ `aretesTouchees` répond pour le GRAPHE, c'est-à-dire pour la composition
 *    d'un itinéraire. Une fiche de promenade pose une autre question : « cette
 *    promenade-ci est-elle concernée ? ». La réponse ne se déduit pas de la
 *    première — un parcours peut longer un secteur fermé sans qu'aucune arête
 *    composée ne le traverse.
 *
 * ⚠️ ET LA PORTÉE EST APPROXIMATIVE, DÉLIBÉRÉMENT. Les arrêtés nomment des
 *    lieux-dits, pas des tronçons : on applique un rayon autour des points
 *    résolus, et `portee_approximative` le dit. Afficher un périmètre net à
 *    partir d'une donnée floue serait une précision inventée.
 * ⛔ Une fermeture sans géométrie (`geometrie: null`) ne touche RIEN et ne
 *    doit pas être affichée comme concernant ce parcours : on ne sait pas où
 *    elle est. Elle reste lisible ailleurs, à l'échelle du territoire.
 */
export function fermeturesSurLeParcours(
  points: { lat: number; lon: number }[],
  f: Fermetures | null,
): Fermeture[] {
  if (!f) return [];
  return f.fermetures.filter((x) => {
    if (!x.geometrie || x.geometrie.length === 0) return false;
    const rayon = x.rayon_m ?? 300;
    return x.geometrie.some((g) =>
      points.some((p) => metres(g.g, [p.lon, p.lat]) <= rayon),
    );
  });
}

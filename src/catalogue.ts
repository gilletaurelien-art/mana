// Le catalogue des promenades de toute la France — servi en statique par mana.bzh.
//
// ⛔ CE FICHIER S'APPELAIT `promenades.ts`, ET C'ÉTAIT UN PIÈGE.
//    `Promenades.tsx` existe déjà : deux fichiers qui ne diffèrent que par la
//    CASSE. Sur un système insensible à la casse (macOS par défaut), le
//    résolveur tombe sur le mauvais. C'est exactement le défaut qui empêchait
//    `manahome-app` de se construire ailleurs que sur la CI Linux (`pros.ts`
//    contre `Pros.tsx`), découvert le matin même — et je l'ai reproduit le
//    soir. ⭐ Connaître un piège ne protège pas d'y tomber : il faut un nom
//    qui le rende impossible.
//
// ⭐ POURQUOI LA DONNÉE N'EST PAS DANS CE DÉPÔT.
//    La France entière représente ~26 600 tracés et plus de 100 Mo. Mais le
//    poids n'est pas la raison principale : **la donnée change au rythme de la
//    MOISSON, le code au rythme des déploiements.** Les mettre ensemble
//    obligerait à un commit de centaine de mégaoctets à chaque récolte, et
//    ferait vieillir le dépôt au rythme d'OpenStreetMap.
//    Elle est donc engendrée par `~/exporter-promenades.py` et servie depuis
//    `/promenades/`, exactement comme les tuiles le sont depuis `/carte/`.
//
// ⚠️ L'ORIGINE DE CETTE PAGE EST DANS UNE LISTE BLANCHE CÔTÉ SERVEUR, la même
//    que pour la carte. Servie depuis une origine absente de cette liste, la
//    recherche ne rend RIEN et **aucune erreur ne s'affiche** : seule la
//    console parle. C'est le même piège que la carte blanche.
//
// ⭐ ET LES QUATRE PROMENADES DE CROZON RESTENT EMBARQUÉES dans `walks.ts`.
//    Ce n'est pas une duplication par négligence, les deux rôles diffèrent :
//    l'embarqué s'affiche INSTANTANÉMENT et SANS RÉSEAU (c'est la vitrine, et
//    c'est ce qui tient la promesse hors ligne) ; le distant est le CATALOGUE.
//    Les tests ne gardent que l'embarqué — c'est lui qu'on expédie.

import type { Walk, Etape } from "./walks";

const BASE = "https://mana.bzh/promenades";

/** Ce que porte l'index : de quoi chercher et lister, sans la géométrie. */
export interface Fiche {
  /** slug */ s: string;
  /** titre */ t: string;
  /** commune */ c: string | null;
  /** longueur en km */ k: number;
  /** région */ r: string;
  /** boucle */ b: boolean;
  /** nombre d'étapes nommées */ e: number;
  /** longitude du départ */ x: number;
  /** latitude du départ */ y: number;
}

let index: Promise<Fiche[]> | null = null;

/** L'index complet, téléchargé une seule fois par visite. */
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
        index = null; // un échec ne doit pas se mémoriser : on pourra réessayer
        throw e;
      });
  }
  return index;
}

interface PromenadeDistante {
  slug: string; titre: string; commune: string | null; km: number;
  url: string; boucle: boolean; rep: number;
  pts: [number, number][];
  etapes: { n: string; c: string; p: number; x: number; y: number }[];
}

/** Une promenade complète, géométrie comprise. */
export async function chargerPromenade(slug: string): Promise<Walk | null> {
  const r = await fetch(`${BASE}/${encodeURIComponent(slug)}.json`);
  if (!r.ok) return null;
  const d: PromenadeDistante = await r.json();
  const etapes: Etape[] = (d.etapes ?? []).map((e) => ({
    nom: e.n, categorie: e.c, pos: e.p, lat: e.y, lon: e.x,
  }));
  return {
    slug: d.slug,
    titre: d.titre,
    lieu: d.commune ?? "France",
    resume: "",
    distanceKm: d.km,
    // Marche à 3,5 km/h — une estimation, jamais un relevé.
    dureeEstimeeH: Math.round((d.km / 3.5) * 2) / 2,
    boucle: d.boucle,
    osmUrl: d.url,
    osmRef: "",
    points: d.pts.map(([lon, lat]) => ({ lon, lat })),
    etapes,
  };
}

/** Recherche par commune ou par titre, sans accents ni casse. */
export function chercher(fiches: Fiche[], q: string): Fiche[] {
  const n = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const m = n(q.trim());
  if (!m) return [];
  return fiches.filter((f) => n(f.c ?? "").includes(m) || n(f.t).includes(m));
}

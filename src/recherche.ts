/**
 * LE MOTEUR DE RECHERCHE — UN SEUL, POUR TOUS LES ÉCRANS.
 *
 * 🔴 EXTRAIT DE `Territoire2030.tsx` LE 6/11/2026, le jour où l'accueil a
 *    redemandé une recherche. Il y vivait depuis le 31/10, mûr et correct :
 *    trois inventaires, dédoublonnage par nom ET position, comparaison sans
 *    accents, plafond à huit. Le réécrire pour l'accueil aurait donné deux
 *    moteurs — et ce dépôt sait ce que ça coûte : « le bon geste existait
 *    dans le dépôt, à côté du mauvais », c'est ainsi que les plages du monde
 *    sont restées à 5 % pendant seize jours, parce que le pipeline FRANÇAIS
 *    prenait `nwr` pendant que le pipeline MONDE prenait `node`.
 *
 * ⭐ Rien n'est changé à la logique : ce fichier est un DÉPLACEMENT, pas une
 *    réécriture. Les tests ci-contre ont été écrits APRÈS l'extraction, sur
 *    le comportement observé, pour que le prochain déplacement, lui, soit
 *    protégé.
 *
 * ⚠️ AUCUN APPEL RÉSEAU, AUCUN GÉOCODEUR. Un géocodeur tiers rendrait « 12
 *    rue de la Gare » — une information que nous n'avons pas à servir — et
 *    casserait le hors-ligne. L'index, c'est ce qu'on a déjà en cache.
 */
import type { Lieu } from "./lieux";

/** Comparaison à plat : sans accents, sans casse.
 *  ⚠️ « ile vierge » doit trouver « Île Vierge » — sans ça, la moitié des
 *  toponymes bretons sont introuvables à qui tape vite. */
export const plat = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** ⚠️ Deux caractères minimum : à un seul, tout répond, et une liste qui
 *  répond à tout n'aide pas à choisir. */
export const LONGUEUR_MIN = 2;

/** ⚠️ Plafonné à huit : une liste qui recouvre la carte ne sert plus à
 *  choisir, elle cache ce qu'on cherchait. */
export const RESULTATS_MAX = 8;

export type Resultat =
  | { genre: "promenade"; nom: string; detail: string; slug: string; g: [number, number] }
  /* ⚠️ `desc` et `wiki` VOYAGENT AVEC LE RÉSULTAT. Sans eux, le même lieu
     rendait une fiche riche au clic et une fiche nue à la recherche : deux
     chemins vers le même endroit, deux niveaux de détail, et rien pour le
     dire. ⭐ Une donnée attachée à un lieu suit le lieu, pas la façon dont on
     l'a trouvé. */
  | { genre: "lieu"; nom: string; detail: string; g: [number, number];
      desc?: string; wiki?: string };

/** Ce dont le moteur a besoin. Les promenades sont facultatives : l'accueil
 *  n'en charge pas (264 Ko), la carte oui.
 *  ⚠️ `libelle` traduit une CLÉ de catégorie en mot lisible. Jamais la clé
 *  technique à l'écran : « megalithe » ne se montre pas. */
export interface Index {
  promenades?: {
    slug: string; titre: string; lieu: string; distanceKm: number;
    points: { lon: number; lat: number }[];
    etapes: { nom: string; categorie: string; lon: number; lat: number }[];
  }[];
  lieux?: Lieu[];
  libelle: (cle: string) => string;
}

/**
 * 🔴 TROIS INVENTAIRES, ET L'ORDRE EST LE RENDU.
 *    On cherche d'abord dans les promenades, puis dans leurs étapes, puis
 *    dans l'inventaire — parce qu'une promenade répond mieux qu'un point.
 * ⭐ Un index n'est pas « les données qu'on a sous la main », c'est ce que
 *    les gens TAPENT. Mesuré le 31/10 : « Île Vierge » rendait zéro sur un
 *    site qui propose la Balade Sonore de l'Île Vierge, parce que le premier
 *    jet ne lisait que les 339 lieux accrochés au graphe.
 */
export function chercher(requete: string, index: Index): Resultat[] {
  const q = plat(requete.trim());
  if (q.length < LONGUEUR_MIN) return [];

  const walks = index.promenades ?? [];

  const promenades: Resultat[] = walks
    .filter((w) => plat(w.titre).includes(q) || plat(w.lieu).includes(q))
    .map((w) => ({
      genre: "promenade", nom: w.titre, slug: w.slug,
      detail: `${w.lieu} · ${w.distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`,
      g: [w.points[0].lon, w.points[0].lat],
    }));

  const etapes: Resultat[] = walks.flatMap((w) =>
    w.etapes.filter((e) => plat(e.nom).includes(q)).map((e) => ({
      genre: "lieu" as const, nom: e.nom,
      detail: `${index.libelle(e.categorie)} · sur ${w.titre}`,
      g: [e.lon, e.lat] as [number, number],
    })),
  );

  /* ⚠️ SEULEMENT LES NOMMÉS : chercher « plage » ne doit pas rendre cinquante
     résultats tous intitulés « Plage ». Les 734 anonymes se voient sur la
     carte, ils ne se cherchent pas par leur nom. */
  const lieux: Resultat[] = (index.lieux ?? [])
    .filter((l) => l.n && plat(l.n).includes(q))
    .map((l) => ({
      genre: "lieu" as const, nom: l.n!,
      detail: index.libelle(l.c), g: l.g,
      desc: l.desc, wiki: l.wiki,
    }));

  /* ⚠️ Dédoublonnage par NOM + POSITION ARRONDIE, jamais par nom seul : il y
     a quatre « menhir » distincts sur la presqu'île, et les fondre en un seul
     en effacerait trois. Mais une étape de promenade et le point OSM
     correspondant sont le même endroit — eux, il faut les fondre. */
  const vus = new Set<string>();
  return [...promenades, ...etapes, ...lieux]
    .filter((r) => {
      const clef = `${plat(r.nom)}@${r.g[0].toFixed(4)},${r.g[1].toFixed(4)}`;
      if (vus.has(clef)) return false;
      vus.add(clef); return true;
    })
    .slice(0, RESULTATS_MAX);
}

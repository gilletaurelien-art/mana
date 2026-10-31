// Les itinéraires balisés par l'Office de tourisme.
//
// ⛔ CE NE SONT PAS DES ITINÉRAIRES MANA, et le produit ne doit jamais le
//    laisser croire. Ils portent `provenance: "ot"` → « Itinéraire balisé par
//    l'Office de tourisme » : un FAIT qui se constate sur un poteau, pas un
//    avis. MANA ne recommande rien et ne s'attribue rien.
//
// ⚠️ L'ACCORD DE REPRISE RESTE À OBTENIR. Les 49 GPX sont publiquement
//    téléchargeables sur crozon-tourisme.bzh, ce qui ne veut pas dire
//    redistribuables : aucun fichier ne porte de licence, ni la page qui les
//    sert. La reprise est une décision du fondateur du 31/10/2026, et le sujet
//    du rendez-vous du 6/11. ⭐ On l'écrit plutôt que de le taire : une donnée
//    reprise sans accord se retire en une commande, à condition de savoir
//    qu'elle est là.
//
// ⚠️ 258 Ko : le fichier est chargé À LA DEMANDE (`import()`), jamais dans le
//    lot principal. Quelqu'un qui lit l'accueil ne paie pas les 46 tracés.

export interface ItineraireOT {
  slug: string;
  titre: string;
  /** le point de départ en toutes lettres, quand la fiche le donne (4 sur 46) */
  depart: string | null;
  /** par la Base Adresse Nationale, au point de départ (40 sur 46) */
  commune?: string | null;
  pratique: "pied" | "vtt" | "velo" | "trail";
  difficulte: "facile" | "moyen" | "difficile" | null;
  /** MESURÉE sur le tracé, pas reprise de la fiche — elles diffèrent de 1,2 %
   *  en médiane, et de 17 % au pire. */
  km: number;
  /**
   * ⭐ DÉCLARÉS PAR L'OFFICE, pas calculés par nous — et c'est ce qui les rend
   *    publiables sous un libellé « balisé par l'Office ». Une durée sortie
   *    d'une formule est une estimation ; la leur est leur parole.
   * ⛔ Et le dénivelé ne vient PAS du GPX : les 552 balises `<ele>` du
   *    « Sentier du Menhir » valent toutes 0.0.
   * ⚠️ `null` sur 6 fiches pour la durée, 2 pour le dénivelé — une absence
   *    VRAIE, qui manque à quelques-uns et non à tous. Le pipeline refuse
   *    d'écrire si elle manque aux 46.
   */
  duree: string | null;
  denivele: number | null;
  boucle: boolean;
  /** la fiche de l'Office : c'est là qu'on envoie, c'est elle qui fait foi */
  source: string;
  gpx: string;
  /** [lon, lat], simplifié à 2 m — au-delà on déplacerait un BALISAGE */
  p: [number, number][];
}

export interface Recueil {
  genere: string;
  source: string;
  avertissement: string;
  itineraires: ItineraireOT[];
}

export const PRATIQUE: Record<ItineraireOT["pratique"], string> = {
  pied: "À pied", vtt: "VTT", velo: "Vélo", trail: "Trail",
};

let cache: Promise<Recueil> | null = null;

/** ⭐ Une seule promesse, mémorisée : deux écrans qui le demandent en même
 *  temps ne téléchargent pas deux fois 258 Ko. */
export function chargerOT(): Promise<Recueil> {
  if (!cache) cache = import("./ot.json").then((m) => m.default as unknown as Recueil);
  return cache;
}

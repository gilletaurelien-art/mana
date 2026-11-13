// Les itinéraires balisés par l'Office de tourisme.
//
// ⛔ CE NE SONT PAS DES ITINÉRAIRES MANA, et le produit ne doit jamais le
//    laisser croire. Ils portent `provenance: "ot"` → « Itinéraire balisé par
//    l'Office de tourisme » : un FAIT qui se constate sur un poteau, pas un
//    avis. MANA ne recommande rien et ne s'attribue rien.
//
// ⚠️ L'ACCORD DE REPRISE RESTE À OBTENIR, ET IL CONCERNE CINQ OFFICES —
//    116 tracés, 1 537 km (recomptés le 13/11/2026 ; le recueil porte
//    `genere: 2026-11-11`).
// 🔴 CE PARAGRAPHE A ANNONCÉ « TROIS OFFICES » ET « 46 TRACÉS » JUSQU'AU
//    13/11. Les deux chiffres étaient justes le 31/10 ; le recueil a plus
//    que doublé le 11/11 et la note n'a pas bougé — elle décrivait donc un
//    accord deux fois et demie plus petit que celui qui manque vraiment.
//    ⭐ Le compte ne se recopie pas, il se lance :
//      node -e 'const r=require("./src/ot.json");console.log(r.itineraires.length,r.offices.length)'
//    Les GPX sont publiquement téléchargeables, ce qui ne veut pas dire
//    redistribuables : aucun fichier ne porte de licence, ni la page qui les
//    sert. La reprise est une décision du fondateur du 31/10/2026 (Crozon),
//    étendue le 11/11. ⚠️ La note ne nommait que deux des quatre offices
//    ajoutés (Abers, Côte des Légendes) ; le recueil généré le même jour en
//    porte quatre — Abers, Iroise, Landerneau-Daoulas, Côte des Légendes.
//    ⭐ On l'écrit plutôt que de le taire : une donnée reprise sans accord se
//    retire en une commande, à condition de savoir qu'elle est là.
// ⭐ ET LES GPX NE SONT PAS HÉBERGÉS PAR LES OFFICES : les 116 sortent du
//    MÊME hôte, `cdt56.media.tourinsoft.eu` — Tourinsoft/Cirkwi, le système
//    d'information touristique départemental. ⚠️ Cette note a cité un
//    SECOND hôte départemental jusqu'au 13/11 ; il n'apparaît nulle part
//    dans le recueil. Il n'est pas renommé ici à dessein : une note qui
//    cite le mauvais nom pour dire qu'il est mauvais se fait trouver par
//    `grep` et valide la consigne fausse — le piège de `fenetre.sh:57`.
//    Cinq marques, un seul tuyau : l'interlocuteur de l'accord n'est donc
//    pas celui qu'on croit — un accord au niveau du SIT pourrait couvrir les
//    sept offices, ou aucun.
//
// ⚠️ 589 Ko : le fichier est chargé À LA DEMANDE (`import()`), jamais dans le
//    lot principal. Quelqu'un qui lit l'accueil ne paie pas les 116 tracés.
//    (La note disait 258 Ko — le poids a suivi le corpus, pas la note.)

export interface ItineraireOT {
  /** ⭐ QUEL office — posé le 11/11/2026, quand le recueil est passé de un à
   *  CINQ. Sans lui, l'artefact crédite un office pour les tracés d'un
   *  autre, et MANA ne crédite plus personne de juste. Voir `Recueil.offices`
   *  pour le nom et le site. */
  ot: string;
  slug: string;
  titre: string;
  /** le point de départ en toutes lettres, quand la fiche le donne
   *  (12 sur 116 au 13/11/2026) */
  depart: string | null;
  /** par la Base Adresse Nationale, au point de départ
   *  (105 sur 116 au 13/11/2026) */
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
   *    « Sentier du Menhir » valent toutes 0.0 (mesuré le 31/10/2026).
   * ⚠️ `null` sur 18 fiches pour la durée et 65 pour le dénivelé (13/11/2026 ;
   *    la note disait 6 et 2, au temps où le recueil n'avait qu'un office).
   *    ⭐ Le dénivelé manque donc à PLUS DE LA MOITIÉ — c'est une absence
   *    VRAIE, pas une panne : tous les offices ne le publient pas, voir
   *    `Office.publie`. Le pipeline refuse d'écrire si elle manque à TOUTES.
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
  /** ⭐ LA LISTE VIVANTE DES OFFICES, pas une phrase recopiée. `source`
   *  ci-dessous en est DÉRIVÉE à la production — un nom d'office écrit à deux
   *  endroits vieillit à un seul. */
  offices: {
    ot: string;
    nom: string;
    site: string;
    /** les champs que CET office publie — le garde du champ vide s'y réfère */
    publie: string[];
    /** [ouest, sud, est, nord] — aucun tracé de cet office n'en sort */
    emprise: [number, number, number, number];
  }[];
  source: string;
  avertissement: string;
  itineraires: ItineraireOT[];
}

/**
 * LE MOT PAR LEQUEL CHAQUE OFFICE EST RECONNAISSABLE DANS UNE PHRASE.
 *
 * 🔴 POSÉ LE 12/11/2026 APRÈS AVOIR FAIT TOMBER QUATRE GARDES. Trois tests du
 *    dépôt exigeaient le libellé COMPLET d'un office dans le texte de
 *    `LApplication.tsx`. Le crédit est passé de un à cinq offices, le libellé
 *    figé a disparu, et les trois sont tombés — avec le quatrième que je
 *    venais d'écrire.
 * ⛔ EXIGER LE LIBELLÉ EXACT DE CHACUN NE MARCHAIT PAS DAVANTAGE, pour deux
 *    raisons mesurées : la prose nomme les offices dans SES mots (« Côte des
 *    Légendes » quand l'artefact dit « Tourisme Côte des Légendes »), et elle
 *    emploie l'apostrophe typographique `’` là où l'artefact porte `'`. Une
 *    phrase ne se génère pas depuis des étiquettes.
 *
 * ⚠️ ET LA DÉRIVATION AUTOMATIQUE A ÉCHOUÉ AUSSI, ce qui vaut d'être écrit.
 *    « Le mot le plus long » rend **Maritime** pour Crozon et **Bretagne**
 *    pour Iroise — uniques dans l'ensemble, et génériques au point de
 *    n'identifier personne. L'unicité ne sauve pas : c'est un jugement, pas
 *    un calcul.
 * ⭐ QUAND UNE DÉRIVATION DEMANDE DU JUGEMENT, ON DÉCLARE — et on fait tomber
 *    la déclaration quand elle devient incomplète. Un sixième office sans son
 *    mot fait échouer les gardes, au lieu de passer en silence.
 */
export const MOT_CLEF_OFFICE: Record<string, string> = {
  crozon: "Crozon",
  abers: "Abers",
  iroise: "Iroise",
  landerneau: "Landerneau",
  legendes: "Légendes",
};

export const PRATIQUE: Record<ItineraireOT["pratique"], string> = {
  pied: "À pied", vtt: "VTT", velo: "Vélo", trail: "Trail",
};

let cache: Promise<Recueil> | null = null;

/** ⭐ Une seule promesse, mémorisée : deux écrans qui le demandent en même
 *  temps ne téléchargent pas deux fois 589 Ko. */
export function chargerOT(): Promise<Recueil> {
  if (!cache) cache = import("./ot.json").then((m) => m.default as unknown as Recueil);
  return cache;
}

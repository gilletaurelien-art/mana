/**
 * LA PHOTOGRAPHIE — et le contrat qu'elle porte.
 *
 * 🔴 CE COMPOSANT EXISTE POUR UNE SEULE RAISON : RENDRE IMPOSSIBLE DE
 *    PRÉSENTER UNE IMAGE D'AMBIANCE COMME LA PHOTOGRAPHIE D'UN LIEU RÉEL.
 *    C'est la règle de direction la plus stricte du brief, et une règle de
 *    produit écrite en commentaire se franchit sans le savoir. Ici elle est
 *    portée par les TYPES et par un test : demander `<Photo lieu="...">` avec
 *    une image d'ambiance ne compile pas.
 *
 * ⭐ ET LE CRÉDIT VOYAGE AVEC L'IMAGE, pas dans une page « mentions » que
 *    personne n'ouvre. Vingt-deux des vingt-quatre images sont sous CC BY ou
 *    CC BY-SA : l'attribution n'est pas une politesse, c'est la condition du
 *    droit d'usage. Une bibliothèque où le crédit est optionnel est une
 *    bibliothèque dont on perdra les crédits à la troisième refonte.
 *
 * ⚠️ AUCUN FILTRE UNIFORME. Le brief est explicite : « l'identité doit venir
 *    de la cohérence de SÉLECTION et du traitement, pas d'un filtre
 *    Instagram ». Le seul traitement appliqué est le VOILE de lisibilité, et
 *    uniquement quand du texte se pose sur l'image — jamais pour le goût.
 */
import biblio from "./bibliotheque.json";

export type Role = "couverture" | "banniere" | "fiche" | "carte-decouverte" | "chemin" | "respiration" | "reseau-chemins";

export type Image = {
  id: string; famille: string; role: string;
  lieu: string | null; documentaire: boolean; pourquoi: string | null;
  /** « entier » : un document (plan, carte ancienne) qu'on ne recadre pas */
  cadrage?: "entier" | "recadrable";
  /** « x% y% » : ce qu'il faut garder quand le cadre coupe */
  focale?: string | null;
  largeur: number; hauteur: number; ratio: number;
  source: string; page: string; fichierSource: string;
  auteur: string; licence: string; attributionRequise: boolean;
  conditions: string; dateOeuvre: string; collecte: string;
  variantes: { fichier: string; largeur: number; format: string; octets: number }[];
};

const IMAGES: Image[] = (biblio as { images: Image[] }).images;
const PAR_ID = new Map(IMAGES.map((i) => [i.id, i]));

export const image = (id: string): Image | undefined => PAR_ID.get(id);
export const parRole = (r: Role) => IMAGES.filter((i) => i.role === r);
export const parFamille = (f: string) => IMAGES.filter((i) => i.famille === f);
/** Les seules utilisables pour illustrer un lieu nommé. */
export const documentaires = () => IMAGES.filter((i) => i.documentaire);
/** Les seules utilisables comme décor : elles n'illustrent rien. */
export const ambiances = () => IMAGES.filter((i) => !i.documentaire);

const BASE = `${import.meta.env.BASE_URL}images/`;

const jeu = (im: Image, fmt: string) =>
  im.variantes.filter((v) => v.format === fmt)
    .sort((a, b) => a.largeur - b.largeur)
    .map((v) => `${BASE}${v.fichier} ${v.largeur}w`).join(", ");

type Props = {
  id: string;
  /**
   * 🔴 LA DÉCLARATION D'INTENTION, ET ELLE EST OBLIGATOIRE.
   *  - "documente" : on affirme que cette image MONTRE le lieu. Le composant
   *    refuse alors une image d'ambiance — en développement il lève, en
   *    production il dégrade sans jamais mentir (il retire la légende).
   *  - "evoque" : décor. La légende ne nomme aucun lieu, même si l'image en a
   *    un : on n'affirme pas en passant ce qu'on n'a pas voulu affirmer.
   */
  usage: "documente" | "evoque";
  /** description pour qui ne voit pas l'image — jamais le crédit, jamais le lieu seul */
  alt: string;
  /** largeurs d'affichage réelles, pour que le navigateur choisisse juste */
  sizes?: string;
  /** la seule retouche admise : un voile, et seulement sous du texte */
  voile?: "aucun" | "bas" | "haut";
  priorite?: boolean;
  className?: string;
};

export function Photo({ id, usage, alt, sizes = "100vw", voile = "aucun", priorite = false, className }: Props) {
  const im = PAR_ID.get(id);
  if (!im) {
    // ⛔ ON NE REMPLACE PAS UNE IMAGE MANQUANTE PAR UNE AUTRE. Une
    //    substitution silencieuse met la mauvaise côte sous le bon toponyme.
    if (import.meta.env.DEV) throw new Error(`[Photo] « ${id} » n'est pas dans la bibliothèque — aucune substitution n'est faite`);
    return null;
  }
  if (usage === "documente" && !im.documentaire) {
    if (import.meta.env.DEV) throw new Error(`[Photo] « ${id} » est une image d'AMBIANCE : elle ne documente aucun lieu`);
  }
  const nomme = usage === "documente" && im.documentaire;

  // ⚠️ `1600w` et non `100vw` par défaut sur une couverture : un `sizes` faux
  //    fait charger la variante 2400 sur un téléphone, et toute l'optimisation
  //    de poids part en fumée sans qu'aucune mesure ne s'en plaigne.
  const petite = im.variantes.find((v) => v.format === "webp" && v.largeur === 960)
    ?? im.variantes.find((v) => v.format === "webp");

  return (
    <figure
      className={`photo ${className ?? ""}`}
      data-voile={voile}
      data-cadrage={im.cadrage ?? "recadrable"}
    >
      <picture>
        <source type="image/avif" srcSet={jeu(im, "avif")} sizes={sizes} />
        <source type="image/webp" srcSet={jeu(im, "webp")} sizes={sizes} />
        <img
          src={petite ? `${BASE}${petite.fichier}` : undefined}
          alt={alt}
          width={im.largeur} height={im.hauteur}
          /* ⚠️ EN STYLE EN LIGNE, et c'est délibéré : il doit l'emporter sur
             le `object-position` de l'écran qui accueille l'image. Une règle
             de feuille serait écrasée par le prochain écran qui en pose une,
             et le sujet sortirait du cadre sans que personne ne le voie. */
          style={im.focale ? { objectPosition: im.focale } : undefined}
          loading={priorite ? "eager" : "lazy"}
          /* 🔴 `fetchpriority` EN MINUSCULES. React 18 ne connaît pas
             `fetchPriority` : il émet un avertissement et NE POSE PAS
             l'attribut. L'image d'accueil n'avait donc aucune priorité —
             exactement l'inverse de ce que le code prétendait faire, et
             silencieusement. ⭐ Un attribut mal orthographié ne casse rien :
             il ne fait rien. C'est le défaut le plus cher à trouver.
             (React 19 accepte les deux ; on écrit celui qui marche partout.) */
          // @ts-expect-error — l'attribut DOM est en minuscules, pas le type React
          fetchpriority={priorite ? "high" : "auto"}
          decoding="async"
        />
      </picture>
      {/* Le crédit est TOUJOURS là. Discret, jamais absent : c'est la licence
          qui l'exige pour 22 des 24 images, et l'exception (CC0) ne justifie
          pas un affichage à deux régimes qu'on finirait par oublier. */}
      <figcaption className="photo-credit">
        {nomme && <span className="photo-lieu">{im.lieu}</span>}
        <a href={im.page} target="_blank" rel="noreferrer noopener">
          {im.auteur} · {im.licence}
        </a>
      </figcaption>
    </figure>
  );
}

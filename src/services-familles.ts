/**
 * LES DIX FAMILLES DE SERVICES ET DE COMMERCES — écrites UNE fois.
 *
 * 🔴 POURQUOI UN MODULE, ET POURQUOI AVANT D'EN AVOIR BESOIN DEUX FOIS.
 *    Cette table vivait dans `scripts/services-monde.ts`, qui s'en sert pour
 *    bâtir le `CASE` SQL qui attribue UNE famille par ligne. Au moment de
 *    brancher le calque, l'écran a besoin des mêmes clés — pour les traduire
 *    et pour les filtrer. ⛔ Les recopier aurait donné deux tables : celle
 *    qui ÉCRIT les tuiles et celle qui les LIT. Elles divergent à la première
 *    famille ajoutée, et le symptôme serait muet — des épingles sans nom de
 *    famille, ou un filtre qui ne trouve jamais rien.
 *
 * ⚠️ `mots` EST UN VOCABULAIRE DE RECHERCHE, PAS UNE TAXONOMIE. `commerce`,
 *    `boutique` et `magasin` désignent les MÊMES fiches : additionner les
 *    mots triplerait le compte. Le script teste un recouvrement de tableau et
 *    attribue UNE famille par ligne, par ordre de priorité.
 * ⭐ L'ORDRE COMPTE, et il est la seule chose que ce fichier impose aux deux
 *    côtés : une pharmacie porte `sante` ET `commerce` ; on veut « Santé ».
 *    Les familles les plus spécifiques passent donc en premier. Trier cette
 *    liste changerait ce que la moisson écrit.
 *
 * ⛔ CE QUE CE JEU COUVRE, ET IL FAUT LE DIRE EN FACE : la France, presque
 *    seulement. Les dix familles viennent des moissons françaises (OSM
 *    France, SIRENE, offices de tourisme) ; la moisson MONDE ne connaît que
 *    quatre types — sentier, parc, plage, panorama — et `tags-cibles.json`
 *    EXCLUT `shop=*` depuis le 21/10. Hors de France, ce calque sera donc
 *    vide tant que cet arbitrage tient.
 */
export interface Famille {
  /** la clé écrite dans la tuile (`f`) */
  cle: string;
  /** ce qu'on en dit à l'écran */
  nom: string;
  /** le vocabulaire que la moisson cherche dans `ressources.mots` */
  mots: string[];
}

export const FAMILLES: readonly Famille[] = [
  { cle: "sante",    nom: "Santé",               mots: ["sante", "medical", "cabinet", "soin"] },
  { cle: "ecole",    nom: "Écoles & enfance",    mots: ["ecole", "college", "lycee", "creche"] },
  { cle: "public",   nom: "Services publics",    mots: ["servicepublic", "administration", "demarche", "guichet"] },
  { cle: "dormir",   nom: "Hébergement",         mots: ["hebergement", "dormir", "loger"] },
  { cle: "manger",   nom: "Restauration",        mots: ["restaurant", "manger", "table"] },
  { cle: "boire",    nom: "Bars & cafés",        mots: ["bar", "pub", "boire"] },
  { cle: "sport",    nom: "Sport & loisirs",     mots: ["sport", "loisir", "activite"] },
  { cle: "garage",   nom: "Garages & auto",      mots: ["garage", "mecanicien", "garagiste"] },
  { cle: "artisan",  nom: "Artisans & bâtiment", mots: ["artisan", "batiment", "chantier", "renovation"] },
  { cle: "commerce", nom: "Commerces",           mots: ["commerce", "boutique", "magasin"] },
];

/**
 * Le nom d'une famille, ou sa clé.
 *
 * ⚠️ ON NE REMPLACE PAS UNE CLÉ INCONNUE PAR UN MOT GÉNÉRIQUE. Une tuile plus
 *    vieille que ce fichier peut porter une famille retirée depuis ; afficher
 *    « Service » à sa place effacerait une information au lieu de l'avouer.
 *    C'est la règle que `direLeDetail` tient déjà pour les types
 *    d'hébergement non traduits.
 */
const PAR_CLE = new Map(FAMILLES.map((f) => [f.cle, f.nom]));
export const direLaFamille = (cle: string): string => PAR_CLE.get(cle) ?? cle;

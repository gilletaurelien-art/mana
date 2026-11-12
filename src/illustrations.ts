/**
 * QUELLE IMAGE POUR QUELLE PROMENADE — une table écrite à la main.
 *
 * 🔴 ET SURTOUT PAS UNE CORRESPONDANCE PAR LE NOM. La tentation est forte :
 *    la promenade dit « Crozon », l'image dit « Crozon », on rapproche. Mais
 *    Crozon fait 81 km² et compte quatre de nos images, dont aucune n'est sur
 *    le parcours de « L'Anse Saint-Nicolas ». Un rapprochement automatique
 *    mettrait la bonne commune sous la mauvaise côte — et personne ne le
 *    verrait, parce que ce serait PLAUSIBLE.
 *    ⭐ Le défaut qui revient le plus souvent dans ce dépôt est une mesure
 *       prise sur un objet et appliquée à un autre. Ici, c'est une légende.
 *
 * ⛔ UNE PROMENADE ABSENTE DE CETTE TABLE N'A PAS DE PHOTOGRAPHIE, et ce n'est
 *    pas un trou à combler : c'est l'état réel de nos droits d'usage. Sa fiche
 *    s'ouvre alors sur SON PROPRE TRACÉ, dessiné depuis nos données. Le brief
 *    l'autorise explicitement — « ou un fond cartographique » — et c'est la
 *    solution la plus juste des quatre qu'il propose : elle ne prétend rien,
 *    elle ne coûte aucun octet, et elle ne ressemble à personne.
 *
 * ⚠️ Vérifié le 31/10/2026 : sur nos quatre promenades, DEUX ont une image de
 *    leur lieu. Les deux autres (la chapelle Saint-Fiacre, l'anse
 *    Saint-Nicolas) n'ont rien de libre sur Commons — on ne fabrique pas.
 */
export type Illustration = {
  /** la couverture : une photographie du lieu, ou rien */
  couverture?: string;
  /** ce qu'on peut montrer plus bas, dans le corps éditorial */
  corps?: string[];
};

/**
 * ⛔ VIDE DEPUIS LE 12/11/2026, ET CE N'EST PAS UNE PERTE D'IMAGES. Les deux
 *    seules entrées qu'elle portait illustraient « Les forts du goulet » et
 *    « L'Île Vierge » — deux des quatre promenades MANA retirées du produit
 *    ce jour-là (voir `walks.ts`). Une illustration sans promenade est
 *    orpheline, et `FichePromenade.test.ts` le refuse nommément.
 * ⭐ LES PHOTOGRAPHIES, ELLES, RESTENT EN BIBLIOTHÈQUE (`images/bibliotheque.json`)
 *    avec leurs droits et leurs lieux : c'est la LÉGENDE qui disparaît, pas
 *    l'image. Le jour où une promenade revient, on la relie ici.
 */
export const ILLUSTRATIONS: Record<string, Illustration> = {};

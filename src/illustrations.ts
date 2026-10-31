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

export const ILLUSTRATIONS: Record<string, Illustration> = {
  "forts-du-goulet": {
    couverture: "espagnols-brume",
    // ⭐ Un plan manuscrit de 1695 n'illustre pas la promenade : il EN EST le
    //    sujet. Le parcours longe sept batteries, et ce document de la BnF
    //    montre leur disposition telle que l'ingénieur du roi l'a dessinée.
    corps: ["espagnols-1695", "espagnols-sentier"],
  },
  "ile-vierge": {
    couverture: "ile-vierge",
    corps: ["ile-vierge-lande"],
  },
  // "saint-fiacre"       : rien de libre pour la chapelle Saint-Fiacre.
  // "anse-saint-nicolas" : rien de libre pour l'anse.
};

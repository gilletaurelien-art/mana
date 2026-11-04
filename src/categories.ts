/**
 * LES CATÉGORIES DE LIEUX, EN UN SEUL EXEMPLAIRE.
 *
 * ⭐ Cette table vivait dans `Territoire2030.tsx`. La fiche de promenade en a
 *    besoin aussi — et une table recopiée se corrige une fois sur deux. Ce
 *    dépôt en a déjà payé le prix : la règle des « plus de huit heures » avait
 *    été corrigée sur la liste, puis retrouvée identique et fausse sur la
 *    fiche. On déplace, on ne duplique pas.
 *
 * ⚠️ Le repli est le CODE BRUT, jamais « Lieu » ou « Autre ». Un libellé
 *    générique cache qu'une catégorie est arrivée sans traduction ; le code
 *    brut à l'écran se remarque et se corrige. Un trou doit se voir.
 */
export const CATEGORIE: Record<string, string> = {
  calvaire: "Calvaire",
  chapelle: "Chapelle",
  chateau: "Fortification",
  grotte: "Grotte",
  lieu_de_culte: "Lieu de culte",
  megalithe: "Mégalithe",
  memorial: "Mémorial",
  moulin: "Moulin",
  panorama: "Point de vue",
  phare: "Phare",
  plage: "Plage",
  ruine: "Ruine",
  source: "Source",
};

export const libelleCategorie = (c: string) => CATEGORIE[c] ?? c;

/**
 * UNE COULEUR PAR GENRE, EN UN SEUL EXEMPLAIRE — 4/11/2026.
 *
 * ⭐ Posée d'abord sur les sites de `/carte` (maplibre, `sites-genre`),
 *    demandée ensuite sur ceux de `/balades-office` (SVG, `CarteFondOT`) :
 *    même défaut que `CATEGORIE` ci-dessus si elle vivait à deux endroits —
 *    une couleur corrigée sur l'un des deux divergerait de l'autre sans
 *    qu'on le voie, puisque chacun a l'air juste pris seul.
 * ⚠️ LE REPLI EST LE MÊME QUE LA COULEUR DE « megalithe », pas une teinte
 *    neuve : un genre absent de cette table garde l'allure d'un genre connu
 *    plutôt que de se signaler par une couleur qui n'existe nulle part
 *    ailleurs sur la carte.
 */
export const COULEUR_CATEGORIE: Record<string, string> = {
  megalithe: "#c69a48",
  plage: "#f2c14e",
  panorama: "#e8702a",
  chateau: "#8b5a2b",
  calvaire: "#d94f4f",
  chapelle: "#d9507a",
  lieu_de_culte: "#a357d9",
  moulin: "#4f8fd9",
  phare: "#ffd23f",
  grotte: "#6b52a3",
  source: "#3fc2b0",
  ruine: "#9c9c9c",
  memorial: "#c68f3f",
};
export const COULEUR_CATEGORIE_DEFAUT = COULEUR_CATEGORIE.megalithe;
export const couleurCategorie = (c: string) => COULEUR_CATEGORIE[c] ?? COULEUR_CATEGORIE_DEFAUT;

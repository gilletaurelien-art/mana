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

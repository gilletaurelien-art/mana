/**
 * LES PICTOGRAMMES DES CATÉGORIES DE LIEUX.
 *
 * ⭐ UNE SEULE LOGIQUE DE DESSIN, imposée par la table et non par la
 *    discipline de qui dessine : grille de 24, trait de 1,8, extrémités
 *    rondes, pas de remplissage. Un picto qui s'en écarte se voit
 *    immédiatement à côté des autres.
 *
 * ⚠️ ILS NE SONT PAS DÉCORATIFS : posés sur la carte, ils disent CE QU'IL Y A
 *    là où ils sont. Un picto approximatif — une croix pour un mégalithe —
 *    envoie chercher autre chose que ce qui est sur place.
 *
 * ⚠️ Les 23 clés sont celles de `lieux.json` (`libelles`). Une catégorie
 *    nouvelle sans picto retombe sur le point : visible, sans mentir.
 */
export const PICTOS: Record<string, string> = {
  // pierres levées : un menhir, et son ombre
  megalithe:    "M10 20h4M11 20V7l2-3 1 3v13",
  archeologie:  "M5 20h14M8 20V9l4-3 4 3v11M8 14h8",
  // bâti défensif
  fortification:"M4 20V9l2.5 2L9 9l3 2 3-2 2.5 2L20 9v11zM4 20h16",
  ruine:        "M4 20h16M6 20V11l3 2V8l4 3v9M16 20v-6l3 2v4",
  // repères de mer
  phare:        "M9 20h6M10 20V11h4v9M10 11l-.5-4h5L14 11M12 3v2M7 7l-2-1M17 7l2-1",
  epave:        "M4 15c2.5 2 5 3 8 3s5.5-1 8-3l-2-4H6zM12 11V5M9 8h6",
  ile:          "M3 17c3-1 5 1 9 1s6-2 9-1M9 14c0-3 1.5-5 3-5s3 2 3 5",
  rocher:       "M3 19l5-8 4 5 3-4 6 7z",
  baie:         "M3 9c5 0 5 8 9 8s4-8 9-8M3 19h18",
  cap:          "M3 19h8l6-11 4 11z",
  plage:        "M3 18c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M7 13a5 5 0 0 1 10 0",
  grotte:       "M4 20V14a8 8 0 0 1 16 0v6M9 20v-4a3 3 0 0 1 6 0v4",
  // eau douce
  fontaine:     "M12 3c3 4.5 4.5 7 4.5 9a4.5 4.5 0 0 1-9 0c0-2 1.5-4.5 4.5-9z",
  // culte
  chapelle:     "M12 3v4M10 5h4M7 20V11l5-4 5 4v9z",
  eglise:       "M12 2v4M10 4h4M8 20V12l4-4 4 4v8zM4 20v-5l4-3M20 20v-5l-4-3",
  lieu_de_culte:"M12 3v5M9.5 5.5h5M6 20v-7l6-4 6 4v7z",
  calvaire:     "M12 20V5M8.5 9h7M9 20h6",
  // mémoire et culture
  memoire:      "M9 20h6M12 20V9M12 9c-2 0-3-1.5-3-3s1.5-3 3-4c1.5 1 3 2 3 4s-1 3-3 3z",
  musee:        "M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18",
  oeuvre:       "M12 3l2.3 5.6L20 9.2l-4.3 3.9 1.2 5.9L12 16l-4.9 3 1.2-5.9L4 9.2l5.7-.6z",
  // nature et regard
  nature:       "M5 19c0-7 5-12 14-12 0 8-5 12-11 12H5zM8 19c1.5-4 4-6.5 7-8",
  panorama:     "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  moulin:       "M12 20V12M9 20h6M12 12 6 9M12 12l6-3M12 12l-2 7M12 12l3-7",
};

/** ⚠️ Le repli est un POINT, pas un picto générique : un symbole inventé pour
 *  « catégorie inconnue » se lit comme un vrai symbole. */
export const PICTO_DEFAUT = "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z";

export const picto = (c: string) => PICTOS[c] ?? PICTO_DEFAUT;

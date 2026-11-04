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
 *
 * 🔴 ET CE REPLI A CACHÉ LE DÉFAUT PENDANT UNE JOURNÉE ENTIÈRE — 4/11/2026.
 *    Cette table ne portait que les TREIZE genres de `walks.ts`, le
 *    vocabulaire des promenades écrites à la main. Or ce qu'elle colorie,
 *    ce sont les sites de `lieux.json`, dont le vocabulaire est celui de
 *    `scripts/lieux.py` et compte VINGT-TROIS genres. Les deux se
 *    ressemblent assez pour ne pas se remarquer — et divergent là où ça
 *    compte : le producteur dit `fortification` (196 sites, le genre le plus
 *    nombreux) quand la table disait `chateau` ; `fontaine` (183) quand elle
 *    disait `source` ; `memoire` quand elle disait `memorial`.
 *    Mesuré sur les pastilles réellement dessinées : 445 sur 624, soit
 *    **71 %**, tombaient dans le repli — c'est-à-dire que « une couleur par
 *    genre » rendait surtout UNE couleur.
 * ⭐ UN REPLI QUI RESSEMBLE À UNE VRAIE VALEUR NE SE VOIT PAS. Choisi
 *    exprès pour qu'un genre inconnu garde l'allure d'un genre connu, il a
 *    fait exactement ça : sept pastilles sur dix avaient l'air d'être
 *    coloriées. Une teinte criarde aurait hurlé dès la première capture.
 *    C'est le prix de ce choix, et il se paie en garde — `genres.test.ts`
 *    LIT `lieux.json` et refuse qu'un genre produit n'ait ni couleur ni
 *    libellé.
 * ⚠️ LES DEUX VOCABULAIRES COHABITENT ICI, ET C'EST VOULU. `chateau`,
 *    `source` et `memorial` restent : ce sont les clés que les étapes de
 *    `walks.ts` portent encore. Les retirer donnerait des pastilles grises
 *    le jour où `VITRINE` se remplit. Elles sont marquées.
 */
export const COULEUR_CATEGORIE: Record<string, string> = {
  // ── le vocabulaire de `scripts/lieux.py` : ce que la carte dessine ────
  megalithe: "#c69a48",
  archeologie: "#8f7336",
  fortification: "#8b5a2b",
  ruine: "#9c9c9c",
  epave: "#5c6b73",
  phare: "#ffd23f",
  moulin: "#4f8fd9",
  lieu_de_culte: "#a357d9",
  calvaire: "#d94f4f",
  plage: "#f2c14e",
  grotte: "#6b52a3",
  cap: "#5fa85a",
  baie: "#2f9ed6",
  ile: "#2e8f8a",
  rocher: "#7d7366",
  fontaine: "#3fc2b0",
  memoire: "#c68f3f",
  musee: "#b85fa8",
  oeuvre: "#ef7ab0",
  nature: "#3f8f4a",
  panorama: "#e8702a",
  // ── les clés que `walks.ts` porte encore, et elles seules ─────────────
  //    ⚠️ Même teinte que leur équivalent ci-dessus : ce sont les mêmes
  //       choses sous l'ancien nom, pas d'autres genres.
  chateau: "#8b5a2b",        // = fortification
  source: "#3fc2b0",         // = fontaine
  memorial: "#c68f3f",       // = memoire
  chapelle: "#a357d9",       // = lieu_de_culte (fusionné le 4/11, voir lieux.py)
};
export const COULEUR_CATEGORIE_DEFAUT = COULEUR_CATEGORIE.megalithe;
export const couleurCategorie = (c: string) => COULEUR_CATEGORIE[c] ?? COULEUR_CATEGORIE_DEFAUT;

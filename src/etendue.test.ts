import { describe, it, expect } from "vitest";
import { etendueDe, ETENDUES, centreDe, dansLEtendue, cadreDe } from "./etendue";
import { VISAGES } from "./visage";
import { TERRITOIRES } from "./territoires";

/**
 * 🔴 CE QUE CE FICHIER TIENT : « architecture commune de base = manahome.org /
 *    manafrance = la france only / mana.bzh = la bretagne seulement »
 * 🔄 ET mana.bzh S'EST RESSERRÉ LE 15/11 : « la carte se limite au
 *    Finistère », puis au périmètre de Brest terres océanes — les six EPCI
 *    qu'Aurélien va solliciter. Le cadre est un argument de vente.
 *    (Aurélien, 15/11/2026). Un produit, trois étendues.
 */
describe("l'étendue suit l'hôte", () => {
  it("manahome porte la base commune : le monde", () => {
    expect(etendueDe("home").clef).toBe("monde");
    expect(dansLEtendue(etendueDe("home"), 12.49, 41.89)).toBe(true);   // Rome
    expect(dansLEtendue(etendueDe("home"), -4.49, 48.24)).toBe(true);   // Crozon
  });

  /**
   * 🔄 RETOURNÉ LE 15/11/2026 — ET LE NOM D'AVANT MENTAIT. Ce test exigeait
   *    `clef === "bretagne"` pour une boîte qui valait l'union de Crozon et
   *    de l'Aulne : 45 km sur 21. On ne jette pas le test, on le retourne :
   *    ce qu'il protégeait — « mana.bzh ne revendique pas toute la France » —
   *    vaut toujours, sous un périmètre qui porte enfin son vrai nom.
   */
  it("mana.bzh ne revendique que Brest terres océanes", () => {
    const e = etendueDe("bzh");
    expect(e.clef).toBe("bto");
    expect(dansLEtendue(e, -4.49, 48.24), "Crozon").toBe(true);
    expect(dansLEtendue(e, 2.35, 48.86), "Paris").toBe(false);
    expect(dansLEtendue(e, 12.49, 41.89), "Rome").toBe(false);
  });

  /* ⭐ LA BRETAGNE SE DÉRIVE. Ce test ne vérifie pas des nombres : il vérifie
     que la boîte EST l'union des emprises moissonnées. Un territoire breton
     ajouté demain doit l'étendre sans que personne n'y touche. */
  /**
   * 🔄 RETOURNÉ LE 15/11/2026, ET SA PRÉMISSE A DISPARU. Ce test exigeait que
   *    la boîte SOIT l'union des emprises moissonnées — vrai tant que
   *    l'étendue se dérivait d'elles. Le cadre vient désormais des six EPCI
   *    de Brest terres océanes, qui est une tout autre source.
   * ⭐ MAIS CE QU'IL PROTÉGEAIT TIENT TOUJOURS, ET IL COMPTE PLUS QU'AVANT :
   *    un cadre DUR qui ne contiendrait pas ce qu'on a moissonné enfermerait
   *    la carte hors de ses propres données. On n'exige plus l'égalité — on
   *    exige l'INCLUSION, qui est la vraie promesse.
   */
  it("le cadre BTO contient tout ce qu'on a moissonné en Bretagne", () => {
    const bzh = TERRITOIRES.filter((t) => t.contree === TERRITOIRES[0].contree);
    expect(bzh.length, "aucun territoire breton : la mesure est vide")
      .toBeGreaterThan(0);
    for (const t of bzh) {
      expect(dansLEtendue(ETENDUES.bto, t.emprise[0], t.emprise[1]),
        `${t.slug} sud-ouest tombe hors du cadre`).toBe(true);
      expect(dansLEtendue(ETENDUES.bto, t.emprise[2], t.emprise[3]),
        `${t.slug} nord-est tombe hors du cadre`).toBe(true);
    }
  });

  /* ⛔ LE MULLERTHAL EST MOISSONNÉ ET N'EST PAS BRETON. Il tient dans
     l'étendue de manahome, pas dans celle de mana.bzh — c'est la
     démonstration que la restriction fonctionne sur un cas réel, pas sur un
     point inventé. */
  it("le Mullerthal est à manahome, pas à mana.bzh", () => {
    const m = TERRITOIRES.find((t) => t.slug === "mullerthal")!;
    const [lo, la] = [(m.emprise[0] + m.emprise[2]) / 2, (m.emprise[1] + m.emprise[3]) / 2];
    expect(dansLEtendue(etendueDe("home"), lo, la)).toBe(true);
    expect(dansLEtendue(etendueDe("bzh"), lo, la)).toBe(false);
  });

  it("la France couvre la métropole et la Corse, pas ses voisins", () => {
    const f = ETENDUES.france;
    for (const [nom, lo, la] of [["Brest", -4.49, 48.39], ["Nice", 7.27, 43.70],
                                 ["Ajaccio", 8.74, 41.93], ["Lille", 3.06, 50.63]] as const) {
      expect(dansLEtendue(f, lo, la), nom).toBe(true);
    }
    for (const [nom, lo, la] of [["Londres", -0.13, 51.51], ["Rome", 12.49, 41.89],
                                 ["Madrid", -3.70, 40.42]] as const) {
      expect(dansLEtendue(f, lo, la), nom).toBe(false);
    }
  });

  it("le centre se déduit de la boîte", () => {
    const c = centreDe(ETENDUES.bto);
    expect(dansLEtendue(ETENDUES.bto, c[0], c[1])).toBe(true);
  });

  /**
   * 🔴 ET LE CENTRE DU MONDE EST EN PLEIN OCÉAN — c'est pour ça que
   *    l'ouverture est une décision séparée. `centreDe(monde)` vaut [0, 0],
   *    le golfe de Guinée : une carte mondiale qui s'y ouvrirait montrerait
   *    de l'eau vide, et on ne peut pas « approcher » depuis nulle part.
   * ⛔ Ce test garde l'ÉCART entre les deux. Les refondre en un seul champ
   *    remettrait la carte à l'eau, et le défaut ne se verrait qu'à l'écran.
   */
  it("l'ouverture n'est pas le centre, quand le centre est l'océan", () => {
    expect(centreDe(ETENDUES.monde)).toEqual([0, 0]);
    expect(ETENDUES.monde.ouverture).not.toEqual([0, 0]);
    /* Elle reste DANS l'étendue : ouvrir hors de ce qu'on revendique serait
       pire que d'ouvrir sur l'eau. */
    const [lo, la] = ETENDUES.monde.ouverture;
    expect(dansLEtendue(ETENDUES.monde, lo, la)).toBe(true);
  });

  /* ⚠️ Pour une étendue BORNÉE, l'ouverture EST le centre — et doit le
     rester : deux valeurs écrites séparément divergeraient à la première
     retouche de l'emprise. */
  it("sur une étendue bornée, l'ouverture suit le centre", () => {
    for (const e of [ETENDUES.bto, ETENDUES.france]) {
      expect(e.ouverture, e.clef).toEqual(centreDe(e));
    }
  });

  /* ⛔ JAMAIS SOUS 6 : mesuré, le relais ortho rend 404 en dessous. Un zoom
     d'ouverture plus large donnerait un écran sans image, et on le
     corrigerait en cherchant du côté du code. */
  it("aucune étendue n'ouvre sous le zoom où l'image existe", () => {
    for (const e of Object.values(ETENDUES)) {
      expect(e.zoom, `${e.clef} ouvre sous z6`).toBeGreaterThanOrEqual(6);
    }
  });

  /**
   * 🔴 LE GARDE QUI MANQUAIT, ET LE COMMENTAIRE QUI TENAIT SA PLACE.
   *    `ETENDUES.france` était testée depuis son écriture — sa boîte, son
   *    centre, son zoom : quatre villes dedans, trois voisines dehors. Mais
   *    AUCUN test ne demandait qui la REÇOIT. `etendueDe("france")` rendait le
   *    monde, et les six tests de la France restaient verts : « un garde sur
   *    l'OBJET ne dit rien du PRODUCTEUR ».
   * ⭐ ET IL ÉNUMÈRE `VISAGES` PLUTÔT QUE DE NOMMER LES CAS CONNUS. Un
   *    cinquième visage ajouté sans étendue tombe ici, au lieu d'ouvrir sur
   *    l'Europe de l'Ouest en production — ce qui est exactement ce qui s'est
   *    passé pour le quatrième, deux heures durant.
   * ⚠️ La table est écrite À LA MAIN, à dessein : c'est une DÉCISION par hôte
   *    (« que revendique ce domaine ? »), pas une formule. La dériver de
   *    `etendueDe` ferait un test qui se contente d'être d'accord avec lui.
   */
  it("chaque visage servi a l'étendue que son domaine revendique", () => {
    const attendu: Record<string, "monde" | "france" | "bto"> = {
      bzh: "bto",        // Brest terres océanes : les six EPCI sollicitées
      home: "monde",     // l'architecture commune de base
      france: "france",  // « manafrance = la france only »
      love: "monde",     // invitée : aucun territoire à elle
    };
    for (const v of VISAGES) {
      expect(attendu[v], `aucune étendue décidée pour le visage « ${v} »`)
        .toBeDefined();
      expect(etendueDe(v).clef, `le visage « ${v} »`).toBe(attendu[v]);
    }
    /* ⛔ Et la table ne décrit QUE des visages servis : un nom qui y
       survivrait à la disparition d'un hôte serait un faux témoin de plus. */
    expect(Object.keys(attendu).sort()).toEqual([...VISAGES].sort());
  });

  /**
   * ⭐ LE SYMPTÔME EXACT — et ma première rédaction de ce test l'a décrit FAUX.
   *    Elle affirmait que l'ancienne ouverture, [6, 48], tombait « hors de la
   *    France, sur la frontière suisse », et exigeait `dansLEtendue → false`.
   *    Le test est tombé : [6, 48] est EN France, du côté de Nancy. Le défaut
   *    n'était donc pas « la carte s'ouvre à l'étranger » mais « la carte
   *    s'ouvre à 300 km du centre, cadrée sur le nord-est » — ce qu'Aurélien a
   *    vu comme « pas centrée sur la France ».
   * ⛔ Un témoin inventé de mémoire aurait pu passer : s'il avait été vrai par
   *    accident, le test serait resté vert en gardant une fausse description
   *    du défaut dans le dépôt. C'est le test qui a corrigé le commentaire.
   */
  it("manafrance ouvre AU CENTRE de la France, pas à son bord", () => {
    expect(etendueDe("france").ouverture).toEqual(centreDe(ETENDUES.france));
    /* L'ancienne ouverture (celle du monde) était dans la boîte — donc aucun
       garde de bornes ne l'aurait signalée — mais à des centaines de
       kilomètres du centre. C'est cet ÉCART qui était le défaut. */
    const [alo, ala] = ETENDUES.monde.ouverture;
    const [clo, cla] = centreDe(ETENDUES.france);
    expect(dansLEtendue(ETENDUES.france, alo, ala),
      "le témoin ne vaut rien : [6, 48] n'est plus dans la boîte France").toBe(true);
    expect(Math.hypot(alo - clo, ala - cla),
      "l'ancienne ouverture était quasi centrée : le témoin ne démontre rien")
      .toBeGreaterThan(3);
  });

  it("mana.love n'hérite d'aucun territoire", () => {
    /* Elle n'emprunte que deux écrans : lui donner la Bretagne l'enfermerait
       dans un territoire qu'elle ne revendique pas. */
    expect(etendueDe("love").clef).toBe("monde");
  });

  /* ═══ LE CADRE DUR — ce que la carte REFUSE de montrer ═══════════════════
     🔴 JUSQU'AU 15/11/2026, `boite` ne retenait RIEN : une étendue ne
        décidait que de l'ouverture, et on pouvait glisser de Crozon à
        Nantes. « La carte se limite au… » demande un vrai cadre. */

  it("les deux hôtes territoriaux ont un cadre, le monde n'en a pas", () => {
    expect(cadreDe(ETENDUES.bto), "mana.bzh glisse hors de BTO").toBeDefined();
    expect(cadreDe(ETENDUES.france), "manafrance glisse hors de France").toBeDefined();
    /* ⛔ Et le monde n'en a PAS. Passer la boîte terrestre à maplibre n'est
       pas équivalent à ne rien passer : ça interdit de franchir
       l'antiméridien sur une carte qui revendique la Terre. */
    expect(cadreDe(ETENDUES.monde), "manahome s'est vu poser une frontière")
      .toBeUndefined();
  });

  it("le cadre est la boîte, dans l'ordre que maplibre attend", () => {
    const c = cadreDe(ETENDUES.bto)!;
    const b = ETENDUES.bto.boite;
    expect(c).toEqual([[b[0], b[1]], [b[2], b[3]]]);
    /* ⚠️ Sud-ouest d'abord, nord-est ensuite : inversés, maplibre rend une
       boîte vide et la carte se fige sur un point. */
    expect(c[0][0]).toBeLessThan(c[1][0]);
    expect(c[0][1]).toBeLessThan(c[1][1]);
  });

  /**
   * ⭐ LE GARDE QUI TIENT LA PROMESSE COMMERCIALE, PAS LE CODE.
   *    Le cadre existe pour montrer à six EPCI que l'outil est le leur. Il
   *    doit donc contenir leurs six territoires — et rien qui les dilue.
   *    Les bornes viennent de `epci_index`, lues le 15/11/2026.
   */
  it("le cadre BTO contient les six EPCI sollicitées", () => {
    const EPCI: [string, number, number, number, number][] = [
      ["Brest Métropole",                 -4.6310, 48.2228, -4.3445, 48.4749],
      ["Pays d'Iroise",                   -5.1398, 48.2620, -4.6187, 48.5753],
      ["Pays des Abers",                  -4.6528, 48.4629, -4.4113, 48.6430],
      ["Lesneven Côte des Légendes",      -4.4346, 48.4476, -4.2193, 48.6779],
      ["Landerneau-Daoulas",              -4.3419, 48.2820, -4.0941, 48.5445],
      ["Presqu'île de Crozon-Aulne",      -4.5273, 48.1614, -4.2164, 48.3887],
    ];
    for (const [nom, o, s2, e2, n] of EPCI) {
      expect(dansLEtendue(ETENDUES.bto, o, s2), `${nom} sud-ouest`).toBe(true);
      expect(dansLEtendue(ETENDUES.bto, e2, n), `${nom} nord-est`).toBe(true);
    }
    /* ⛔ ET IL NE DOIT PAS DÉBORDER SUR CE QU'ON NE SOLLICITE PAS. Un élu de
       la Côte des Légendes qui voit Concarneau se demande ce qu'il finance. */
    for (const [nom, lo, la] of [["Quimper", -4.1115, 47.9988],
                                 ["Concarneau", -3.9204, 47.8736],
                                 ["Morlaix", -3.8164, 48.5996],
                                 ["Lorient", -3.3740, 47.7483]] as const) {
      expect(dansLEtendue(ETENDUES.bto, lo, la), `${nom} est dans le cadre`).toBe(false);
    }
  });

  /* ⚠️ Et le cadre reste PRATICABLE : son centre d'ouverture est dedans, et
     il est assez large pour qu'une carte s'y déplace. 77 km sur 57. */
  it("le cadre BTO est praticable", () => {
    const [lo, la] = ETENDUES.bto.ouverture;
    expect(dansLEtendue(ETENDUES.bto, lo, la)).toBe(true);
    const b = ETENDUES.bto.boite;
    expect(b[2] - b[0], "cadre trop étroit pour s'y déplacer").toBeGreaterThan(0.5);
    expect(b[3] - b[1], "cadre trop plat pour s'y déplacer").toBeGreaterThan(0.3);
  });
});

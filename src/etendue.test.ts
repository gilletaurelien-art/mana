import { describe, it, expect } from "vitest";
import { etendueDe, ETENDUES, centreDe, dansLEtendue } from "./etendue";
import { TERRITOIRES } from "./territoires";

/**
 * 🔴 CE QUE CE FICHIER TIENT : « architecture commune de base = manahome.org /
 *    manafrance = la france only / mana.bzh = la bretagne seulement »
 *    (Aurélien, 15/11/2026). Un produit, trois étendues.
 */
describe("l'étendue suit l'hôte", () => {
  it("manahome porte la base commune : le monde", () => {
    expect(etendueDe("home").clef).toBe("monde");
    expect(dansLEtendue(etendueDe("home"), 12.49, 41.89)).toBe(true);   // Rome
    expect(dansLEtendue(etendueDe("home"), -4.49, 48.24)).toBe(true);   // Crozon
  });

  it("mana.bzh ne revendique que la Bretagne", () => {
    const e = etendueDe("bzh");
    expect(e.clef).toBe("bretagne");
    expect(dansLEtendue(e, -4.49, 48.24), "Crozon").toBe(true);
    expect(dansLEtendue(e, 2.35, 48.86), "Paris").toBe(false);
    expect(dansLEtendue(e, 12.49, 41.89), "Rome").toBe(false);
  });

  /* ⭐ LA BRETAGNE SE DÉRIVE. Ce test ne vérifie pas des nombres : il vérifie
     que la boîte EST l'union des emprises moissonnées. Un territoire breton
     ajouté demain doit l'étendre sans que personne n'y touche. */
  it("la boîte bretonne est l'union des emprises moissonnées", () => {
    const bzh = TERRITOIRES.filter((t) => t.contree === TERRITOIRES[0].contree);
    const e = ETENDUES.bretagne;
    expect(e.boite[0]).toBe(Math.min(...bzh.map((t) => t.emprise[0])));
    expect(e.boite[2]).toBe(Math.max(...bzh.map((t) => t.emprise[2])));
    /* ⛔ Et chaque territoire breton y tient EN ENTIER : une union qui
       perdrait un coin serait une promesse rognée, et personne ne le verrait
       avant d'y marcher. */
    for (const t of bzh) {
      expect(dansLEtendue(e, t.emprise[0], t.emprise[1]), `${t.slug} sud-ouest`).toBe(true);
      expect(dansLEtendue(e, t.emprise[2], t.emprise[3]), `${t.slug} nord-est`).toBe(true);
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
    const c = centreDe(ETENDUES.bretagne);
    expect(dansLEtendue(ETENDUES.bretagne, c[0], c[1])).toBe(true);
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
    for (const e of [ETENDUES.bretagne, ETENDUES.france]) {
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

  it("mana.love n'hérite d'aucun territoire", () => {
    /* Elle n'emprunte que deux écrans : lui donner la Bretagne l'enfermerait
       dans un territoire qu'elle ne revendique pas. */
    expect(etendueDe("love").clef).toBe("monde");
  });
});

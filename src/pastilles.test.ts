import { describe, it, expect } from "vitest";
import { placerPastilles, type Point } from "./pastilles";

/* Un fil droit de `n` points, de (x0,y0) vers (x1,y1). */
const fil = (x0: number, y0: number, x1: number, y1: number, n = 40): Point[] =>
  Array.from({ length: n }, (_, i) => [
    x0 + ((x1 - x0) * i) / (n - 1),
    y0 + ((y1 - y0) * i) / (n - 1),
  ] as Point);

const ecarte = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe("où poser le numéro d'un tracé", () => {
  it("trois tracés qui s'écartent : chacun garde son bout", () => {
    const p = placerPastilles([
      fil(200, 400, 320, 200), fil(200, 400, 60, 180), fil(200, 400, 150, 700),
    ]);
    expect(p.map((q) => q.reculee)).toEqual([false, false, false]);
    expect(p[0]).toMatchObject({ x: 320, y: 200 });
  });

  it("🔴 deux bouts à 2 px l'un de l'autre se séparent", () => {
    /* LE CAS MESURÉ : pastilles 2 et 3 de « Menhirs de Kerziou », relevées
       à (41, 330) et (40, 332) pour un rayon de 9 px. */
    const p = placerPastilles([
      fil(200, 400, 41, 330), fil(200, 395, 40, 332),
    ]);
    expect(ecarte(p[0], p[1]), "les deux numéros se recouvrent encore")
      .toBeGreaterThanOrEqual(24);
  });

  it("⭐ la pastille déplacée reste SUR son fil", () => {
    /* C'est la propriété qui compte : un numéro qui flotte à côté du vide
       ne dit plus à quel tracé il appartient. On vérifie donc la distance
       au fil, pas la façon dont on l'a obtenue. */
    const deux = fil(200, 395, 40, 332);
    const p = placerPastilles([fil(200, 400, 41, 330), deux]);
    const auFil = Math.min(...deux.map((q) => Math.hypot(q[0] - p[1].x, q[1] - p[1].y)));
    expect(auFil, "le numéro a quitté son tracé").toBeLessThan(3);
    expect(p[1].reculee).toBe(true);
  });

  it("⛔ on ne recule pas au-delà de la borne", () => {
    /* Sinon la pastille cesse de désigner la fin du chemin. */
    const t = fil(0, 0, 600, 0, 200);
    const p = placerPastilles([[[600, 0]], t], { ecart: 24, reculMax: 90 });
    const recul = 600 - p[1].x;
    expect(recul).toBeLessThanOrEqual(90 + 6);
    expect(recul).toBeGreaterThanOrEqual(24);
  });

  it("⛔ et la borne PAR DÉFAUT tient, elle aussi", () => {
    /* 🔴 LE TEST D'AU-DESSUS NE GARDAIT QUE LA VALEUR QU'IL PASSE. Mutation
       passée : remplacer `reculMax = 90` par `1e9` dans la signature ne le
       faisait pas tomber, puisqu'il fournit sa propre borne. ⭐ Un garde qui
       passe l'option qu'il teste ne teste pas le défaut qui sert à tout le
       monde — et c'est la valeur par défaut que l'écran emploie.
       ⚠️ Il faut EMPILER les tracés pour que la borne morde : chaque
          pastille repousse la suivante de 24 px, et c'est la cinquième qui
          dépasse 90. Avec un seul fil bloquant, le premier point libre est à
          24 px et la borne ne sert jamais — c'est pour ça qu'elle avait
          survécu. */
    const t = fil(0, 0, 600, 0, 200);
    const p = placerPastilles(Array.from({ length: 6 }, () => t));
    for (const [i, q] of p.entries()) {
      expect(Math.abs(600 - q.x), `la pastille ${i + 1} a glissé vers le départ`)
        .toBeLessThanOrEqual(96);
    }
  });

  it("⚠️ deux fils CONFONDUS : on décale à côté plutôt que de cacher", () => {
    /* Le régime où le recul ne peut pas marcher — les deux tracés sont le
       même, donc reculer sur l'un reste à portée de l'autre. Une pastille
       à côté du fil se lit encore ; une pastille invisible, non. */
    const t = fil(100, 100, 100, 160, 30);
    const p = placerPastilles([t, t], { ecart: 24, reculMax: 40 });
    expect(ecarte(p[0], p[1])).toBeGreaterThanOrEqual(23.9);
    expect(p[1].reculee).toBe(true);
  });

  it("l'ordre est stable : le premier tracé n'est jamais déplacé", () => {
    // ⭐ Le n° 1 est l'ancre. Si tout le monde pouvait bouger, deux rendus
    //    successifs des mêmes données donneraient deux dispositions.
    const t = fil(100, 100, 100, 160, 30);
    for (const n of [2, 3, 4]) {
      const p = placerPastilles(Array.from({ length: n }, () => t));
      expect(p[0]).toMatchObject({ x: 100, y: 160, reculee: false });
    }
  });

  it("un tracé vide ne fait pas tomber les autres", () => {
    const p = placerPastilles([[], fil(0, 0, 100, 100)]);
    expect(Number.isNaN(p[0].x)).toBe(true);
    expect(p[1]).toMatchObject({ x: 100, y: 100 });
  });

  it("aucun tracé : aucune pastille", () => {
    expect(placerPastilles([])).toEqual([]);
  });
});

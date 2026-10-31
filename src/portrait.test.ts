import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { portrait } from "./portrait";
import type { Recueil } from "./ot";

const recueil = JSON.parse(
  readFileSync(new URL("./ot.json", import.meta.url), "utf8"),
) as Recueil;

describe("le portrait d'un tracé", () => {
  it("tient dans sa boîte, sur les 46 circuits", () => {
    const debords: string[] = [];
    for (const w of recueil.itineraires) {
      const p = portrait(w.p, 300, 330, 0.12);
      if (!p) { debords.push(`${w.slug} : aucun portrait`); continue; }
      for (const m of p.d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)) {
        const x = Number(m[1]), y = Number(m[2]);
        if (x < -0.05 || x > 300.05 || y < -0.05 || y > 330.05) {
          debords.push(`${w.slug} : ${x},${y}`);
          break;
        }
      }
    }
    expect(debords).toEqual([]);
  });

  /**
   * 🔴 LE TEST QUI TIENT LA RAISON D'ÊTRE DU PORTRAIT.
   *
   * Normaliser X et Y séparément — ce qui vient tout seul sous les doigts —
   * étire chaque tracé jusqu'à remplir sa boîte. Les 46 silhouettes
   * deviennent alors 46 rectangles pleins : le portrait n'est plus un
   * visage, et rien à l'écran ne s'en plaint.
   *
   * ⭐ On ne mesure donc pas une formule, on mesure ce qu'elle PRODUIT : la
   *    DISPERSION des proportions. Avec un seul facteur d'échelle, les
   *    circuits larges remplissent la largeur et les circuits longs la
   *    hauteur — les rapports s'étalent. Avec deux facteurs, ils valent tous
   *    exactement 300/330, et l'écart-type tombe à zéro.
   */
  it("garde les proportions — les 46 silhouettes ne se ressemblent pas", () => {
    const rapports = recueil.itineraires.map((w) => {
      const p = portrait(w.p, 300, 330, 0.12)!;
      const xs: number[] = [], ys: number[] = [];
      for (const m of p.d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)) {
        xs.push(Number(m[1])); ys.push(Number(m[2]));
      }
      return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
    });
    const moy = rapports.reduce((a, b) => a + b, 0) / rapports.length;
    const ecart = Math.sqrt(
      rapports.reduce((a, r) => a + (r - moy) ** 2, 0) / rapports.length,
    );
    // Mesuré : ~0,76. Un rendu étiré rendrait exactement 0.
    expect(ecart).toBeGreaterThan(0.3);
    // Et aucune silhouette ne remplit les deux axes à la fois.
    expect(rapports.every((r) => Math.abs(r - 300 / 330) > 0.001)).toBe(true);
  });

  it("reconnaît une boucle, et un aller simple", () => {
    const boucle = portrait([[-4.5, 48.2], [-4.49, 48.21], [-4.5, 48.2]], 100, 100)!;
    const droit = portrait([[-4.5, 48.2], [-4.4, 48.25]], 100, 100)!;
    expect(boucle.boucle).toBe(true);
    expect(droit.boucle).toBe(false);
  });

  it("rend null plutôt qu'un dessin faux quand il n'y a pas de tracé", () => {
    expect(portrait([], 100, 100)).toBeNull();
    expect(portrait([[-4.5, 48.2]], 100, 100)).toBeNull();
  });
});

/**
 * LA COHÉRENCE DES SURFACES — comptée, pas relue.
 *
 * 🔴 CE DÉSORDRE N'EST NÉ D'AUCUNE DÉCISION. Trois chartes se sont succédé
 *    sur cette feuille, chacune ajoutant sans retirer. Au 31/10/2026, avant
 *    reprise : 96 surfaces, 44 noms de fond, 17 rayons, 17 ombres — dont
 *    douze rayons « organiques » et sept ombres manuscrites qui
 *    appartenaient à la charte bleu nuit, sur un site passé au sable.
 *
 * ⭐ LE TRAITEMENT D'UNE SURFACE DOIT ENCODER SON RÔLE, PAS SON ÂGE. Et
 *    personne ne relit six mille lignes de CSS pour s'en assurer : sans un
 *    test qui COMPTE, la quatrième charte ajoutera sa couche sur les trois
 *    autres, et la session suivante lira les quatre langages comme s'ils
 *    étaient voulus.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const FEUILLES = ["src/styles.css", "src/systeme.css", "src/tokens.css"];
const sansCommentaires = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "");
const css = () => FEUILLES.map((f) => sansCommentaires(readFileSync(f, "utf8"))).join("\n");

describe("la charte des surfaces", () => {
  /**
   * ⚠️ Le motif vise les rayons à QUATRE valeurs différentes — la signature
   *    du blob. `var(--r-l) var(--r-l) 0 0` reste permis : c'est un rayon de
   *    token, appliqué à deux coins, et il dit quelque chose (une feuille qui
   *    monte depuis le bas).
   */
  it("⛔ aucun rayon « organique » — quatre valeurs en pixels différentes", () => {
    const fautifs = css().split("\n")
      .map((l, i) => ({ l: l.trim(), n: i + 1 }))
      .filter((x) => /border-radius:\s*\d+px\s+\d+px\s+\d+px\s+\d+px/.test(x.l))
      .map((x) => `ligne ${x.n} : ${x.l.slice(0, 70)}`);
    expect(fautifs, "utiliser --r-s / --r-m / --r-l / --r-xl / --r-rond").toEqual([]);
  });

  it("⛔ aucune pilule écrite en dur — `--r-rond` existe pour ça", () => {
    expect(css()).not.toMatch(/border-radius:\s*999px/);
  });

  /**
   * ⭐ Le reflet intérieur blanc est le MARQUEUR de l'ancienne charte : il
   *    simule une lumière venue d'en haut sur une surface vernie. Sur la
   *    craie il n'a plus d'objet. Le chercher est plus sûr que de chercher
   *    « une ombre complexe » — un motif de forme, pas de goût.
   */
  it("⛔ aucune ombre ne porte de reflet intérieur blanc (charte bleu nuit)", () => {
    const fautifs = css().split("\n")
      .filter((l) => /inset[^;]*rgb\(255 255 255/.test(l))
      .map((l) => l.trim().slice(0, 70));
    expect(fautifs, "utiliser --ombre-carte (posé) ou --ombre-levee (flottant)").toEqual([]);
  });

  it("🔴 aucune couleur en hexadécimal brut hors des tokens", () => {
    /* ⚠️ On n'inspecte QUE les feuilles de composants : `tokens.css` est
       l'endroit où les hex sont légitimes — c'est leur définition. Trois
       vivaient sur les repères de carte (#2a9d4a, #c0392b, #2f6fdd), sans
       aucun lien avec la charte, sur l'écran censé être notre signature. */
    const composants = ["src/styles.css", "src/systeme.css"]
      .map((f) => sansCommentaires(readFileSync(f, "utf8"))).join("\n");
    const hex = [...composants.matchAll(/(?:color|background|fill|stroke|border-color)[^;:]*:\s*(#[0-9a-f]{3,8})/gi)]
      .map((m) => m[1]);
    // ⚠️ #fff et #000 restent admis dans une ombre ou un voile : ce sont des
    //    neutres purs, pas des couleurs de marque.
    const marque = hex.filter((h) => !/^#(fff|000|ffffff|000000)$/i.test(h));
    expect([...new Set(marque)], "nommer la couleur dans tokens.css").toEqual([]);
  });

  it("⛔ les noms de surface périmés ont disparu", () => {
    /* `--sand` et `--blanc-chaud` nommaient la même intention que
       `--fond-surelevé` et `--craie`. Cinq noms pour trois rôles, c'est
       quatre occasions de diverger. */
    for (const mort of ["--sand", "--blanc-chaud"]) {
      expect(css(), `${mort} est encore employé`).not.toContain(`var(${mort})`);
    }
  });
});

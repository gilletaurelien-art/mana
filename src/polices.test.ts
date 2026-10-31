/**
 * LES POLICES SONT EN WOFF2, ET UN TEST LE TIENT.
 *
 * ⭐ Parce qu'un interdit en commentaire se franchit sans le savoir. Les deux
 *    Rubik ont vécu dix mois en TTF à côté d'une MarelleBaton déjà en WOFF2 :
 *    personne n'avait tort, personne n'avait regardé. Le poids est le genre de
 *    défaut qui ne casse rien et ne se signale jamais — il se paie dehors, sur
 *    un réseau pauvre, au premier chargement.
 *
 * Mesuré le 31/10/2026 : 343 Ko de TTF → 111 Ko de WOFF2, −68 %. C'est le
 * poste le plus lourd du premier écran, et le hors-ligne le télécharge en
 * entier.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";

const DOSSIER = "src/fonts";

describe("les polices", () => {
  it("⛔ aucune police en TTF — c'est trois fois le poids du WOFF2", () => {
    const ttf = readdirSync(DOSSIER).filter((f) => /\.ttf$/i.test(f));
    expect(ttf).toEqual([]);
  });

  it("la feuille de style ne déclare aucun format « truetype »", () => {
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).not.toContain('format("truetype")');
    expect(css).not.toContain("format('truetype')");
  });

  it("chaque police déclarée existe vraiment et porte l'en-tête WOFF2", () => {
    const css = readFileSync("src/styles.css", "utf8");
    const noms = [...css.matchAll(/url\("\.\/fonts\/([^"]+)"\)/g)].map((m) => m[1]);
    expect(noms.length).toBeGreaterThan(0);
    for (const n of noms) {
      // ⚠️ On lit l'EN-TÊTE, pas l'extension : un fichier renommé passerait
      //    un contrôle de nom et s'afficherait en police système, en silence.
      const d = readFileSync(`${DOSSIER}/${n}`);
      expect(d.subarray(0, 4).toString("latin1")).toBe("wOF2");
    }
  });

  it("aucune police ne dépasse 80 Ko — le seuil est le poids, pas le format", () => {
    for (const f of readdirSync(DOSSIER)) {
      const o = statSync(`${DOSSIER}/${f}`).size;
      expect(o, `${f} pèse ${Math.round(o / 1024)} Ko`).toBeLessThan(80 * 1024);
    }
  });
});

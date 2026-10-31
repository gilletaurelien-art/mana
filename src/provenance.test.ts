import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MENTION, WALKS } from "./walks";
import type { Provenance } from "./walks";

/**
 * ⛔ CE FICHIER TIENT UNE RÈGLE DE SÉCURITÉ, PAS UNE RÈGLE DE STYLE.
 *
 * Quelqu'un qui suit une boucle NON BALISÉE sur le sentier côtier doit
 * l'apprendre avant de partir. Les quatre mentions existaient d'abord en
 * commentaire ; un interdit en docstring se franchit sans le savoir.
 */
describe("qui répond de ce tracé", () => {
  it("les quatre rangs ont une mention, et aucune n'est vide", () => {
    const rangs: Provenance[] = ["ot", "mana", "osm", "compose"];
    for (const r of rangs) expect(MENTION[r].length).toBeGreaterThan(10);
  });

  it("⛔ aucune mention n'affirme que l'Office RECOMMANDE MANA", () => {
    // « recommande » est un avis sur un tiers : il se retire, il vieillit, et
    // il dit que l'Office adoube MANA. « balisé par » est un fait qu'on
    // constate sur un poteau.
    for (const m of Object.values(MENTION)) {
      expect(m.toLowerCase()).not.toMatch(/recommand|approuv|valid[ée]|partenaire officiel/);
    }
  });

  it("⛔ seul le rang `ot` emploie le mot « balisé » au positif", () => {
    expect(MENTION.ot).toMatch(/balisé/i);
    expect(MENTION.mana).not.toMatch(/balisé/i);
    // les deux autres ne le promettent pas : l'un le nie, l'autre le dit inconnu
    expect(MENTION.compose).toMatch(/non balisé/i);
    expect(MENTION.osm).toMatch(/non vérifié/i);
  });

  it("une promenade composée dit NON BALISÉ, jamais le contraire", () => {
    expect(MENTION.compose).toMatch(/non balisé/i);
    expect(MENTION.compose).toMatch(/MANA/);
  });

  it("les quatre promenades embarquées déclarent leur rang", () => {
    expect(WALKS.length).toBeGreaterThan(0);
    for (const w of WALKS) {
      expect(w.provenance, w.slug).toBeDefined();
      // ⛔ aucune ne peut se déclarer balisée par l'Office : nous n'avons pas
      //    leurs tracés. Le jour où on les aura, ce test se RETOURNE.
      expect(w.provenance, w.slug).not.toBe("ot");
    }
  });

  it("la mention VOYAGE dans le GPX, pas seulement à l'écran", () => {
    // ⭐ Même règle que l'attribution ODbL : un fichier exporté se promène
    //    sans sa page. La mention doit être DANS le <desc>.
    const src = readFileSync(new URL("./Promenade.tsx", import.meta.url), "utf8");
    const gpx = src.slice(src.indexOf("function enGpx"), src.indexOf("function telecharger"));
    expect(gpx).toContain("MENTION[walk.provenance]");
  });

  it("les deux écrans qui décident d'un départ portent la mention", () => {
    for (const f of ["./FichePromenade.tsx", "./Promenade.tsx"]) {
      const src = readFileSync(new URL(f, import.meta.url), "utf8");
      expect(src, f).toContain("MENTION[walk.provenance]");
    }
  });
});

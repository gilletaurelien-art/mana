import { describe, it, expect } from "vitest";
import inventaire from "./lieux.json";
import type { Inventaire } from "./lieux";
import { nommer } from "./lieux";

const inv = inventaire as unknown as Inventaire;

/**
 * ⭐ CE FICHIER TIENT L'INVENTAIRE — la moitié que MANA apporte face aux
 *    46 circuits de l'Office. Il protège surtout contre la règle de
 *    dédoublonnage, qui a détruit son propre sujet TROIS FOIS avant d'être
 *    juste (voir `scripts/lieux.py`).
 */
describe("l'inventaire des sites remarquables", () => {
  it("recense plus de mille lieux, dont des centaines nommés", () => {
    expect(inv.lieux.length).toBeGreaterThan(1200);
    expect(inv.lieux.filter((l) => l.n).length).toBeGreaterThan(500);
  });

  it("🔴 l'alignement de Lagatjar n'est pas écrasé en un seul point", () => {
    // Trois règles de dédoublonnage l'ont absorbé : proximité (84 mégalithes
    // ramenés à 23), puis « un nœud cède à une surface », puis « seulement si
    // la surface est fermée » — Lagatjar EST un polygone fermé autour du champ.
    // ⭐ Un alignement de menhirs, c'est beaucoup de menhirs : c'est le sujet.
    const meg = inv.lieux.filter((l) => l.c === "megalithe");
    expect(meg.length).toBeGreaterThanOrEqual(80);
    expect(meg.some((l) => l.n?.includes("Lagatjar"))).toBe(true);
  });

  it("⛔ aucun robinet, aucune borne, aucune ligne de falaise", () => {
    // Comptés avant d'être refusés : drinking_water 30, milestone 27 (zéro
    // nommé), cliff 48. ⭐ Une catégorie n'est pas un sujet.
    const cats = new Set(inv.lieux.map((l) => l.c));
    for (const interdit of ["drinking_water", "milestone", "cliff", "pier", "slipway"]) {
      expect(cats.has(interdit), interdit).toBe(false);
    }
  });

  it("chaque lieu porte sa position, sa catégorie et sa source OSM", () => {
    for (const l of inv.lieux) {
      expect(inv.libelles[l.c], l.c).toBeTruthy();
      expect(l.osm, l.osm).toMatch(/^[nw]\d+$/);
      expect(l.g[0]).toBeGreaterThan(-4.70);
      expect(l.g[0]).toBeLessThan(-4.00);
      expect(l.g[1]).toBeGreaterThan(48.10);
      expect(l.g[1]).toBeLessThan(48.40);
    }
  });

  it("⚠️ un lieu anonyme se nomme par sa CATÉGORIE, jamais par sa clé", () => {
    // « megalithe » ne se montre pas à l'écran ; « Mégalithe » si.
    const anonyme = inv.lieux.find((l) => !l.n)!;
    expect(anonyme).toBeDefined();
    expect(nommer(anonyme, inv.libelles)).toBe(inv.libelles[anonyme.c]);
    expect(nommer(anonyme, inv.libelles)).not.toBe(anonyme.c);
  });

  it("l'attribution ODbL voyage avec l'inventaire", () => {
    expect(inv.attribution).toMatch(/OpenStreetMap/);
    expect(inv.attribution).toMatch(/ODbL/);
  });
});

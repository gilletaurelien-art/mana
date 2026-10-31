import { describe, it, expect } from "vitest";
import { surLaPresquile, PRESQUILE } from "./Promenades";
import type { Fiche } from "./catalogue";

/**
 * ⭐ CE TEST TIENT UNE RÈGLE DE PRODUIT, PAS UN DÉTAIL D'IMPLÉMENTATION : la
 *    page s'intitule « Presqu'île de Crozon », donc elle ne doit montrer que
 *    ça. Un interdit en commentaire se franchit sans le savoir.
 *
 * ⚠️ Les lignes ci-dessous sont RECOPIÉES de l'index réel
 *    (https://mana.bzh/bretagne/index.json, relevé le 31/10/2026) — pas
 *    inventées : une fixture inventée répond ce qu'on espère.
 */
const f = (n: string, d: string | null, a: string | null, k = 1): Fiche =>
  ({ s: n, n, k, d, a, c: 1, p: 1, x: 0, y: 0, o: false, j: 0 });

const INDEX = [
  f("Chemin des Douaniers, Lanvéoc - Pentrez", "Lanvéoc", "Saint-Nic", 94.5),
  f("Chemin des Douaniers, Marros - Lanvéoc", "Lanvéoc", "Argol", 28.5),
  f("Presqu'île de Crozon, Pentrez-Marros", "Saint-Nic", "Argol", 24.2),
  f("L'Anse Saint-Nicolas", "Crozon", "Crozon", 12.0),
  f("Chemin des Douaniers, Le Faou - Marros", "Faou", "Argol", 12.0),
  f("La balade de Saint-Fiacre", "Crozon", "Crozon", 6.4),
  f("Balade Sonore de l'Île Vierge", "Crozon", "Crozon", 3.4),
  // ── ce que l'emprise rectangulaire attrapait à tort, et qu'on refuse ──
  f("Sentier Côtier", "Logonna-Daoulas", "Logonna-Daoulas", 27.7),
  f("Circuit du Menez-Hom", "Trégarvan", "Trégarvan", 15.0),
  f("PR de Daoulas", "Daoulas", "Daoulas", 5.5),
  f("Circuit de St Mathieu", "Plougonvelin", "Plougonvelin", 4.9),
  f("Chemin des Douaniers, Brest - Le Faou", "Hôpital-Camfrout", "Daoulas", 27.8),
];

describe("la page ne montre que la presqu'île", () => {
  it("retient les 7 itinéraires relevés, et 181 km", () => {
    const gardes = INDEX.filter(surLaPresquile);
    expect(gardes).toHaveLength(7);
    expect(Math.round(gardes.reduce((t, x) => t + x.k, 0))).toBe(181);
  });

  it("⛔ écarte la rade de Brest, que l'emprise rectangulaire attrapait", () => {
    const noms = INDEX.filter(surLaPresquile).map((x) => x.n);
    for (const intrus of ["Sentier Côtier", "Circuit du Menez-Hom", "PR de Daoulas", "Circuit de St Mathieu"]) {
      expect(noms).not.toContain(intrus);
    }
  });

  it("retient par le DÉPART ou par l'ARRIVÉE, pas seulement le départ", () => {
    // « Le Faou → Argol » part hors presqu'île et y arrive : il compte.
    expect(surLaPresquile(f("x", "Faou", "Argol"))).toBe(true);
    expect(surLaPresquile(f("x", "Argol", "Faou"))).toBe(true);
    expect(surLaPresquile(f("x", "Faou", "Daoulas"))).toBe(false);
  });

  it("tolère les communes absentes de l'index sans lever", () => {
    expect(surLaPresquile(f("x", null, null))).toBe(false);
  });

  it("nomme les 7 communes de la presqu'île", () => {
    expect(PRESQUILE.size).toBe(7);
    expect(PRESQUILE.has("Camaret-sur-Mer")).toBe(true);
  });
});

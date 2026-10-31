import { describe, it, expect } from "vitest";
import { TERRITOIRES, DEFAUT, territoireDe, urlGraphe } from "./territoires";

/** Coordonnées des chefs-lieux, relevées le 31/10/2026. */
const COMMUNES: [string, number, number, string][] = [
  ["Camaret-sur-Mer", -4.5936, 48.2772, "presquile"],
  ["Roscanvel", -4.5469, 48.3161, "presquile"],
  ["Crozon", -4.4896, 48.2470, "presquile"],
  ["Lanvéoc", -4.4553, 48.2914, "presquile"],
  ["Telgruc-sur-Mer", -4.3650, 48.2272, "presquile"],
  ["Argol", -4.2986, 48.2436, "presquile"],
  ["Landévennec", -4.2697, 48.2936, "aulne"],
  ["Rosnoën", -4.2122, 48.2619, "aulne"],
  ["Le Faou", -4.1803, 48.2947, "aulne"],
  ["Pont-de-Buis-lès-Quimerch", -4.1047, 48.2697, "aulne"],
  ["Saint-Ségal", -4.0750, 48.2297, "aulne"],
];

describe("le choix du territoire", () => {
  it("les 11 communes de la communauté tombent dans un graphe", () => {
    for (const [nom, lon, lat] of COMMUNES) {
      expect(territoireDe(lon, lat), nom).not.toBeNull();
    }
  });

  it("chacune tombe dans celui qui l'entoure", () => {
    for (const [nom, lon, lat, attendu] of COMMUNES) {
      expect(territoireDe(lon, lat)?.slug, nom).toBe(attendu);
    }
  });

  it("⭐ le recouvrement n'est pas un mur : Argol et Landévennec sont des deux côtés", () => {
    // Les deux communes vivent DANS la bande commune. Elles sont servies par
    // un seul graphe, mais l'autre les contient aussi — c'est ce qui fait
    // qu'une boucle ne s'arrête pas à la limite administrative.
    const [, argolLon, argolLat] = COMMUNES.find((c) => c[0] === "Argol")!;
    const [, landLon, landLat] = COMMUNES.find((c) => c[0] === "Landévennec")!;
    for (const [lon, lat] of [[argolLon, argolLat], [landLon, landLat]]) {
      const dedans = TERRITOIRES.filter(
        (t) => lon >= t.emprise[0] && lon <= t.emprise[2] && lat >= t.emprise[1] && lat <= t.emprise[3],
      );
      expect(dedans).toHaveLength(2);
    }
  });

  it("hors des deux emprises, on ne devine pas", () => {
    expect(territoireDe(-1.68, 48.11)).toBeNull();   // Rennes
    expect(territoireDe(-4.49, 47.80)).toBeNull();   // au large, plein sud
  });

  it("le défaut est la presqu'île — c'est là que vivent les 4 promenades", () => {
    expect(DEFAUT.slug).toBe("presquile");
  });

  it("l'URL se bâtit sous la base donnée", () => {
    expect(urlGraphe("https://mana.bzh/bretagne/g", DEFAUT))
      .toBe("https://mana.bzh/bretagne/g/presquile.json");
  });
});

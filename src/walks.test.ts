import { describe, it, expect } from "vitest";
import { WALKS, verifierTrace, sautMax, pointsRepetes, distM } from "./walks";

/**
 * ⛔ CE FICHIER EST UN INTERDIT, PAS UNE DESCRIPTION.
 *
 * Le 28/10/2026, la page d'accueil affichait un parcours INVENTÉ présenté
 * comme le GR34 — une boucle plausible dessinée à la main. Devant un office
 * de tourisme, leur propre côte se reconnaît en trois secondes, et le jour où
 * un tracé se révèle faux, tout le reste devient suspect.
 *
 * Ces tests refusent d'embarquer un tracé qu'on n'a pas vérifié.
 */

describe("les tracés livrés sont géométriquement sains", () => {
  for (const w of WALKS) {
    it(`${w.slug} — aucun saut, aucun point répété`, () => {
      expect(verifierTrace(w.points)).toEqual([]);
    });
  }
});

describe("chaque promenade dit d'où elle vient", () => {
  for (const w of WALKS) {
    it(`${w.slug} — porte sa référence OSM et son lien`, () => {
      // L'ODbL exige l'attribution : sans source, on ne publie pas.
      expect(w.osmRef).toMatch(/^osm:(way|node|relation):\d+/);
      expect(w.osmUrl).toMatch(/^https:\/\/www\.openstreetmap\.org\//);
    });
  }
});

describe("les étapes sont ordonnées LE LONG du chemin", () => {
  for (const w of WALKS) {
    it(`${w.slug} — positions croissantes de 0 à 1`, () => {
      // Une liste triée par distance sous un titre qui annonce une SÉQUENCE
      // (« ce que vous croiserez ») ment sur l'ordre de la marche.
      const pos = w.etapes.map((e) => e.pos);
      expect(pos).toEqual([...pos].sort((a, b) => a - b));
      for (const p of pos) expect(p).toBeGreaterThanOrEqual(0);
      for (const p of pos) expect(p).toBeLessThanOrEqual(1);
    });
  }
});

describe("on n'affiche QUE ce qu'on sait", () => {
  for (const w of WALKS) {
    it(`${w.slug} — aucune étape au nom générique`, () => {
      // « Lande », « Plage », « Point de vue » sont des objets OSM SANS nom.
      // Les afficher donne du bruit présenté comme un repère.
      const generiques = /^(plage|lande|point de vue|ch[âa]teau|calvaire|phare|grotte|parc|for[êe]t|sentier|moulin|chapelle)$/i;
      for (const e of w.etapes) expect(e.nom).not.toMatch(generiques);
    });

    it(`${w.slug} — la longueur annoncée correspond au tracé`, () => {
      // ⚠️ Ce test ne REMPLACE pas verifierTrace : un tracé recollé dans le
      //    désordre a une longueur parfaitement plausible (le moissonneur coupe
      //    tout saut > 500 m). La longueur ne détecte PAS le désordre.
      let m = 0;
      for (let i = 1; i < w.points.length; i++) m += distM(w.points[i - 1], w.points[i]);
      expect(m / 1000).toBeGreaterThan(w.distanceKm * 0.9);
      expect(m / 1000).toBeLessThan(w.distanceKm * 1.1);
    });
  }
});

describe("le contrôle refuse VRAIMENT — validé par mutation", () => {
  // ⚠️ LA MUTATION SE FAIT SUR UNE MATIÈRE FABRIQUÉE ICI, jamais sur un tracé
  //    livré. Première version : on ajoutait un point en double à WALKS[0] et
  //    on attendait `pointsRepetes === 1`. Elle a rendu 37 — parce que le
  //    tracé réel en porte DÉJÀ 36, légitimement. Le test mesurait la donnée
  //    au lieu de mesurer le garde.
  //    ⭐ Une mutation posée sur une matière qu'on n'a pas fabriquée teste
  //       autre chose que ce qu'on croit.
  const droit = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ lat: 48.6 + i * 0.0002, lon: -2.3 }));

  it("un tracé fabriqué sain passe", () => {
    expect(verifierTrace(droit(50))).toEqual([]);
  });

  it("un saut de 400 m est refusé", () => {
    const t = droit(50);
    const abime = [...t.slice(0, 20), { lat: t[19].lat + 0.004, lon: t[19].lon }, ...t.slice(20)];
    expect(sautMax(abime)).toBeGreaterThan(150);
    expect(verifierTrace(abime).join(" ")).toMatch(/saut/);
  });

  it("un recollement désordonné (plus de 8 % de points répétés) est refusé", () => {
    const t = droit(50);
    const abime = [...t, ...t.slice(0, 10)]; // 10 répétés sur 60 = 16,7 %
    expect(pointsRepetes(abime)).toBe(10);
    expect(verifierTrace(abime).join(" ")).toMatch(/répétés/);
  });

  it("quelques répétitions légitimes NE sont PAS refusées", () => {
    // Une antenne aller-retour vers un point de vue repasse par les mêmes nœuds.
    const t = droit(100);
    const abime = [...t, ...t.slice(95)]; // 5 sur 105 = 4,8 %
    expect(verifierTrace(abime)).toEqual([]);
  });

  it("les tracés RÉELLEMENT livrés passent", () => {
    for (const w of WALKS) expect(verifierTrace(w.points)).toEqual([]);
  });
});

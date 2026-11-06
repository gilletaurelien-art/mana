import { describe, it, expect } from "vitest";
import { chercher, plat, RESULTATS_MAX, LONGUEUR_MIN } from "./recherche";
import type { Lieu } from "./lieux";

const lib = (c: string) => ({ megalithe: "Mégalithe", plage: "Plage", pointe: "Pointe" }[c] ?? c);
const lieu = (n: string | null, c: string, g: [number, number], extra: Partial<Lieu> = {}): Lieu =>
  ({ n, c, g, osm: "n1", ...extra });

/**
 * 🔴 CES TESTS NAISSENT D'UNE EXTRACTION, PAS D'UNE ÉCRITURE. Le moteur
 * vivait dans `Territoire2030.tsx` ; il en est sorti le 6/11/2026 pour servir
 * AUSSI l'accueil. Il n'avait aucun test : il était correct et personne ne
 * pouvait le déplacer sans risque.
 * ⭐ Un code sans test n'est pas « du code à tester un jour » : c'est du code
 *    qu'on n'a pas le droit de bouger. Le prix se paie au moment où l'on en a
 *    besoin ailleurs — c'est-à-dire au moment où il a fait ses preuves.
 */
describe("plat — les accents ne doivent pas cacher la Bretagne", () => {
  it("« ile vierge » trouve « Île Vierge »", () => {
    expect(plat("Île Vierge")).toContain(plat("ile vierge"));
  });
  it("la casse ne décide de rien", () => {
    expect(plat("MÉNEZ HOM")).toBe(plat("ménez hom"));
  });
});

describe("chercher — ce qu'on tape, pas ce qu'on a sous la main", () => {
  const LIEUX = [
    lieu("Pointe de Pen-Hir", "pointe", [-4.62, 48.25]),
    lieu("Plage de Goulien", "plage", [-4.55, 48.23]),
    lieu(null, "plage", [-4.50, 48.20]),
  ];
  const idx = { lieux: LIEUX, libelle: lib };

  it("trouve sans accents ni casse", () => {
    expect(chercher("pen-hir", idx).map((r) => r.nom)).toEqual(["Pointe de Pen-Hir"]);
  });

  /* ⚠️ 734 lieux de l'inventaire n'ont PAS de nom. Chercher « plage » ne doit
     pas rendre cinquante lignes toutes intitulées « Plage » : les anonymes se
     voient sur la carte, ils ne se cherchent pas par leur nom. */
  it("ne rend JAMAIS un lieu sans nom", () => {
    const r = chercher("plage", idx);
    expect(r.map((x) => x.nom)).toEqual(["Plage de Goulien"]);
    expect(r.every((x) => x.nom)).toBe(true);
  });

  it(`se tait sous ${LONGUEUR_MIN} caractères — une liste qui répond à tout n'aide pas`, () => {
    expect(chercher("p", idx)).toEqual([]);
    expect(chercher(" ", idx)).toEqual([]);
  });

  it("le détail d'un lieu est son libellé lisible, jamais la clé technique", () => {
    expect(chercher("goulien", idx)[0].detail).toBe("Plage");
  });

  /* ⚠️ `desc` et `wiki` VOYAGENT AVEC LE RÉSULTAT : sans eux, le même lieu
     rendait une fiche riche au clic et une fiche nue à la recherche. */
  it("la description et le lien wiki suivent le lieu", () => {
    const r = chercher("hom", {
      lieux: [lieu("Ménez Hom", "pointe", [-4.2, 48.2], { desc: "un sommet", wiki: "fr:Ménez-Hom" })],
      libelle: lib,
    })[0];
    expect(r.genre).toBe("lieu");
    expect(r).toMatchObject({ desc: "un sommet", wiki: "fr:Ménez-Hom" });
  });
});

describe("chercher — le dédoublonnage ne doit pas effacer de lieux réels", () => {
  /* 🔴 LE TEST QUI COMPTE. Il y a QUATRE « menhir » distincts sur la
     presqu'île. Dédoublonner par NOM seul en effacerait trois — une
     suppression silencieuse de données réelles, invisible à l'écran. La clé
     est donc nom + POSITION arrondie. */
  it("quatre menhirs homonymes restent quatre", () => {
    const r = chercher("menhir", {
      lieux: [
        lieu("Menhir", "megalithe", [-4.60, 48.25]),
        lieu("Menhir", "megalithe", [-4.50, 48.26]),
        lieu("Menhir", "megalithe", [-4.40, 48.27]),
        lieu("Menhir", "megalithe", [-4.30, 48.28]),
      ],
      libelle: lib,
    });
    expect(r).toHaveLength(4);
  });

  it("mais le MÊME endroit vu deux fois n'est rendu qu'une", () => {
    const r = chercher("menhir", {
      lieux: [lieu("Menhir", "megalithe", [-4.6, 48.25]), lieu("Menhir", "megalithe", [-4.6, 48.25])],
      libelle: lib,
    });
    expect(r).toHaveLength(1);
  });
});

describe("chercher — les trois inventaires, et leur ordre", () => {
  const PROM = [{
    slug: "ile-vierge", titre: "Balade Sonore de l'Île Vierge", lieu: "Crozon",
    distanceKm: 4.2, points: [{ lon: -4.5, lat: 48.2 }],
    etapes: [{ nom: "Plage de l'Île Vierge", categorie: "plage", lon: -4.51, lat: 48.21 }],
  }];

  /* ⭐ Mesuré le 31/10 : « Île Vierge » rendait ZÉRO sur un site qui propose
     la Balade Sonore de l'Île Vierge — le premier jet ne lisait que les lieux
     accrochés au graphe. Un index, c'est ce que les gens TAPENT. */
  it("une promenade se trouve par son titre, même absente de l'inventaire", () => {
    const r = chercher("ile vierge", { promenades: PROM, lieux: [], libelle: lib });
    expect(r[0]).toMatchObject({ genre: "promenade", slug: "ile-vierge" });
  });

  it("une promenade passe AVANT un point : elle répond mieux", () => {
    const r = chercher("vierge", {
      promenades: PROM,
      lieux: [lieu("Île Vierge (rocher)", "pointe", [-4.9, 48.9])],
      libelle: lib,
    });
    expect(r[0].genre).toBe("promenade");
  });

  it("l'accueil peut chercher SANS promenades — 264 Ko qu'il ne charge pas", () => {
    expect(() => chercher("plage", { lieux: [], libelle: lib })).not.toThrow();
    expect(chercher("plage", { libelle: lib })).toEqual([]);
  });

  it(`plafonne à ${RESULTATS_MAX} : une liste qui recouvre la carte cache ce qu'on cherchait`, () => {
    const beaucoup = Array.from({ length: 30 }, (_, i) =>
      lieu(`Plage ${i}`, "plage", [-4.6 + i / 100, 48.2]));
    expect(chercher("plage", { lieux: beaucoup, libelle: lib })).toHaveLength(RESULTATS_MAX);
  });
});

describe("🔴 6/11/2026 — le champ promettait « une commune » et n'en rendait aucune", () => {
  /* ⭐ « Ce qu'on affiche dit ce qu'on promet. » Le libellé du champ annonce
     « Une commune, un lieu… » depuis le 1/11 ; le moteur ne cherchait que
     dans l'inventaire des sites, qui ne porte pas de communes. Un libellé qui
     annonce une entrée inexistante est un mensonge d'interface — et c'est le
     fondateur qui l'a vu, pas les tests. */
  const COMMUNES = [
    ["Crozon", -4.5316, 48.2313],
    ["Camaret-sur-Mer", -4.589, 48.266],
    ["Faou", -4.1792, 48.2947],
  ] as const;
  const idx = { communes: COMMUNES, libelle: lib };

  it("une commune se trouve par son nom", () => {
    const r = chercher("camaret", idx);
    expect(r.map((x) => x.nom)).toEqual(["Camaret-sur-Mer"]);
    expect(r[0].genre).toBe("commune");
    expect(r[0].detail).toBe("Commune");
  });

  /* 🔴 LE TEST QUI COMPTE. La source nationale stocke « Faou » et
     « Hôpital-Camfrout » SANS leur article. Qui tape « Le Faou » — c'est-à-
     dire la façon normale de le dire — n'aurait rien trouvé, et aurait conclu
     que la commune n'est pas couverte. ⭐ Un index ne se juge pas sur ce
     qu'il contient, mais sur ce que les gens TAPENT. */
  it("« Le Faou » trouve « Faou » — la source stocke les communes sans article", () => {
    expect(chercher("le faou", idx).map((x) => x.nom)).toEqual(["Faou"]);
    expect(chercher("faou", idx).map((x) => x.nom)).toEqual(["Faou"]);
  });

  /* ⭐ Qui tape « Crozon » cherche la COMMUNE, pas le « Menhir de Crozon ».
     On rend d'abord la réponse la plus large — même règle que les promenades
     devant les points. */
  it("la commune passe avant le point qui porte son nom", () => {
    const r = chercher("crozon", {
      communes: COMMUNES,
      lieux: [lieu("Menhir de Crozon", "megalithe", [-4.5, 48.24])],
      libelle: lib,
    });
    expect(r[0].genre).toBe("commune");
    expect(r.map((x) => x.nom)).toEqual(["Crozon", "Menhir de Crozon"]);
  });

  it("sans communes fournies, le moteur se tait au lieu de lever", () => {
    expect(() => chercher("crozon", { libelle: lib })).not.toThrow();
  });
});

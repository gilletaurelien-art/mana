import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { Z } from "./tuiles";

const lire = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const carte = lire("./CarteMonde.tsx");

/**
 * 🔴 DEUX JEUX DE TUILES, UN SEUL CADRAGE — 15/11/2026. La carte commune lit
 *    `/monde/s` (les sites) et `/monde/h` (les hébergements) avec le MÊME
 *    `tuilesDuCadre()`, donc le même zoom. Si un producteur s'écarte, chaque
 *    tuile demandée rend 404 — et le code traite un 404 comme « il n'y a rien
 *    ici ». Le calque s'allumerait, ne montrerait rien, et aurait l'air
 *    d'un territoire vide.
 * ⭐ C'est la forme la plus silencieuse de la panne : pas d'erreur, pas de
 *    trace, une réponse plausible. D'où ce garde.
 */
describe("les deux calques de la carte commune partagent leur découpage", () => {
  it("le script d'export écrit au zoom que l'écran demande", () => {
    const script = lire("../scripts/hebergements-monde.ts");
    const m = script.match(/const ZOOM = (\d+);/);
    expect(m, "le zoom du script est introuvable").not.toBeNull();
    expect(Number(m![1]), "le script d'hébergements n'écrit pas au zoom lu").toBe(Z);
  });

  it("les sites et les hébergements sont moissonnés par la MÊME fonction", () => {
    /* ⛔ Deux moissonneuses auraient divergé au premier correctif — c'est
       écrit dans ce dépôt depuis que les plages du monde sont restées à 5 %
       pendant seize jours, « parce que le pipeline FRANÇAIS prenait `nwr`
       pendant que le pipeline MONDE prenait `node` ». */
    expect(carte.match(/async function moissonner\(/g)?.length ?? 0).toBe(1);
    const appels = carte.match(/moissonner\("(sites|hebergements)"/g) ?? [];
    expect(appels).toHaveLength(2);
  });

  it("le calque éteint ne se télécharge pas", () => {
    /* ⭐ Masquer coûte la bande passante de ce qu'on cache ; ne pas charger
       coûte zéro. 7 365 tuiles valent la peine qu'on le vérifie. */
    const i = carte.indexOf('moissonner("hebergements"');
    const avant = carte.slice(Math.max(0, i - 400), i);
    expect(avant).toMatch(/calquesVivants\.current\.hebergements/);
  });

  it("les calques se lisent dans un relais, pas dans la closure de montage", () => {
    /* 🔴 L'effet de montage ne tourne qu'UNE fois : une closure y lirait
       éternellement l'état initial — `hebergements: false` — et le calque
       s'allumerait à l'écran sans jamais rien charger. */
    expect(carte).toMatch(/calquesVivants\.current = calques;/);
  });

  it("ce qui est cliquable est ce qui est filtré", () => {
    /* ⭐ `setFilter` est sûr ICI parce qu'il n'y a qu'une liste : le clic
       passe par `m.on("click", "sites")`, que maplibre ne déclenche que pour
       les objets rendus. La carte du territoire, elle, tenait deux listes —
       d'où son retrait des `setFilter` le 4/11. */
    expect(carte).toMatch(/m\.setFilter\("sites"/);
    expect(carte).toMatch(/m\.on\("click", "sites"/);
  });
});

/* ═══ LA FICHE DIT CE QU'ELLE SAIT, ET SEULEMENT ÇA ═══════════════════════ */
import { titreDe, direLeDetail } from "./CarteMonde";

describe("la fiche détaille un hébergement comme un site", () => {
  it("un site nommé porte son nom, un anonyme porte son genre", () => {
    expect(titreDe({ genre: "site", n: "Menhir de Crozon", c: "megalithe", g: [0, 0] }))
      .toBe("Menhir de Crozon");
    expect(titreDe({ genre: "site", n: "Plage", c: "plage", a: 1, g: [0, 0] }))
      .toBe("Plage");
    expect(direLeDetail({ genre: "site", n: "Plage", c: "plage", a: 1, g: [0, 0] }))
      .toBe("Sans nom connu");
  });

  it("un hébergement joint ce qu'on sait, dans l'ordre", () => {
    expect(direLeDetail({ genre: "hebergement", n: "Le Phare", t: "hotel",
                          commune: "Crozon", ch: 12, lits: 24, g: [0, 0] }))
      .toBe("Hôtel · Crozon · 12 chambres · 24 couchages");
  });

  /* ⛔ ON N'ÉCRIT PAS CE QU'ON NE SAIT PAS. Un point OSM porte rarement ses
     couchages : « Hôtel · — chambres » serait un trou maquillé. */
  it("il ne mentionne pas les champs absents", () => {
    expect(direLeDetail({ genre: "hebergement", n: "Chez X", t: "camp_site", g: [0, 0] }))
      .toBe("Camping");
    expect(direLeDetail({ genre: "hebergement", n: "Chez X", g: [0, 0] }))
      .toBe("Hébergement");
  });

  /* ⚠️ « 1 chambres » trahit un gabarit, et se lit comme un défaut du produit
     entier — pas comme une faute de frappe. */
  it("le singulier se dit", () => {
    expect(direLeDetail({ genre: "hebergement", n: "Gîte", ch: 1, lits: 1, g: [0, 0] }))
      .toBe("1 chambre · 1 couchage");
  });

  /* ⭐ Un type inconnu se montre TEL QUEL plutôt que de devenir
     « Hébergement », qui effacerait une information au lieu de l'avouer. */
  it("un type non traduit passe sans être effacé", () => {
    expect(direLeDetail({ genre: "hebergement", n: "X", t: "Rifugio alpino", g: [0, 0] }))
      .toBe("Rifugio alpino");
  });
});

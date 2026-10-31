import { describe, it, expect } from "vitest";
import recueil from "./ot.json";
import type { Recueil } from "./ot";
import { MENTION } from "./walks";

const r = recueil as unknown as Recueil;

/**
 * ⛔ CE FICHIER TIENT CE QU'ON A LE DROIT DE DIRE DE LA DONNÉE D'UN TIERS.
 *    Les tracés sont ceux de l'Office de tourisme. MANA les affiche, les
 *    crédite, et renvoie à leur fiche — elle ne se les attribue pas et ne les
 *    recommande pas.
 */
describe("les itinéraires de l'Office", () => {
  it("46 retenus — les 3 fichiers cassés restent dehors", () => {
    expect(r.itineraires).toHaveLength(46);
    const slugs = r.itineraires.map((i) => i.slug);
    // ⛔ Celui-ci contient DEUX tracés : le sien et celui du Faou, 23 km plus
    //    loin. 48,5 km au lieu de 14. Le laisser entrer dessinerait une ligne
    //    en travers de la presqu'île sous un libellé « balisé ».
    expect(slugs).not.toContain("le-tour-du-cap-de-la-chevre");
    expect(slugs).not.toContain("presquile-voies-vertes");   // 112 tracés
    expect(slugs).not.toContain("circuit-vtt-radio-kimerch"); // écart 42 %
  });

  it("chacun porte un tracé, un lien vers la fiche de l'Office, et un GPX", () => {
    for (const i of r.itineraires) {
      expect(i.p.length, i.slug).toBeGreaterThan(20);
      expect(i.source, i.slug).toMatch(/^https:\/\/www\.crozon-tourisme\.bzh\/itineraire\//);
      expect(i.gpx, i.slug).toMatch(/\.gpx$/);
      expect(i.km, i.slug).toBeGreaterThan(0.5);
    }
  });

  it("⛔ aucun tracé ne dépasse l'emprise de la communauté de communes", () => {
    // Le garde qui aurait arrêté « Le tour du Cap de la chèvre » tout seul.
    for (const i of r.itineraires) {
      for (const [lon, lat] of i.p) {
        expect(lon, i.slug).toBeGreaterThan(-4.70);
        expect(lon, i.slug).toBeLessThan(-4.00);
        expect(lat, i.slug).toBeGreaterThan(48.10);
        expect(lat, i.slug).toBeLessThan(48.40);
      }
    }
  });

  it("⛔ l'artefact ne dit nulle part que l'Office RECOMMANDE MANA", () => {
    const tout = JSON.stringify(r).toLowerCase();
    expect(tout).not.toMatch(/recommand|approuv|partenaire officiel|valid[ée] par/);
  });

  it("⚠️ l'avertissement sur l'accord de reprise VOYAGE avec la donnée", () => {
    // ⭐ Même règle que l'attribution ODbL : un artefact se promène sans sa
    //    page. Si la reprise doit être retirée, il faut pouvoir la retrouver.
    expect(r.avertissement).toMatch(/accord/i);
    expect(r.source).toMatch(/Office de tourisme/i);
  });

  it("la mention affichée est celle du rang `ot`", () => {
    expect(MENTION.ot).toMatch(/balisé par l'Office de tourisme/i);
  });
});

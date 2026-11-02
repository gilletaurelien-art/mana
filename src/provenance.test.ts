import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MENTION, WALKS } from "./walks";
import type { Provenance } from "./walks";
import { enGpx } from "./Promenade";

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

/* ════════════════════════════════════════════════════════════════════════
   CE QUE LE FICHIER DIT, PAS CE QUE LE CODE A L'AIR DE DIRE
   ════════════════════════════════════════════════════════════════════════

   🔴 LES GARDES DU GPX LISAIENT LA SOURCE, et c'est pour ça qu'ils n'ont rien
      vu le 2/11. Un parcours composé n'est l'objet OSM de personne : son
      `osmRef` est vide et son `osmUrl` est la page de licence. Le fichier
      exporté annonçait donc « Référence : . » et offrait un lien intitulé
      « Le tracé sur OpenStreetMap » qui menait au texte juridique.
   ⭐ Deux affirmations fausses dans un artefact qui VOYAGE — il s'ouvre dans
      une montre six mois plus tard, loin de la page qui pouvait les corriger.
      Ce test GÉNÈRE le fichier et le lit.
*/
describe("le GPX d'une promenade composée", () => {
  const compose = {
    provenance: "compose" as const,
    slug: "composee", titre: "Vers le Manoir de Goandour", lieu: "Crozon", resume: "",
    distanceKm: 1.7, dureeEstimeeH: 0.5, boucle: false,
    osmUrl: "https://www.openstreetmap.org/copyright", osmRef: "",
    points: [{ lon: -4.49, lat: 48.24 }, { lon: -4.48, lat: 48.245 }],
    traits: [[{ lon: -4.49, lat: 48.24 }, { lon: -4.48, lat: 48.245 }]],
    etapes: [],
  };

  it("⛔ n'annonce pas une référence qu'il n'a pas", () => {
    const gpx = enGpx(compose);
    expect(gpx, "une référence vide s'écrit en se taisant")
      .not.toMatch(/Référence\s*:\s*\./);
    expect(gpx, "et surtout pas une référence vide tout court")
      .not.toMatch(/Référence\s*:\s*</);
  });

  it("⛔ son lien ne promet pas le tracé quand il mène à la licence", () => {
    const gpx = enGpx(compose);
    const lien = gpx.match(/<link href="([^"]+)"><text>([^<]+)<\/text><\/link>/);
    expect(lien, "le lien de métadonnées").not.toBeNull();
    const [, href, texte] = lien!;
    /* La règle : le texte décrit CE QU'ON TROUVE à l'adresse. Une page de
       licence ne s'annonce pas comme un tracé. */
    if (/copyright|licenses?\//.test(href)) {
      expect(texte.toLowerCase(), `« ${texte} » pour ${href}`).toMatch(/licence|odbl/);
      expect(texte.toLowerCase()).not.toMatch(/tracé/);
    }
  });

  it("⭐ et l'attribution, elle, voyage bien dans le fichier", () => {
    /* Ce qui était déjà juste doit le rester : un fichier qui porte une
       licence correcte et deux affirmations fausses n'est pas à moitié
       honnête — mais on ne répare pas la moitié fausse en cassant l'autre. */
    const gpx = enGpx(compose);
    expect(gpx).toMatch(/opendatacommons\.org\/licenses\/odbl/);
    expect(gpx).toMatch(/contributeurs d'OpenStreetMap/);
    expect(gpx, "l'absence d'altitude se dit").toMatch(/[Aa]ucune altitude/);
  });
});

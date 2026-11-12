import { describe, it, expect } from "vitest";
import catalogue from "./finistrail.json";

/**
 * ⛔ CE FICHIER TIENT UNE DÉCISION, PAS SEULEMENT UNE FORME.
 *
 * Le point d'accès GPX de Finis'Trail existe et répond — il rend une phrase
 * qui demande de passer par la page de l'éditeur. On a donc choisi de NE PAS
 * reprendre les tracés, et de ne publier qu'un catalogue de renvoi : des
 * chiffres, un point, un lien. ⭐ Une décision qui ne vit qu'en commentaire se
 * franchit sans le savoir ; ici, la première tentative de coller un tracé dans
 * cet artefact fait tomber un test.
 */
const c = catalogue as unknown as {
  genere: string; source: string; lien: string; avertissement: string;
  sans_trace: boolean;
  circuits: Array<{
    id: string; nom: string; commune: string | null; secteur: string | null;
    pratique: string | null; difficulte: number | null; km: number;
    denivele: number | null; descente: number | null;
    minutes: [number, number] | null; g: [number, number]; source: string;
  }>;
};

describe("le catalogue Finis'Trail", () => {
  it("⛔ AUCUN circuit ne porte de tracé — c'est la décision, et elle est tenue ici", () => {
    expect(c.sans_trace).toBe(true);
    for (const x of c.circuits) {
      /* `p` est le champ des tracés dans `ot.json` et `walks.ts`. Son absence
         est ce qui empêche un écran de prendre ces 41 entrées pour des
         balades affichables. */
      expect(x, `${x.id} ${x.nom}`).not.toHaveProperty("p");
      expect(x, `${x.id} ${x.nom}`).not.toHaveProperty("gpx");
      expect(x, `${x.id} ${x.nom}`).not.toHaveProperty("points");
    }
    /* ⚠️ Et le marqueur ne suffit pas seul : on vérifie aussi qu'aucun tableau
       de plus de deux nombres ne se cache dans une entrée — un tracé déguisé
       en autre nom passerait les trois contrôles ci-dessus. */
    for (const x of c.circuits) {
      for (const [cle, v] of Object.entries(x)) {
        if (Array.isArray(v) && v.length > 2) {
          expect.fail(`${x.id} : « ${cle} » porte ${v.length} valeurs — un tracé déguisé ?`);
        }
      }
    }
  });

  it("⚠️ témoin daté : 41 circuits au 12/11/2026 — la presse en annonce 45", () => {
    /* ⭐ L'écart est écrit plutôt que tranché : Ouest-France et les offices
       parlent de 45 circuits balisés, l'index de la plateforme en porte 41.
       On compte ce qu'on lit. Si ce nombre bouge, c'est normal — il se
       recompte, il ne se croit pas. */
    expect(c.circuits).toHaveLength(41);
  });

  it("les sept secteurs sont nommés, et ce ne sont PAS les sept EPCI du Pays de Brest", () => {
    const secteurs = [...new Set(c.circuits.map((x) => x.secteur))].sort();
    expect(secteurs).toHaveLength(7);
    for (const s of secteurs) expect(s, "un secteur sans nom").toBeTruthy();
    /* 🔴 LE PIÈGE DES DEUX « SEPT ». Le périmètre de Finis'Trail est la
       DESTINATION « Brest terres océanes », pas le pôle métropolitain du Pays
       de Brest : Landivisiau en est absent, Menez-Hom Atlantique — côté
       Châteaulin — en fait partie. Deux découpages à sept qui se ressemblent
       et ne se recouvrent pas. Ce test fige l'écart pour qu'on ne le reperde
       pas en répétant « les sept intercommunalités ». */
    expect(secteurs).toContain("Menez-Hom Atlantique");
    expect(secteurs.join(" | ")).not.toMatch(/Landivisiau/);
  });

  it("chaque circuit porte ses chiffres, un point en Bretagne et le lien de sa fiche", () => {
    for (const x of c.circuits) {
      expect(x.nom.trim().length, x.id).toBeGreaterThan(2);
      expect(x.commune, x.id).toBeTruthy();
      expect(x.secteur, x.id).toBeTruthy();
      expect(x.km, x.id).toBeGreaterThan(0.5);
      expect(x.km, x.id).toBeLessThan(120);
      expect(x.difficulte, x.id).not.toBeNull();
      expect(x.denivele, x.id).not.toBeNull();
      expect(x.minutes?.length, x.id).toBe(2);
      /* ⛔ Un point faux sous un nom juste est pire qu'un point absent : les
         x/y de la page sont en Web Mercator, et les lire tels quels posait les
         circuits au large de l'Afrique. */
      const [lon, lat] = x.g;
      expect(lon, `${x.id} ${x.nom}`).toBeGreaterThan(-5.4);
      expect(lon, `${x.id} ${x.nom}`).toBeLessThan(-1.0);
      expect(lat, `${x.id} ${x.nom}`).toBeGreaterThan(47.2);
      expect(lat, `${x.id} ${x.nom}`).toBeLessThan(49.0);
      expect(x.source, x.id).toBe(`https://espacestrail.run/fr/finistrail/parcours/${x.id}`);
    }
  });

  it("⚠️ l'avertissement sur l'absence d'accord VOYAGE avec la donnée", () => {
    /* Même règle que pour les Offices et l'attribution ODbL : un artefact se
       promène sans sa page. Si la reprise doit être retirée, il faut pouvoir
       la retrouver. */
    expect(c.avertissement).toMatch(/accord/i);
    expect(c.avertissement).toMatch(/sans les tracés/i);
    expect(c.source).toMatch(/Finis'Trail/i);
    expect(c.lien).toMatch(/^https:\/\/finistrail\.bzh/);
  });

  it("⛔ le catalogue ne dit nulle part que Finis'Trail RECOMMANDE MANA", () => {
    const tout = JSON.stringify(c).toLowerCase();
    expect(tout).not.toMatch(/recommand|approuv|partenaire officiel|valid[ée] par/);
  });
});

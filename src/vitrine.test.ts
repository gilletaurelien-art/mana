import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { WALKS, VITRINE } from "./walks";
import { routePromenade, routeEnChemin, routeRencontres, routeComplet } from "./router";

/**
 * 🔴 CE FICHIER TIENT LA DISTINCTION ENTRE « CACHÉ » ET « CASSÉ ».
 *
 * Le 31/10/2026, les quatre promenades MANA ont été retirées de la vitrine au
 * profit des 46 circuits balisés de l'Office. Retirées, PAS détruites : leurs
 * écrans restent vivants et atteignables par URL.
 *
 * ⭐ Sans ce test, la prochaine personne qui verra `VITRINE` vide conclura que
 *    les données sont mortes et supprimera `WALKS` — et cinq écrans
 *    deviendront des coquilles, sans qu'un seul test ne s'en plaigne.
 */
describe("la vitrine et ce qu'elle cache", () => {
  it("les quatre promenades existent toujours, avec leurs tracés", () => {
    expect(WALKS.length).toBeGreaterThanOrEqual(4);
    for (const w of WALKS) {
      expect(w.points.length, w.slug).toBeGreaterThan(10);
      expect(w.provenance, w.slug).toBe("mana");
    }
  });

  it("⚠️ elles sont HORS vitrine — c'est l'état voulu, pas un oubli", () => {
    // ⭐ Les rendre au produit se fait sur UNE ligne de `walks.ts`.
    //    Ce test se retourne avec elle, et c'est le but : il dit l'état
    //    courant à voix haute au lieu de le laisser deviner.
    expect(VITRINE).toHaveLength(0);
  });

  it("⛔ aucune de leurs URL n'est cassée", () => {
    for (const w of WALKS) {
      expect(routePromenade(`/promenade/${w.slug}`), w.slug).toBe(w.slug);
      expect(routeEnChemin(`/promenade/${w.slug}/en-chemin`), w.slug).toBe(w.slug);
      expect(routeRencontres(`/promenade/${w.slug}/rencontres`), w.slug).toBe(w.slug);
      expect(routeComplet(`/promenade/${w.slug}/complet`), w.slug).toBe(w.slug);
    }
  });

  it("⛔ plus aucun écran ne LISTE une promenade cachée", () => {
    // Les listes puisent dans `VITRINE` ; seuls la résolution d'une URL et le
    // carnet ont le droit de nommer `WALKS`.
    const permis = new Set(["Promenade.tsx", "EnChemin.tsx", "Espace.tsx", "walks.ts"]);
    const dossier = new URL("./", import.meta.url);
    for (const f of readdirSync(dossier)) {
      if (!/\.tsx?$/.test(f) || /\.test\./.test(f) || permis.has(f)) continue;
      const src = readFileSync(new URL(f, dossier), "utf8");
      // `WALKS.find(...)` résout une URL : c'est légitime partout.
      const liste = src.replace(/WALKS\.find\([^)]*\)/g, "").match(/\bWALKS\b\s*[.[]/g);
      expect(liste ?? [], `${f} liste WALKS au lieu de VITRINE`).toHaveLength(0);
    }
  });

  it("le pied de page n'annonce plus les promenades retirées", () => {
    // ⚠️ ON ÉCARTE LES COMMENTAIRES, sinon ce test attrape le sien. Première
    //    version : il échouait sur une ligne d'explication de `App.tsx` qui
    //    CITE `/promenade/anse-saint-nicolas` pour dire pourquoi l'or reste
    //    allumé sur la section. ⭐ Même piège que le `grep` de `guardedAnswer`
    //    au tronc : quatre fichiers y parlent du garde pour expliquer qu'ils
    //    n'en ont pas besoin, et un grep nu en compte treize au lieu de neuf.
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    for (const w of WALKS) {
      expect(app, w.slug).not.toContain(`/promenade/${w.slug}`);
    }
  });
});

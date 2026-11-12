import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { WALKS, VITRINE } from "./walks";

/**
 * 🔴 CE FICHIER TENAIT LA DISTINCTION ENTRE « CACHÉ » ET « CASSÉ ».
 *    IL TIENT MAINTENANT CELLE ENTRE « RETIRÉ » ET « OUBLIÉ ».
 *
 * Le 31/10/2026, les quatre promenades MANA avaient été retirées de la
 * VITRINE : plus listées nulle part, mais leurs écrans répondaient encore par
 * URL. Ce fichier existait pour empêcher qu'on en conclue « c'est mort,
 * supprimons `WALKS` » — il annonçait, mot pour mot, que cinq écrans
 * deviendraient des coquilles.
 *
 * ⭐ LE 12/11/2026, LE FONDATEUR A TRANCHÉ L'AUTRE SENS : « on ne garde que
 *    les balades de l'OT et notre compositeur interactif ». `WALKS` est donc
 *    vide, volontairement. Le test n'est pas supprimé — il est RETOURNÉ : il
 *    garde désormais que le retrait est COMPLET et ASSUMÉ, au lieu de garder
 *    qu'il ne l'est pas.
 *
 * ⚠️ ET L'AVERTISSEMENT DE L'ANCIENNE VERSION ÉTAIT JUSTE : deux écrans
 *    deviennent effectivement muets. Ils sont nommés plus bas, en test, plutôt
 *    que regrettés en commentaire.
 */
describe("les quatre promenades ont quitté le produit", () => {
  it("⛔ ni vitrine, ni réserve — les deux listes sont vides", () => {
    /* ⭐ Les deux, et pas seulement `VITRINE` : c'est précisément la moitié
       qui manquait entre le 31/10 et le 12/11. Une vitrine vide devant une
       réserve pleine, c'est un contenu que le produit porte sans le nommer. */
    expect(VITRINE, "VITRINE").toHaveLength(0);
    expect(WALKS, "WALKS").toHaveLength(0);
  });

  it("⛔ aucune page publique n'annonce encore une promenade MANA", () => {
    /* Les quatre identifiants retirés. ⚠️ Écrits en dur ICI et nulle part
       ailleurs : ils n'existent plus dans le code, donc aucune constante ne
       peut les fournir — et c'est justement ce qui rend ce garde utile. */
    const partis = ["forts-du-goulet", "saint-fiacre", "anse-saint-nicolas", "ile-vierge"];
    const llms = readFileSync(new URL("../public/llms.txt", import.meta.url), "utf8");
    for (const s of partis) {
      expect(llms, `llms.txt annonce encore « ${s} »`).not.toContain(`/promenade/${s}`);
    }
    /* ⚠️ ON ÉCARTE LES COMMENTAIRES — sinon ce test attrape les explications
       qui CITENT ces identifiants pour dire pourquoi ils sont partis. Même
       piège que le `grep` de `guardedAnswer` au tronc : quatre fichiers y
       parlent du garde pour expliquer qu'ils n'en ont pas besoin. */
    const dossier = new URL("./", import.meta.url);
    for (const f of readdirSync(dossier)) {
      if (!/\.tsx?$/.test(f) || /\.test\./.test(f)) continue;
      const src = readFileSync(new URL(f, dossier), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      for (const s of partis) {
        expect(src, `${f} nomme encore « ${s} »`).not.toContain(s);
      }
    }
  });

  it("⛔ plus aucun écran ne LISTE une promenade", () => {
    /* Garde conservé tel quel depuis le 31/10 : les listes puisent dans
       `VITRINE` ; seuls la résolution d'une URL et le carnet ont le droit de
       nommer `WALKS`. ⭐ Il reste mordant alors même que les deux tableaux
       sont vides — il garde une MÉCANIQUE, pas une population. */
    const permis = new Set(["Promenade.tsx", "EnChemin.tsx", "Espace.tsx", "walks.ts"]);
    const dossier = new URL("./", import.meta.url);
    for (const f of readdirSync(dossier)) {
      if (!/\.tsx?$/.test(f) || /\.test\./.test(f) || permis.has(f)) continue;
      const src = readFileSync(new URL(f, dossier), "utf8");
      /* ⚠️ `some` AUTANT QUE `find` — élargi le 12/11/2026. La règle a
         toujours été « résoudre une URL est légitime, LISTER ne l'est
         pas » ; le motif, lui, ne connaissait que `find`. Le jour où
         `Rencontres` a demandé « ce slug est-il embarqué ? » avec `some`,
         le garde a crié au loup sur une résolution.
         ⭐ Un motif qui ne connaît qu'une forme de la bonne pratique
            condamne la suivante. On nomme les deux, et on garde le refus
            pour ce qui compte : `WALKS.map`, `WALKS[0]`, `WALKS.length`
            dans un écran — là, on liste. */
      const liste = src
        .replace(/WALKS\.(find|some)\([^)]*\)/g, "")
        .match(/\bWALKS\b\s*[.[]/g);
      expect(liste ?? [], `${f} liste WALKS au lieu de VITRINE`).toHaveLength(0);
    }
  });

  /**
   * 🔴 LA CONSÉQUENCE, ÉCRITE EN TEST PLUTÔT QU'EN REGRET.
   *
   * `Rencontres.tsx` et `Espace.tsx` ne lisent QUE `WALKS` : ni l'un ni
   * l'autre ne sait charger un itinéraire du catalogue distant. Avec `WALKS`
   * vide, « Ce que vous croiserez » ne répond plus pour personne, et « Mes
   * promenades » reste vide quoi qu'on mette en marque-page.
   *
   * ⚠️ CE TEST N'INTERDIT PAS DE LES RÉPARER — il refuse qu'ils se mettent à
   *    rendre du VIDE SANS LE DIRE. Chacun doit garder sa branche « rien à
   *    montrer ». Le jour où l'un apprend à lire le catalogue (comme
   *    `FichePromenade` l'a appris le 12/11), ce test continue de passer.
   */
  it("⚠️ les deux écrans qui ne lisent que WALKS disent qu'ils n'ont rien", () => {
    const lire = (f: string) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
    expect(lire("Rencontres.tsx"), "Rencontres : plus de branche « slug inconnu »")
      .toMatch(/if \(!walk\) return/);
    expect(lire("Espace.tsx"), "Espace : plus de message quand le carnet est vide")
      .toContain("Rien de gardé");
  });
});

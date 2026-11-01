import { readdirSync, existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { describe, it, expect } from "vitest";

/* ════════════════════════════════════════════════════════════════════════
   LES NOMS QUE mana.bzh A DÉJÀ PRIS
   ════════════════════════════════════════════════════════════════════════

   🔴 CETTE APPLICATION VA COHABITER AVEC UNE AUTRE, SUR LA MÊME ORIGINE.
      mana.bzh sert 63 885 pages d'agrégat depuis `/srv/www`, et le nom de
      premier niveau d'un fichier servi est une ADRESSE : deux dossiers ne
      peuvent pas répondre à « /assets/* ». Mesuré le 1/11 sur le VPS, sept
      collisions : assets (73 Mo), bretagne (15 Mo), fonds (9,7 Mo),
      index.html, llms.txt, robots.txt, sw.js.

   ⭐ ET LA COLLISION EST MUETTE DES DEUX CÔTÉS. Les fichiers sont hachés,
      donc rien ne s'écrase ; c'est le ROUTAGE qui tranche, et le perdant
      rend une page blanche sans une ligne d'erreur. On ne peut pas le voir
      en déployant — seulement en l'empêchant.

   ⚠️ Ce test lit le dossier `public/`, pas le build : il échoue à l'écriture
      d'un fichier, pas à la construction. C'est le bon moment.
*/

/** Relevé sur `~/mana-selfhost-proto/volumes/www` le 1/11/2026. */
const PRIS = ["assets", "bretagne", "fonds", "sw.js", "robots.txt", "llms.txt"];

describe("les noms de premier niveau", () => {
  it("⛔ aucun dossier de `public/` ne porte un nom déjà pris sur mana.bzh", () => {
    /* ⚠️ ON MESURE CE QUI EST EXPÉDIABLE, PAS CE QUI EST SUR LE DISQUE.
       `public/bretagne/` existe en local — 15 Mo de graphes, ignorés par git,
       servis en production par mana.bzh elle-même. Le premier jet de ce test
       le comptait et criait à la collision : juste sur le nom, faux sur le
       risque, parce que ce dossier ne part jamais. ⭐ Un garde qui mesure un
       disque de développement parle d'une machine, pas d'un déploiement. */
    const suivis = new Set(
      execSync("git ls-files public", { encoding: "utf8" })
        .split("\n").filter(Boolean)
        .map((f) => f.replace(/^public\//, "").split("/")[0]),
    );
    /* ⚠️ `robots.txt` et `llms.txt` sont suivis et c'est voulu : GitHub Pages
       les sert. Ils ne sont simplement jamais expédiés vers mana.bzh, où les
       leurs portent la doctrine d'exploration des 63 885 pages. Le test tient
       donc les DOSSIERS — ce que le routage ne peut pas départager — et laisse
       les deux fichiers, dont l'exclusion est une consigne de déploiement. */
    const dossiers = [...suivis].filter((n) => !n.includes("."));
    const heurts = dossiers.filter((n) => PRIS.includes(n));
    expect(heurts, `noms déjà pris sur mana.bzh : ${heurts.join(", ")}`).toEqual([]);
  });

  it("⛔ les bundles ne s'appellent pas « assets »", () => {
    const vite = readdirSync(".").includes("vite.config.ts");
    expect(vite).toBe(true);
    expect(readFileSync("vite.config.ts", "utf8"))
      .toMatch(/assetsDir:\s*"(?!assets")[a-z-]+"/);
  });

  it("le dossier des images de fond s'appelle « paysages », et le code le lit là", () => {
    expect(existsSync("public/paysages"), "public/paysages").toBe(true);
    expect(existsSync("public/fonds"), "public/fonds doit avoir disparu").toBe(false);
    const fond = readFileSync("src/Fond.tsx", "utf8");
    expect(fond).toMatch(/BASE_URL\}paysages\//);
  });
});

describe("le service worker suit le nom des bundles", () => {
  /* 🔴 LE DÉFAUT QUE CE TEST TIENT, ET JE L'AI INTRODUIT MOI-MÊME LE 1/11.
     En renommant le dossier des bundles de « assets » vers « app » — pour
     qu'il ne heurte pas celui de mana.bzh —, le motif du service worker a
     cessé de correspondre. Le hors-ligne restait « armé », et il ne gardait
     plus l'application elle-même : la page s'ouvrait en ligne, et rien ne
     signalait que le cache était devenu creux.
     ⭐ Un service worker ne peut pas lire la configuration de construction :
        il ne peut que la RECOPIER. Une recopie ne tient que si quelque chose
        relie les deux — c'est ce test. */
  const conf = readFileSync("vite.config.ts", "utf8");
  const sw = readFileSync("public/sw.js", "utf8");

  it("garde le dossier que Vite produit, quel que soit son nom", () => {
    const m = conf.match(/assetsDir:\s*"([a-z-]+)"/);
    expect(m, "assetsDir dans vite.config.ts").not.toBeNull();
    const dossier = m![1];
    const sansCommentaires = sw.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(sansCommentaires, `le service worker ne garde pas « /${dossier}/ »`)
      .toContain(`/\\/${dossier}\\//`);
  });

  it("⛔ et il ne garde plus un dossier qui n'existe plus", () => {
    const sansCommentaires = sw.replace(/\/\*[\s\S]*?\*\//g, "");
    const dossier = conf.match(/assetsDir:\s*"([a-z-]+)"/)![1];
    const gardes = [...sansCommentaires.matchAll(/\/\\\/([a-z-]+)\\\/\//g)].map((x) => x[1]);
    const morts = gardes.filter((d) => d !== dossier && d !== "bretagne" && d !== "carte");
    expect(morts, `motifs orphelins : ${morts.join(", ")}`).toEqual([]);
  });
});

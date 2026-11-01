import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

/* ════════════════════════════════════════════════════════════════════════
   LE PRÉFIXE DE SERVICE — une seule déclaration, et elle est variable
   ════════════════════════════════════════════════════════════════════════

   🔴 LA MÊME APPLICATION DOIT SERVIR DEUX ADRESSES. GitHub Pages la sert
      sous `/mana/` ; mana.bzh doit la servir à la RACINE, où ce préfixe
      n'existe pas. Un « /mana » recopié quelque part ne suit pas la
      déclaration — et le défaut est MUET : les bundles partent en 404,
      l'écran reste blanc, rien ne dit pourquoi.
   ⭐ C'est la famille de défaut que ce dépôt a déjà payée : une valeur qui
      dépend de la cible en dépend PARTOUT, et chaque porteur doit être
      relevé, pas supposé.
*/

const lire = (f: string) => readFileSync(f, "utf8");
const nu = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "")
   .replace(/<!--[\s\S]*?-->/g, "")
   .split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");

describe("le préfixe de service", () => {
  it("n'est déclaré qu'à un seul endroit, et il est variable", () => {
    const vite = nu(lire("vite.config.ts"));
    expect(vite).toMatch(/base:\s*process\.env\.MANA_BASE/);
    // ⭐ et la valeur par défaut reste celle de GitHub Pages : la démo du 6/11
    //    part de là, et une bascule de préfixe par défaut la casserait.
    expect(vite).toMatch(/\?\?\s*"\/mana\/"/);
  });

  it("⛔ aucun fichier servi n'écrit « /mana » à la main", () => {
    /* ⚠️ Les fichiers de `public/` sont copiés TELS QUELS : Vite ne les
       traverse pas, donc un préfixe écrit là ne suivra jamais la base.
       `index.html`, lui, est traversé — mais seulement via `%BASE_URL%`. */
    const porteurs = ["index.html", "public/manifest.webmanifest", "public/sw.js"];
    for (const f of porteurs) {
      expect(nu(lire(f)), `${f} écrit le préfixe à la main`).not.toMatch(/["'(/]\/mana\//);
    }
  });

  it("index.html prend le préfixe de Vite, et sait le retirer des deux côtés", () => {
    const html = nu(lire("index.html"));
    expect(html).toContain('var b = "%BASE_URL%"');
    expect(html).toMatch(/slice\(b\.length - 1\)/);
    // la recette, vérifiée : « /mana/ » comme « / » doivent rendre le même chemin
    const retirer = (b: string, p: string) => p.slice(b.length - 1) || "/";
    for (const [b, entree, attendu] of [
      ["/mana/", "/mana/carte", "/carte"],
      ["/mana/", "/mana/", "/"],
      ["/mana/", "/mana", "/"],
      ["/", "/carte", "/carte"],
      ["/", "/", "/"],
    ] as const) {
      expect(retirer(b, entree), `${b} + ${entree}`).toBe(attendu);
    }
  });

  /* 🔴 LE COMMENTAIRE DISAIT « Un test les compare » — IL N'EXISTAIT PAS.
     Cinquième fois dans ce projet qu'un commentaire répond à la place du
     code. ⭐ Une description fidèle occupe la place de la vérification : on
     lit la phrase, on la croit, on passe. Le voici. */
  it("la règle du fond est la MÊME dans index.html et dans App.tsx", () => {
    const html = nu(lire("index.html"));
    const app = nu(lire("src/App.tsx"));
    // les deux copies : un chemin racine, ou un chemin finissant par /en-chemin
    for (const [source, texte] of [["index.html", html], ["App.tsx", app]] as const) {
      expect(texte, `${source} : la condition « racine »`).toMatch(/p(?:ath)? === "\/"/);
      expect(texte, `${source} : la condition « en chemin »`)
        .toMatch(/\/\\\/en-chemin\\\/\?\$\/\.test\(p(?:ath)?\)/);
      expect(texte, `${source} : le même attribut`).toMatch(/dataset\.fond/);
      expect(texte, `${source} : les mêmes deux valeurs`).toMatch(/"immersif"/);
      expect(texte, `${source} : les mêmes deux valeurs`).toMatch(/"lecture"/);
    }
  });
});

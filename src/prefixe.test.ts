import { readFileSync, readdirSync } from "node:fs";
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

/* ════════════════════════════════════════════════════════════════════════
   UN TITRE PAR ADRESSE
   ════════════════════════════════════════════════════════════════════════ */
describe("les titres de page", () => {
  const app = lire("src/App.tsx");

  /** Les adresses statiques que le routeur de App.tsx distingue. */
  const routes = [...nu(app).matchAll(/path === "(\/[a-z-]*)"/g)]
    .map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i);

  it("le routeur distingue bien une poignée d'adresses statiques", () => {
    // garde-fou du garde : si l'extraction ne trouve plus rien, le test
    // ci-dessous passerait sur une liste vide et ne dirait plus rien.
    expect(routes.length).toBeGreaterThanOrEqual(8);
    expect(routes).toContain("/radio");
  });

  /* 🔴 LE GARDE QUI COMPTE, ET IL SE MET À JOUR TOUT SEUL. Il ne récite pas
     une liste : il LIT les adresses que le routeur distingue, et exige que
     chacune ait son titre. Ajouter une route sans lui en écrire un fait
     tomber ce test — exactement au moment où il faut y penser.
     ⭐ Cinq routes n'en avaient pas le 1/11, dont `/radio`, une URL indexée
        qui servait jusque-là une page intitulée « MANARADIO — l'antenne de
        MANA, en direct ». Sans titre à elle, son résultat de recherche
        aurait dit la même chose que l'accueil. */
  it("chaque adresse du routeur a un titre à elle", () => {
    const table = app.match(/export const TITRES[\s\S]*?\n\};/);
    expect(table, "la table des titres").not.toBeNull();
    const connus = new Set([...table![0].matchAll(/"(\/[a-z-]*)":/g)].map((m) => m[1]));
    const orphelines = routes.filter((r) => !connus.has(r));
    expect(orphelines, `adresses sans titre : ${orphelines.join(", ")}`).toEqual([]);
    expect(connus.has("/"), "l'accueil").toBe(true);
  });

  /* ⚠️ UNE TABLE QUE PERSONNE NE LIT EST UNE LISTE DE SOUHAITS. Mutation du
     1/11 : en remplaçant l'affectation par un `void`, les deux tests
     ci-dessus restaient au vert — l'un vérifiait que la table est COMPLÈTE,
     l'autre qu'aucun écran ne la contourne, et aucun que le titre atterrit
     quelque part. ⭐ Vérifier qu'une règle est écrite n'est pas vérifier
     qu'elle s'applique. */
  it("et la table est bel et bien posée sur le document", () => {
    const n = nu(app);
    expect(n).toMatch(/TITRES\[path\]/);
    expect(n).toMatch(/document\.title\s*=\s*titre/);
  });

  /* 🔴 ET LES ROUTES DYNAMIQUES AUSSI — deux sur quatre n'en avaient pas.
     Dont `/promenade/<slug>`, LA page qu'on partage : son résultat de
     recherche disait exactement ce que dit l'accueil. Le défaut était
     invisible depuis l'écran, où le titre d'onglet ne se regarde pas, et il
     a survécu à tout le travail de titres de ce matin — parce que ce
     travail-là ne regardait que la table.
     ⭐ Un garde qui couvre une moitié d'une famille laisse l'autre moitié
        exactement aussi exposée qu'avant, et donne l'impression du
        contraire. */
  it("chaque route dynamique pose son propre titre, TIRÉ DE SA DONNÉE", () => {
    /* 🔴 CE TEST A ÉTÉ REFAIT APRÈS AVOIR ÉTÉ MUTÉ — la première version
       exigeait seulement qu'un `document.title =` existe dans l'écran.
       Deux mutations passaient : retirer le vrai titre laissait la LIGNE DE
       RESTAURATION (`document.title = TITRE_DEFAUT`), qui suffisait à le
       satisfaire ; et retirer un écran du routeur laissait le compte
       au-dessus du seuil.
       ⭐ Un garde satisfait par le ménage d'une règle ne tient pas la règle.
          La règle est : chaque route qui porte un SLUG monte un écran dont
          le titre est TIRÉ de la donnée que ce slug désigne. On part donc
          des fonctions de routage — la source —, pas d'un compte. */
    const fonctions = [...nu(lire("src/router.ts")).matchAll(/export function (route[A-Z][a-zA-Z]*)\(/g)]
      .map((m) => m[1]);
    expect(fonctions.length, "les routes à slug de router.ts").toBeGreaterThanOrEqual(4);

    const nuApp = nu(app);
    for (const fn of fonctions) {
      const monte = nuApp.match(new RegExp(`<([A-Z][a-zA-Z]*)[^>]*slug=\\{${fn}\\(path\\)!\\}`));
      expect(monte, `aucun écran n'est monté pour ${fn}`).not.toBeNull();
      const ecran = nu(lire(`src/${monte![1]}.tsx`));
      // ⛔ le titre doit DÉPENDRE de la donnée, pas être une constante
      expect(ecran, `${monte![1]} ne tire pas son titre de la promenade`)
        .toMatch(/document\.title\s*=\s*`[^`]*\$\{walk\.titre\}/);
    }
  });

  /* 🔴 UN SEUL ÉCRIVAIN PAR TRANSITION. Les écrans dynamiques rendaient le
     titre par défaut en se démontant, et cette restauration s'exécutait
     APRÈS l'effet qui venait de poser le titre de la page suivante. Mesuré
     en production : `/radio` affiche son titre à froid, et retombe au titre
     d'accueil quand on y revient depuis une fiche de balade.
     ⭐ Deux écrivains pour une valeur, et l'ordre ne nous appartient pas.
        On ne corrige pas en espérant un ordre : on retire le second. */
  it("⛔ aucun écran ne « restaure » le titre en se démontant", () => {
    for (const f of readdirSync("src").filter((x) => x.endsWith(".tsx"))) {
      const t = nu(lire(`src/${f}`));
      expect(t, `${f} restaure un titre au démontage`)
        .not.toMatch(/return \(\) =>[\s\S]{0,80}document\.title/);
      if (f !== "App.tsx") {
        expect(t, `${f} recopie le titre par défaut`).not.toMatch(/TITRE_DEFAUT/);
      }
    }
  });

  it("⛔ aucun titre n'est écrit deux fois — les pages statiques lisent la table", () => {
    /* ⚠️ Les titres vivaient dans les composants et ils avaient DÉJÀ divergé :
       deux restauraient « La porte d'entrée de l'écosystème MANA en
       Bretagne », deux autres « Promenades & découvertes en Bretagne ».
       Personne n'avait menti — chaque copie était juste le jour de son
       écriture. ⛔ Les pages DYNAMIQUES gardent le leur : le titre d'une
       promenade est son nom, il ne tient pas dans une table. */
    const dynamiques = ["src/Promenade.tsx", "src/EnChemin.tsx",
                        "src/FichePromenade.tsx", "src/Rencontres.tsx"];
    const ecrans = readdirSync("src")
      .filter((f) => f.endsWith(".tsx") && f !== "App.tsx")
      .map((f) => `src/${f}`)
      .filter((f) => !dynamiques.includes(f));
    for (const f of ecrans) {
      expect(nu(lire(f)), `${f} pose un titre au lieu de lire la table`)
        .not.toMatch(/document\.title\s*=/);
    }
    // et même les dynamiques ne recopient pas le titre de repli
    for (const f of dynamiques) {
      expect(nu(lire(f)), `${f} recopie le titre par défaut`)
        .not.toMatch(/document\.title\s*=\s*"MANA\.bzh/);
    }
  });
});

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

  /* 🔴 CE GARDE NOMMAIT SES FICHIERS, ET IL A GARDÉ UN FANTÔME — 7/11 au
     soir. Il listait `public/manifest.webmanifest` ; le manifeste a déménagé
     sous `public/app/`, et le test est tombé en ENOENT.
     ⭐ Il a eu de la chance de tomber BRUYAMMENT. Un garde qui nomme un
        fichier échoue de deux façons : il crie quand le fichier bouge, et il
        se TAIT quand un fichier NEUF arrive — c'est la seconde qui coûte,
        parce qu'elle ressemble à un succès. Quatre gardes de ce dépôt sont
        restés verts des semaines sur un composant mort pour cette raison.
     ⚠️ Il DÉCOUVRE donc ses porteurs au lieu de les nommer : tout ce que
        `public/` contient en texte est copié TEL QUEL par Vite — qui ne le
        traverse pas — donc un préfixe écrit là ne suivra jamais la base.
        `index.html` est traversé, mais seulement via `%BASE_URL%`. */
  it("⛔ aucun fichier servi n'écrit « /mana » à la main", () => {
    const TEXTE = /\.(json|webmanifest|js|txt|svg|html|css)$/;
    const parcourir = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const chemin = `${d}/${e.name}`;
        if (e.isDirectory()) return parcourir(chemin);
        return TEXTE.test(e.name) ? [chemin] : [];
      });
    const porteurs = ["index.html", ...parcourir("public")];
    /* ⛔ Un garde qui ne lit rien dit oui : s'il ne trouve plus aucun
       porteur, c'est le garde qui est cassé, pas le dépôt qui est propre. */
    expect(porteurs.length, "aucun fichier servi trouvé").toBeGreaterThan(3);
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

/* ════════════════════════════════════════════════════════════════════════
   🔴 LE MANIFESTE A DÉMÉNAGÉ, ET SES CHEMINS SONT RELATIFS À LUI
   ════════════════════════════════════════════════════════════════════════
   Le 7/11, `/manifest.webmanifest` rendait la coquille de mana.love (26 008 o
   de HTML) : la racine n'est pas à nous sur cet hôte. Il vit donc sous
   `app/`, déjà à nous des deux côtés par le préfixe du bloc Caddy.

   ⛔ ET LE DÉPLACER TEL QUEL AURAIT CASSÉ L'APPLICATION INSTALLÉE, EN SILENCE.
      Ses chemins sont relatifs AU MANIFESTE : `start_url: "./"` valait la
      racine tant qu'il y était, et serait devenu `/app/` une fois déplacé.
      Une application installée dont la portée vaut `/app/` ne peut plus
      naviguer vers `/carte` — elle s'ouvre, elle fonctionne, et chaque lien
      sort de l'application vers le navigateur. Rien n'échoue.
   ⭐ `"../"` est la bonne réponse parce qu'elle est relative DANS LES DEUX
      déploiements : `/app/` → `/` sur mana.bzh, `/mana/app/` → `/mana/` sur
      GitHub Pages. Une valeur absolue aurait cassé l'un des deux.
*/
describe("🔴 le manifeste d'installation, là où il vit maintenant", () => {
  const CHEMIN = "public/app/manifest.webmanifest";
  const m = JSON.parse(readFileSync(CHEMIN, "utf8"));

  /* 🔄 RETOURNÉ AVANT MÊME D'ÊTRE DÉPLOYÉ. Il exigeait une balise
     `<link rel="manifest">` statique — et une relecture adversariale a montré
     que cette balise était le défaut : servie aux deux hôtes, elle faisait
     installer depuis mana.love une application dont le `start_url` ouvre LA
     LANDING DE L'AUTRE. Le manifeste est donc posé en JS, et seulement sur
     mana.bzh. ⭐ Sur mana.love nous sommes un invité : un invité ne propose
     pas d'installer la maison. */
  it("⛔ le manifeste n'est PAS posé sur mana.love", () => {
    const html = nu(lire("index.html"));
    expect(html, "la balise statique est revenue : elle vaut pour les deux hôtes")
      .not.toMatch(/<link[^>]*rel="manifest"/);
    expect(html, "le manifeste n'est plus posé du tout").toContain('"manifest"');
    expect(html, "il n'est plus conditionné à l'hôte")
      .toMatch(/location\.hostname !== "mana\.love"/);
    /* ⚠️ Et il doit passer par le préfixe de Vite, pas par un chemin écrit à
       la main — sinon GitHub Pages ne le trouve pas. */
    expect(html).toMatch(/b \+ "app\/manifest\.webmanifest"/);
  });

  /* ⭐ L'ICÔNE, ELLE, RESTE STATIQUE ET VAUT POUR LES DEUX. Une icône
     n'installe rien : elle nomme l'onglet de NOS pages, et nos pages sont
     bien à nous sur les deux hôtes. */
  it("l'icône est servie aux deux hôtes, sous `app/`", () => {
    expect(nu(lire("index.html"))).toContain('href="%BASE_URL%app/icon.svg"');
  });

  /* ⚠️ La recette, éprouvée sur LES DEUX bases — c'est tout l'intérêt du
     relatif, et c'est ce qu'un garde doit montrer plutôt qu'affirmer. */
  it("⛔ sa portée et son départ retombent sur la RACINE du site, pas sur /app/", () => {
    for (const base of ["/", "/mana/"]) {
      const ou = new URL(`https://exemple.fr${base}app/manifest.webmanifest`);
      expect(new URL(m.start_url, ou).pathname, `base ${base} : start_url`).toBe(base);
      expect(new URL(m.scope, ou).pathname, `base ${base} : scope`).toBe(base);
      /* ⭐ L'icône, elle, reste À CÔTÉ du manifeste : elle a déménagé avec
         lui, pour la même raison et sous le même préfixe. */
      expect(new URL(m.icons[0].src, ou).pathname, `base ${base} : icône`)
        .toBe(`${base}app/icon.svg`);
    }
  });

  it("l'icône qu'il désigne existe vraiment", () => {
    expect(readFileSync("public/app/icon.svg", "utf8").length).toBeGreaterThan(50);
  });

  /* ⛔ ET IL NE NOMME AUCUN DOMAINE. Il est servi aux DEUX hôtes, octet pour
     octet : « MANA.bzh — Promenades en Bretagne » aurait fait installer
     MANA.bzh à qui installe mana.love. Un fichier statique ne peut pas
     changer selon l'hôte — alors il ne promet que ce qui est vrai des deux. */
  it("⛔ il ne nomme aucun domaine : il est servi aux deux hôtes", () => {
    for (const champ of ["name", "short_name", "description"] as const) {
      expect(m[champ], `${champ} nomme un domaine`).not.toMatch(/mana\.(bzh|love)/i);
    }
  });
});

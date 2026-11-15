import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * LA CONFIGURATION DE CONSTRUCTION, ET CE QU'ELLE PERD EN SILENCE.
 *
 * 🔴 CE QUI S'EST PASSÉ, DU 14 AU 15/11/2026. `vite.config.ts` a porté DEUX
 *    clés `plugins` dans le même objet : la première avec `react()`, la
 *    seconde avec le plugin de titre, ajoutée quand l'app a été promue à la
 *    racine de manahome. En JavaScript, la seconde écrase la première —
 *    `@vitejs/plugin-react` n'était donc plus chargé du tout. Le build
 *    passait (esbuild transpile le JSX d'après `tsconfig`), les tests
 *    passaient, et ce qui se perdait — le Fast Refresh en développement — ne
 *    se voit pas dans une sortie de build.
 * ⭐ esbuild LE DISAIT pourtant, à chaque lancement : « Duplicate key
 *    "plugins" in object literal ». Un avertissement noyé dans cinquante
 *    lignes de sortie n'est pas un garde — personne ne lit ce qui défile
 *    quand tout est vert.
 *
 * ⛔ ET LA PREMIÈRE RÉDACTION DE CE FICHIER NE TENAIT PAS CE QU'ELLE
 *    ANNONÇAIT — mesuré par mutation le 15/11. Son test s'appelait « should
 *    have react plugin loaded » et vérifiait… que le tableau contient AU
 *    MOINS DEUX plugins. Mutation posée : remplacer `react()` par un plugin
 *    quelconque. Le compte restait à deux, et le test restait VERT.
 *    ⭐ C'est « un garde qui NOMME ce qu'il protège sans le regarder », la
 *       famille que ce dépôt paie le plus souvent. Un nom de test n'est pas
 *       une vérification.
 */

const ici = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");

describe("la configuration de construction ne perd rien en route", () => {
  /**
   * ⭐ ON INTERROGE LA CONFIGURATION RÉSOLUE, PAS SON TEXTE. Une clé en
   *    double ne laisse aucune trace dans l'objet final : elle en retire
   *    simplement une valeur. Lire le fichier dirait « react() est écrit » —
   *    ce qui était vrai pendant tout le temps où il ne servait à rien.
   */
  /**
   * ⭐ ON INTERROGE LA CONFIGURATION RÉSOLUE, PAS SON TEXTE. Une clé en
   *    double ne laisse aucune trace dans l'objet final : elle en retire
   *    simplement une valeur. Lire le fichier dirait « react() est écrit » —
   *    ce qui était vrai pendant tout le temps où il ne servait à rien.
   *
   * ⚠️ ET ELLE SE LIT DANS UN PROCESSUS À PART. Un `import("../vite.config")`
   *    ici chargeait l'API Node de Vite dans le worker : suite de 63 s → 103 s
   *    et « [vitest-worker]: Timeout calling onTaskUpdate », un avertissement
   *    qui annonce lui-même des faux positifs. Voir `scripts/lire-config.mjs`.
   */
  const resolue = () => JSON.parse(execFileSync(
    process.execPath,
    [new URL("../scripts/lire-config.mjs", import.meta.url).pathname],
    { encoding: "utf8", timeout: 60_000 },
  )) as { base?: string; plugins?: unknown[];
          build?: { outDir?: string; assetsDir?: string } };

  it("le plugin React est RÉELLEMENT chargé", () => {
    const cfg = resolue();
    expect(Array.isArray(cfg.plugins), "aucun tableau de plugins").toBe(true);
    /* ⚠️ `@vitejs/plugin-react` rend PLUSIEURS plugins (babel + refresh) dans
       un tableau imbriqué : sans l'aplatir, on cherche un nom sur un tableau
       et on ne trouve jamais rien — un garde vert sur une mesure vide. */
    const noms = (cfg.plugins ?? []).flat(Infinity)
      .map((p) => (p as { name?: string } | null)?.name)
      .filter(Boolean) as string[];
    expect(noms.length, "aucun plugin nommé : la mesure est vide").toBeGreaterThan(0);
    expect(noms.some((n) => n.startsWith("vite:react")),
      `@vitejs/plugin-react n'est pas chargé — plugins vus : ${noms.join(", ")}`)
      .toBe(true);
    /* Et le plugin maison reste là : c'est lui qui écrit le `<title>` que les
       robots lisent sans exécuter de JavaScript. */
    expect(noms, "le plugin de titre a disparu").toContain("titre-de-l-hote");
  });

  /**
   * ⭐ ET LES AUTRES RÉGLAGES AVEC : le symptôme d'une clé en double n'est
   *    pas « une clé en double », c'est UN RÉGLAGE PERDU. On vérifie donc ce
   *    que la configuration doit encore porter — chacun a sa note dans
   *    `vite.config.ts`, et chacun casse quelque chose de visible.
   */
  it("les réglages qui ont déjà coûté cher sont encore là", () => {
    const cfg = resolue();
    /* ⛔ `assetsDir: "app"` : « assets » est DÉJÀ PRIS sur mana.bzh par 73 Mo
       de bundles qui servent 63 885 pages d'agrégat. Deux applications ne
       peuvent pas se partager ce nom — la seconde devient une page blanche. */
    expect(cfg.build?.assetsDir, "le dossier des bundles est revenu à « assets »")
      .toBe("app");
    expect(cfg.build?.outDir, "le dossier de sortie n'est plus `site`").toBe("site");
    /* ⛔ Le préfixe est VARIABLE : `/mana/` sur GitHub Pages, `/` à la racine
       d'un domaine. Figé, les bundles partent en 404 et l'écran reste blanc. */
    expect(cfg.base, "le préfixe n'est plus celui que le build pose").toBeTruthy();
  });

  /**
   * ⛔ ET LE FILET GÉNÉRAL — toute clé en double, pas seulement `plugins`.
   *
   * ⚠️ IL COMPTE LES ACCOLADES, il ne cherche pas une indentation. Une
   *    première rédaction prenait `^\s+(\w+):` sur tout le bloc : elle
   *    ramassait les clés IMBRIQUÉES (le `name:` d'un plugin, par exemple).
   *    Deux plugins nommés — ce qui est la situation normale — auraient donc
   *    fait tomber ce test pour un motif inventé. « Un garde qui refuse pour
   *    un motif inventé est aussi faux qu'un garde qui laisse passer. »
   */
  it("aucune clé n'est déclarée deux fois dans `defineConfig`", () => {
    const texte = ici("../vite.config.ts");
    const debut = texte.indexOf("defineConfig({");
    expect(debut, "`defineConfig({` est introuvable").toBeGreaterThan(-1);

    const corps = texte.slice(debut + "defineConfig({".length);
    const clefs: string[] = [];
    let profondeur = 0, chaine: string | null = null, i = 0;
    for (; i < corps.length; i++) {
      const c = corps[i], avant = corps[i - 1];
      if (chaine) { if (c === chaine && avant !== "\\") chaine = null; continue; }
      if (c === '"' || c === "'" || c === "`") { chaine = c; continue; }
      /* les commentaires ne portent pas de clé */
      if (c === "/" && corps[i + 1] === "*") { i = corps.indexOf("*/", i) + 1; continue; }
      if (c === "/" && corps[i + 1] === "/") { i = corps.indexOf("\n", i); continue; }
      if (c === "{" || c === "[" || c === "(") { profondeur++; continue; }
      if (c === "}" && profondeur === 0) break;          // fin de l'objet
      if (c === "}" || c === "]" || c === ")") { profondeur--; continue; }
      if (profondeur === 0) {
        const m = corps.slice(i).match(/^(\w+)\s*:/);
        if (m) { clefs.push(m[1]); i += m[0].length - 1; }
      }
    }
    /* ⛔ Un motif qui ne trouve RIEN rend une liste vide, donc zéro doublon :
       le garde passerait au vert en n'ayant rien mesuré. */
    expect(clefs.length, "aucune clé lue : le balayage a raté sa cible")
      .toBeGreaterThan(2);
    const doublons = clefs.filter((k, n) => clefs.indexOf(k) !== n);
    expect(doublons,
      `clé(s) déclarée(s) deux fois : ${doublons.join(", ")} — la seconde `
      + "écrase la première EN SILENCE, et le build continue de passer")
      .toEqual([]);
  });
});

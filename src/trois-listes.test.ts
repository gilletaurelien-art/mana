import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { ROUTES_APP, PREFIXES_APP, FICHIERS_APP, estANous } from "./routes";

/* ════════════════════════════════════════════════════════════════════════
   « QU'EST-CE QUI EST À NOUS ? » — TROIS RÉPONSES QUI DOIVENT CONCORDER
   ════════════════════════════════════════════════════════════════════════

   🔴 Depuis le 1/11/2026, mana.bzh sert cette application À CÔTÉ d'une
      autre : 63 885 pages d'agrégat vivent sur la même origine. Trois
      mécanismes doivent s'accorder sur le partage :
        · le bloc Caddy — quel fichier le serveur rend ;
        · le service worker — quelle navigation il garde, et pour laquelle
          il ose rendre notre coquille hors ligne ;
        · le routeur — quel écran monter.

   ⭐ ET LE DÉSACCORD EST MUET DANS LES TROIS SENS :
        · oublié côté Caddy → l'ancienne application répond ;
        · oublié côté service worker → le chemin n'est pas gardé hors ligne ;
        · DE TROP côté service worker → on rend la coquille des balades à
          quelqu'un qui demandait « les associations à Abbeville ».
      Le troisième est le pire : une page s'affiche, elle est jolie, et elle
      ne répond pas à la question posée.
*/

const sw = readFileSync("public/sw.js", "utf8");
const caddy = readFileSync("deploiement/mana-bzh.caddy", "utf8");

const extraire = (texte: string, nom: string) => {
  const m = texte.match(new RegExp(`${nom}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  expect(m, `${nom} introuvable`).not.toBeNull();
  return [...m![1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
};

describe("les trois listes de chemins", () => {
  it("le service worker porte EXACTEMENT la liste de routes.ts", () => {
    /* ⚠️ `public/sw.js` est servi tel quel : il ne peut pas importer
       `src/routes.ts`. Il en porte une copie — et une recopie ne tient que
       par ce qui la relie. */
    expect(extraire(sw, "ROUTES_APP")).toEqual([...ROUTES_APP]);
    expect(extraire(sw, "PREFIXES_APP")).toEqual([...PREFIXES_APP]);
    expect(extraire(sw, "FICHIERS_APP")).toEqual([...FICHIERS_APP]);
  });

  it("le bloc Caddy engendré porte exactement les mêmes chemins", () => {
    const m = caddy.match(/^\s*path (.+)$/m);
    expect(m, "la ligne `path` du matcher").not.toBeNull();
    const attendus = [
      ...ROUTES_APP,
      ...PREFIXES_APP.map((p) => `${p}*`),
      ...FICHIERS_APP,
    ];
    expect(m![1].trim().split(/\s+/)).toEqual(attendus);
  });

  it("et il vise bien le seul domaine concerné", () => {
    /* ⛔ Le bloc Caddy est partagé par mana.bzh, mana.love et
       manafamily.org. Sans `host mana.bzh`, les deux autres recevraient
       cette application à la place de la leur.
       ⚠️ SUR LE FICHIER SANS SES COMMENTAIRES — sixième fois aujourd'hui
          qu'un commentaire répond à la place du code : muté en
          « # host mana.bzh », ce garde restait au vert. */
    const nuCaddy = caddy.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
    expect(nuCaddy).toMatch(/^\s*host mana\.bzh$/m);
    expect(nuCaddy).toMatch(/root \* \/srv\/www\/_app-bzh/);
  });

  it("chaque adresse du routeur est revendiquée, et rien de plus", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    const routes = [...app.matchAll(/path === "(\/[a-z-]*)"/g)]
      .map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i);
    expect(routes.length).toBeGreaterThanOrEqual(8);
    for (const r of routes) {
      expect(estANous(r), `le routeur monte « ${r} » mais rien ne le revendique`)
        .toBe(true);
    }
    // ⛔ et une page d'agrégat de l'autre application n'est PAS à nous
    for (const etranger of ["/abbeville/associations", "/crozon/patrimoine",
                            "/crozon/vivre-ici", "/qui-est-mana", "/communes",
                            "/carte/ortho/14/8000/5700.jpg", "/bretagne/g/presquile.json"]) {
      expect(estANous(etranger), `« ${etranger} » ne doit PAS être à nous`).toBe(false);
    }
  });

  /* 🔴 DEUX MOTIFS PÉRIMÉS DANS CE SERVICE WORKER EN UNE JOURNÉE, même
     cause les deux fois : un chemin RECOPIÉ ici qui a changé ailleurs.
       · `/assets/` — renommé en `/app/`, les bundles n'étaient plus gardés ;
       · `/carte/style.json` — c'est le chemin de l'application HISTORIQUE ;
         celle-ci sert `/carte-style.json`, donc le style n'était jamais
         gardé et hors ligne la carte ne pouvait même pas démarrer.
     ⭐ Le premier a été trouvé par un test, le second par une MESURE du
        cache réel en production. Un test qui ne couvre qu'un membre d'une
        famille ne dit rien des autres. */
  it("garde tout ce qu'il faut pour démarrer sans réseau", () => {
    const nu = sw.replace(/\/\*[\s\S]*?\*\//g, "");
    const bloc = nu.match(/const IMMUABLES = \[([\s\S]*?)\];/);
    expect(bloc, "la liste IMMUABLES").not.toBeNull();

    /* ⛔ Aucun chemin de l'application HISTORIQUE : ils ne se distinguent
       d'un des nôtres que par un caractère, et l'erreur est muette. */
    expect(bloc![1], "un chemin de l'ancienne application").not.toContain("carte\\/style");

    // les feuilles de style sont tirées de FICHIERS_APP, pas réécrites
    expect(bloc![1]).toContain("FICHIERS_APP");

    // et le graphe, qui est ce qui coûte le plus cher à retélécharger
    expect(bloc![1]).toMatch(/bretagne\\\/g/);
  });

  it("⛔ le service worker refuse de servir une navigation qui n'est pas à nous", () => {
    /* 🔴 Sans ce refus, hors ligne, `/abbeville/associations` rendrait la
       coquille des balades — et la page aurait l'air de marcher. */
    const nu = sw.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(nu).toMatch(/if \(!estANous\(url\.pathname\)\) return;/);

    /* ⚠️ LE GARDE `res.ok` DE LA BRANCHE *NAVIGATION*, PAS N'IMPORTE LEQUEL.
       Première version : `expect(nu).toMatch(/if \(res\.ok\)/)`. Trois
       branches du fichier portent ce test — le muter dans la navigation
       laissait le garde au vert sur les deux autres. ⭐ Une mutation qui ne
       mord qu'une occurrence sur trois ne dit rien, et un garde qui ne sait
       pas laquelle il regarde non plus. On découpe donc la branche. */
    const nav = nu.match(/req\.mode === "navigate"[\s\S]*?\n    return;/);
    expect(nav, "la branche de navigation").not.toBeNull();
    expect(nav![0], "une navigation en erreur ne doit pas être mise en cache")
      .toMatch(/if \(res\.ok\)/);
  });
});

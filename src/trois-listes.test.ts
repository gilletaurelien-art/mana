import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, it, expect } from "vitest";
import { ROUTES_APP, PREFIXES_APP, FICHIERS_APP, estANous, ROUTE_OFFICE,
         ROUTES_HORS_LOVE, FICHIERS_HORS_LOVE, ROUTES_LOVE, FICHIERS_LOVE } from "./routes";

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

  /* 🔴 ET LE GARDE D'AU-DESSUS NE COUVRAIT QUE LA MOITIÉ DE LA FAMILLE —
     trouvé le 2/11/2026 en essayant simplement de relancer le générateur.

     Il compare le bloc COMMITÉ aux constantes : les deux concordaient
     parfaitement. Pendant ce temps `scripts/caddy-bloc.mjs` était cassé de
     DEUX façons — il levait sur la terminaison `];` de `FICHIERS_APP`, et une
     fois cela admis il rendait **18 chemins au lieu de 20**, sans
     `/carte-style.json` ni `/carte-ortho.json`, parce qu'il ne lisait que les
     chaînes entre guillemets doubles et que ces deux-là sont des gabarits.

     ⭐ C'EST L'ACCIDENT DU 31/10 QUE CE FICHIER EXISTE POUR EMPÊCHER, et le
        générateur l'aurait CRÉÉ : « /carte/style.json → 404, aucune carte sur
        aucun site, aucune erreur ». Sa prochaine exécution était la bascule
        vers le KS-5.
     ⭐ UN GARDE POSÉ SUR LE RÉSULTAT D'UN OUTIL NE DIT RIEN DE L'OUTIL. Celui-ci
        FAIT TOURNER le générateur — en mode `--verifier`, qui calcule sans rien
        écrire, pour que le test ne touche pas l'arbre de travail. */
  /* 🔴 LE CATALOGUE N'ÉTAIT GARDÉ PAR RIEN — trouvé le 2/11 en confrontant ce
     que l'application CHARGE à ce que le service worker GARDE. Hors ligne, la
     liste des promenades était vide : le seul motif de données était
     `/fermetures.json`, et le seul motif de graphe `/bretagne/g/…`, qui ne
     couvre ni `/bretagne/index.json` ni `/bretagne/t/<slug>.json` ni
     `/promenades/communes.json`.
     ⭐ C'est le TROISIÈME chemin recopié qui mord dans ce fichier. Les deux
        premiers (`/assets/`, `/carte/style.json`) avaient cessé de désigner
        leur cible ; celui-ci n'a jamais été écrit. Même remède : on ne garde
        pas la recopie, on la RELIE — ce test lit les URL de `catalogue.ts` et
        exige qu'un motif du service worker les attrape. */
  it("🔴 tout ce que le catalogue CHARGE, le service worker le GARDE", () => {
    const cat = readFileSync("src/catalogue.ts", "utf8");
    /* Les chemins tels que `catalogue.ts` les fabrique : une base absolue, et
       des gabarits. On les résout en exemples concrets. */
    const exemples = [
      "/bretagne/index.json",
      "/bretagne/t/pointe-de-pen-hir.json",
      "/promenades/communes.json",
    ];
    /* ⚠️ Le test ne vaut que si ces exemples décrivent VRAIMENT ce que le
       fichier charge : on le vérifie, sinon il garderait une fiction. */
    expect(cat, "la base du catalogue a changé").toMatch(/mana\.bzh\/bretagne/);
    expect(cat, "l'index du catalogue").toMatch(/\/index\.json/);
    expect(cat, "un itinéraire du catalogue").toMatch(/\/t\/\$\{encodeURIComponent/);
    expect(cat, "les communes").toMatch(/promenades\/communes\.json/);

    const sw = readFileSync("public/sw.js", "utf8");
    const bloc = (nom: string) => {
      const m = sw.match(new RegExp(`const ${nom} = \\[([\\s\\S]*?)\\n\\];`));
      expect(m, `le bloc ${nom}`).not.toBeNull();
      return m![1];
    };
    /* 🔴 LES COMMENTAIRES D'ABORD, ET C'EST LE GARDE LUI-MÊME QUI L'A APPRIS.
       Première version : l'extracteur lisait le bloc en entier, commentaires
       compris. Or la prose y CITE les chemins — « ne couvre ni
       /bretagne/index.json ni … » — et deux barres obliques autour d'un texte
       font une expression régulière parfaitement valide, qui correspond.
       Éprouvé par mutation : en RETIRANT le motif, le test restait vert.
       ⭐ Le commentaire répondait à la place du code, dans un test écrit pour
          empêcher exactement ce genre de substitution. Neuvième fois de la
          journée pour cette famille de défaut. */
    const sansCommentaires = (t: string) =>
      t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const motifs = sansCommentaires(bloc("DONNEES") + "\n" + bloc("IMMUABLES"));
    /* On exécute les motifs plutôt que de chercher leur texte : c'est leur
       EFFET qui compte, pas leur écriture. */
    const regex = motifs.split("\n")
      /* une ligne = un motif ; le commentaire de fin de ligne s'en va aussi */
      .map((l) => l.replace(/\s*\/\/.*$/, "").trim())
      .map((l) => l.match(/^\/(.+)\/,?$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => { try { return new RegExp(m[1]); } catch { return null; } })
      .filter((r): r is RegExp => r !== null);
    expect(regex.length, "aucun motif lisible dans le service worker")
      .toBeGreaterThanOrEqual(4);
    for (const chemin of exemples) {
      expect(regex.some((r) => r.test(chemin)),
        `« ${chemin} » est chargé par le catalogue et aucun motif du service `
        + `worker ne le garde — hors ligne, cette page sera vide`).toBe(true);
    }
  });

  /* 🔴 CE TEST A ÉTÉ RETOURNÉ LE 13/11/2026, PAS SUPPRIMÉ.
     Il exigeait que les tuiles NE soient PAS gardées, et il citait la promesse
     de l'en-tête : « les promettre serait mentir ». Cet interdit vivait en
     TEST, donc il a été franchi en le sachant — c'est tout l'intérêt.
     ⭐ Ce qu'il protégeait est encore vrai sous une autre forme : ne pas
        promettre ce qu'on ne peut pas tenir. Les tuiles sont désormais gardées
        parce qu'une MESURE a remplacé une estimation (jeu arrêté à z14, 30 à
        80 Ko la tuile, ~45 tuiles pour 12 km) — mais la promesse reste BORNÉE,
        et c'est cette borne que le test tient maintenant. */
  it("✅ les tuiles sont gardées, dans LEUR cache, et le cache est PLAFONNÉ", () => {
    const sw = readFileSync("public/sw.js", "utf8");
    /* ⛔ Sans cache séparé, l'élagage des tuiles rognerait les bundles. */
    expect(sw, "les tuiles n'ont plus de cache à elles")
      .toMatch(/const CACHE_TUILES = /);
    expect(sw, "le plafond a disparu : la promesse redevient sans borne")
      .toMatch(/const PLAFOND_TUILES = \d+/);
    expect(sw, "rien n'élague le cache des tuiles").toMatch(/function elaguer\(/);
    expect(sw, "l'élagueur n'est jamais appelé")
      .toMatch(/c\.put\(req, copie\)\.then\(\(\) => elaguer\(c\)\)/);
    /* 🔴 LE PIÈGE QUI SE SERAIT TU : `activate` supprime tout cache dont le
       nom n'est pas celui de la version. Sans cette ligne, chaque mise à jour
       de l'app effacerait les tuiles téléchargées — en silence, et seulement
       chez les gens qui s'étaient préparés. */
    expect(sw, "le cache des tuiles n'est pas dans la liste de survie d'activate")
      .toMatch(/k !== CACHE && k !== CACHE_TUILES/);
    /* ⭐ Et il n'est PAS versionné : une mise à jour de code ne jette pas ce
       qu'un promeneur a emporté. */
    expect(sw, "le cache des tuiles est devenu versionné")
      .toMatch(/const CACHE_TUILES = "mana-tuiles"/);
  });

  it("✅ les glyphes et le sprite sont gardés — une carte muette n'est pas une carte", () => {
    const sw = readFileSync("public/sw.js", "utf8");
    /* ⚠️ Ils vivent sous `/carte/`, donc le refus des tuiles les écartait avec
       elles. Sans glyphes, la carte hors ligne montre les routes et le trait
       de côte, et AUCUN nom de lieu. Ils sont peu et uniques : ils vont dans
       le cache de l'app, où rien ne les élague. */
    expect(sw).toMatch(/const CARTE_ESSENTIELS = \[/);
    expect(sw, "les glyphes ne sont pas visés").toMatch(/carte\\\/fonts/);
    expect(sw, "le sprite n'est pas visé").toMatch(/carte\\\/sprites/);
    /* ⛔ ET L'ORDRE DÉCIDE : visés APRÈS le motif des tuiles, ils seraient
       pris par lui et rejoindraient le cache plafonné, donc élaguables. */
    expect(sw, "les essentiels sont aiguillés après les tuiles : ils seraient élagués")
      .toMatch(/correspond\(CARTE_ESSENTIELS, url\)[\s\S]*?correspond\(TUILES, url\)/);
  });

  it("🔴 le GÉNÉRATEUR du bloc Caddy rend bien ce que le bloc contient", () => {
    const sortie = execFileSync("node", ["scripts/caddy-bloc.mjs", "--verifier"],
                                { encoding: "utf8" });
    /* Le compte aussi, pas seulement l'accord : si un jour les deux se
       trompaient de la même façon, le nombre le dirait. */
    expect(sortie).toMatch(
      new RegExp(`${ROUTES_APP.length + PREFIXES_APP.length + FICHIERS_APP.length} chemins`));
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

    /* 🔴 CE GARDE ÉPINGLAIT `/srv/www/_app-bzh` — une racine qui N'EXISTE PAS
       sur le serveur depuis la bascule du 2/11. Il ne gardait donc pas la
       production : il VERROUILLAIT une valeur périmée, et aurait refusé la
       correction.
       ⭐ Un garde qui épingle une valeur de cible se retourne contre elle au
          premier déménagement. Celui-ci garde ce qui doit rester vrai : les
          DEUX blocs servent la MÊME racine, et elle vient du générateur —
          pas d'une chaîne recopiée dans un test. La valeur juste, elle, se
          vérifie contre le serveur au déploiement, là où le serveur est
          joignable. */
    const racines = [...nuCaddy.matchAll(/^\s*root \* (\S+)$/gm)].map((m) => m[1]);
    expect(racines.length, "il manque la racine d'un des deux blocs").toBe(2);
    expect(racines[0], "les deux blocs servent des racines différentes").toBe(racines[1]);
    expect(racines[0], "la racine n'est pas un chemin absolu").toMatch(/^\//);
    const gen = readFileSync("scripts/caddy-bloc.mjs", "utf8");
    const declaree = gen.match(/const RACINE = process\.env\.MANA_RACINE \?\? "([^"]+)"/);
    expect(declaree, "le générateur ne déclare plus de racine").not.toBeNull();
    expect(racines[0], "le bloc en dépôt ne vient pas du générateur").toBe(declaree![1]);
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

describe("🔴 7/11/2026 — le SECOND visage : mana.love, tenu par l'autre app", () => {
  const swSrc = readFileSync("public/sw.js", "utf8");
  const caddySrc = readFileSync("deploiement/mana-bzh.caddy", "utf8");

  /* ⛔ LE DÉSACCORD EST MUET DANS LES TROIS SENS, et sur un second hôte il
     gagne une quatrième façon de l'être : revendiquer sur mana.love un
     chemin que cet hôte ne sert pas. La page répondrait 200, s'afficherait,
     et ne répondrait pas à la question posée. */
  /* 🔴 CES DEUX TESTS SONT RETOURNÉS, PAS SUPPRIMÉS — le matin du 7/11 ils
     exigeaient « love = bzh moins /balades-office », et c'était la bonne
     garde pour l'architecture de ce matin-là. Le fondateur a tranché
     autrement dans la journée : la racine reste à l'application citoyenne.
     ⭐ Ce qu'ils protégeaient reste vrai sous une forme plus large — « la
     liste love est DÉRIVÉE, et elle ne revendique rien qu'on ne serve pas ».
     Les effacer aurait rendu l'ancienne garde au néant au lieu de la faire
     grandir. */
  it("le bloc Caddy porte DEUX matchers, et love ne revendique aucun exclu", () => {
    const lignes = [...caddySrc.matchAll(/^\s*path (.+)$/gm)].map((m) => m[1].trim().split(" "));
    expect(lignes.length, "il manque un des deux blocs").toBe(2);
    const [bzh, love] = lignes;
    expect(bzh).toContain(ROUTE_OFFICE);
    const exclus = [...Object.keys(ROUTES_HORS_LOVE), ...FICHIERS_HORS_LOVE];
    for (const c of exclus) {
      expect(bzh, `${c} devrait être à nous sur mana.bzh`).toContain(c);
      expect(love, `${c} est revenu sur mana.love`).not.toContain(c);
    }
    /* ⭐ DÉRIVÉE, PAS RECOPIÉE : tout le reste doit être identique, sinon les
       deux listes divergeront au premier ajout de route — en silence. */
    expect(love).toEqual(bzh.filter((c) => !exclus.includes(c)));
  });

  /* ⛔ LE PIÈGE QUI NE SE VOIT PAS DANS LA LISTE DES ROUTES. Un service
     worker est enregistré par la RACINE et prend toute la portée de l'hôte.
     Servir le nôtre sur mana.love remplacerait celui de l'autre application
     en silence : aucune requête n'échoue, et ses écrans perdent leur
     hors-ligne. */
  it("⛔ /sw.js n'est PAS servi sur mana.love", () => {
    expect(FICHIERS_HORS_LOVE).toContain("/sw.js");
    expect(FICHIERS_LOVE, "notre service worker remplacerait le sien")
      .not.toContain("/sw.js");
    const love = [...caddySrc.matchAll(/^\s*path (.+)$/gm)][1][1].trim().split(" ");
    expect(love).not.toContain("/sw.js");
  });

  /* ⭐ ET LA RACINE EST LE CAS QUI A L'AIR DE MARCHER. Une liste blanche trop
     LARGE ne tombe jamais en erreur : elle affiche une application plausible
     à la place d'une autre. */
  it("⛔ la racine de mana.love n'est pas à nous", () => {
    expect(ROUTES_LOVE).not.toContain("/");
    expect(ROUTES_APP, "elle reste à nous sur mana.bzh").toContain("/");
  });

  /* ⚠️ UNE EXCLUSION QUI NE RETIRE RIEN EST UNE EXCLUSION MORTE, et elle est
     muette : le chemin renommé revient dans la liste love sans un mot. */
  it("chaque exclusion retire bien quelque chose, et porte sa raison", () => {
    for (const [c, pourquoi] of Object.entries(ROUTES_HORS_LOVE)) {
      expect(ROUTES_APP as readonly string[], `${c} n'existe plus`).toContain(c);
      expect(pourquoi.length, `${c} est exclu sans raison écrite`).toBeGreaterThan(20);
    }
    for (const f of FICHIERS_HORS_LOVE) expect(FICHIERS_APP).toContain(f);
    expect(ROUTES_LOVE.length).toBe(ROUTES_APP.length - Object.keys(ROUTES_HORS_LOVE).length);
    expect(FICHIERS_LOVE.length).toBe(FICHIERS_APP.length - FICHIERS_HORS_LOVE.length);
  });

  it("le service worker décide par l'hôte QUI LE SERT, pas par la construction", () => {
    expect(swSrc).toMatch(/self\.location\.hostname === "mana\.love"/);
    /* ⭐ LA COPIE DES EXCLUSIONS EST TENUE, comme les listes elles-mêmes : le
       service worker est servi tel quel, il ne peut pas importer routes.ts. */
    const copieR = swSrc.match(/const ROUTES_HORS_LOVE = \[([^\]]*)\]/);
    expect(copieR, "le SW ne porte plus les exclusions").not.toBeNull();
    for (const c of Object.keys(ROUTES_HORS_LOVE)) {
      if (c === ROUTE_OFFICE) continue;   // porté par sa constante
      expect(copieR![1], `${c} manque à la copie du SW`).toContain(`"${c}"`);
    }
    const copieF = swSrc.match(/const FICHIERS_HORS_LOVE = \[([^\]]*)\]/);
    expect(copieF).not.toBeNull();
    for (const f of FICHIERS_HORS_LOVE) expect(copieF![1]).toContain(`"${f}"`);
    /* ⛔ Et `estANous` doit consulter les listes DU VISAGE, pas les listes
       brutes — sinon les branches existent et ne décident de rien. */
    expect(swSrc).toMatch(/routesDuVisage\(\)\.includes\(c\)/);
    expect(swSrc).toMatch(/fichiersDuVisage\(\)\.includes\(c\)/);
  });

  /* 🔴 CE TEST EXISTE PARCE QU'UNE MUTATION N'A PAS MORDU. Les gardes
     ci-dessus lisent le TEXTE du service worker : la copie des exclusions, et
     le fait qu'`estANous` appelle bien `routesDuVisage()`. J'ai remplacé le
     corps de `routesDuVisage` par `ROUTES_APP` — la liste brute — et les
     seize tests sont restés verts. Tout ce qu'ils vérifiaient était encore
     là ; la seule chose qui avait changé était ce que le code DÉCIDE.
     ⭐ Un garde qui lit la forme d'une fonction ne dit rien de sa valeur. On
     EXÉCUTE donc le fichier, avec un faux `self` par hôte, et on interroge sa
     décision. */
  it("🔴 on EXÉCUTE le service worker : sa décision diffère selon l'hôte", () => {
    const decideur = (hostname: string) => {
      /* On n'évalue que la tête du fichier — jusqu'aux écouteurs, qui
         exigeraient un vrai service worker. C'est exactement la part qui
         décide. */
      const tete = swSrc.slice(0, swSrc.search(/self\.addEventListener/));
      const faire = new Function("self", `${tete}\nreturn estANous;`);
      /* ⚠️ `self.location` doit être une VRAIE URL : la tête du fichier
         calcule `new URL("./", self.location)` pour sa base. Un objet plat
         avec un `hostname` faisait lever « Invalid URL » — et ce n'était pas
         le défaut cherché. */
      return faire({ location: new URL(`https://${hostname}/sw.js`) }) as
        (p: string) => boolean;
    };
    const bzh = decideur("mana.bzh");
    const love = decideur("mana.love");

    for (const c of [...Object.keys(ROUTES_HORS_LOVE), ...FICHIERS_HORS_LOVE]) {
      expect(bzh(c), `${c} devrait être à nous sur mana.bzh`).toBe(true);
      expect(love(c), `${c} est revendiqué sur mana.love`).toBe(false);
    }
    /* ⭐ Et le reste doit rester à nous des deux côtés, sinon une soustraction
       trop gourmande passerait pour une réussite. */
    for (const c of ROUTES_LOVE) expect(love(c), `${c} a été perdu`).toBe(true);
    for (const f of FICHIERS_LOVE) expect(love(f), `${f} a été perdu`).toBe(true);
  });

  /* 🔴 LE RÉGIME DE CACHE SE DEMANDE AU CODE, PAS À SES LISTES — 7/11 au
     soir, trouvé par une relecture adversariale avant déploiement.
     `IMMUABLES` attrape TOUT `/app/`, parce que les bundles y sont HACHÉS :
     leur nom change avec leur contenu, donc « garder sans fin » est sans
     risque. Le manifeste et l'icône viennent d'y déménager, et leur nom est
     FIXE — la même règle leur aurait servi une version périmée.
     ⭐ On n'éprouve pas la présence d'un motif dans une liste : on demande au
        fichier, pour une adresse donnée, QUEL régime il choisit. Un motif
        peut exister dans la bonne liste et être masqué par l'ordre des
        aiguillages, ce qu'une lecture de liste ne voit jamais. */
  it("🔴 ce qui n'a pas de hachage dans son nom n'est pas servi par le cache d'abord", () => {
    const tete = swSrc.slice(0, swSrc.search(/self\.addEventListener/));
    const faire = new Function("self", `${tete}
      return (u) => correspond(TUILES, u) ? "tuiles"
                  : correspond(DONNEES, u) ? "reseau-d-abord"
                  : correspond(IMMUABLES, u) ? "cache-d-abord" : "reseau-seul";`);
    const regime = faire({ location: new URL("https://mana.bzh/sw.js") }) as
      (u: URL) => string;

    for (const sans of ["/app/manifest.webmanifest", "/app/icon.svg"]) {
      expect(regime(new URL(`https://mana.bzh${sans}`)),
        `${sans} n'a pas de version dans son nom`).toBe("reseau-d-abord");
    }
    /* ⛔ Et les bundles, eux, DOIVENT rester en cache d'abord : c'est tout le
       hors-ligne de l'application. Un garde qui corrige l'un en cassant
       l'autre aurait l'air d'une réussite. */
    expect(regime(new URL("https://mana.bzh/app/index-CI3wvUaU.js")))
      .toBe("cache-d-abord");
  });

  /* 🔴 LE REPLI HORS LIGNE DOIT DÉSIGNER QUELQUE CHOSE QUI EST GARDÉ — et il
     ne le faisait pas. Il allait chercher `./index.html`, que le pré-cache
     croyait garder : mesuré, `/index.html` répond 301 sur les deux hôtes, et
     `cache.put()` refuse une réponse redirigée. L'entrée échouait seule, le
     rattrapage per-entrée effaçait l'erreur, et une navigation hors ligne
     vers une page jamais visitée ne rendait RIEN.
     ⭐ Le hors-ligne est notre argument de vente : un repli qui désigne une
        adresse absente du cache est une promesse qui ne tient qu'en ligne. */
  it("🔴 ce que le repli hors ligne cherche est bien ce que l'installation garde", () => {
    const m = swSrc.match(/const PRECACHE = \[([^\]]*)\]/);
    expect(m, "la liste de pré-cache a disparu").not.toBeNull();
    /* ⚠️ LA LISTE MÊLE DES LITTÉRAUX ET DES CONSTANTES, et il faut résoudre
       les deux — ma première version ne lisait que les chaînes entre
       guillemets, donc elle ne voyait pas `COQUILLE` et accusait le code
       d'un défaut qu'il n'avait pas. Un garde qui ne reconnaît qu'une FORME
       d'écriture ne garde que cette forme-là. */
    const resoudre = (e: string) => {
      const litteral = e.match(/^"([^"]+)"$/);
      if (litteral) return litteral[1];
      const v = swSrc.match(new RegExp(`const ${e} = "([^"]+)"`));
      expect(v, `${e} n'est pas résoluble`).not.toBeNull();
      return v![1];
    };
    const garde = m![1].split(",").map((e) => e.trim()).filter(Boolean).map(resoudre);
    const repli = swSrc.match(/hit \|\| caches\.match\(([^)]+)\)/);
    expect(repli, "le repli hors ligne a disparu").not.toBeNull();
    const cible = repli![1].trim();
    /* Le repli nomme une CONSTANTE, pas une chaîne : c'est ce qui empêche les
       deux listes de désigner des choses différentes. */
    expect(cible, "le repli écrit une adresse au lieu de nommer la constante")
      .toMatch(/^[A-Z_]+$/);
    const valeur = swSrc.match(new RegExp(`const ${cible} = "([^"]+)"`));
    expect(valeur, `${cible} n'est pas défini`).not.toBeNull();
    expect(garde, `le repli cherche ${valeur![1]}, qui n'est pas pré-caché`)
      .toContain(valeur![1]);
    /* ⛔ Et `./index.html` ne doit pas revenir : il répond 301, donc il ne
       peut PAS entrer dans un cache. */
    expect(garde, "./index.html est revenu dans le pré-cache (il répond 301)")
      .not.toContain("./index.html");

    /* ⚠️ ET LA COQUILLE EST BIEN LA RACINE. Une mutation l'a montré : changer
       `COQUILLE` pour « ./accueil » laissait ce garde VERT, parce qu'il
       vérifie la COHÉRENCE des deux listes et non la justesse de l'adresse.
       Les deux auraient désigné ensemble une adresse que le serveur ne sert
       pas comme coquille — cohérentes et fausses.
       ⭐ `./` est la seule adresse dont on sait qu'elle rend la coquille sur
          les deux hôtes : elle est dans `ROUTES_APP`, dans les deux blocs
          Caddy, et elle répond 200 sans redirection. */
    expect(valeur![1], "la coquille n'est plus la racine").toBe("./");
  });

  /* 🔴 ET LE PRÉ-CACHE PASSE PAR CE GARDE — il ne le faisait pas, alors que
     le fichier le définit pour cette raison exacte. Un fichier manquant sous
     `/app/` revient en 200 avec la coquille : `addAll` réussissait, et du
     HTML était gravé sous l'adresse du manifeste.
     ⛔ MAIS LA COQUILLE ELLE-MÊME EST DU HTML. Mon premier correctif
        appliquait le garde à toutes les entrées : il aurait rejeté `./`, la
        seule page que le hors-ligne sert. Le garde dit « du HTML sous le nom
        d'un BIEN », pas « le HTML est mauvais ». Ce test tient les deux sens
        — sans quoi la réparation supprimerait ce qu'elle protège. */
  it("🔴 le pré-cache refuse une coquille, SAUF pour la coquille elle-même", () => {
    /* ⚠️ SANS LES COMMENTAIRES — troisième fois aujourd'hui qu'un garde
       trébuche dessus, et ici dans le sens qui CRIE À FAUX : les trois
       occurrences restantes d'`addAll` sont celles qui expliquent pourquoi
       il est parti. Une recherche qui compte les commentaires ment dans
       l'autre sens, et un garde qui crie à faux finit désarmé. */
    const install = swSrc.slice(swSrc.indexOf('addEventListener("install"'),
                                swSrc.indexOf('addEventListener("activate"'))
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");
    expect(install, "le pré-cache ne vérifie pas ce qu'il garde")
      .toMatch(/estDeLaCoquille\(res\)/);
    expect(install, "le garde s'applique aussi à la coquille : le hors-ligne disparaît")
      .toMatch(/u === COQUILLE \|\| !estDeLaCoquille\(res\)/);
    /* ⚠️ Et `addAll` ne doit pas revenir : il garde sans regarder. */
    expect(install, "addAll est revenu — il ne vérifie rien").not.toMatch(/addAll/);
  });

  /* 🔴 LE GARDE QUI EMPÊCHE DE METTRE LA COQUILLE EN CACHE SOUS LE NOM D'UN
     BUNDLE — et il n'était nommé dans AUCUN test jusqu'au 7/11 au soir.
     Le bloc Caddy porte `try_files {path} {path}/index.html /index.html` :
     un fichier ABSENT sous `/app/` revient en **200 avec la coquille**.
     `res.ok` ne voit rien — c'est bien un 200 — et le cache se remplit de
     HTML sous le nom d'un bundle. L'application casse alors HORS LIGNE,
     durablement, sans une erreur.
     ⭐ C'est « un 200 ne prouve rien sur un site à repli SPA », pris du côté
        du cache : le serveur peut mentir, c'est à celui qui garde de vérifier
        ce qu'il garde. Un garde de cette importance qui n'est cité nulle part
        peut disparaître dans une réécriture sans que rien ne tombe. */
  it("🔴 le service worker REFUSE de garder une coquille sous le nom d'un bien", () => {
    /* ⚠️ ON COUPE À L'ÉCOUTEUR `fetch`, PAS AU PREMIER. `estDeLaCoquille`
       vit APRÈS `install` et `activate` : une tranche arrêtée au premier
       `addEventListener` ne l'atteignait pas, et le test tombait en
       « not defined » — ce qui ressemblait à un garde qui mord alors que
       c'était le banc qui se trompait de borne. ⭐ Un `self.addEventListener`
       muet laisse les enregistrements se faire sans rien exécuter : leurs
       corps ne tournent qu'à l'événement. */
    const tete = swSrc.slice(0, swSrc.search(/self\.addEventListener\("fetch"/));
    const faire = new Function("self", `${tete}\nreturn estDeLaCoquille;`);
    const coquille = faire({
      location: new URL("https://mana.bzh/sw.js"),
      addEventListener: () => {},
    }) as (r: { headers: { get: (k: string) => string | null } }) => boolean;
    const reponse = (type: string | null) => ({ headers: { get: () => type } });

    expect(coquille(reponse("text/html; charset=utf-8")),
      "du HTML servi à la place d'un bundle serait mis en cache").toBe(true);
    /* ⛔ Et il ne doit pas refuser les biens légitimes : un garde trop large
       viderait le hors-ligne au lieu de le protéger. */
    for (const bon of ["application/javascript", "text/css", "application/json",
                       "image/svg+xml", "font/woff2", "application/manifest+json"]) {
      expect(coquille(reponse(bon)), `${bon} est pris pour une coquille`).toBe(false);
    }
    /* ⚠️ Un serveur peut ne rien dire du tout : l'absence d'en-tête n'est pas
       une coquille, sinon on cesserait de garder au premier serveur avare. */
    expect(coquille(reponse(null))).toBe(false);
  });

  /* ⚠️ Nos propres biens sont servis depuis l'hôte qui sert la page : sans
     mana.love dans la liste blanche, l'app n'aurait aucun hors-ligne là-bas. */
  it("le service worker garde les biens des DEUX origines", () => {
    const m = swSrc.match(/const ORIGINES = \[([^\]]*)\]/);
    expect(m, "la liste blanche d'origines a disparu").not.toBeNull();
    expect(m![1]).toContain("mana.bzh");
    expect(m![1]).toContain("mana.love");
  });

  /* 🔴 LE GARDE SUR LE PRODUCTEUR, PAS SUR L'ARTEFACT. Le bloc en dépôt peut
     rester juste pendant que le générateur, lui, est cassé — c'est arrivé le
     2/11, et personne ne l'a vu parce que le test ne lisait que le résultat.
     On FAIT TOURNER le générateur. */
  it("le générateur rend bien ces deux blocs — on le lance, on ne le relit pas", () => {
    const sortie = execFileSync("node", ["scripts/caddy-bloc.mjs", "--verifier"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    expect(sortie).toMatch(/les deux blocs concordent/);
  });
});

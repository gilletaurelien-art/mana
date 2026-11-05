import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { cadrer, vuePour, VUE_REPOS, R_LAT, ZOOM_MIN, ZOOM_MAX, type Emprise } from "./cadrage";
import { TOUT } from "./territoires";

/* Une boîte de téléphone, et une de portable — le cadrage prend le plus
   contraignant des deux axes, donc les deux régimes doivent être exercés. */
const TEL = { W: 390, H: 640 };
const ORDI = { W: 1280, H: 720 };
const REPOS = { k: 1, px: 0, py: 0 };

describe("le cadrage de la carte", () => {
  it("le centre du cadre se relit à l'identique", () => {
    /* 🔴 CE TEST EXISTE PARCE QUE `X`/`Y` ET LEUR INVERSE ÉTAIENT ÉCRITS À LA
       MAIN, L'UN SOUS L'AUTRE, SANS RIEN POUR LES CROISER. L'inverse sert à
       recaler le fond satellite sous le canvas : s'il dérive d'un facteur,
       l'image et les pastilles se désaccordent — et c'est exactement le
       défaut qui a traversé une vérification visuelle en octobre, du côté du
       zoom (voir `carte-fond.ts`, le facteur deux). */
    for (const { W, H } of [TEL, ORDI]) {
      const c = cadrer(TOUT.emprise, W, H, REPOS);
      expect(c.X(c.centreLon)).toBeCloseTo(W / 2, 6);
      expect(c.Y(c.centreLat)).toBeCloseTo(H / 2, 6);
    }
  });

  it("et il se relit encore après un zoom et un glissement", () => {
    // ⚠️ Le régime qu'on ne regarde pas : au repos, `k = 1` et `px = py = 0`
    //    annulent la moitié des termes de l'inverse. Un facteur faux sur `k`
    //    passerait inaperçu.
    for (const vue of [{ k: 3.5, px: -120, py: 64 }, { k: 0.6, px: 40, py: -18 }]) {
      const c = cadrer(TOUT.emprise, TEL.W, TEL.H, vue);
      expect(c.X(c.centreLon)).toBeCloseTo(TEL.W / 2, 5);
      expect(c.Y(c.centreLat)).toBeCloseTo(TEL.H / 2, 5);
    }
  });

  it("l'emprise entière tient dans la boîte, marge comprise", () => {
    const [o, s, e, n] = TOUT.emprise;
    for (const { W, H } of [TEL, ORDI]) {
      const c = cadrer(TOUT.emprise, W, H, REPOS);
      for (const [lon, lat] of [[o, s], [o, n], [e, s], [e, n]] as const) {
        const x = c.X(lon), y = c.Y(lat);
        expect(x, `lon ${lon} dans ${W}px`).toBeGreaterThanOrEqual(0);
        expect(x, `lon ${lon} dans ${W}px`).toBeLessThanOrEqual(W);
        expect(y, `lat ${lat} dans ${H}px`).toBeGreaterThanOrEqual(0);
        expect(y, `lat ${lat} dans ${H}px`).toBeLessThanOrEqual(H);
      }
    }
  });

  it("le nord est en haut", () => {
    const [, s, , n] = TOUT.emprise;
    const c = cadrer(TOUT.emprise, TEL.W, TEL.H, REPOS);
    expect(c.Y(n)).toBeLessThan(c.Y(s));
  });

  it("l'est est à droite", () => {
    const [o, , e] = TOUT.emprise;
    const c = cadrer(TOUT.emprise, TEL.W, TEL.H, REPOS);
    expect(c.X(e)).toBeGreaterThan(c.X(o));
  });

  it("zoomer ×2 serre l'échelle d'exactement moitié", () => {
    const un = cadrer(TOUT.emprise, TEL.W, TEL.H, REPOS);
    const deux = cadrer(TOUT.emprise, TEL.W, TEL.H, { k: 2, px: 0, py: 0 });
    expect(deux.metresParPixel).toBeCloseTo(un.metresParPixel / 2, 9);
  });

  it("un degré de longitude vaut moins qu'un degré de latitude, ici", () => {
    /* ⛔ Sans le cosinus, la presqu'île s'étirerait de 33 % en largeur. Le
       seuil n'est pas décoratif : à 48,26° de latitude, cos vaut 0,665. */
    const c = cadrer(TOUT.emprise, TEL.W, TEL.H, REPOS);
    expect(c.kLon).toBeCloseTo(Math.cos((48.2596 * Math.PI) / 180), 3);
    expect(c.kLon).toBeLessThan(0.7);
  });

  it("un mètre au sol fait le même nombre de pixels dans les deux axes", () => {
    /* 🔴 LE PIÈGE DE CETTE PROJECTION : `X` porte `kLon`, `Y` ne le porte
       pas. C'est juste — un degré de longitude est plus court ici — mais
       c'est aussi l'endroit exact où un facteur s'oublie. On le vérifie donc
       EN MÈTRES, pas en degrés : 1 000 m vers l'est et 1 000 m vers le nord
       doivent faire le même nombre de pixels. */
    const c = cadrer(TOUT.emprise, TEL.W, TEL.H, REPOS);
    const [o, s] = TOUT.emprise;
    const mille = (x: number) => Math.abs(x);
    const versEst = mille(c.X(o + 1000 / (R_LAT * c.kLon)) - c.X(o));
    const versNord = mille(c.Y(s + 1000 / R_LAT) - c.Y(s));
    expect(versEst).toBeCloseTo(versNord, 6);
    // et ce nombre de pixels est bien l'inverse de `metresParPixel`
    expect(versEst).toBeCloseTo(1000 / c.metresParPixel, 6);
  });

  it("une boîte plate est bornée par sa hauteur, une boîte haute par sa largeur", () => {
    /* ⚠️ `Math.min` des deux axes : le régime qui ne mord pas est celui qu'on
       ne teste jamais. L'emprise fait 44,6 × 20,6 km, soit un rapport 2,16. */
    const plate = cadrer(TOUT.emprise, 2000, 200, REPOS);
    const haute = cadrer(TOUT.emprise, 300, 2000, REPOS);
    const [o, s, e, n] = TOUT.emprise;
    // plate : la hauteur est pleine (à la marge près), la largeur a du mou
    expect(plate.Y(s) - plate.Y(n)).toBeCloseTo(200 - 36, 6);
    expect(plate.X(e) - plate.X(o)).toBeLessThan(2000 - 36);
    // haute : l'inverse
    expect(haute.X(e) - haute.X(o)).toBeCloseTo(300 - 36, 6);
    expect(haute.Y(s) - haute.Y(n)).toBeLessThan(2000 - 36);
  });

  it("une emprise quelconque se cadre aussi — la fonction ne connaît pas `TOUT`", () => {
    const petite: Emprise = [-4.52, 48.24, -4.48, 48.26];
    const c = cadrer(petite, TEL.W, TEL.H, REPOS);
    expect(c.centreLon).toBeCloseTo(-4.5, 6);
    expect(c.centreLat).toBeCloseTo(48.25, 6);
  });
});

/**
 * 🔴 LE RECADRAGE SUR CE QU'ON VIENT DE CHOISIR — 5/11/2026.
 *
 * ⭐ LA PROPRIÉTÉ QU'ON TIENT N'EST PAS UNE FORMULE, C'EST UNE PROMESSE :
 *    « les points qu'on cadre sont VISIBLES ». Les tests la vérifient donc en
 *    reprojetant avec `cadrer()` sous la vue rendue — c'est-à-dire en
 *    croisant les deux fonctions l'une par l'autre, plutôt qu'en comparant
 *    `vuePour` à une seconde écriture de son propre calcul.
 */
describe("cadrer sur ce qu'on vient de choisir", () => {
  const dansLaBoite = (pts: readonly (readonly [number, number])[], W: number, H: number, o?: object) => {
    const v = vuePour(TOUT.emprise, pts, W, H, o);
    const c = cadrer(TOUT.emprise, W, H, v);
    return pts.map(([lon, lat]) => ({ x: c.X(lon), y: c.Y(lat), v }));
  };

  // Menhirs de Kerziou et ses trois destinations, relevés en production
  const KERZIOU: [number, number] = [-4.2996, 48.2456];
  const TROIS: [number, number][] = [
    [-4.3072, 48.2528], [-4.2888, 48.2371], [-4.3104, 48.2399],
  ];

  /**
   * ⛔ UNE ENFILADE EST-OUEST, ET ELLE N'EST PAS DÉCORATIVE. Un lieu et ses
   *    trois destinations forment une tache presque CARRÉE (12,7 × 13,8 px au
   *    repos) — et sur une boîte carrée, croiser les deux axes dans le calcul
   *    du zoom donne un résultat simplement plus LÂCHE : 22,4 au lieu de
   *    24,4, donc tout rentre encore et aucun test ne tombe. Mutation passée.
   * ⭐ Le régime qui démasque est celui où la boîte est étirée : trois points
   *    le long de la côte font 70,4 × 2,6 px, et le zoom croisé (7,9 au lieu
   *    de 4,4) voudrait leur donner 560 px de large pour 390 disponibles.
   *    Un cas réel — les promenades suivent le littoral.
   */
  const ENFILADE: [number, number][] = [
    [-4.40, 48.250], [-4.34, 48.252], [-4.28, 48.249],
  ];

  it("un lieu et ses trois promenades tiennent tous à l'écran", () => {
    for (const pts of [[KERZIOU, ...TROIS], ENFILADE]) {
      for (const { W, H } of [TEL, ORDI]) {
        for (const p of dansLaBoite(pts, W, H)) {
          expect(p.x, `x dans ${W}×${H}`).toBeGreaterThanOrEqual(0);
          expect(p.x, `x dans ${W}×${H}`).toBeLessThanOrEqual(W);
          expect(p.y, `y dans ${W}×${H}`).toBeGreaterThanOrEqual(0);
          expect(p.y, `y dans ${W}×${H}`).toBeLessThanOrEqual(H);
        }
      }
    }
  });

  it("🔴 et ils ne font plus trois pixels", () => {
    /* C'EST LE DÉFAUT MESURÉ, et donc le seul test qui dit si on l'a réparé.
       Au repos, les quatre points tiennent dans une tache de quelques pixels
       sur une carte de 45 km de large. Le seuil est posé à 120 px : en
       dessous, on ne lit pas la forme d'un chemin. */
    const repos = cadrer(TOUT.emprise, TEL.W, TEL.H, VUE_REPOS);
    const etendue = (c: { X: (n: number) => number; Y: (n: number) => number }) => {
      const xs = [KERZIOU, ...TROIS].map(([lo]) => c.X(lo));
      const ys = [KERZIOU, ...TROIS].map(([, la]) => c.Y(la));
      return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    };
    expect(etendue(repos), "au repos, la tache devrait être minuscule").toBeLessThan(25);
    const v = vuePour(TOUT.emprise, [KERZIOU, ...TROIS], TEL.W, TEL.H);
    /* 🔴 LE SEUIL EST À 250 px, ET IL A DÛ MONTER. Écrit d'abord à 120, il
       laissait passer la mutation qui redescend le plafond de zoom à 12 : au
       plafond de 12 la tache fait 166 px — plus que 120, donc « réparé » —
       alors que le cadrage demandé en vaut 338. ⭐ Un seuil choisi pour être
       sûrement franchi par le correctif est aussi un seuil que la moitié du
       correctif franchit. On le pose là où le DÉFAUT tombe, pas là où le
       correctif passe : 250 px, soit les deux tiers d'un écran de téléphone,
       en dessous desquels on ne lit pas la forme d'un chemin. */
    expect(etendue(cadrer(TOUT.emprise, TEL.W, TEL.H, v))).toBeGreaterThan(250);
  });

  it("⛔ un lieu SEUL ne se colle pas au nez — on voit autour", () => {
    /* Sans `spanMinM`, une boîte de taille nulle donne un zoom infini, ramené
       à `kMax` : le lieu occuperait l'écran entier, sans entourage.
       🔴 LE SEUIL SE MESURE EN MÈTRES AU SOL, PAS EN `k`. Écrit d'abord
       `expect(v.k).toBeLessThan(12)`, ce test est tombé le jour où le
       plafond est monté à 64 — en disant « 12 n'est pas < 12 », c'est-à-dire
       en parlant d'un réglage et pas de ce qu'on voit. ⭐ Un seuil posé sur
       une borne interne devient faux quand la borne bouge, même si la
       PROPRIÉTÉ, elle, tient toujours. */
    const c = cadrer(TOUT.emprise, TEL.W, TEL.H, vuePour(TOUT.emprise, [KERZIOU], TEL.W, TEL.H));
    const largeurEcranM = c.metresParPixel * TEL.W;
    expect(largeurEcranM, "l'écran doit montrer le hameau autour du menhir")
      .toBeGreaterThan(1200);
    expect(largeurEcranM, "mais pas la moitié du territoire non plus")
      .toBeLessThan(6000);
  });

  it("⛔ la vue rendue est DÉJÀ légale : bornée et serrée", () => {
    for (const pts of [[KERZIOU], [KERZIOU, ...TROIS], TROIS]) {
      const v = vuePour(TOUT.emprise, pts, TEL.W, TEL.H);
      expect(v.k).toBeGreaterThanOrEqual(ZOOM_MIN);
      expect(v.k).toBeLessThanOrEqual(ZOOM_MAX);
      // ⚠️ le même serrage que `serrer()` dans l'écran : la fenêtre ne sort
      //    jamais du cadre de départ, donc pas d'« écran vide » sans retour
      expect(Math.abs(v.px)).toBeLessThanOrEqual((TEL.W * (v.k - 1)) / 2 + 1e-9);
      expect(Math.abs(v.py)).toBeLessThanOrEqual((TEL.H * (v.k - 1)) / 2 + 1e-9);
    }
  });

  it("⛔ un point HORS emprise ne fait pas sortir la fenêtre du cadre", () => {
    /* 🔴 LE SERRAGE DANS `vuePour` ÉTAIT DU CODE QUE RIEN N'ATTEIGNAIT — sa
       mutation passait. Démonstration : pour un point DANS l'emprise, le
       centrage est toujours légal, parce que la marge de 18 px du cadre le
       tient à distance du bord. Le serrage ne mord que pour un point du
       dehors — et il y en a un vrai, la position GPS de quelqu'un qui n'est
       pas sur le territoire.
       ⭐ C'est le même piège que `tracer()` hier : du code défendable, jamais
          exécuté, qu'aucune mutation ne pouvait démasquer faute d'entrée qui
          l'emprunte. La réparation n'est pas de retirer la garde — elle est
          juste — mais de lui donner le cas qui la traverse. */
    const loin: [number, number] = [-5.1, 48.4];   // au large d'Ouessant
    const v = vuePour(TOUT.emprise, [loin], TEL.W, TEL.H);
    expect(Math.abs(v.px), "px déborde le serrage")
      .toBeLessThanOrEqual((TEL.W * (v.k - 1)) / 2 + 1e-9);
    expect(Math.abs(v.py), "py déborde le serrage")
      .toBeLessThanOrEqual((TEL.H * (v.k - 1)) / 2 + 1e-9);
    /* Et la conséquence qui compte : la FENÊTRE reste dans le cadre de
       départ, donc l'écran ne montre jamais de vide hors territoire.
       ⚠️ Ce n'est PAS « toute l'emprise est visible » — à fort zoom elle ne
          l'est évidemment pas. C'est : le morceau qu'on regarde est un
          morceau DU cadre. En pixels du repos, la fenêtre va de
          `centre ± W / (2k)`, et elle doit tenir dans [0, W]. */
    const fenetre = (centre: number, taille: number, k: number) =>
      [centre - taille / (2 * k), centre + taille / (2 * k)] as const;
    const [gauche, droite] = fenetre(TEL.W / 2 - v.px / v.k, TEL.W, v.k);
    const [haut, bas] = fenetre(TEL.H / 2 - v.py / v.k, TEL.H, v.k);
    expect(gauche, "la fenêtre déborde à gauche du cadre").toBeGreaterThanOrEqual(-1e-6);
    expect(droite, "la fenêtre déborde à droite du cadre").toBeLessThanOrEqual(TEL.W + 1e-6);
    expect(haut, "la fenêtre déborde en haut du cadre").toBeGreaterThanOrEqual(-1e-6);
    expect(bas, "la fenêtre déborde en bas du cadre").toBeLessThanOrEqual(TEL.H + 1e-6);
  });

  it("un lieu au bord de l'emprise reste visible, même serré", () => {
    /* ⚠️ Le régime qu'on ne regarde pas : au bord, le serrage EMPÊCHE de
       centrer. Le lieu ne doit pas pour autant sortir de l'écran. */
    const [o, s, e, n] = TOUT.emprise;
    for (const coin of [[o, s], [e, n], [o, n], [e, s]] as [number, number][]) {
      const v = vuePour(TOUT.emprise, [coin], TEL.W, TEL.H);
      const c = cadrer(TOUT.emprise, TEL.W, TEL.H, v);
      expect(c.X(coin[0]), `coin ${coin}`).toBeGreaterThanOrEqual(-0.001);
      expect(c.X(coin[0]), `coin ${coin}`).toBeLessThanOrEqual(TEL.W + 0.001);
      expect(c.Y(coin[1]), `coin ${coin}`).toBeGreaterThanOrEqual(-0.001);
      expect(c.Y(coin[1]), `coin ${coin}`).toBeLessThanOrEqual(TEL.H + 0.001);
    }
  });

  it("🔴 ce qui est recouvert ne compte pas comme de la place", () => {
    /* Le défaut relevé à l'écran : l'encadré du lieu mange le bas, la
       recherche le haut, et un cadrage « au centre » pose les tracés
       derrière eux. On vérifie la propriété utile — les points tombent dans
       la bande LIBRE — et pas la formule qui la produit. */
    const HAUT = 74, BAS = 374, DROITE = 68;   // relevés sur un téléphone
    const v = vuePour(TOUT.emprise, [KERZIOU, ...TROIS], TEL.W, TEL.H,
                      { haut: HAUT, bas: BAS, droite: DROITE });
    const c = cadrer(TOUT.emprise, TEL.W, TEL.H, v);
    for (const [lon, lat] of [KERZIOU, ...TROIS]) {
      const x = c.X(lon), y = c.Y(lat);
      expect(y, `${lon},${lat} passe sous la recherche`).toBeGreaterThanOrEqual(HAUT);
      expect(y, `${lon},${lat} passe derrière l'encadré`).toBeLessThanOrEqual(TEL.H - BAS);
      expect(x, `${lon},${lat} passe derrière les commandes`).toBeLessThanOrEqual(TEL.W - DROITE);
      expect(x, `${lon},${lat} sort à gauche`).toBeGreaterThanOrEqual(0);
    }
  });

  it("⚠️ et sans recouvrement, le cadrage reprend tout l'écran", () => {
    // le régime qu'on ne regarde pas : `haut`/`bas` à zéro doivent rendre
    // exactement le cadrage d'avant, pas une version décalée
    const sans = vuePour(TOUT.emprise, [KERZIOU, ...TROIS], TEL.W, TEL.H);
    const zeros = vuePour(TOUT.emprise, [KERZIOU, ...TROIS], TEL.W, TEL.H, { haut: 0, bas: 0 });
    expect(zeros).toEqual(sans);
    const c = cadrer(TOUT.emprise, TEL.W, TEL.H, sans);
    const ys = [KERZIOU, ...TROIS].map(([, la]) => c.Y(la));
    // centré verticalement dans l'écran entier
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(TEL.H / 2, 6);
  });

  it("aucun point : on ne bouge pas", () => {
    expect(vuePour(TOUT.emprise, [], TEL.W, TEL.H)).toEqual(VUE_REPOS);
  });

  it("⛔ on ne DÉZOOME jamais sous le territoire entier", () => {
    // une boîte plus large que l'emprise ne doit pas rendre k < 1 : en
    // dessous, on montrerait du vide autour d'une donnée qu'on n'a pas
    const v = vuePour(TOUT.emprise, [[-5.5, 47.5], [-3.2, 49.0]], TEL.W, TEL.H);
    expect(v.k).toBe(1);
  });
});

/**
 * 🔴 ET LE GARDE QUI TIENT LA SÉQUENCE DE CHARGEMENT — 4/11/2026.
 *
 * Ce qui précède prouve que le cadrage SAIT se passer du graphe. Rien n'y
 * oblige l'écran. Le défaut d'origine ne venait pas d'un calcul faux : il
 * venait de l'ENDROIT où l'étendue était relevée (`graphe.n`), et il
 * reviendrait au premier « tant qu'on y est, mesurons la vraie étendue ».
 *
 * ⭐ C'est le cas où un interdit en commentaire se franchit sans le savoir :
 *    la raison du choix est longue, et on la lit APRÈS avoir écrit la ligne.
 * ⚠️ EN ÉCARTANT LES COMMENTAIRES, comme `provenance.test.ts` a dû le faire
 *    après qu'une prose fidèle ait répondu à la place du code.
 */
describe("ce que la carte attend pour s'afficher", () => {
  const sansCommentaires = readFileSync(new URL("./Territoire2030.tsx", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("⛔ le cadre se mesure sur l'emprise, pas sur les nœuds du graphe", () => {
    /* ⭐ LES DEUX SENS, ET LE POSITIF D'ABORD. Écrit en négatif seul
       (`not.toMatch(/of\s+graphe\.n/)`), ce garde a PASSÉ sa propre
       mutation : `graphe` est désormais nullable, donc quiconque remet la
       boucle écrit `graphe!.n` — et le point d'exclamation suffisait à
       passer dessous. ⛔ Un garde en négatif dit oui à tout ce qu'on n'a pas
       pensé à interdire ; celui-ci exige maintenant le bon référentiel au
       lieu de deviner les formes du mauvais. */
    expect(sansCommentaires, "le cadrage ne nomme plus `terr.emprise`")
      .toMatch(/cadrer\(\s*terr\.emprise/);
    expect(sansCommentaires, "le cadrage reparcourt les nœuds du graphe : il attend de nouveau 2,2 Mo")
      .not.toMatch(/of\s+graphe[!?]*\.n/);
  });

  it("⛔ le dessin ne renonce plus faute de graphe", () => {
    /* La ligne d'origine : `if (!c || !b || !graphe) return;` — un seul
       `!graphe` dans la garde d'entrée du dessin, et les pastilles, le fond
       satellite et le lieu visé attendent le réseau pour rien. */
    const dessin = sansCommentaires.slice(sansCommentaires.indexOf("const dessiner = ()") - 400);
    expect(dessin.slice(0, 400), "la garde d'entrée du dessin exige le graphe")
      .not.toMatch(/!graphe/);
  });

  it("l'attente qui couvre la carte porte sur l'inventaire, pas sur le réseau", () => {
    /* ⭐ Le voile plein écran doit porter sur ce qu'on NE VOIT PAS sans lui
       (les 624 pastilles), pas sur ce qui ne commande qu'UNE fonction (le
       réseau de chemins). Repéré par le libellé, qui est une chaîne — donc
       ce que la production porte vraiment, à l'abri de la minification. */
    expect(sansCommentaires).toContain("Lecture des lieux…");
    expect(sansCommentaires, "le voile est revenu sur le graphe")
      .not.toMatch(/!graphe && !erreur && \(\s*<p className="terr-attente/);
  });

  it("⛔ « j'attends » et « j'ai échoué » ne sont pas le même état", () => {
    /* 🔴 `inv` valait `null` dans les deux cas : un `lieux.json` injoignable
       affichait « Lecture des lieux… » pour toujours. Le défaut était
       inoffensif tant que ce message dépendait du graphe — rien ne lisait
       l'ambiguïté. L'afficher la réveille. */
    expect(sansCommentaires).toMatch(/inv === undefined/);
    expect(sansCommentaires).toMatch(/inv === null/);
  });

  it("⛔ une liste vide ne s'annonce pas « aucune promenade » avant d'être calculable", () => {
    /* ⚠️ Entre l'arrivée du graphe et la lecture de `fermetures.json`, les
       propositions sont vides sans que la question ait été posée. Le rendu
       doit donc attendre `pretPourPropositions`, pas `graphe` — les deux
       fichiers arrivant ensemble en local, l'écart ne se voit pas d'ici. */
    expect(sansCommentaires).toContain("pretPourPropositions");
    expect(sansCommentaires, "le rendu décide sur le graphe seul")
      .not.toMatch(/graphe && !erreur && propositions\.length === 0/);
  });
});

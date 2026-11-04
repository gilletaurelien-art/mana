import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { cadrer, R_LAT, type Emprise } from "./cadrage";
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

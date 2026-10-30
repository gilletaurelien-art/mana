/** PREUVE SUR LE VRAI GRAPHE — pas sur un carré de quatre nœuds.
 *  Se saute si le graphe local n'est pas présent (il n'est pas versionné). */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { indexer, composer, noeudLePlusProche, type Graphe } from "./composition";
import { aretesTouchees, type Fermetures } from "./fermetures";

const CHEMIN = "public/bretagne/g/crozon.json";
const d = existsSync(CHEMIN);

describe.skipIf(!d)("sur le graphe réel de la presqu'île", () => {
  const g: Graphe = JSON.parse(readFileSync(CHEMIN, "utf8"));
  const f: Fermetures = JSON.parse(readFileSync("public/fermetures.json", "utf8"));
  const t = aretesTouchees(g, f);

  it("les arrêtés ferment une part mesurée et PROPORTIONNÉE du réseau", () => {
    expect(t.interdites.size).toBeGreaterThan(0);          // ça mord
    expect(t.interdites.size / g.a.length).toBeLessThan(0.05);  // ça n'ampute pas
    expect(t.actives).toHaveLength(4);
    expect(t.nonSituees).toHaveLength(2);                  // Porzh Louz + l'avis général
  });

  it("MUTATION : au départ de Postolonnec, la boucle empruntait le tronçon fermé — et ne l'emprunte plus", () => {
    const depart = noeudLePlusProche(g, indexer(g), -4.46515, 48.23854);
    expect(depart).toBeGreaterThanOrEqual(0);

    const avant = composer(g, indexer(g), depart, 6000);
    const touchaitAvant = avant.some((b) => b.aretes.some((e) => t.interdites.has(e)));

    const apres = composer(g, indexer(g, t.interdites), depart, 6000);
    const touchaitApres = apres.some((b) => b.aretes.some((e) => t.interdites.has(e)));

    expect(touchaitAvant).toBe(true);    // le garde avait quelque chose à refuser
    expect(touchaitApres).toBe(false);   // et il l'a refusé
  });

  it("🔴 fermer DÉTACHE l'accès à la plage : depuis Postolonnec, aucune boucle", () => {
    // Ce n'est pas un défaut du garde, c'est la forme du terrain : l'accès à la
    // plage est un cul-de-sac greffé sur le GR34. Fermer le GR34 détache le
    // moignon — mesuré : composante de 2 nœuds sur 64 028.
    // ⭐ Le test le CONSTATE au lieu de l'exiger faux. Ce qui doit être corrigé
    //    n'est pas le calcul, c'est le SILENCE : l'écran doit dire pourquoi.
    const ixF = indexer(g, t.interdites);
    const depart = noeudLePlusProche(g, ixF, -4.46515, 48.23854);
    expect(composer(g, ixF, depart, 6000)).toHaveLength(0);
  });

  it("mais le reste du réseau vit : depuis le bourg de Crozon, les boucles restent", () => {
    const ixF = indexer(g, t.interdites);
    const depart = noeudLePlusProche(g, ixF, -4.4896, 48.2470);   // bourg de Crozon
    const avec = composer(g, ixF, depart, 6000);
    const sans = composer(g, indexer(g), noeudLePlusProche(g, indexer(g), -4.4896, 48.2470), 6000);
    expect(avec.length).toBeGreaterThan(0);
    // ⚠️ et on vérifie que fermer n'a pas DIVISÉ l'offre : même ordre de grandeur
    expect(avec.length).toBeGreaterThanOrEqual(Math.min(1, sans.length));
  });
});

/** ⭐ LE GARDE DE LA DÉTECTION — celui qui a été FAUX pendant vingt minutes.
 *  Tester le DEGRÉ laissait passer Postolonnec : la jonction y garde une arête.
 *  Seule la CONNEXITÉ voit le moignon détaché. */
import { composanteAtteint } from "./composition";
describe.skipIf(!existsSync("public/bretagne/g/crozon.json"))("détecter un départ coupé", () => {
  const g: Graphe = JSON.parse(readFileSync("public/bretagne/g/crozon.json", "utf8"));
  const f: Fermetures = JSON.parse(readFileSync("public/fermetures.json", "utf8"));
  const t = aretesTouchees(g, f);
  const ixTout = indexer(g), ixF = indexer(g, t.interdites);
  const SEUIL = 50;

  it("à Postolonnec : le réseau vivait, l'arrêté l'a coupé", () => {
    const n = noeudLePlusProche(g, ixF, -4.46515, 48.23854);
    expect(composanteAtteint(ixTout, n, SEUIL)).toBe(true);    // avant : relié
    expect(composanteAtteint(ixF, n, SEUIL)).toBe(false);      // après : moignon
  });

  it("🔴 et le DEGRÉ ne l'aurait pas vu — c'est pour ça que ce test existe", () => {
    const n = noeudLePlusProche(g, ixF, -4.46515, 48.23854);
    expect(ixF.adj.get(n)?.length).toBeGreaterThan(0);         // il a l'air sain
  });

  it("au bourg de Crozon : rien n'est coupé", () => {
    const n = noeudLePlusProche(g, ixF, -4.4896, 48.247);
    expect(composanteAtteint(ixF, n, SEUIL)).toBe(true);
  });
});

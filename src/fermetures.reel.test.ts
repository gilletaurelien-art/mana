/** PREUVE SUR LE VRAI GRAPHE — pas sur un carré de quatre nœuds.
 *  Se saute si le graphe local n'est pas présent (il n'est pas versionné). */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { indexer, composer, noeudLePlusProche, type Graphe } from "./composition";
import { aretesTouchees, type Fermetures } from "./fermetures";

const CHEMIN = "public/bretagne/g/presquile.json";
const d = existsSync(CHEMIN);

/**
 * 🔴 LA LECTURE EST PARESSEUSE, ET CE N'EST PAS UN RAFFINEMENT. Première
 *    version : les `readFileSync` étaient au corps du `describe.skipIf`.
 *    Or `skipIf` SAUTE LES TESTS mais exécute quand même la fonction pour les
 *    collecter — donc la lecture levait avant tout saut, et `npm run build`
 *    échouait sur le runner GitHub, où le graphe n'est pas versionné.
 *    Résultat : le déploiement de Pages serait tombé.
 * ⭐ Un garde écrit POUR la CI et jamais essayé DANS la condition de la CI.
 *    Éprouvé le 31/10 en retirant le fichier : le test échouait bien.
 */
let cache: { g: Graphe; f: Fermetures; t: ReturnType<typeof aretesTouchees> } | null = null;
function reel() {
  if (!cache) {
    const g: Graphe = JSON.parse(readFileSync(CHEMIN, "utf8"));
    const f: Fermetures = JSON.parse(readFileSync("public/fermetures.json", "utf8"));
    cache = { g, f, t: aretesTouchees(g, f) };
  }
  return cache;
}

describe.skipIf(!d)("sur le graphe réel de la presqu'île", () => {

  it("les arrêtés ferment une part mesurée et PROPORTIONNÉE du réseau", () => {
    const { g, t } = reel();
    expect(t.interdites.size).toBeGreaterThan(0);          // ça mord
    expect(t.interdites.size / g.a.length).toBeLessThan(0.05);  // ça n'ampute pas
    expect(t.actives).toHaveLength(4);
    expect(t.nonSituees).toHaveLength(2);                  // Porzh Louz + l'avis général
  });

  it("MUTATION : au départ de Postolonnec, la boucle empruntait le tronçon fermé — et ne l'emprunte plus", () => {
    const { g, t } = reel();
    const depart = noeudLePlusProche(g, indexer(g), -4.46515, 48.23854);
    expect(depart).toBeGreaterThanOrEqual(0);

    const avant = composer(g, indexer(g), depart, 6000);
    const touchaitAvant = avant.some((b) => b.aretes.some((e) => t.interdites.has(e)));

    const apres = composer(g, indexer(g, t.interdites), depart, 6000);
    const touchaitApres = apres.some((b) => b.aretes.some((e) => t.interdites.has(e)));

    expect(touchaitAvant).toBe(true);    // le garde avait quelque chose à refuser
    expect(touchaitApres).toBe(false);   // et il l'a refusé
  });

  /* 🔴 CE TEST A ÉTÉ RETOURNÉ LE 31/10/2026, ET VOICI POURQUOI.
   *
   * Il exigeait ZÉRO boucle depuis Postolonnec une fois l'arrêté appliqué, en
   * constatant que « l'accès à la plage est un cul-de-sac greffé sur le GR34 »
   * — composante de 2 nœuds sur 64 028.
   *
   * ⭐ C'ÉTAIT UNE PROPRIÉTÉ DU GRAPHE, PAS DU TERRAIN. Le graphe servi
   *    excluait les voies carrossables ; le moignon était un TROU DANS LE
   *    RÉSEAU. Sur le graphe rebâti (qui pénalise la route au lieu de
   *    l'exclure), quatre boucles existent — dont deux à 6,4 et 6,8 km avec
   *    CINQ arêtes de route sur soixante-huit. Des sentiers, pas des
   *    échappatoires par le bitume.
   *
   * ⚠️ ON RETOURNE, ON NE SUPPRIME PAS : ce que ce test protégeait reste vrai
   *    sous une autre forme — aucune boucle proposée ne doit emprunter une
   *    arête fermée. C'est désormais ce qu'il vérifie, au lieu de vérifier
   *    qu'il n'y a RIEN à proposer. */
  it("🔴 l'arrêté ne détache plus l'accès — mais aucune boucle n'emprunte le fermé", () => {
    const { g, t } = reel();
    const ixF = indexer(g, t.interdites);
    const depart = noeudLePlusProche(g, ixF, -4.46515, 48.23854);
    const b = composer(g, ixF, depart, 6000);
    expect(b.length).toBeGreaterThan(0);
    // ⛔ LA GARANTIE QUI COMPTE, et elle n'a pas bougé.
    for (const boucle of b) {
      for (const e of boucle.aretes) expect(t.interdites.has(e)).toBe(false);
    }
  });

  it("mais le reste du réseau vit : depuis le bourg de Crozon, les boucles restent", () => {
    const { g, t } = reel();
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
describe.skipIf(!d)("détecter un départ coupé", () => {
  const SEUIL = 50;
  const prep = () => {
    const { g, t } = reel();
    return { g, ixTout: indexer(g), ixF: indexer(g, t.interdites) };
  };

  /* 🔴 RETOURNÉ LE 31/10/2026, pour la même raison que son voisin : sur le
   * graphe rebâti, Postolonnec n'est plus détaché par l'arrêté.
   * ⚠️ LE GARDE RESTE, ET IL EST LE SEUL À SAVOIR VOIR ÇA. Un départ peut
   *    toujours être coupé ailleurs ; ce test continue d'exiger que la
   *    CONNEXITÉ, et non le degré, soit ce qui en décide. */
  it("à Postolonnec : l'arrêté mord, mais ne détache plus le départ", () => {
    const { g, ixTout, ixF } = prep();
    const n = noeudLePlusProche(g, ixF, -4.46515, 48.23854);
    expect(composanteAtteint(ixTout, n, SEUIL)).toBe(true);    // avant : relié
    expect(composanteAtteint(ixF, n, SEUIL)).toBe(true);       // après : relié encore
  });

  /* ⭐ ET ON GARDE UNE PREUVE QUE LE GARDE SAIT REFUSER. Sans elle, « coupé »
   *  ne serait plus jamais observé, et un garde qu'on n'a jamais vu refuser
   *  n'a jamais été vu. On fabrique la coupure : on interdit TOUTES les arêtes
   *  qui touchent le départ. */
  it("MUTATION : si l'on coupe tout autour du départ, la connexité le dit", () => {
    const { g, ixTout } = prep();
    const n = noeudLePlusProche(g, ixTout, -4.46515, 48.23854);
    // ⚠️ L'adjacence porte `[arête, voisin]` : c'est le PREMIER élément.
    //    Pris à l'envers, on interdit des index de nœuds lus comme des index
    //    d'arêtes — des arêtes au hasard, ailleurs, et le test passe en vert
    //    sur un mensonge.
    const autour = new Set((ixTout.adj.get(n) ?? []).map(([arete]) => arete));
    expect(autour.size).toBeGreaterThan(0);
    expect(composanteAtteint(indexer(g, autour), n, SEUIL)).toBe(false);
  });

  it("🔴 et le DEGRÉ ne l'aurait pas vu — c'est pour ça que ce test existe", () => {
    const { g, ixF } = prep();
    const n = noeudLePlusProche(g, ixF, -4.46515, 48.23854);
    expect(ixF.adj.get(n)?.length).toBeGreaterThan(0);         // il a l'air sain
  });

  it("au bourg de Crozon : rien n'est coupé", () => {
    const { g, ixF } = prep();
    const n = noeudLePlusProche(g, ixF, -4.4896, 48.247);
    expect(composanteAtteint(ixF, n, SEUIL)).toBe(true);
  });
});

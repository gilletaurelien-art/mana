// ⭐ CES TESTS LISENT LES VRAIS GRAPHES, pas des fixtures. Le défaut qu'ils
//    gardent — « un territoire sans spot cliquable » — n'existe que dans la
//    rencontre entre un graphe réel et un inventaire réel ; une fixture
//    fabriquée l'aurait reproduit ou pas selon ce que j'y aurais mis, et
//    aurait donc répondu à ma place.
//    ⚠️ Les graphes sont HORS GIT (docs/graphe-pipeline.md les rejoue en
//       quatre-vingts secondes). Les tests qui en dépendent se SAUTENT quand
//       ils manquent, plutôt que d'échouer : un test rouge sur une machine qui
//       n'a pas encore construit ses graphes ferait chercher au mauvais
//       endroit. Le test du haut, lui, échoue si on les a tous perdus.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Graphe } from "./composition";
import type { Inventaire } from "./lieux";
import inventaireBrut from "./lieux.json";
import { lieuxDuTerritoire, lieuxDuGraphe, choisissables, emprise } from "./lieux-du-territoire";

const INV = inventaireBrut as unknown as Inventaire;
const LIBELLE: Record<string, string> = {
  megalithe: "Mégalithe", plage: "Plage", panorama: "Point de vue",
  chateau: "Fortification", calvaire: "Calvaire", chapelle: "Chapelle",
  lieu_de_culte: "Édifice religieux", moulin: "Moulin", phare: "Phare",
  grotte: "Grotte", source: "Source", cascade: "Cascade", ruine: "Ruines",
};
const R = (p: string) => resolve(__dirname, "..", p);
const GRAPHES = {
  presquile: R("public/bretagne/g/presquile.json"),
  mullerthal: R("public/monde/g/mullerthal.json"),
};
const lire = (f: string) => JSON.parse(readFileSync(f, "utf8")) as Graphe;
const present = (f: string) => existsSync(f);

describe("la source des lieux d'un territoire", () => {
  it("au moins un graphe est construit, sinon ces tests ne gardent rien", () => {
    expect(Object.values(GRAPHES).some(present)).toBe(true);
  });

  it.skipIf(!present(GRAPHES.mullerthal))(
    "🔴 LE MULLERTHAL N'EST PLUS MUET — l'inventaire breton n'y offre rien", () => {
    const g = lire(GRAPHES.mullerthal);
    const s = lieuxDuTerritoire(INV, g, LIBELLE)!;
    // C'est LE défaut : zéro côté inventaire, et le graphe prend le relais.
    expect(s.compte.inventaire).toBe(0);
    expect(s.origine).toBe("graphe");
    expect(s.lieux.length).toBeGreaterThan(100);
    // ⛔ Et ce qu'on propose porte de VRAIS noms, pas des catégories.
    expect(s.lieux.every((l) => l.n && l.n.length > 1)).toBe(true);
  });

  it.skipIf(!present(GRAPHES.presquile))(
    "⛔ LA BRETAGNE NE RÉGRESSE PAS — l'inventaire reste la source", () => {
    const g = lire(GRAPHES.presquile);
    const s = lieuxDuTerritoire(INV, g, LIBELLE)!;
    expect(s.origine).toBe("inventaire");
    // La source rendue n'est PAS élaguée à l'emprise : l'accrochage à
    // l'exécution doit continuer de voir les lieux du territoire voisin.
    expect(s.lieux.length).toBeGreaterThan(s.compte.inventaire);
  });

  it.skipIf(!present(GRAPHES.mullerthal))(
    "⚠️ un lieu anonyme du graphe ne devient pas un toponyme", () => {
    const g = lire(GRAPHES.mullerthal);
    const anonymes = g.l.filter((l) => l.anonyme);
    expect(anonymes.length).toBeGreaterThan(0);   // sinon le test ne prouve rien
    const rendus = lieuxDuGraphe(g);
    for (const i of g.l.keys()) if (g.l[i].anonyme) expect(rendus[i].n).toBeNull();
    // et ils ne se retrouvent donc pas dans ce qu'on propose
    expect(choisissables(rendus, LIBELLE).every((l) => l.n !== null)).toBe(true);
  });

  it("un nom qui EST sa catégorie ne se choisit pas", () => {
    // Le défaut vu en production le 2/11 : « Calvaire » proposé comme nom.
    const faux = [
      { c: "calvaire", n: "Calvaire", g: [0, 0] as [number, number], osm: "x" },
      { c: "calvaire", n: "Calvaire du Gador", g: [0, 0] as [number, number], osm: "y" },
    ];
    expect(choisissables(faux, LIBELLE).map((l) => l.n)).toEqual(["Calvaire du Gador"]);
  });

  it.skipIf(!present(GRAPHES.presquile))("l'emprise encadre bien les nœuds", () => {
    const g = lire(GRAPHES.presquile);
    const [x0, y0, x1, y1] = emprise(g);
    expect(g.n.every(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)).toBe(true);
    expect(x1).toBeGreaterThan(x0);
  });

  it.skipIf(!present(GRAPHES.presquile))(
    "🔴 `tous` N'EST PAS `lieux` — et c'est le compte breton qui en dépend", () => {
    // ⛔ LE DÉFAUT QU'IL GARDE : compter « ce qu'on croise » sur la liste
    //    FILTRÉE sous-compte de deux tiers. Mesuré le 2/11 — 1,47 lieu
    //    annoncé contre 4,20 réels, et 27 % de « 0 lieu » tous faux.
    //    ⭐ `lieux` est ce qu'on PROPOSE (nommé, dédoublonné) ; `tous` est ce
    //       qu'on CROISE (un lavoir sans nom reste un lavoir).
    const g = lire(GRAPHES.presquile);
    const s = lieuxDuTerritoire(INV, g, LIBELLE)!;
    expect(s.tous.length).toBeGreaterThan(s.lieux.length);
    expect(s.tous.some((l) => !l.n)).toBe(true);   // des anonymes y sont
    expect(s.lieux.some((l) => !l.n)).toBe(false); // et jamais dans l'offre
  });

  it.skipIf(!present(GRAPHES.mullerthal))(
    "⛔ et hors de Bretagne AUSSI — sinon « 0 lieu » reviendrait", () => {
    const g = lire(GRAPHES.mullerthal);
    const s = lieuxDuTerritoire(INV, g, LIBELLE)!;
    expect(s.origine).toBe("graphe");
    // ⚠️ C'est exactement ce qui s'affichait avant : « 3,1 km · 0 lieu ».
    //    La source du compte lisait l'inventaire BRETON, donc zéro partout.
    expect(s.tous.length).toBe(g.l.length);
    expect(s.tous.length).toBeGreaterThan(s.lieux.length);
  });

  it("sans graphe, l'inventaire sert quand même", () => {
    const s = lieuxDuTerritoire(INV, null, LIBELLE)!;
    expect(s.origine).toBe("inventaire");
    expect(s.lieux.length).toBeGreaterThan(1000);
  });

  it("sans rien, on ne rend rien — et on ne devine pas", () => {
    expect(lieuxDuTerritoire(null, null, LIBELLE)).toBeNull();
  });
});

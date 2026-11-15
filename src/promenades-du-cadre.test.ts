import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { promenadesDuCadre, direLaListe } from "./promenades-du-cadre";
import { ETENDUES } from "./etendue";
import type { Fiche } from "./catalogue";

const lire = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

const fiche = (s: string, x: number, y: number): Fiche =>
  ({ s, n: s, k: 10, d: null, a: null, c: 1, p: 1, x, y, o: false, j: 0 });

/**
 * 🔴 CE QUE CE FICHIER PROTÈGE : « remets-la, filtrée par l'hôte » (Aurélien,
 *    15/11/2026), et la raison commerciale derrière — mana.bzh est présenté à
 *    Brest terres océanes le 23/11, et ne doit montrer que leur territoire.
 */
describe("la liste des promenades suit le cadre de l'hôte", () => {
  const brest = fiche("brest", -4.49, 48.39);        // Brest Métropole
  const crozon = fiche("crozon", -4.49, 48.24);      // presqu'île
  const quimper = fiche("quimper", -4.11, 47.99);    // Finistère, HORS BTO
  const vannes = fiche("vannes", -2.74, 47.66);      // Morbihan
  const rome = fiche("rome", 12.49, 41.89);
  const tout = [brest, crozon, quimper, vannes, rome];

  it("mana.bzh ne montre que Brest terres océanes", () => {
    const vus = promenadesDuCadre(tout, ETENDUES.bto).map((f) => f.s);
    expect(vus).toEqual(["brest", "crozon"]);
    /* ⛔ Quimper est en Finistère et n'est PAS dans BTO : un élu de la Côte
       des Légendes qui voit Concarneau se demande ce qu'il finance. */
    expect(vus).not.toContain("quimper");
  });

  it("manafrance montre la France, pas Rome", () => {
    const vus = promenadesDuCadre(tout, ETENDUES.france).map((f) => f.s);
    expect(vus).toContain("quimper");
    expect(vus).toContain("vannes");
    expect(vus).not.toContain("rome");
  });

  /* ⛔ ET LE MONDE NE FILTRE RIEN — ce qui n'est PAS la même chose que
     filtrer sur la boîte terrestre : une promenade sans coordonnées ne doit
     pas disparaître de manahome pour autant. */
  it("manahome ne filtre rien, pas même par la boîte du monde", () => {
    const sansPosition = { ...fiche("perdue", NaN, NaN) };
    const avec = [...tout, sansPosition];
    expect(promenadesDuCadre(avec, ETENDUES.monde)).toHaveLength(avec.length);
    /* alors qu'un cadre, lui, l'écarte : on ne prétend pas la situer */
    expect(promenadesDuCadre(avec, ETENDUES.bto).map((f) => f.s))
      .not.toContain("perdue");
  });

  /**
   * ⭐ LE TITRE DIT CE QUE LE FILTRE FAIT. Une session a payé le 31/10 un
   *    titre « Presqu'île de Crozon » posé sur une bbox qui rendait Daoulas
   *    et le Menez-Hom. L'index ne porte que le DÉPART : la phrase dit
   *    « au départ de », jamais « dans ».
   */
  it("la phrase annonce le critère, pas une exhaustivité", () => {
    expect(direLaListe(69, ETENDUES.bto)).toBe("69 promenades au départ de Brest terres océanes");
    expect(direLaListe(1, ETENDUES.bto)).toBe("1 promenade au départ de Brest terres océanes");
    /* ⚠️ L'ESPACE DES MILLIERS EST UNE FINE INSÉCABLE (U+202F), pas une
       espace ordinaire : `toLocaleString("fr-FR")` la pose, et un littéral
       écrit à la main ne lui ressemble qu'à l'œil. Mon premier jet a échoué
       sur deux chaînes identiques à l'affichage. On la DÉRIVE donc du même
       formateur, plutôt que de la recopier. */
    expect(direLaListe(1032, ETENDUES.monde))
      .toBe(`${(1032).toLocaleString("fr-FR")} promenades à parcourir`);
    /* ⛔ « dans » promettrait ce que le point de départ ne donne pas. */
    expect(direLaListe(69, ETENDUES.bto)).not.toContain(" dans ");
  });

  /* ⛔ ET LES CLASSES DU COMPOSANT EXISTENT DANS LA FEUILLE. Inventer une
     classe est plus silencieux qu'inventer une balise : rien ne lève, le nom
     a l'air juste, et l'élément est simplement invisible. Vécu le 15/11 au
     matin avec `ot-pastille`. */
  it("les classes du composant existent vraiment", () => {
    const tsx = lire("./PromenadesDuCadre.tsx");
    const css = lire("./styles.css");
    const classes = [...tsx.matchAll(/className="([a-z0-9 -]+)"/g)]
      .flatMap((m) => m[1].split(/\s+/)).filter(Boolean);
    expect(classes.length, "aucune classe lue : le motif a raté sa cible")
      .toBeGreaterThan(3);
    for (const c of new Set(classes)) {
      expect(css.includes(`.${c}`), `la classe « ${c} » n'existe dans aucune feuille`)
        .toBe(true);
    }
  });

  /* ⚠️ Et la liste est RENDUE — un composant qu'aucun écran n'appelle est le
     fantôme qu'on vient de ressusciter. */
  it("la liste est rendue sur les deux adresses du compositeur", () => {
    const app = lire("./App.tsx");
    expect((app.match(/<PromenadesDuCadre \/>/g) ?? []).length,
      "la liste n'est pas rendue sur les DEUX adresses (/composer et /promenades)")
      .toBe(2);
  });
});

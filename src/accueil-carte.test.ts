import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { carteEnFond } from "./fond-du-monde";
import { entreesBarre } from "./barre";

const lire = (f: string) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
const css = lire("styles.css");
const app = lire("App.tsx");

/**
 * 🔴 L'ACCUEIL DE MANAHOME EST LA CARTE — Aurélien, 15/11/2026 : « j'ai
 *    demandé la carte en plein écran ». Le renversement tient à une seule
 *    propriété CSS : la colonne de l'application cesse d'attraper les gestes,
 *    et ses commandes les reprennent une par une.
 *
 * ⛔ C'EST PRÉCISÉMENT CE GENRE DE LISTE QUI VIEILLIT EN SILENCE. Un bouton
 *    ajouté demain à l'accueil tomberait hors de la liste d'exceptions : il
 *    s'afficherait normalement, se lirait comme un bouton, et ne répondrait
 *    à rien. Aucune erreur, aucune trace — une zone morte qui a l'air vivante.
 */

/** Le corps de la règle qui rend les gestes aux commandes. */
function selecteursQuiReprennent(): string[] {
  const i = css.indexOf('.monde-fond[data-vivante] ~ .app-colonne { pointer-events: none; }');
  expect(i, "la règle qui coupe les gestes a disparu").toBeGreaterThan(0);
  const apres = css.slice(i);
  const j = apres.indexOf("pointer-events: auto;");
  expect(j, "plus rien ne reprend les gestes").toBeGreaterThan(0);
  /* ⚠️ LE DERNIER `{`, PAS LE PREMIER — mesuré à la première exécution : la
     liste d'exceptions tient sur plusieurs lignes séparées par des virgules,
     et couper au premier `{` ne rendait QUE la première. Le garde refusait
     alors six sélecteurs sur sept, tous présents. Un garde qui lit mal la
     règle accuse le code d'une faute qui est la sienne. */
  const bloc = apres.slice(0, j);
  return bloc.slice(0, bloc.lastIndexOf("{"))
    .split(",").map((x) => x.trim()).filter(Boolean);
}

describe("la carte d'accueil prend les gestes, les commandes les reprennent", () => {
  it("la carte de fond est vivante sur l'accueil, et figée ailleurs", () => {
    /* ⚠️ Le fond reste posé sur tous les écrans de contenu (c'est la
       politique de fond d'écran du 14/11) — c'est sa VIVACITÉ qui est
       réservée à l'accueil. */
    expect(carteEnFond("home", "/")).toBe(true);
    expect(carteEnFond("home", "/reglages")).toBe(true);
    expect(app).toMatch(/vivante=\{path === "\/"\}/);
  });

  it("chaque sorte de commande de l'accueil reprend les gestes", () => {
    const repris = selecteursQuiReprennent().join(" ");
    /* La barre du bas vit DANS la colonne : sans elle, les cinq onglets de
       MANAhome seraient morts — c'est le pire cas, et le plus silencieux. */
    for (const quoi of [".site-header", ".rech", " a", " button", " input", " label"]) {
      expect(repris, `${quoi} ne reprend pas les gestes`).toContain(quoi);
    }
  });

  /**
   * ⭐ ET ON COMPTE LES COMMANDES RÉELLES, pas les sortes. L'accueil de
   *    manahome rend la barre (cinq entrées) et le champ de recherche. Si
   *    l'une de ces familles disparaissait du CSS, le test ci-dessus le
   *    dirait ; celui-ci dit si l'ACCUEIL, lui, a gagné une commande d'un
   *    genre que la liste ne couvre pas.
   */
  it("l'accueil n'emploie aucune commande d'un genre non prévu", () => {
    const inv = lire("Invitation.tsx") + lire("RechercheAccueil.tsx");
    const balises = new Set(
      [...inv.matchAll(/<([a-z]+)[\s>]/g)].map((m) => m[1]),
    );
    const cliquables = [...balises].filter((b) =>
      ["a", "button", "input", "select", "textarea", "summary"].includes(b));
    expect(cliquables.length, "aucune commande trouvée — le garde ne garde rien")
      .toBeGreaterThan(0);
    const repris = selecteursQuiReprennent().join(" ");
    for (const b of cliquables) {
      expect(repris, `<${b}> est employé par l'accueil et ne reprend pas les gestes`)
        .toContain(` ${b}`);
    }
  });

  /* 🔴 LA COLONNE « CARTE » DE MANAHOME RAMÈNE À L'ACCUEIL, qui EST la carte.
     Avant le 15/11 elle ouvrait `/carte` — la carte du TERRITOIRE BRETON — sur
     un site qui revendique le monde. */
  it("la barre de manahome mène à la carte, pas à la Bretagne", () => {
    const carte = entreesBarre("home").find((e) => e.clef === "carte");
    expect(carte?.chemin, "manahome n'a pas d'autre chemin de retour").toBe("/");
    /* ⛔ Et mana.bzh garde le sien : son territoire EST son produit. */
    expect(entreesBarre("bzh").find((e) => e.clef === "carte")?.chemin)
      .toBe("/carte?vue=carte");
  });
});

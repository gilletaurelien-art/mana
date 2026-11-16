import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

/**
 * 🔴 CE QUE CE FICHIER PROTÈGE — reproduit le 16/11/2026 contre le bundle de
 *    PRODUCTION, en sabotant un seul morceau différé de 8 Ko derrière un
 *    passe-plat :
 *
 *        témoin .................. #root = 89 nœuds, l'application marche
 *        morceau remplacé ........ #root = 0 nœud, page BLANCHE
 *        socket coupée ........... #root = 0 nœud, page BLANCHE
 *
 *    `Suspense` a un repli de CHARGEMENT, pas un repli d'ÉCHEC. Sans frontière
 *    au-dessus, l'erreur d'un import différé remonte et React démonte TOUT
 *    l'arbre : ni devise, ni recherche, ni barre du bas, et rien qui dise
 *    pourquoi.
 *
 * ⭐ POURQUOI PAR RECETTE, ENCORE. La frontière existait depuis le 30/10 dans
 *    `CarteOuSchema`, excellente, documentée — et posée sur TROIS sites. Six
 *    autres `Suspense` sont restés nus dix-sept jours, dont l'accueil de
 *    mana.bzh. Une liste écrite à la main aurait nommé les trois connus.
 *    Même leçon que `rendez-vous-load.test.ts`, apprise le même jour :
 *    **une leçon rangée dans un composant ne se propage pas à ses voisins.**
 *
 * ⚠️ CE QU'IL NE PROUVE PAS. Il lit du TEXTE. Ce dépôt n'a aucun outillage de
 *    rendu (ni jsdom, ni testing-library), donc aucun test ne peut voir ce
 *    qu'un écran affiche — c'est d'ailleurs pourquoi `CarteOuSchema` a pu
 *    annoncer pendant dix-sept jours un test qui n'existait pas. Ce garde dit
 *    que la frontière est POSÉE, pas qu'elle rattrape.
 */

const ICI = new URL(".", import.meta.url);

const nu = (f: string) =>
  readFileSync(new URL(f, ICI), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");

/** Les écrans qui diffèrent un composant — trouvés, jamais recopiés. */
const ecransDiffores = () =>
  readdirSync(ICI)
    .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
    .filter((f) => /<Suspense\b/.test(nu(f)));

describe("aucun Suspense ne reste sans filet d'échec", () => {
  it("il y a bien des écrans à garder — sinon la recette ne garde rien", () => {
    /* ⛔ Une recette qui ne trouve plus personne PASSE en silence : c'est la
       forme la plus discrète du vert qui ne dit rien. */
    expect(ecransDiffores().length).toBeGreaterThanOrEqual(5);
  });

  for (const f of ecransDiffores()) {
    it(`${f} place une frontière d'erreur au-dessus de chaque Suspense`, () => {
      const code = nu(f);
      const suspense = (code.match(/<Suspense\b/g) ?? []).length;
      const frontieres = (code.match(/<GardeDEcran\b|<CarteOuSchema\b/g) ?? []).length;
      expect(frontieres,
        `${f} porte ${suspense} <Suspense> et ${frontieres} frontière(s) : `
        + `un import différé qui rejette y démonterait l'application entière, `
        + `page blanche, sans un mot`)
        .toBeGreaterThanOrEqual(suspense);
    });
  }

  it("la frontière vit à UN seul endroit", () => {
    /* ⚠️ Deux classes `getDerivedStateFromError` divergeraient, et la seconde
       serait la mauvaise. `CarteOuSchema` portait la sienne ; elle est passée
       dans `garde-ecran.tsx`, que tout le monde importe. */
    const porteurs = readdirSync(ICI)
      .filter((f) => (f.endsWith(".tsx") || f.endsWith(".ts")) && !f.includes(".test."))
      .filter((f) => /getDerivedStateFromError/.test(nu(f)));
    expect(porteurs).toEqual(["garde-ecran.tsx"]);
  });
});

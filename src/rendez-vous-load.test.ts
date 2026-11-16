import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

/**
 * 🔴 CE QUE CE FICHIER PROTÈGE — « les balades des Offices ne sont plus
 *    cliquables », Aurélien, 16/11/2026.
 *
 *    `CarteBalades` posait sa source et ses quatre couches dans
 *    `m.on("load", …)`. Or maplibre n'émet `load` qu'une fois le style
 *    analysé ET le premier rendu fait. Onglet d'arrière-plan, conteneur
 *    encore masqué, tuile ortho qui tarde — pas de premier rendu, pas de
 *    `load`, et le gestionnaire ne tourne JAMAIS. Mesuré dans la page en
 *    production : sources `ne2_shaded` et `openmaptiles` seules, aucun calque
 *    `balades-*`, `isStyleLoaded()` faux.
 *
 * ⛔ ET LA PANNE EST MUETTE DANS LES DEUX SENS. Rien n'échoue : la carte
 *    s'affiche, le fond se peint, la liste des 116 circuits en dessous reste
 *    parfaitement cliquable. Seuls les tracés manquent — ce qui se dit « ce
 *    n'est plus cliquable » et jamais « la carte n'a pas fini de charger ».
 *
 * ⭐ POURQUOI PAR RECETTE ET NON PAR LISTE. `CarteMonde` avait payé ce défaut
 *    DEUX JOURS les 14-15/11, et la leçon était écrite dans `style-pret.ts`.
 *    Elle n'avait pas voyagé : `CarteBalades` gardait l'ancien câblage, et
 *    `Territoire2030` aussi — découvert par cette recette, pas par l'enquête.
 *    **Une leçon apprise dans un composant ne se propage pas toute seule aux
 *    composants jumeaux.** Une liste écrite à la main aurait nommé les deux
 *    qu'on connaissait et manqué le troisième ; celle-ci balaie `src/`.
 *
 * ⚠️ CE QU'IL NE PROUVE PAS. Il lit du TEXTE : il atteste que les trois
 *    chemins sont câblés, pas qu'ils fonctionnent. Ce qui tient le
 *    fonctionnement est `style-pret.test.ts`, qui éprouve `poserLaSource`
 *    contre une carte qui se comporte comme maplibre. Les deux ensemble,
 *    jamais l'un seul.
 */

const ICI = new URL(".", import.meta.url);

/** Le code seul — la leçon s'écrit en commentaire et doit pouvoir le rester.
 *  ⚠️ Deux gardes de ce dépôt se sont déjà déclenchés sur leur PROPRE
 *     documentation : un commentaire qui cite le défaut n'est pas le défaut. */
const nu = (f: string) =>
  readFileSync(new URL(f, ICI), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");

/** Les écrans qui posent une source maplibre — trouvés, jamais recopiés. */
function poseursDeSource(): string[] {
  return readdirSync(ICI)
    .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
    .filter((f) => /\b(addSource|poserLaSource)\s*\(/.test(nu(f)));
}

describe("une carte ne confie pas son installation au seul « load »", () => {
  it("il y a bien des écrans à garder — sinon la recette ne garde rien", () => {
    /* ⛔ Une recette qui ne trouve plus personne PASSE, en silence : c'est la
       forme la plus discrète du vert qui ne dit rien. */
    expect(poseursDeSource().length).toBeGreaterThanOrEqual(3);
  });

  for (const f of poseursDeSource()) {
    it(`${f} s'arme aussi sur « styledata »`, () => {
      const code = nu(f);
      expect(code, `${f} pose une source sans jamais écouter styledata : `
        + `si « load » n'arrive pas, la carte reste nue pour toujours`)
        .toMatch(/on\(\s*["']styledata["']/);
    });

    it(`${f} ne pose AUCUNE source à nu`, () => {
      const code = nu(f);
      /* ⚠️ S'armer plus tôt que `load` SANS le poseur échangerait une carte
         vide contre un écran en erreur : `addSource` lève « Style is not
         done loading » tant que le style n'est pas analysé.
         🔴 ET LA PREMIÈRE RÉDACTION DE CE GARDE SE CONTENTAIT DE VOIR
            `poserLaSource` QUELQUE PART DANS LE FICHIER. La mutation l'a dit :
            rendre UNE pose à nu dans un fichier qui en portait deux autres
            par le poseur passait au vert. Un fichier qui pose trois sources a
            trois occasions de se tromper, pas une. */
      expect(code.match(/\.addSource\s*\(/g) ?? [],
        `${f} appelle addSource à nu : passer par poserLaSource, qui rend `
        + `false au lieu de lever quand le style n'est pas encore analysé`)
        .toHaveLength(0);
      expect(code, `${f} ne pose plus rien du tout — la recette garde un fantôme`)
        .toMatch(/poserLaSource\s*\(/);
    });
  }
});

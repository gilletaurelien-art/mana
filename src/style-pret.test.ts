import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { poserLaSource, type CarteQuiPose } from "./style-pret";

/**
 * 🔴 CE QUE CE FICHIER PROTÈGE : la carte de fond de MANAhome restait nue
 *    « une fois sur deux », et la cause n'était pas le hasard — c'était un
 *    garde qui posait la mauvaise question (voir `style-pret.ts`).
 */

/** Une carte qui se comporte comme maplibre : elle lève avant l'analyse du
 *  style, et elle refuse les doublons APRÈS. ⭐ Les deux messages comptent :
 *  les confondre est exactement le défaut qu'on garde. */
function carteDeMaplibre(refusAvantPose: number): CarteQuiPose & { posees: string[] } {
  let restants = refusAvantPose;
  const posees: string[] = [];
  return {
    posees,
    addSource(id: string) {
      if (restants-- > 0) throw new Error("Style is not done loading.");
      if (posees.includes(id)) throw new Error(`There is already a source with ID "${id}".`);
      posees.push(id);
    },
  };
}

describe("poser une source quand le style l'accepte", () => {
  it("rend false tant que le style n'est pas analysé", () => {
    const c = carteDeMaplibre(3);
    expect(poserLaSource(c, "sites", {})).toBe(false);
    expect(poserLaSource(c, "sites", {})).toBe(false);
    expect(poserLaSource(c, "sites", {})).toBe(false);
    expect(c.posees).toEqual([]);
    expect(poserLaSource(c, "sites", {})).toBe(true);
    expect(c.posees).toEqual(["sites"]);
  });

  it("passe du premier coup quand le style est déjà prêt", () => {
    const c = carteDeMaplibre(0);
    expect(poserLaSource(c, "sites", {})).toBe(true);
  });

  /**
   * ⛔ LE PIÈGE QUI SE REFERME SUR LE CORRECTIF LUI-MÊME. Rappelé une fois de
   *    plus posée, la fonction rend `false` — parce que maplibre lève pour le
   *    DOUBLON. Un appelant qui lirait ce `false` comme « pas encore prêt »
   *    rappellerait indéfiniment et croirait sa carte en panne, alors qu'elle
   *    est installée. C'est pourquoi `CarteMonde` lève son drapeau APRÈS la
   *    pose réussie, et n'appelle plus jamais ensuite.
   */
  it("un second appel après la pose rend false — d'où le drapeau chez l'appelant", () => {
    const c = carteDeMaplibre(0);
    expect(poserLaSource(c, "sites", {})).toBe(true);
    expect(poserLaSource(c, "sites", {})).toBe(false);
    expect(c.posees).toEqual(["sites"]);
  });
});

describe("la carte du monde ne retombe pas dans isStyleLoaded()", () => {
  const ecran = readFileSync(new URL("./CarteMonde.tsx", import.meta.url), "utf8");
  /** Le code seul : la leçon s'écrit en commentaire, et doit pouvoir le rester. */
  const code = ecran.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

  it("l'installation ne se garde plus sur isStyleLoaded()", () => {
    /* 🔴 C'était `if (installe || !m.isStyleLoaded()) return;`. La fonction
       reste employable ailleurs — pour une mesure, un affichage — mais plus
       comme PORTE d'installation. */
    expect(code).not.toMatch(/isStyleLoaded\(\)/);
  });

  it("elle pose la source par le poseur, et lève son drapeau après", () => {
    const i = code.indexOf("poserLaSource");
    const j = code.indexOf("installe = true");
    expect(i, "le poseur n'est plus appelé").toBeGreaterThan(0);
    expect(i, "le drapeau doit se lever APRÈS la pose").toBeLessThan(j);
    /* ⚠️ Et il y a bien un refus entre les deux : sans lui, le drapeau se
       lèverait même quand la pose a échoué. */
    expect(code.slice(i, j)).toMatch(/if \(!pose\) return;/);
  });
});

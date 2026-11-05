import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PROPOSITIONS_ECART_MIN_M } from "./composition";

/**
 * 🔴 LE CONTRAT ENTRE LES DEUX ÉCRANS — 5/11/2026.
 *
 * `/carte` propose trois promenades depuis un lieu et laisse en toucher une.
 * `/promenades` recalcule sa propre liste, sur un autre réseau. Entre les
 * deux, un seul fil : le paramètre `dest` de l'URL. Il n'est tenu par aucun
 * type — c'est une chaîne qui traverse une barre d'adresse — donc par rien,
 * sauf ce fichier.
 *
 * ⛔ CE QUI M'AVAIT RETENU DE L'ÉCRIRE ÉTAIT UNE PEUR NON MESURÉE : « les
 *    deux écrans peuvent proposer des listes différentes ». Vrai, et mesuré
 *    enfin sur TOUS les lieux de la bande de couture — 141 listes identiques
 *    sur 143, les deux divergentes partageant déjà deux destinations sur
 *    trois ; zéro divergence sur 51 lieux ailleurs. ⭐ Un risque nommé et
 *    non mesuré est cru traité : celui-ci a servi à retirer une fonction
 *    pour 1,4 % des cas, et il tenait d'autant mieux qu'il était vrai.
 */
const sansCommentaires = (f: string) =>
  readFileSync(new URL(f, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

describe("la destination choisie voyage d'un écran à l'autre", () => {
  const carte = sansCommentaires("./Territoire2030.tsx");
  const composer = sansCommentaires("./Composer.tsx");

  it("🔴 /carte met la destination retenue dans le lien", () => {
    expect(carte, "le lien vers /promenades n'emporte plus `dest`")
      .toMatch(/&dest=\$\{/);
    /* ⚠️ Et il ne l'emporte QUE si une proposition est retenue : sans ce
       ternaire, un `dest=undefined,undefined` partirait dans l'URL. */
    expect(carte).toMatch(/retenuPourLien\s*\?/);
  });

  it("🔴 /promenades lit `dest` et s'en sert pour choisir", () => {
    expect(composer, "`dest` n'est plus lu").toMatch(/get\("dest"\)/);
    expect(composer, "`dest` est lu mais ne choisit rien").toMatch(/setChoisie\(proche\)/);
  });

  it("⛔ c'est une SUGGESTION : une destination inconnue ne casse rien", () => {
    /* Le repli est la condition de sûreté du paramètre. Sans le seuil, une
       destination hors liste choisirait quand même la « moins loin » —
       c'est-à-dire n'importe laquelle. */
    expect(composer, "le choix n'est plus conditionné à une distance")
      .toMatch(/if \(proche >= 0 && dp < 60\) setChoisie/);
  });

  it("⚠️ la tolérance reste bien SOUS l'écart minimal entre propositions", () => {
    /* 🔴 L'INVARIANT QUI LIE LES DEUX NOMBRES. On retrouve la destination par
       sa POSITION, à 60 m près. Deux propositions sont séparées d'au moins
       `PROPOSITIONS_ECART_MIN_M` par construction : tant que la tolérance
       reste dessous, aucune confusion n'est possible. Si quelqu'un abaissait
       l'écart minimal à 50 m, le lien désignerait parfois la voisine — et ça
       ne se verrait que sur deux lieux voisins, c'est-à-dire presque jamais,
       c'est-à-dire trop tard. */
    expect(60).toBeLessThan(PROPOSITIONS_ECART_MIN_M);
  });
});

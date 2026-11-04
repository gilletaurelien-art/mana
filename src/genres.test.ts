import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { COULEUR_CATEGORIE } from "./categories";
import type { Inventaire } from "./lieux";

/**
 * LES GENRES PRODUITS ONT TOUS UNE COULEUR ET UN LIBELLÉ.
 *
 * 🔴 CE FICHIER EXISTE PARCE QUE `categories.ts` DÉCRIVAIT UN VOCABULAIRE
 *    QUE PLUS PERSONNE NE PRODUISAIT. Le 4/11/2026, la couleur par genre a
 *    été posée sur la carte depuis `COULEUR_CATEGORIE` — treize entrées,
 *    écrites pour les étapes de `walks.ts`. Ce qu'elle colorie, ce sont les
 *    sites de `lieux.json`, dont les genres viennent de `scripts/lieux.py`
 *    et sont vingt-trois. Mesuré le lendemain : **445 pastilles sur 624**
 *    tombaient dans le repli, dont les deux genres les plus nombreux
 *    (`fortification` 196, `fontaine` 183), que la table nommait encore
 *    `chateau` et `source`.
 *
 * ⭐ ET ÇA N'A PAS SAUTÉ AUX YEUX PARCE QUE LE REPLI RESSEMBLE À UNE VRAIE
 *    COULEUR — choisi exprès ainsi, pour qu'un genre inconnu garde l'allure
 *    d'un genre connu. Le choix se défend ; il coûte juste qu'on ne puisse
 *    pas le vérifier à l'œil. C'est exactement le cas où la règle doit
 *    vivre en TEST et pas en commentaire : un interdit en docstring se
 *    franchit sans le savoir.
 *
 * ⛔ CE TEST LIT LA DONNÉE, IL NE RECOPIE PAS SA LISTE. Écrire ici les
 *    vingt-trois genres attendus en ferait une troisième copie à vieillir —
 *    la faute même qu'il surveille. La source est `lieux.json`, qui emporte
 *    ses genres ET ses libellés, tous deux écrits par le producteur.
 */
const inv = JSON.parse(
  readFileSync(new URL("./lieux.json", import.meta.url), "utf8"),
) as Inventaire;

const genresProduits = [...new Set(inv.lieux.map((l) => l.c))].sort();

describe("les genres de l'inventaire", () => {
  it("il y en a bien plusieurs — sinon ce fichier ne garde rien", () => {
    // ⛔ Sans cette ligne, un `lieux.json` vide ferait PASSER les deux tests
    //    suivants (aucun genre à vérifier) : un garde en négatif dit oui
    //    quand il ne lit rien.
    expect(genresProduits.length).toBeGreaterThan(10);
  });

  it("🔴 chaque genre produit a SA couleur, aucun ne tombe dans le repli", () => {
    const orphelins = genresProduits.filter((g) => !(g in COULEUR_CATEGORIE));
    expect(
      orphelins,
      `genres sans couleur propre dans COULEUR_CATEGORIE (categories.ts) : ${orphelins.join(", ")}`,
    ).toEqual([]);
  });

  it("🔴 chaque genre produit a SON libellé dans l'inventaire", () => {
    const muets = genresProduits.filter((g) => !inv.libelles[g]);
    expect(
      muets,
      `genres sans libellé dans lieux.json — la clé technique s'afficherait : ${muets.join(", ")}`,
    ).toEqual([]);
  });

  /**
   * ⚠️ CELUI-CI GARDE LA COHABITATION, PAS LA COUVERTURE. `chateau`,
   *    `source` et `memorial` ne sont plus produits par `lieux.py` mais
   *    restent portés par les étapes de `walks.ts` : les retirer donnerait
   *    des pastilles grises le jour où `VITRINE` se remplit. Ils sont donc
   *    attendus EN PLUS des genres produits — et ce test dit pourquoi, pour
   *    que personne ne « nettoie » la table en croyant la ranger.
   * ⭐ Il dit aussi l'inverse : si l'un d'eux disparaît de `walks.ts`, il
   *    n'a plus de raison d'être ici non plus.
   */
  it("les trois clés de l'ancien vocabulaire survivent tant que walks.ts les porte", () => {
    const walks = readFileSync(new URL("./walks.ts", import.meta.url), "utf8");
    for (const [ancien, moderne] of [
      ["chateau", "fortification"],
      ["source", "fontaine"],
      ["memorial", "memoire"],
      // 🔴 Fusionné le 4/11 : `lieux.py` ne produit plus `chapelle` ni
      //    `eglise`, les deux tombent dans `lieu_de_culte`. `walks.ts` porte
      //    encore `chapelle` sur ses étapes — même chose, même teinte.
      ["chapelle", "lieu_de_culte"],
    ]) {
      if (!walks.includes(`categorie: "${ancien}"`)) continue;
      expect(COULEUR_CATEGORIE[ancien], `${ancien} est encore dans walks.ts`).toBeTruthy();
      // la même chose sous l'ancien nom, donc la même teinte : deux couleurs
      // diraient deux genres là où il n'y en a qu'un
      expect(COULEUR_CATEGORIE[ancien]).toBe(COULEUR_CATEGORIE[moderne]);
    }
  });
});

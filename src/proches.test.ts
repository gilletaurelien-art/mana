import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { lieuxProches, SEUIL_PROCHES } from "./proches";
import type { Inventaire, Lieu } from "./lieux";
import type { Recueil } from "./ot";

const inv = JSON.parse(readFileSync(new URL("./lieux.json", import.meta.url), "utf8")) as Inventaire;
const ot = JSON.parse(readFileSync(new URL("./ot.json", import.meta.url), "utf8")) as Recueil;

const lieu = (n: string | null, g: [number, number]): Lieu =>
  ({ c: "plage", n, g, osm: `n${n ?? "x"}${g[0]}` });

describe("les sites que le chemin longe", () => {
  /**
   * ⛔ « À PROXIMITÉ » N'EST PAS « SUR LE CHEMIN ». Un lieu qui demande un
   *    détour, annoncé comme étant sur le parcours, envoie quelqu'un le
   *    chercher là où il n'est pas — et c'est le genre de faute qu'on ne
   *    découvre qu'à pied, sous la pluie.
   */
  it("refuse au-delà du seuil, accepte en deçà", () => {
    // 0,0015° de latitude ≈ 167 m ; 0,001° ≈ 111 m.
    const trace: [number, number][] = [[-4.5, 48.2], [-4.49, 48.2]];
    const pres = lieuxProches(trace, [lieu("Près", [-4.495, 48.201])]);
    const loin = lieuxProches(trace, [lieu("Loin", [-4.495, 48.2015])]);
    expect(pres.map((x) => x.l.n)).toEqual(["Près"]);
    expect(loin).toEqual([]);
    expect(SEUIL_PROCHES).toBe(150);
  });

  /** ⛔ 734 lieux de l'inventaire n'ont pas de nom. « Fortification » sous un
   *  circuit n'apprend rien à personne. */
  it("ne cite que les lieux nommés", () => {
    const trace: [number, number][] = [[-4.5, 48.2], [-4.49, 48.2]];
    expect(lieuxProches(trace, [lieu(null, [-4.495, 48.2001])])).toEqual([]);
  });

  /** ⚠️ « Chemins de l'écrivain » est relevé en plusieurs objets OSM : la
   *  ligne annonçait deux fois la même chose. ⭐ Ici on compte des SUJETS. */
  it("ne cite pas deux fois le même nom", () => {
    const trace: [number, number][] = [[-4.5, 48.2], [-4.49, 48.2]];
    const r = lieuxProches(trace, [
      lieu("Même", [-4.496, 48.2002]),
      lieu("Même", [-4.494, 48.2003]),
      lieu("Autre", [-4.492, 48.2004]),
    ]);
    expect(r.map((x) => x.l.n)).toEqual(["Même", "Autre"]);
  });

  it("rend les plus proches d'abord, et pas plus que demandé", () => {
    const trace: [number, number][] = [[-4.5, 48.2], [-4.49, 48.2]];
    const r = lieuxProches(trace, [
      lieu("Loin", [-4.495, 48.2009]),
      lieu("Près", [-4.495, 48.2001]),
      lieu("Moyen", [-4.495, 48.2005]),
    ], 2);
    expect(r.map((x) => x.l.n)).toEqual(["Près", "Moyen"]);
  });

  /**
   * 🔴 LE TEST QUI TIENT LA RAISON D'ÊTRE DE CETTE LIGNE. Si le pré-filtre
   *    par boîte se rognait au tracé au lieu d'être élargi du seuil, ou si
   *    la projection perdait son cosinus, le compte s'effondrerait sans que
   *    rien d'autre ne change à l'écran : les cartes afficheraient simplement
   *    une ligne de moins.
   *    Mesuré le 31/10 sur les données réelles : 493 rapprochements, et AUCUN
   *    des 46 circuits sans un seul site nommé à 150 m.
   *
   * 🔄 RETOURNÉ LE 11/11/2026 — le recueil est passé à 77 circuits sur trois
   *    offices, et UN seul n'a aucun site nommé à 150 m :
   *    `randabers-4-balade-autour-du-lac-de-bourg-blanc`, une boucle
   *    familiale de 2,8 km autour d'un plan d'eau de bourg, dont le plus
   *    proche site nommé — l'église Notre-Dame — est à 371 m. Vérifié : c'est
   *    une absence VRAIE, pas une couche de lieux trouée.
   * ⭐ ON NOMME L'EXCEPTION, ON NE DESSERRE PAS LE SEUIL. Remplacer `toEqual([])`
   *    par « au moins 90 % » aurait rendu le garde muet sur sept circuits
   *    vides au lieu d'un, sans que personne ne s'en aperçoive. Une liste
   *    explicite échoue dès qu'un HUITIÈME apparaît — et elle dit son nom.
   */
  it("sur les données réelles, chaque circuit longe au moins un site nommé — sauf ceux qu'on nomme", () => {
    /** ⛔ Toute entrée ici se mérite par une VÉRIFICATION, pas par un échec.
     *  Chacune porte la distance MESURÉE au site nommé le plus proche :
     *  · `randabers-4` — 2,8 km autour d'un plan d'eau de bourg à Bourg-Blanc,
     *    plus proche site l'église Notre-Dame à 371 m.
     *  · `chemin-de-penguelen` — 8,3 km le long du Penguelen dans Landerneau,
     *    plus proche site la chapelle Saint-Éloi à 722 m.
     *  ⭐ Les deux sont des chemins de BOURG, et c'est le motif : un sentier
     *  côtier croise des fortifications et des pointes tous les 300 m, un
     *  chemin de ville ne croise rien de « remarquable ». L'exception n'est
     *  pas un accident, c'est une famille — si une troisième arrive sur un
     *  chemin de bourg, elle est légitime ; sur un sentier côtier, elle
     *  dénonce un trou dans la couche de lieux. */
    const SANS_SITE_A_150M = [
      "randabers-4-balade-autour-du-lac-de-bourg-blanc",
      "chemin-de-penguelen",
    ];
    const vides: string[] = [];
    let total = 0;
    for (const w of ot.itineraires) {
      const r = lieuxProches(w.p, inv.lieux, 99);
      total += r.length;
      if (r.length === 0) vides.push(w.slug);
    }
    expect(vides.sort()).toEqual([...SANS_SITE_A_150M].sort());
    expect(total).toBeGreaterThan(300);
  });
});

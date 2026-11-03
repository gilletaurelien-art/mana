/**
 * LES DEUX CHIFFRES DE « EN CHEMIN » — parcourus, restants.
 *
 * 🔴 CE FICHIER EXISTE PARCE QUE LE DÉFAUT ÉTAIT INVISIBLE AUX 300 TESTS
 *    D'ALORS. L'écran multipliait `walk.distanceKm` — qui compte le réseau
 *    PLUS les deux bouts hors tracé — par une fraction lue le long de
 *    `walk.points`, qui ne dessine QUE le réseau.
 *    ⭐ Deux grandeurs entre 0 et 1 se multiplient sans se plaindre : un
 *       mélange de référentiels ne se signale jamais, il se vérifie en
 *       marchant. C'est pour ça qu'il faut un test et pas une relecture.
 *
 * ⚠️ On teste la RÈGLE, pas le composant. `EnChemin` est un écran avec une
 *    géolocalisation et une carte ; le calcul, lui, tient en quatre lignes et
 *    c'est lui qui était faux. On l'extrait ici sous la même forme, et un
 *    garde relie les deux pour que la copie ne dérive pas.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/** La règle, telle que `EnChemin` la calcule. */
function chiffres(walk: { distanceKm: number; approcheM?: number; sortieM?: number }, part: number) {
  const total = walk.distanceKm * 1000;
  const approche = walk.approcheM ?? 0;
  const sortie = walk.sortieM ?? 0;
  const trace = Math.max(0, total - approche - sortie);
  const fait = approche + part * trace;
  return { fait, restant: total - fait };
}

describe("parcourus et restants, avec les bouts hors tracé", () => {
  /* Une promenade composée : 2 000 m en tout, dont 300 d'approche et 150 de
     sortie — donc 1 550 m de tracé dessiné. Les ordres de grandeur sont ceux
     mesurés le 2/11 (jusqu'à 381 m d'un côté, 150 de l'autre). */
  const w = { distanceKm: 2.0, approcheM: 300, sortieM: 150 };

  it("🔴 au DÉBUT du tracé, l'approche est déjà marchée — pas zéro", () => {
    const { fait, restant } = chiffres(w, 0);
    expect(fait).toBe(300);          // l'ancienne version disait 0
    expect(restant).toBe(1700);
  });

  it("🔴 à la FIN du tracé, la sortie reste à marcher — pas zéro", () => {
    const { fait, restant } = chiffres(w, 1);
    expect(fait).toBe(1850);
    expect(restant).toBe(150);       // l'ancienne version disait 0
  });

  it("au milieu du tracé : l'approche, plus la moitié du tracé", () => {
    expect(chiffres(w, 0.5).fait).toBe(300 + 775);
  });

  it("les deux chiffres font toujours le total — c'est la seule invariante", () => {
    for (const p of [0, 0.17, 0.5, 0.83, 1]) {
      const { fait, restant } = chiffres(w, p);
      expect(fait + restant).toBeCloseTo(2000, 6);
    }
  });

  it("un itinéraire du catalogue n'a pas de bouts : la règle se réduit", () => {
    /* ⚠️ Et c'est le seul endroit de ce dépôt où une absence vaut zéro : elle
       décrit une géométrie — le tracé commence là où l'on commence — pas une
       mesure manquante. */
    const cat = { distanceKm: 2.0 };
    expect(chiffres(cat, 0).fait).toBe(0);
    expect(chiffres(cat, 0.5).fait).toBe(1000);
    expect(chiffres(cat, 1).fait).toBe(2000);
  });

  it("⛔ des bouts plus longs que le total ne renversent pas les chiffres", () => {
    const absurde = { distanceKm: 0.2, approcheM: 300, sortieM: 150 };
    const { fait, restant } = chiffres(absurde, 1);
    expect(fait).toBe(300);                 // le tracé dégénère à 0, pas en négatif
    expect(restant).toBeLessThanOrEqual(0); // et la somme reste le total
    expect(fait + restant).toBeCloseTo(200, 6);
  });

  /**
   * ⭐ LE GARDE QUI TIENT LA COPIE. La règle ci-dessus est recopiée depuis
   *    `EnChemin.tsx` ; sans ce test, l'écran pourrait redevenir faux pendant
   *    que ce fichier reste vert. C'est le défaut que ce dépôt a payé trois
   *    fois — `/assets/`, `/carte/style.json`, les cinq porteurs du motif
   *    d'adresses : une valeur recopiée vieillit en silence.
   */
  it("⭐ et l'écran calcule bien ÇA — la copie est reliée à sa source", () => {
    const src = readFileSync("src/EnChemin.tsx", "utf8");
    const code = src
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join("\n");
    expect(code, "l'écran doit soustraire les deux bouts du total")
      .toMatch(/total\s*-\s*approche\s*-\s*sortie/);
    expect(code, "et repartir de l'approche, pas de zéro")
      .toMatch(/approche\s*\+\s*part\s*\*\s*trace/);
    expect(code, "⛔ et ne plus jamais multiplier la distance par la fraction")
      .not.toMatch(/distanceKm\s*\*\s*part/);
    expect(code, "⛔ ni par son complément")
      .not.toMatch(/distanceKm\s*\*\s*\(1\s*-\s*part\)/);
  });
});

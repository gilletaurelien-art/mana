import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { tuilesDuCadre, xDe, yDe, Z } from "./tuiles";

const SOUS = resolve(__dirname, "..", "public", "monde", "s", String(Z));
const fichier = (x: number, y: number) => resolve(SOUS, String(x), `${y}.json`);
/* ⚠️ LES TUILES SONT HORS GIT, comme les graphes — `public/monde/` est exclu,
   et pour la même raison qu'eux : 138 Mo de donnée rejouable n'ont rien à
   faire dans l'historique. Les deux tests qui les CONFRONTENT se sautent donc
   quand elles manquent, plutôt que d'échouer : un rouge sur une machine qui
   n'a pas encore produit ses tuiles envoie chercher au mauvais endroit.
   ⭐ On les rejoue en 72 s : `node scripts/sites-monde.mjs`. */
const posees = existsSync(SOUS);

describe("les tuiles du monde", () => {
  /* ⭐ CE TEST CONFRONTE LE CALCUL AUX FICHIERS RÉELLEMENT PRODUITS. Une
     formule de tuile juste « en théorie » qui désigne des fichiers absents
     donne une carte vide — et une carte vide ressemble à « il n'y a rien
     ici », pas à « je cherche au mauvais endroit ». */
  it.skipIf(!posees)("le Mullerthal tombe sur une tuile qui existe", () => {
    const [x, y] = [xDe(6.27), yDe(49.83)];
    expect(existsSync(fichier(x, y)),
      `la tuile ${Z}/${x}/${y} du Mullerthal n'existe pas sur disque`).toBe(true);
  });

  it.skipIf(!posees)("Crozon aussi — la Bretagne est dans le monde", () => {
    const [x, y] = [xDe(-4.49), yDe(48.25)];
    expect(existsSync(fichier(x, y))).toBe(true);
  });

  it("⛔ loin, on ne charge rien, et on le dit", () => {
    const r = tuilesDuCadre({ ouest: -180, est: 180, nord: 80, sud: -80 }, 3);
    expect(r.etat).toBe("loin");
  });

  it("⛔ un cadre trop large est REFUSÉ, pas tronqué en silence", () => {
    const r = tuilesDuCadre({ ouest: -10, est: 30, nord: 55, sud: 35 }, 7);
    expect(r.etat).toBe("trop");
  });

  it("un cadre de ville rend une poignée de tuiles, toutes bornées", () => {
    const r = tuilesDuCadre({ ouest: 6.2, est: 6.35, nord: 49.9, sud: 49.78 }, 11);
    expect(r.etat).toBe("ok");
    if (r.etat !== "ok") return;
    expect(r.tuiles.length).toBeGreaterThan(0);
    expect(r.tuiles.length).toBeLessThanOrEqual(24);
    for (const [x, y] of r.tuiles) {
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(2 ** Z);
      expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(2 ** Z);
    }
  });

  it("⚠️ la formule suit bien la latitude Mercator (le nord a de petits y)", () => {
    expect(yDe(60)).toBeLessThan(yDe(0));
    expect(yDe(0)).toBeLessThan(yDe(-60));
    expect(xDe(-180)).toBe(0);
    expect(xDe(179.99)).toBe(2 ** Z - 1);
  });
});

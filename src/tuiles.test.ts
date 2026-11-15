import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { tuilesDuCadre, xDe, yDe, Z, Z_SERVICES } from "./tuiles";

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

describe("le quadrillage se choisit, et le générateur lit LE MÊME", () => {
  /* 🔴 CE GARDE NAÎT D'UN DÉFAUT MESURÉ LE 15/11/2026. `tuilesDuCadre` recevait
     un `zoom` et ne le passait PAS à `xDe`/`yDe` : les trois calques étaient
     figés à z8 sans qu'une ligne le dise. Ce n'était pas le z8 qui était faux
     — il est juste pour les sites — c'était qu'on ne pouvait pas en sortir.

     ⛔ ET LA CONSÉQUENCE ÉTAIT CHIFFRÉE : au z8, les 1 846 439 services
     tiennent dans 93 tuiles, dont une à 208 439 fiches. Sous le plafond de
     1 500, on en poserait 109 400 — six pour cent — et l'écrêtage suivant
     l'ordre alphabétique, ce sont des villes entières qui tombent. */

  it("le défaut reste z8 : les calques existants ne bougent pas", () => {
    const cadre = { ouest: -4.6, est: -4.2, nord: 48.4, sud: 48.1 };
    const a = tuilesDuCadre(cadre, 9);
    const b = tuilesDuCadre(cadre, 9, Z);
    expect(a).toEqual(b);
  });

  it("la grille s'applique sur LES DEUX axes, pas un seul", () => {
    /* 🔴 PREMIÈRE RÉDACTION DE CE GARDE : RESTÉE VERTE SUR LA MOITIÉ DU
       DÉFAUT. Elle comparait le NOMBRE de tuiles entre z8 et z11 sur un cadre
       plat — muter `xDe(c.ouest, grille)` en `xDe(c.ouest)` ne changeait pas
       ce nombre, seul l'axe y le faisait bouger. Le garde a donc laissé
       passer exactement le bug qu'il nommait.
       ⭐ C'est « la seconde moitié d'un même défaut », déjà payée dans
          `typeDeLieu` le 6/11 : corriger (ou garder) UN axe donne un travail
          qui a l'air fait.
       ⛔ On compare donc les COORDONNÉES aux valeurs attendues, axe par axe —
          pas un total qui peut concorder par accident. */
    const petit = { ouest: -4.52, est: -4.46, nord: 48.26, sud: 48.22 };
    const r = tuilesDuCadre(petit, 12, Z_SERVICES);
    expect(r.etat).toBe("ok");
    if (r.etat !== "ok") return;
    const xs = r.tuiles.map((t) => t[0]), ys = r.tuiles.map((t) => t[1]);
    expect(Math.min(...xs), "l'axe x ignore la grille").toBe(xDe(petit.ouest, Z_SERVICES));
    expect(Math.max(...xs), "l'axe x ignore la grille").toBe(xDe(petit.est, Z_SERVICES));
    expect(Math.min(...ys), "l'axe y ignore la grille").toBe(yDe(petit.nord, Z_SERVICES));
    expect(Math.max(...ys), "l'axe y ignore la grille").toBe(yDe(petit.sud, Z_SERVICES));
    /* ⚠️ Et le témoin d'écart reste : les deux grilles ne doivent pas coïncider. */
    const en8 = tuilesDuCadre(petit, 12, Z);
    if (en8.etat === "ok") {
      expect(r.tuiles.length).toBeGreaterThan(en8.tuiles.length);
    }
  });

  it("⛔ une grille fine fait refuser plus tôt — et c'est voulu", () => {
    /* ⭐ À quadrillage plus fin, un cadre large demande trop de tuiles et
       `tuilesDuCadre` répond « trop ». Les commerces n'apparaissent donc qu'au
       zoom « ville ». Une carte de France couverte d'épingles de boulangerie
       ne servirait personne — le refus est une réponse, pas une panne. */
    const region = { ouest: -5, est: -1, nord: 49, sud: 47 };
    const r = tuilesDuCadre(region, 9, Z_SERVICES);
    expect(r.etat).toBe("trop");
  });

  it("Z_SERVICES est plus fin que Z, et nommé une seule fois", () => {
    expect(Z_SERVICES).toBeGreaterThan(Z);
  });
});

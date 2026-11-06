import { describe, it, expect } from "vitest";
import { couchesAu, coucheVisible, type Phase } from "./fond-rotation";

/**
 * 🔴 CES TESTS DÉCRIVENT L'ÉCLAIR SIGNALÉ LE 6/11/2026, puis l'interdisent.
 * ⭐ Ils ne demandent ni navigateur, ni horloge, ni onglet au premier plan —
 *    ce qui compte, parce que la rotation se SUSPEND quand l'onglet est
 *    caché : le défaut était structurellement inobservable depuis un banc.
 */
const N = 5;

describe("le fond tournant — la couche qui part garde son image", () => {
  /* 🔴 LE TEST QUI DIT LE DÉFAUT. L'ancienne règle donnait, au palier i+1,
     l'image i+2 à la couche sortante — qui reste opaque une seconde entière
     sous la nouvelle. D'où une coupure franche vers une image qu'on n'a pas
     demandée, suivie d'un fondu vers celle qu'on attendait. */
  it("pendant le fondu, la couche sortante montre encore CE QU'ELLE MONTRAIT", () => {
    for (let i = 0; i < 2 * N; i++) {
      const sortante = coucheVisible(i);
      const avant = couchesAu(i, "repos", N)[sortante];
      const pendant = couchesAu(i + 1, "fondu", N)[sortante];
      expect(pendant, `palier ${i} → ${i + 1}, couche ${sortante}`).toBe(avant);
    }
  });

  it("la couche entrante porte bien l'image du palier", () => {
    for (let i = 0; i < 2 * N; i++) {
      expect(couchesAu(i, "fondu", N)[coucheVisible(i)]).toBe(i % N);
      expect(couchesAu(i, "repos", N)[coucheVisible(i)]).toBe(i % N);
    }
  });

  /* ⭐ L'entrante ne change jamais d'image en cours de fondu non plus : elle
     a été préchargée au palier précédent, et c'est tout l'intérêt. */
  it("l'image entrante était DÉJÀ posée au palier précédent — rien à charger au basculement", () => {
    for (let i = 1; i < 2 * N; i++) {
      const entrante = coucheVisible(i);
      expect(couchesAu(i - 1, "repos", N)[entrante]).toBe(i % N);
    }
  });

  it("une fois recouverte, la couche cachée précharge la suivante", () => {
    for (let i = 0; i < 2 * N; i++) {
      const cachee = 1 - coucheVisible(i);
      expect(couchesAu(i, "repos", N)[cachee]).toBe((i + 1) % N);
    }
  });

  /* ⚠️ Les deux couches ne doivent jamais porter la même image : le fondu
     n'aurait alors rien à enchaîner, et un palier sauterait en silence. */
  it("les deux couches ne portent jamais la même image", () => {
    for (const phase of ["fondu", "repos"] as Phase[]) {
      for (let i = 0; i < 2 * N; i++) {
        const [a, b] = couchesAu(i, phase, N);
        expect(a, `palier ${i} en ${phase}`).not.toBe(b);
      }
    }
  });

  it("le tour boucle sans index négatif ni trou", () => {
    for (const phase of ["fondu", "repos"] as Phase[]) {
      for (let i = 0; i < 4 * N; i++) {
        for (const k of couchesAu(i, phase, N)) {
          expect(k).toBeGreaterThanOrEqual(0);
          expect(k).toBeLessThan(N);
        }
      }
    }
  });

  it("une rotation sans image LÈVE au lieu de rendre un index fantôme", () => {
    expect(() => couchesAu(0, "repos", 0)).toThrow(/rotation/);
  });
});

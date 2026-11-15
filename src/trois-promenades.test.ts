import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  indexer, accrocherUn, accrocherTous, accroche, propositionsAutour, type Graphe,
} from "./composition";
import { territoireDe } from "./territoires";
import type { Inventaire } from "./lieux";
import brut from "./lieux.json";

/**
 * 🔴 « ON CLIQUE SUR UN SITE REMARQUABLE > Y ALLER OU PARTIR D'ICI > 3
 *    OPTIONS » — Aurélien, 15/11/2026. La fonction existait sur la carte
 *    bretonne ; elle est passée sur la surface commune.
 *
 * ⭐ CE TEST JOUE LA CHAÎNE ENTIÈRE SUR LE VRAI GRAPHE, pas sur une fixture.
 *    Une fixture peut répondre à la place du code — ce dépôt l'a écrit. Ici
 *    on charge les 16 210 arêtes de la presqu'île et on compose vraiment.
 * ⚠️ Le graphe est hors git (rejouable, voir `.gitignore`) : le test se
 *    SAUTE s'il est absent, et il le DIT. Un test qui passe parce qu'il n'a
 *    rien fait est pire qu'un test absent.
 */
const CHEMIN = new URL("../public/bretagne/g/presquile.json", import.meta.url);
const present = existsSync(CHEMIN);
const inv = brut as unknown as Inventaire;

describe.skipIf(!present)("trois promenades depuis un site remarquable", () => {
  const g = JSON.parse(readFileSync(CHEMIN, "utf8")) as Graphe;
  const ix = indexer(g, new Set());

  /** Les destinations : les lieux NOMMÉS, dédoublonnés — même filtre que l'écran. */
  const vus = new Set<string>();
  const spots = inv.lieux.filter((l) => {
    if (!l.n || l.n === (inv.libelles[l.c] ?? l.c) || vus.has(l.n)) return false;
    vus.add(l.n); return true;
  });
  const positions = spots.map((s) => s.g as readonly [number, number]);
  const accroches = accrocherTous(g, ix, positions, { ecartSiLoin: false });

  /** Le menhir de la capture d'écran d'Aurélien. */
  const depart = spots.find((l) => l.n === "Menhir de Crozon")
    ?? spots.find((l) => l.c === "megalithe")!;

  it("le point de départ existe et tombe dans un territoire connu", () => {
    expect(depart, "aucun mégalithe nommé dans l'inventaire").toBeTruthy();
    expect(territoireDe(depart.g[0], depart.g[1])?.slug).toBe("presquile");
  });

  it("trois promenades en partent, et elles vont quelque part", () => {
    const d = accrocherUn(g, ix, depart.g);
    expect(accroche(d), `${depart.n} n'est accroché à aucun chemin`).toBe(true);
    const props = propositionsAutour(g, ix, d, spots, positions, accroches);
    expect(props.length, "moins de trois propositions").toBe(3);
    for (const p of props) {
      expect(p.spot.n, "une proposition sans nom").toBeTruthy();
      /* ⛔ ET AUCUNE NE PROPOSE LE LIEU D'OÙ L'ON PART. */
      expect(p.spot.n).not.toBe(depart.n);
      /* La bande mesurée du compositeur : 600 à 4 000 m. */
      expect(p.metres).toBeGreaterThan(500);
      expect(p.metres).toBeLessThan(12_000);
    }
    /* ⚠️ Trois destinations DISTINCTES : deux fois le même endroit, ce n'est
       pas trois options. */
    expect(new Set(props.map((p) => p.spot.n)).size).toBe(3);
  });

  /**
   * 🔴 `metres` N'EST PAS `parcours.metres`, ET L'ÉCART EST CE QU'ON MARCHE.
   *    Le type le dit : « CE QU'ON AFFICHE : le réseau PLUS les deux bouts
   *    hors réseau ». La première version de la fiche affichait le second —
   *    un chiffre juste pour une autre question, donc faux pour celle-ci.
   */
  it("la distance affichée inclut l'approche et la sortie", () => {
    const d = accrocherUn(g, ix, depart.g);
    const props = propositionsAutour(g, ix, d, spots, positions, accroches);
    const avecBouts = props.filter((p) => p.approche + p.sortie > 0);
    expect(avecBouts.length, "aucune proposition n'a de bout hors réseau — "
      + "ce test ne prouve alors rien").toBeGreaterThan(0);
    for (const p of avecBouts) {
      expect(p.metres).toBeGreaterThan(p.parcours.metres);
      expect(p.metres).toBe(p.parcours.metres + p.approche + p.sortie);
    }
  });

  /* ⛔ LE REFUS HONNÊTE, qui est la moitié du travail sur une carte mondiale :
     hors des trois territoires moissonnés, il n'y a pas de réseau — et c'est
     NOUS qui n'y sommes pas, pas le monde qui n'a rien à marcher. */
  it("hors des territoires, on sait qu'on ne sait pas", () => {
    for (const [nom, lon, lat] of [["Rome", 12.49, 41.89], ["Berlin", 13.40, 52.52],
                                   ["Paris", 2.35, 48.86]] as const) {
      expect(territoireDe(lon, lat), nom).toBeNull();
    }
  });
});

it("le graphe de la presqu'île est là (sinon les tests ci-dessus se sautent)", () => {
  /* ⚠️ Ce test ÉCHOUE si le graphe manque, pendant que les autres se sautent.
     Sans lui, un dépôt fraîchement cloné annoncerait « tout est vert » en
     n'ayant rien éprouvé du tout. */
  expect(present, `graphe absent : ${CHEMIN.pathname} — voir docs/graphe-pipeline.md`)
    .toBe(true);
});

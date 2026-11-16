import { describe, it, expect, vi, afterEach } from "vitest";
import { chargerItineraire, PromenadeIllisible } from "./catalogue";

/**
 * 🔴 CE QUE CE FICHIER PROTÈGE — un défaut mesuré le 16/11/2026, sur le chemin
 *    exact de la démonstration à Brest terres océanes.
 *
 *    `chargerItineraire` rendait `null` pour TOUT `!r.ok`. L'écran de la fiche
 *    affichait alors « Cette promenade n'existe pas. Aucun parcours ne porte le
 *    nom « … ». Il a peut-être été renommé. » — pour un 502, un 504 à froid,
 *    une coupure. Ce sont les 69 liens de la liste « promenades au départ de
 *    Brest terres océanes ».
 *
 * ⭐ UN PRODUIT QUI ACCUSE SA PROPRE DONNÉE COÛTE PLUS CHER QU'UN PRODUIT QUI
 *    AVOUE. « Ça n'existe pas » clôt la question et se retient ; « je n'ai pas
 *    pu lire » dit quoi faire. On ne rouvre pas une certitude.
 *
 * ⚠️ Ces tests appellent la VRAIE fonction avec un `fetch` simulé — ils ne
 *    lisent pas le fichier. C'est la seule forme qui aurait refusé le défaut :
 *    le code fautif, lu, était parfaitement plausible.
 */

const reponse = (statut: number, corps?: unknown) => ({
  ok: statut >= 200 && statut < 300,
  status: statut,
  json: async () => corps,
});

const GEOMETRIE = {
  rel: "r1", b: [-4.6, 48.2, -4.4, 48.3],
  g: { type: "MultiLineString", coordinates: [[[-4.5, 48.25], [-4.49, 48.26]]] },
  s: "pointe", n: "La pointe", k: 4.2, x: -4.5, y: 48.25,
};

afterEach(() => vi.unstubAllGlobals());

describe("une absence et un échec ne se disent pas de la même façon", () => {
  it("404 — la promenade est absente : on rend null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reponse(404)));
    await expect(chargerItineraire("jamais-existe")).resolves.toBeNull();
  });

  /* ⛔ LE CŒUR DU DÉFAUT. Chacun de ces états rendait `null` — donc
     « cette promenade n'existe pas » — alors que le fichier est là. */
  for (const statut of [500, 502, 503, 504, 403, 429]) {
    it(`${statut} — la promenade n'a pas pu être lue : on LÈVE, on ne rend pas null`, async () => {
      vi.stubGlobal("fetch", vi.fn(async () => reponse(statut)));
      await expect(chargerItineraire("pointe")).rejects.toBeInstanceOf(PromenadeIllisible);
      await expect(chargerItineraire("pointe")).rejects.toMatchObject({ statut });
    });
  }

  it("réseau coupé — l'erreur passe telle quelle, elle ne devient pas une absence", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(chargerItineraire("pointe")).rejects.toBeInstanceOf(TypeError);
  });

  it("200 avec un tracé — la promenade arrive", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reponse(200, GEOMETRIE)));
    const w = await chargerItineraire("pointe");
    expect(w).not.toBeNull();
    expect(w!.points.length).toBeGreaterThan(1);
  });

  /* ⚠️ ET CE CAS-LÀ RESTE UNE ABSENCE, à dessein : le fichier est lisible, il
     ne porte simplement aucun chemin. Dire « je n'ai pas pu lire » inventerait
     une panne. */
  it("200 sans aucun point — c'est une absence, pas un échec", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reponse(200, { ...GEOMETRIE, g: { type: "MultiLineString", coordinates: [] } })));
    await expect(chargerItineraire("vide")).resolves.toBeNull();
  });
});

describe("l'écran dit les deux, et ne les confond pas", () => {
  const ecran = readFichePromenade();
  it("il porte un état d'ÉCHEC distinct de l'absence", () => {
    expect(ecran, "sans état distinct, un 502 redevient « n'existe pas »")
      .toMatch(/illisible/);
  });
  it("le catch ne retombe plus silencieusement sur l'absence", () => {
    /* 🔴 C'était `.catch(() => { if (vivant) setDistante(null); })` — un échec
       devenait un `null`, indiscernable d'un 404. */
    expect(ecran).toMatch(/catch\([^)]*\)\s*=>\s*\{[^}]*setIllisible\(true\)/s);
  });
});

function readFichePromenade(): string {
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  return readFileSync(new URL("./FichePromenade.tsx", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

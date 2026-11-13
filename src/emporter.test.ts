import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  tuileDe, tuilesDuTrace, gabaritDesTuiles, adresseDe, emporter, poidsMo,
  CACHE_TUILES, ZOOMS,
} from "./emporter";

const STYLE = JSON.parse(readFileSync("public/carte-style.json", "utf8"));

describe("les tuiles d'un tracé", () => {
  it("place un point connu sur la bonne tuile", () => {
    /* ⭐ Témoin MESURÉ en ligne le 13/11/2026 : la tuile z14 qui contient
       Crozon (-4,49 / 48,247) est 7987/5678, et elle pèse 82 311 o — donc elle
       existe vraiment. Un témoin calculé par la même formule que le code
       qu'il teste ne prouverait rien. */
    expect(tuileDe(-4.49, 48.247, 14)).toEqual({ z: 14, x: 7987, y: 5678 });
    expect(tuileDe(-4.49, 48.247, 12)).toEqual({ z: 12, x: 1996, y: 1419 });
  });

  it("suit le TRACÉ et non sa boîte englobante", () => {
    /* ⛔ C'est la différence qui décide du poids. Une balade en L : emporter la
       boîte prendrait tout le carré, le tracé n'en prend que deux bords. */
    const enL = [
      { lat: 48.20, lon: -4.60 }, { lat: 48.20, lon: -4.40 }, { lat: 48.35, lon: -4.40 },
    ];
    const tracé = tuilesDuTrace(enL, [13], 0).length;
    const boite = tuilesDuTrace(
      [{ lat: 48.20, lon: -4.60 }, { lat: 48.35, lon: -4.60 },
       { lat: 48.35, lon: -4.40 }, { lat: 48.20, lon: -4.40 }], [13], 0,
    ).length;
    expect(tracé, "le tracé coûte autant que son contour : l'interpolation a sauté")
      .toBeLessThan(boite * 1.2);
    expect(tracé).toBeGreaterThan(3);
  });

  it("ne laisse pas de trou entre deux points éloignés", () => {
    /* 🔴 LE DÉFAUT QUE L'INTERPOLATION ÉVITE. Deux relevés distants de 5 km
       sautent plusieurs tuiles à z14 : sans interpolation, la carte est trouée
       exactement entre deux points du tracé — un trou en pleine balade. */
    const deuxLoin = [{ lat: 48.20, lon: -4.60 }, { lat: 48.20, lon: -4.40 }];
    const xs = tuilesDuTrace(deuxLoin, [14], 0).map((t) => t.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i] - xs[i - 1], `trou de ${xs[i] - xs[i - 1]} tuiles en x`)
        .toBeLessThanOrEqual(1);
    }
  });

  it("ne rend aucun doublon", () => {
    const pts = Array.from({ length: 40 }, (_, i) => ({ lat: 48.2 + i * 1e-4, lon: -4.5 }));
    const t = tuilesDuTrace(pts);
    expect(new Set(t.map((x) => `${x.z}/${x.x}/${x.y}`)).size).toBe(t.length);
  });

  it("ne dépasse pas le zoom du jeu de tuiles", () => {
    /* ⛔ Mesuré : z15 et z16 rendent 0 octet. Emporter au-delà du `maxzoom`
       téléchargerait du vide en annonçant un succès. Le garde lit le maxzoom
       DANS la feuille de style — il ne le recopie pas. */
    const maxzoom = STYLE.sources.openmaptiles.maxzoom;
    expect(typeof maxzoom).toBe("number");
    expect(Math.max(...ZOOMS), `ZOOMS dépasse le maxzoom (${maxzoom}) du jeu`)
      .toBeLessThanOrEqual(maxzoom);
  });

  it("reste d'un poids annonçable pour une balade réelle", () => {
    /* Une boucle de ~12 km autour de Crozon, échantillonnée tous les ~100 m. */
    const boucle = Array.from({ length: 120 }, (_, i) => {
      const a = (i / 120) * 2 * Math.PI;
      return { lat: 48.247 + 0.015 * Math.sin(a), lon: -4.49 + 0.022 * Math.cos(a) };
    });
    const n = tuilesDuTrace(boucle).length;
    expect(n, `${n} tuiles pour 12 km : trop pour un forfait mobile`).toBeLessThan(260);
    expect(poidsMo(n), "le poids annoncé dépasse 15 Mo").toBeLessThan(15);
    expect(n).toBeGreaterThan(20);
  });
});

describe("le gabarit d'adresse est LU, jamais recopié", () => {
  /* ⛔ La règle 1 du module. Le chemin porte la version du jeu de tuiles
     (`…/planet/20260906_080001_pt/…`) : recopié dans le code, il désignerait un
     jeu retiré au premier renouvellement, et le bouton téléchargerait du vide
     en annonçant « à bord ». Même défaut que les cibles de déploiement
     recopiées dans une note. */

  it("prend le gabarit dans la feuille de style", async () => {
    const faux = (async () => new Response(JSON.stringify(STYLE))) as unknown as typeof fetch;
    const g = await gabaritDesTuiles(faux, "peu-importe");
    expect(g).toBe(STYLE.sources.openmaptiles.tiles[0]);
    expect(g).toContain("{z}");
  });

  it("ne devine RIEN quand la feuille est illisible", async () => {
    for (const reponse of [
      async () => new Response("pas du json"),
      async () => new Response("{}", { status: 500 }),
      async () => new Response(JSON.stringify({ sources: {} })),
      async () => { throw new Error("hors ligne"); },
    ]) {
      expect(await gabaritDesTuiles(reponse as unknown as typeof fetch, "x"),
        "un gabarit a été inventé").toBeNull();
    }
  });

  it("refuse un gabarit sans emplacement de coordonnées", async () => {
    const sansZ = { sources: { openmaptiles: { tiles: ["https://x/fixe.pbf"] } } };
    const faux = (async () => new Response(JSON.stringify(sansZ))) as unknown as typeof fetch;
    expect(await gabaritDesTuiles(faux, "x")).toBeNull();
  });

  it("remplit les trois coordonnées", () => {
    expect(adresseDe("https://h/{z}/{x}/{y}.pbf", { z: 14, x: 7987, y: 5678 }))
      .toBe("https://h/14/7987/5678.pbf");
  });
});

describe("le téléchargement compte ses échecs", () => {
  it("rend le compte exact des réussites et des échecs", async () => {
    const adresses = Array.from({ length: 10 }, (_, i) => `https://h/${i}`);
    const faux = (async (u: string) =>
      u.endsWith("3") || u.endsWith("7")
        ? new Response("", { status: 404 })
        : new Response("x")) as unknown as typeof fetch;
    const vues: number[] = [];
    const r = await emporter(adresses, (f) => vues.push(f), faux, 3);
    expect(r).toEqual({ reussies: 8, echouees: 2 });
    /* ⭐ Les échecs ne sont pas avalés : le bouton doit pouvoir dire « 8 sur
       10 » plutôt qu'annoncer un succès qu'il n'a pas. */
    expect(vues.at(-1), "l'avancée ne va pas jusqu'au bout").toBe(10);
  });

  it("survit à une adresse qui jette", async () => {
    const faux = (async () => { throw new Error("réseau coupé"); }) as unknown as typeof fetch;
    expect(await emporter(["a", "b"], undefined, faux, 2))
      .toEqual({ reussies: 0, echouees: 2 });
  });
});

describe("le nom du cache colle au service worker", () => {
  /* 🔴 DEUX FICHIERS, UN SEUL NOM DE CACHE, ET AUCUN IMPORT POSSIBLE :
     `public/sw.js` est servi tel quel, il ne peut rien importer de `src/`.
     Le nom est donc écrit deux fois — et deux écritures d'une même valeur
     divergent toujours. Ici, si elles divergeaient, `dejaABord` lirait un cache
     vide et le bouton annoncerait « à emporter » pour une balade déjà à bord,
     indéfiniment. */
  const sw = readFileSync("public/sw.js", "utf8");

  it("le module et le service worker nomment le même cache", () => {
    expect(sw, `le sw ne déclare pas le cache « ${CACHE_TUILES} »`)
      .toContain(`const CACHE_TUILES = "${CACHE_TUILES}"`);
  });
});

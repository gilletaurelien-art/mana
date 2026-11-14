import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { chercher } from "./recherche";
import { TERRITOIRES } from "./territoires";
import { libelleCategorie } from "./categories";
import { ETENDUE, type Inventaire } from "./lieux";
import brut from "./lieux.json";
import communesBrutes from "./communes.json";
import type { Commune } from "./recherche";

const inv = brut as unknown as Inventaire;
const communes = communesBrutes as unknown as Commune[];
const index = {
  lieux: inv.lieux, communes,
  libelle: (c: string) => inv.libelles[c] ?? libelleCategorie(c),
};

/**
 * 🔴 LE 14/11/2026, AURÉLIEN DEMANDE : « le moteur de recherche sur la landing
 *    de manahome fonctionne correctement ? ». Trois mesures ont répondu non,
 *    et ce fichier les fige.
 */

describe("ce que la recherche couvre — et le mot qui le dit", () => {
  const lon = inv.lieux.map((l) => l.g[0]);
  const lat = inv.lieux.map((l) => l.g[1]);

  /* ⭐ LE MOT « la Bretagne » N'EST PAS POSÉ LÀ, IL EST TENU. L'interface
     l'affiche (« La recherche ne couvre encore que la Bretagne ») ; ce test
     refuse que l'inventaire en sorte. Le jour où il s'étend, le test tombe
     AVANT que la phrase ne devienne fausse en ligne. */
  it("tout l'inventaire tient dans l'étendue annoncée", () => {
    const [o, s_, e, n] = ETENDUE.boite;
    const dehors = inv.lieux.filter(
      (l) => l.g[0] < o || l.g[0] > e || l.g[1] < s_ || l.g[1] > n);
    expect(dehors.map((l) => l.n ?? l.c)).toEqual([]);
    expect(inv.lieux.length).toBeGreaterThan(1000);
  });

  /* ⛔ ET L'ÉTENDUE DOIT SERRER : une boîte assez large pour contenir le
     monde rendrait le test ci-dessus vert quoi qu'il arrive. On vérifie
     qu'elle exclut ce qu'elle doit exclure. */
  it("l'étendue annoncée exclut bien le reste du monde", () => {
    const [o, s_, e, n] = ETENDUE.boite;
    for (const [nom, g] of [["Rome", [12.49, 41.89]], ["Berlin", [13.40, 52.52]],
                            ["le Mullerthal", [6.27, 49.83]]] as const) {
      const dedans = g[0] >= o && g[0] <= e && g[1] >= s_ && g[1] <= n;
      expect(dedans, `${nom} ne doit pas être dans l'étendue annoncée`).toBe(false);
    }
  });

  /**
   * 🔴 LA PREMIÈRE RÉDACTION DÉRIVAIT LA COUVERTURE DES `TERRITOIRES`, ET
   *    C'ÉTAIT FAUX — gardé ici parce que la tentation reviendra. Les emprises
   *    décrivent les GRAPHES de promenade ; l'inventaire des lieux est bien
   *    plus large. Une valeur dérivée de la mauvaise source est aussi fausse
   *    qu'une valeur recopiée, et elle inspire davantage confiance.
   */
  it("les emprises des graphes ne décrivent PAS l'inventaire", () => {
    const dans = (g: readonly number[], e: readonly number[]) =>
      g[0] >= e[0] && g[0] <= e[2] && g[1] >= e[1] && g[1] <= e[3];
    const bretons = TERRITOIRES.filter((t) => t.contree === "bretagne");
    const hors = inv.lieux.filter((l) => !bretons.some((t) => dans(l.g, t.emprise)));
    expect(hors.length / inv.lieux.length).toBeGreaterThan(0.5);
  });

  it("l'index est breton, et rien d'autre", () => {
    expect(Math.min(...lon)).toBeGreaterThan(-5);
    expect(Math.max(...lon)).toBeLessThan(-3.9);
    expect(Math.min(...lat)).toBeGreaterThan(48);
    expect(Math.max(...lat)).toBeLessThan(49);
  });
});

describe("« Rome » rend cinq lieux bretons — ils doivent le DIRE", () => {
  /* 🔴 LE CAS MESURÉ EN LIGNE le 14/11/2026 sur manahome.org : cinq
     propositions, toutes en presqu'île de Crozon, parce que « rome » est une
     sous-chaîne de « T-rome-nec » et de « Jé-rôme ». Chaque ligne est exacte,
     l'ensemble est un mensonge — et un mensonge PLAUSIBLE, donc cru. */
  const resultats = chercher("Rome", index);

  it("le cas est toujours là — sinon ce garde ne garde rien", () => {
    expect(resultats.length).toBeGreaterThan(0);
    expect(resultats.map((r) => r.nom)).toContain("Grotte de Roméo");
  });

  /* ⛔ ET AUCUN N'EST À ROME : c'est tout le défaut. La distance se mesure,
     elle ne se suppose pas — plus de 1 000 km du Colisée pour chacun. */
  it("aucun des cinq n'est à moins de mille kilomètres de Rome", () => {
    for (const r of resultats) {
      const dx = (r.g[0] - 12.4922) * 74, dy = (r.g[1] - 41.8902) * 111;
      expect(Math.hypot(dx, dy), r.nom).toBeGreaterThan(1000);
    }
  });

  /* ⭐ DONC L'ÉCRAN DOIT LE DIRE. La ligne de portée est rendue dès qu'il y a
     des résultats hors de mana.bzh ; ce garde lit le composant pour que le
     « dès qu'il y a des résultats » ne se perde pas dans une condition. */
  it("l'écran annonce la portée au-dessus de la liste", () => {
    const ecran = readFileSync(new URL("./RechercheAccueil.tsx", import.meta.url), "utf8");
    const i = ecran.indexOf("rech-portee");
    const j = ecran.indexOf('className="rech-liste"');
    expect(i, "la ligne de portée a disparu").toBeGreaterThan(0);
    expect(i, "la portée doit se lire AVANT la liste").toBeLessThan(j);
    expect(ecran.slice(Math.max(0, i - 200), i)).toMatch(/ailleurs && resultats\.length > 0/);
  });

  /* ⭐ ET LE CAS QUI MARCHE RESTE : on ne répare pas en cassant. */
  it("« Crozon » rend toujours la commune en tête", () => {
    expect(chercher("Crozon", index)[0].nom).toBe("Crozon");
  });
});

/* ═══ LE GARDE DE FOND ═════════════════════════════════════════════════════
   🔴 Le défaut réel n'était pas « Rome » : c'était `?q=`. `RechercheAccueil`
      construisait `/promenades?q=…` et PERSONNE ne lisait `q` — le composeur
      ignorait la requête et composait en Bretagne, l'air sûr de lui. Un
      commentaire daté affirmait le contraire depuis huit jours.
   ⭐ Un paramètre qu'on ÉCRIT sans que personne ne le LISE ne lève aucune
      erreur : l'URL est valide, la page s'affiche, elle montre autre chose.
      C'est la forme la moins bruyante du mensonge, et elle se mesure. */

/** Le texte d'un fichier, commentaires retirés.
 *  ⚠️ INDISPENSABLE : trois paramètres morts ne vivent QUE dans des
 *     commentaires qui racontent leur retrait (`?chercher=1`, `?u=radio`).
 *     Sans ce nettoyage, le garde refuserait pour un motif inventé. */
function sansCommentaires(t: string): string {
  return t.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

/** Les littéraux de ce fichier, un par un. */
function litteraux(t: string): string[] {
  return [...t.matchAll(/`[^`]*`|"[^"\n]*"|'[^'\n]*'/g)].map((m) => m[0]);
}

/** ⭐ UN SCHÉMA D'URI VEUT DIRE « CHEZ QUELQU'UN D'AUTRE ». `daddr`, `dirflg`
 *  et `to` appartiennent à Apple Plans, Google Maps et OpenStreetMap ;
 *  `body` à l'application SMS. Les exiger lus ici serait exiger que nous
 *  lisions le courrier des autres. */
const chezUnAutre = (lit: string) => /:\/\/|(?:^|[`"'(])(?:mailto|sms|tel|geo):/.test(lit);

describe("aucun paramètre d'URL écrit vers NOS pages n'est ignoré", () => {
  const fichiers = readdirSync(new URL(".", import.meta.url))
    .filter((f) => /\.tsx?$/.test(f) && !f.includes(".test."));
  const textes = fichiers.map((f) =>
    [f, sansCommentaires(readFileSync(new URL(`./${f}`, import.meta.url), "utf8"))] as const);

  const lus = new Set<string>();
  for (const [, t] of textes) {
    for (const m of t.matchAll(/\.get\(["']([a-z][a-z0-9_]*)["']\)/g)) lus.add(m[1]);
  }

  it("le relevé des LECTEURS n'est pas vide", () => {
    /* ⭐ Un garde qui ne trouve aucun lecteur déclarerait tout le monde
       coupable, ou — selon le sens du test — innocenterait tout le monde.
       On vérifie que l'instrument voit. */
    expect(lus.size).toBeGreaterThanOrEqual(5);
    expect(lus).toContain("lon");
    expect(lus).toContain("visage");
  });

  it("tout paramètre écrit vers chez nous est lu quelque part", () => {
    const orphelins: string[] = [];
    let examines = 0;
    for (const [f, t] of textes) {
      for (const lit of litteraux(t)) {
        if (chezUnAutre(lit)) continue;
        for (const m of lit.matchAll(/[?&]([a-z][a-z0-9_]*)=/g)) {
          examines++;
          if (!lus.has(m[1])) orphelins.push(`${f} écrit ?${m[1]}= que personne ne lit`);
        }
      }
    }
    expect(examines, "le garde n'a examiné aucun paramètre").toBeGreaterThanOrEqual(5);
    expect(orphelins).toEqual([]);
  });
});

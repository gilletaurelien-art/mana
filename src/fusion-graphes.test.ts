import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fusionnerGraphes } from "./fusion-graphes";
import { metres, type Graphe } from "./composition";

/**
 * LA COUTURE DES DEUX GRAPHES.
 *
 * 🔴 CE FICHIER EXISTE PARCE QUE LA COUTURE A VÉCU DANS UN `useEffect` QUI
 *    `fetch` DEUX FICHIERS DE 3 Mo. Rien ne pouvait l'exercer, donc on la
 *    relisait — et on la croyait. Elle a porté deux défauts pendant une
 *    journée : des lieux accrochés à des arêtes qui n'étaient pas les leurs
 *    (jusqu'à 43 km), et deux moitiés de territoire qui ne communiquaient
 *    nulle part.
 *
 * ⛔ LES FIXTURES SONT MINUSCULES, ET C'EST LE POINT. Six nœuds suffisent à
 *    faire échouer les deux défauts — alors que les fichiers réels, eux, ne
 *    sont même pas dans git (`.gitignore` : `public/bretagne/`). Un garde qui
 *    dépendrait d'eux ne tournerait jamais en intégration, c'est-à-dire
 *    jamais. La recette sur données réelles vit plus bas, et elle DIT quand
 *    elle est sautée.
 */

/** Un graphe jouet : des nœuds en ligne, des arêtes qui les relient. */
function jouet(
  noeuds: [number, number][],
  aretes: [number, number][],
  lieux: { a: number; g: [number, number] }[],
  nom = "test",
): Graphe {
  return {
    genere: "2026-11-05",
    territoire: nom,
    attribution: "test",
    n: noeuds,
    a: aretes.map(([x, y]) => [x, y, 100, 0, []] as Graphe["a"][number]),
    l: lieux.map((li, i) => ({
      a: li.a, f: 0.5, c: "megalithe", n: `lieu ${nom}${i}`, g: li.g, d: 5,
    })),
  };
}

/** Le nombre de nœuds de la plus grosse composante, et combien il y en a. */
function composantes(g: Graphe): { nb: number; plusGrosse: number } {
  const voisins = new Map<number, number[]>();
  for (const ar of g.a) {
    (voisins.get(ar[0]) ?? voisins.set(ar[0], []).get(ar[0])!).push(ar[1]);
    (voisins.get(ar[1]) ?? voisins.set(ar[1], []).get(ar[1])!).push(ar[0]);
  }
  const vus = new Set<number>();
  let nb = 0, plusGrosse = 0;
  for (const depart of voisins.keys()) {
    if (vus.has(depart)) continue;
    nb++;
    let taille = 0;
    const pile = [depart];
    vus.add(depart);
    while (pile.length) {
      const x = pile.pop()!;
      taille++;
      for (const v of voisins.get(x) ?? []) if (!vus.has(v)) { vus.add(v); pile.push(v); }
    }
    plusGrosse = Math.max(plusGrosse, taille);
  }
  return { nb, plusGrosse };
}

describe("fusionnerGraphes", () => {
  /**
   * 🔴 LE DÉFAUT N° 1 : `lieu.a` EST UN INDEX D'ARÊTE, PAS DE NŒUD.
   *    Le graphe B porte son lieu sur SON arête n° 1. Dans la fusion, cette
   *    arête devient la n° 3 (B vient après les deux arêtes de A). Sans
   *    décalage, le lieu déclare encore « 1 » — c'est-à-dire la seconde
   *    arête de A, à l'autre bout de la carte.
   * ⭐ ET ON LE VÉRIFIE PAR LA GÉOMÉTRIE, PAS PAR LE NUMÉRO. Attendre `3`
   *    testerait mon arithmétique contre elle-même ; mesurer la distance du
   *    lieu à l'arête qu'il déclare teste ce qui compte — que l'accroche
   *    désigne un chemin qui passe VRAIMENT là.
   */
  it("🔴 décale `lieu.a`, qui est un index d'ARÊTE", () => {
    // A : deux arêtes autour de −4,6 / 48,2
    const A = jouet(
      [[-4.60, 48.20], [-4.59, 48.20], [-4.58, 48.20]],
      [[0, 1], [1, 2]],
      [{ a: 0, g: [-4.595, 48.20] }],
      "A",
    );
    // B : deux arêtes autour de −4,10 / 48,30 — 40 km plus loin
    const B = jouet(
      [[-4.11, 48.30], [-4.10, 48.30], [-4.09, 48.30]],
      [[0, 1], [1, 2]],
      [{ a: 1, g: [-4.095, 48.30] }],
      "B",
    );

    const f = fusionnerGraphes([A, B], "tout");

    for (const li of f.l) {
      const ar = f.a[li.a];
      expect(ar, `le lieu « ${li.n} » déclare une arête qui n'existe pas`).toBeDefined();
      const ecart = Math.min(metres(li.g, f.n[ar[0]]), metres(li.g, f.n[ar[1]]));
      expect(
        ecart,
        `« ${li.n} » est à ${Math.round(ecart)} m de l'arête ${li.a} qu'il déclare`,
      ).toBeLessThan(2000);
    }
  });

  /**
   * 🔴 LE DÉFAUT N° 2 : LES EMPRISES SE CHEVAUCHENT, DONC DES NŒUDS EXISTENT
   *    DEUX FOIS. Ici le nœud [−4,30 / 48,25] est le dernier de A et le
   *    premier de B — le même carrefour, moissonné des deux côtés.
   *    Concaténés, ils restent deux nœuds : A et B forment alors deux
   *    réseaux qui ne se touchent nulle part, et aucun chemin ne va de l'un
   *    à l'autre.
   */
  it("🔴 SOUDE les nœuds que les deux emprises ont en commun", () => {
    const A = jouet(
      [[-4.32, 48.25], [-4.31, 48.25], [-4.30, 48.25]],
      [[0, 1], [1, 2]],
      [],
      "A",
    );
    const B = jouet(
      [[-4.30, 48.25], [-4.29, 48.25], [-4.28, 48.25]],
      [[0, 1], [1, 2]],
      [],
      "B",
    );

    const f = fusionnerGraphes([A, B], "tout");

    expect(f.n, "le nœud commun doit être fondu, pas recopié").toHaveLength(5);
    // ⛔ les arêtes, elles, ne se dédoublonnent PAS : voir le commentaire de
    //    `fusionnerGraphes`. Quatre entrent, quatre sortent.
    expect(f.a).toHaveLength(4);

    const c = composantes(f);
    expect(c.nb, "les deux moitiés doivent former UN réseau").toBe(1);
    expect(c.plusGrosse).toBe(5);
  });

  /**
   * ⚠️ LE PIÈGE SYMÉTRIQUE, et il faut le tenir dans l'autre sens : souder
   *    deux nœuds qui se RESSEMBLENT inventerait un carrefour qui n'existe
   *    pas sur le terrain. Deux chemins qui se frôlent à un mètre sans se
   *    croiser — un pont au-dessus d'une route — doivent rester séparés.
   * ⭐ C'est pour ça que l'égalité est STRICTE : les vrais doublons sont le
   *    même objet OSM moissonné deux fois, identiques bit à bit.
   */
  it("⛔ ne soude PAS deux nœuds seulement voisins — un pont n'est pas un carrefour", () => {
    const A = jouet([[-4.30, 48.25], [-4.29, 48.25]], [[0, 1]], [], "A");
    const B = jouet([[-4.30, 48.250001], [-4.31, 48.250001]], [[0, 1]], [], "B");

    const f = fusionnerGraphes([A, B], "tout");

    expect(f.n, "1 m d'écart reste un écart").toHaveLength(4);
    expect(composantes(f).nb, "deux chemins qui se frôlent ne communiquent pas").toBe(2);
  });

  it("garde l'identité du territoire fusionné et la date la plus ANCIENNE", () => {
    const A = { ...jouet([[-4.3, 48.2]], [], [], "A"), genere: "2026-10-31" };
    const B = { ...jouet([[-4.1, 48.3]], [], [], "B"), genere: "2026-11-03" };
    const f = fusionnerGraphes([A, B], "tout");
    expect(f.territoire).toBe("tout");
    // ⚠️ un graphe fusionné n'est à jour que de sa moitié la plus vieille
    expect(f.genere).toBe("2026-10-31");
  });

  it("un seul graphe reste lui-même, sous le nom demandé", () => {
    const A = jouet([[-4.3, 48.2], [-4.29, 48.2]], [[0, 1]], [{ a: 0, g: [-4.295, 48.2] }], "A");
    const f = fusionnerGraphes([A], "tout");
    expect(f.n).toHaveLength(2);
    expect(f.l[0].a).toBe(0);
    expect(f.territoire).toBe("tout");
  });
});

/* ════════════════════════════════════════════════════════════════════════
   LA RECETTE SUR LES VRAIS FICHIERS

   ⚠️ `public/bretagne/` est dans `.gitignore` : ces fichiers ne sont PAS sur
      la machine d'intégration. Ce bloc se saute alors, et il le DIT dans son
      nom — un garde qui se tait quand il ne lit rien dit oui à tout.
   ⭐ Les gardes qui comptent sont au-dessus, sur des fixtures de six nœuds.
      Celui-ci ajoute l'ÉCHELLE : il a compté 279 violations avant le
      correctif, et il doit en compter une — « Grotte de l'Éléphant », à
      150 m, qui vient de la moisson et non de la couture.
   ════════════════════════════════════════════════════════════════════════ */
const DOSSIER = new URL("../public/bretagne/g/", import.meta.url);
const presents = ["presquile", "aulne"].every((t) => existsSync(new URL(`${t}.json`, DOSSIER)));

/**
 * 🔴 CHARGÉS PARESSEUSEMENT, ET CE N'EST PAS UNE COQUETTERIE — appris en
 *    cassant le déploiement du 4/11. `describe.skipIf` saute les TESTS, pas
 *    le CORPS du `describe` : celui-ci s'exécute à la collecte, toujours.
 *    Un `readFileSync` écrit là jetait donc un ENOENT sur la machine
 *    d'intégration, où `public/bretagne/` n'existe pas — suite en échec,
 *    build refusé, alors que les 325 tests passaient sur mon poste.
 * ⭐ UN GARDE CONDITIONNEL DOIT L'ÊTRE JUSQU'AU BOUT. « Sauté » ne veut rien
 *    dire si la préparation, elle, a déjà couru. Et le piège ne se voit que
 *    là où la condition est FAUSSE — c'est-à-dire jamais sur la machine où
 *    on l'écrit.
 */
let cache: Graphe[] | null = null;
const lireLesGraphes = () =>
  (cache ??= ["presquile", "aulne"].map(
    (t) => JSON.parse(readFileSync(new URL(`${t}.json`, DOSSIER), "utf8")) as Graphe,
  ));

describe.skipIf(!presents)("la couture sur les graphes réellement moissonnés", () => {

  /**
   * 🔴 LA BANDE NE CHANGE PAS LE RÉSEAU — 5/11/2026, et c'est la seule
   *    propriété qui autorisait l'optimisation.
   *
   * La soudure n'indexe plus que les nœuds dont la longitude tombe dans la
   * bande commune aux deux graphes (3,9× plus rapide). Elle rend donc DEUX
   * nœuds de plus — des doublons internes à `presquile.json`, hors bande.
   * ⭐ Un compte de nœuds ne dit rien d'un réseau : ce qu'il faut tenir,
   *    c'est que les mêmes ARÊTES se touchent. Les deux doublons sont des
   *    POINTS DE FORME (l'un dans la polyligne d'une arête qui finit déjà
   *    sur son jumeau, l'autre deux fois de suite dans la même polyligne) —
   *    aucun n'est un carrefour, donc aucune jonction n'apparaît ni ne
   *    disparaît. Vérifié A/B : mêmes trois plus grandes composantes
   *    (26 017, 296, 180) dans les deux implémentations.
   */
  it("🔴 la soudure croise toujours les deux graphes, et le réseau est le même", () => {
    const f = fusionnerGraphes(lireLesGraphes(), "tout");
    const brut = lireLesGraphes().reduce((s, g) => s + g.n.length, 0);

    /* ⛔ LE CHIFFRE QUI COMPTE EST LE NOMBRE DE SOUDURES, pas le nombre de
       nœuds restants : c'est lui qui dit que les deux moitiés se sont
       rencontrées. Une bande mal calculée le ferait tomber à zéro en
       laissant un compte de nœuds parfaitement plausible. */
    expect(brut - f.n.length, "les deux graphes ne se soudent plus")
      .toBeGreaterThan(19_000);

    /* La couture ne crée ni ne détruit d'arête ni de lieu. */
    expect(f.a.length).toBe(lireLesGraphes().reduce((s, g) => s + g.a.length, 0));
    expect(f.l.length).toBe(lireLesGraphes().reduce((s, g) => s + g.l.length, 0));

    /* 🔴 LE GARDE SE CALIBRE SUR LA SOUDURE EXHAUSTIVE, PAS SUR UN NOMBRE.
       Première écriture : « plus de 19 000 soudures ». Elle a LAISSÉ PASSER
       la mutation qui tire la bande des emprises déclarées de
       `territoires.ts` au lieu des nœuds — 19 152 soudures au lieu de
       19 869, soit **717 perdues** dans le débord à l'est, et un compte
       parfaitement plausible.
       ⭐ Un seuil choisi à la main vieillit à la première moisson et ne sait
          pas ce qu'il devrait valoir. Ici le test RECALCULE la référence :
          la bande a le droit de manquer les doublons INTERNES à un fichier
          (hors bande, donc jamais confrontés), et rien d'autre. */
    const exhaustif = (() => {
      const vus = new Set<string>();
      let total = 0, soudes = 0;
      for (const g of lireLesGraphes()) {
        for (const [lon, lat] of g.n) {
          total++;
          const k = `${lon},${lat}`;
          if (vus.has(k)) soudes++; else vus.add(k);
        }
      }
      return { total, soudes };
    })();
    const interneHorsBande = 2;   // mesuré : deux POINTS DE FORME de presquile.json
    expect(
      exhaustif.soudes - (exhaustif.total - f.n.length),
      "la bande rate des soudures que la couture exhaustive trouve — elle est mal calculée",
    ).toBeLessThanOrEqual(interneHorsBande);
  }, 120_000);

  /**
   * ⚠️ LA DISTANCE SE MESURE À LA POLYLIGNE, PAS AUX DEUX BOUTS — et la
   *    première écriture de ce test faisait l'erreur. Une arête du graphe
   *    n'est pas un segment : c'est un chemin avec ses points intermédiaires
   *    (case 4), parfois long de centaines de mètres. Un lieu accroché à son
   *    MILIEU est légitimement loin de ses extrémités. Résultat : 16 faux
   *    positifs sur le graphe pourtant CORRIGÉ, que j'ai failli lire comme
   *    un correctif incomplet.
   * ⭐ Une mesure juste rapportée au mauvais objet produit une certitude, et
   *    on ne rouvre pas une certitude. Vérifié en recalculant les deux
   *    formes : aux bouts 16, à la polyligne 0.
   */
  const distanceAuChemin = (p: [number, number], pts: [number, number][]) => {
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      const ab = metres(a, b);
      if (ab === 0) { best = Math.min(best, metres(p, a)); continue; }
      /* projection sur le segment, en coordonnées locales approximées par
         les distances mesurées — suffisant pour un seuil de 200 m */
      const ap = metres(a, p), bp = metres(b, p);
      // loi des cosinus : la hauteur du triangle sur le côté [a,b]
      const t = Math.max(0, Math.min(1, (ap * ap - bp * bp + ab * ab) / (2 * ab * ab)));
      const h2 = ap * ap - (t * ab) * (t * ab);
      best = Math.min(best, Math.sqrt(Math.max(0, h2)));
    }
    return best;
  };

  it("🔴 aucun lieu n'est à plus de 200 m du CHEMIN qu'il déclare", () => {
    const f = fusionnerGraphes(lireLesGraphes(), "tout");
    const loin = f.l.filter((li) => {
      const ar = f.a[li.a];
      if (!ar) return true;
      const pts = [f.n[ar[0]], ...ar[4].map((i) => f.n[i]), f.n[ar[1]]].filter(Boolean);
      return distanceAuChemin(li.g, pts) > 200;
    });
    expect(
      loin.map((li) => li.n).slice(0, 8),
      `${loin.length} lieux sur ${f.l.length} pointent une arête qui n'est pas la leur`,
    ).toEqual([]);
  });

  it("🔴 le territoire fusionné forme UN réseau, pas deux", () => {
    const graphes = lireLesGraphes();
    const f = fusionnerGraphes(graphes, "tout");
    const avant = graphes.reduce((s, g) => s + g.n.length, 0);
    expect(f.n.length, "des nœuds en double subsistent").toBeLessThan(avant);

    const voisins = new Map<number, number[]>();
    for (const ar of f.a) {
      (voisins.get(ar[0]) ?? voisins.set(ar[0], []).get(ar[0])!).push(ar[1]);
      (voisins.get(ar[1]) ?? voisins.set(ar[1], []).get(ar[1])!).push(ar[0]);
    }
    const vus = new Set<number>();
    const tailles: number[] = [];
    for (const d of voisins.keys()) {
      if (vus.has(d)) continue;
      let t = 0; const pile = [d]; vus.add(d);
      while (pile.length) {
        const x = pile.pop()!; t++;
        for (const v of voisins.get(x) ?? []) if (!vus.has(v)) { vus.add(v); pile.push(v); }
      }
      tailles.push(t);
    }
    tailles.sort((x, y) => y - x);
    /* ⛔ LE TEST N'EST PAS « UNE SEULE COMPOSANTE » : un réseau de chemins
       réel en compte des centaines (îles, impasses isolées, sentiers coupés
       par la moisson). Ce qui se vérifie, c'est qu'il n'y a plus DEUX GROSSES
       composantes de taille comparable — la signature des deux moitiés qui
       s'ignorent. Avant correctif : 17 271 et 10 595. */
    expect(
      tailles[1] / tailles[0],
      `deux composantes majeures subsistent : ${tailles[0]} et ${tailles[1]}`,
    ).toBeLessThan(0.2);
  });
});

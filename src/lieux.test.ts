import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import inventaire from "./lieux.json";
import type { Inventaire } from "./lieux";
import { nommer, lienWiki } from "./lieux";

const inv = inventaire as unknown as Inventaire;

/**
 * ⭐ CE FICHIER TIENT L'INVENTAIRE — la moitié que MANA apporte face aux
 *    46 circuits de l'Office. Il protège surtout contre la règle de
 *    dédoublonnage, qui a détruit son propre sujet TROIS FOIS avant d'être
 *    juste (voir `scripts/lieux.py`).
 */
describe("l'inventaire des sites remarquables", () => {
  it("recense plus de mille lieux, dont des centaines nommés", () => {
    expect(inv.lieux.length).toBeGreaterThan(1200);
    expect(inv.lieux.filter((l) => l.n).length).toBeGreaterThan(500);
  });

  it("🔴 l'alignement de Lagatjar n'est pas écrasé en un seul point", () => {
    // Trois règles de dédoublonnage l'ont absorbé : proximité (84 mégalithes
    // ramenés à 23), puis « un nœud cède à une surface », puis « seulement si
    // la surface est fermée » — Lagatjar EST un polygone fermé autour du champ.
    // ⭐ Un alignement de menhirs, c'est beaucoup de menhirs : c'est le sujet.
    const meg = inv.lieux.filter((l) => l.c === "megalithe");
    expect(meg.length).toBeGreaterThanOrEqual(80);
    expect(meg.some((l) => l.n?.includes("Lagatjar"))).toBe(true);
  });

  it("⛔ aucun robinet, aucune borne, aucune ligne de falaise", () => {
    // Comptés avant d'être refusés : drinking_water 30, milestone 27 (zéro
    // nommé), cliff 48. ⭐ Une catégorie n'est pas un sujet.
    const cats = new Set(inv.lieux.map((l) => l.c));
    for (const interdit of ["drinking_water", "milestone", "cliff", "pier", "slipway"]) {
      expect(cats.has(interdit), interdit).toBe(false);
    }
  });

  it("chaque lieu porte sa position, sa catégorie et sa source OSM", () => {
    for (const l of inv.lieux) {
      expect(inv.libelles[l.c], l.c).toBeTruthy();
      expect(l.osm, l.osm).toMatch(/^[nw]\d+$/);
      expect(l.g[0]).toBeGreaterThan(-4.70);
      expect(l.g[0]).toBeLessThan(-4.00);
      expect(l.g[1]).toBeGreaterThan(48.10);
      expect(l.g[1]).toBeLessThan(48.40);
    }
  });

  it("⚠️ un lieu anonyme se nomme par sa CATÉGORIE, jamais par sa clé", () => {
    // « megalithe » ne se montre pas à l'écran ; « Mégalithe » si.
    const anonyme = inv.lieux.find((l) => !l.n)!;
    expect(anonyme).toBeDefined();
    expect(nommer(anonyme, inv.libelles)).toBe(inv.libelles[anonyme.c]);
    expect(nommer(anonyme, inv.libelles)).not.toBe(anonyme.c);
  });

  it("l'attribution ODbL voyage avec l'inventaire", () => {
    expect(inv.attribution).toMatch(/OpenStreetMap/);
    expect(inv.attribution).toMatch(/ODbL/);
  });
});

describe("le lien vers l'article", () => {
  /**
   * ⛔ LA LANGUE EST DANS LA DONNÉE. Supposer « fr » ferait tomber les
   *    articles bretons ou anglais sur une page absente — et un lien mort est
   *    pire qu'un lien manquant : il donne l'air d'avoir cherché.
   */
  it("respecte la langue qu'OSM écrit", () => {
    expect(lienWiki("fr:Pointe de Pen-Hir")).toBe("https://fr.wikipedia.org/wiki/Pointe_de_Pen-Hir");
    expect(lienWiki("br:Menez Hom")).toBe("https://br.wikipedia.org/wiki/Menez_Hom");
    expect(lienWiki("en:Crozon")).toBe("https://en.wikipedia.org/wiki/Crozon");
  });

  it("retombe sur le français quand le préfixe manque", () => {
    expect(lienWiki("Crozon")).toBe("https://fr.wikipedia.org/wiki/Crozon");
  });

  /** ⚠️ Un article nommé « Cap de la Chèvre » ne s'écrit pas comme il se lit. */
  it("encode ce qui doit l'être", () => {
    expect(lienWiki("fr:Cap de la Chèvre")).toBe(
      "https://fr.wikipedia.org/wiki/Cap_de_la_Ch%C3%A8vre",
    );
  });

  /**
   * 🔴 LES 45 LIENS DE L'INVENTAIRE SONT CONSTRUITS, PAS SUPPOSÉS. Ce test
   *    les passe tous : un seul `wiki` d'une forme imprévue produirait une
   *    adresse muette, et personne ne clique assez pour s'en apercevoir.
   */
  it("tient sur les 45 articles réels de l'inventaire", () => {
    const avec = inv.lieux.filter((l) => l.wiki);
    expect(avec.length).toBeGreaterThan(20);
    for (const l of avec) {
      const u = lienWiki(l.wiki!);
      expect(u, `${l.n} → ${l.wiki}`).toMatch(/^https:\/\/[a-z-]{2,10}\.wikipedia\.org\/wiki\/.+/);
      expect(u, `${l.n}`).not.toMatch(/\s|undefined|wiki\/$/);
    }
  });
});

describe("viser un lieu sur la carte du territoire", () => {
  const src = readFileSync(new URL("./Territoire2030.tsx", import.meta.url), "utf8");

  /**
   * 🔴 LE POINTAGE DOIT EMPLOYER LA PROJECTION QUI A DESSINÉ L'IMAGE.
   *    Elle dépend de l'emprise du graphe, du cosinus à la latitude moyenne,
   *    de l'échelle, des marges ET de l'état de la vue. Une seconde version
   *    écrite à côté pour le pointage tomberait juste aujourd'hui et faux au
   *    premier changement de cadrage — et le décalage serait de quelques
   *    pixels, donc invisible jusqu'à ce qu'on clique à côté d'un menhir.
   * ⭐ Le dessin DÉPOSE donc sa projection ; le clic s'en sert.
   */
  it("le clic réutilise la projection du dernier rendu", () => {
    expect(src).toMatch(/proj\.current = \{ X, Y \}/);
    expect(src).toMatch(/const P = proj\.current/);
  });

  /**
   * ⚠️ L'EFFET QUI POSE LES ÉCOUTEURS NE TOURNE QU'UNE FOIS. Un gestionnaire
   *    lisant `sitesIci` directement capturerait le tableau VIDE du premier
   *    rendu — et le défaut serait MUET : un clic qui ne fait rien, exactement
   *    comme avant qu'on ajoute la fonction.
   */
  /* 🔴 RETOURNÉ LE 4/11/2026, PAS SUPPRIMÉ. Le `ref` porte désormais une
     TROISIÈME clé, `visibles` — la liste réellement dessinée — et c'est elle
     que le pointage parcourt depuis qu'un clic pouvait ouvrir la fiche d'un
     site masqué par le filtre. La règle que ce test protège n'a pas bougé
     d'un pouce : le gestionnaire posé une seule fois doit lire l'inventaire
     D'AUJOURD'HUI. Seul l'endroit où il le lit a changé. */
  it("le pointage lit l'inventaire d'aujourd'hui, pas celui du premier rendu", () => {
    expect(src).toMatch(/vivant\.current = \{ sites: sitesIci, visibles: sitesVisibles, inv \}/);
    expect(src).toMatch(/for \(const l of vivant\.current\.visibles\)/);
  });

  /**
   * ⛔ 734 lieux n'ont pas de nom : les viser n'apprendrait rien.
   * 🔴 ET LA PREMIÈRE VERSION DE CE TEST LISAIT DEUX FONCTIONS. Elle
   *    découpait de `const viser` à `const haut` — or `const survol` se
   *    glisse entre les deux, et il porte le MÊME `if (!l.n) continue`.
   *    Retiré de `viser`, celui de `survol` répondait à sa place : la
   *    mutation n'a pas fait échouer le test. ⭐ Un garde dont la fenêtre
   *    contient un second bloc semblable ne peut pas dire lequel il a
   *    vérifié — c'est « la règle qui gagne » transposée au découpage de
   *    source. La fenêtre s'arrête donc à `const survol`.
   */
  /* 🔴 RETOURNÉ LE 4/11/2026 — ET LA RAISON VAUT D'ÊTRE DITE. Le filtre
     `if (!l.n) continue` a quitté `viser()` et `survol()` : il est remonté
     dans `sitesVisibles`, le memo qui alimente À LA FOIS le GeoJSON dessiné
     par maplibre et la liste parcourue au clic. Ce n'est pas une
     réécriture de confort — c'est la correction d'un défaut mesuré : les
     deux listes étant tenues séparément, le filtre par genre masquait les
     pastilles sans rien changer aux cibles, et on ouvrait la fiche d'un
     site invisible.
     ⭐ LE TEST SUIT LA RÈGLE, PAS SA LIGNE. « Les lieux sans nom ne sont pas
        visables » est toujours vrai ; il se vérifie maintenant à l'endroit
        unique qui le décide, et le test exige EN PLUS que les deux
        consommateurs lisent bien cette liste-là — ce que l'ancienne forme ne
        pouvait pas demander, puisqu'il n'y avait pas de liste unique. */
  it("ne vise que les lieux nommés, et les deux lecteurs lisent la même liste", () => {
    expect(src).toMatch(/const sitesVisibles = useMemo\(/);
    const visibles = src.slice(
      src.indexOf("const sitesVisibles = useMemo("),
      src.indexOf("vivant.current = {"),
    );
    expect(visibles.length, "la fenêtre de lecture est vide").toBeGreaterThan(80);
    expect(visibles).toMatch(/l\.n &&/);

    // ⛔ ET LES DEUX CONSOMMATEURS, NOMMÉMENT. Un seul d'entre eux relié à
    //    `sitesVisibles` laisserait exactement le défaut du 4/11 : dessiné
    //    d'un côté, visé de l'autre.
    expect(src, "le GeoJSON dessiné doit venir de sitesVisibles")
      .toMatch(/features: sitesVisibles\.map/);
    expect(
      src.match(/for \(const l of vivant\.current\.visibles\)/g)?.length,
      "viser() ET survol() doivent parcourir la liste visible",
    ).toBe(2);

    // ⭐ et le PLUS PROCHE, jamais le premier trouvé : sur la presqu'île les
    //    sites se touchent, et « le premier » dépend de l'ordre du fichier.
    //    ⚠️ Fenêtre arrêtée à `const survol` : lui aussi parcourt les sites,
    //       et un garde dont la fenêtre contient un second bloc semblable ne
    //       peut pas dire lequel il a vérifié (défaut vécu sur ce test même).
    const viser = src.slice(src.indexOf("const viser ="), src.indexOf("const survol ="));
    expect(viser).not.toContain("const survol");
    expect(viser).toMatch(/d2 < meilleur\.d2/);
  });

  /** ⚠️ Un glissement ne doit pas se terminer par un lieu visé au hasard. */
  it("distingue un clic d'un déplacement", () => {
    expect(src).toMatch(/Math\.hypot\(e\.clientX - d\.x, e\.clientY - d\.y\) > 5/);
  });
});

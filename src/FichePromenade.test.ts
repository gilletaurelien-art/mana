/**
 * LA FICHE — ce qui doit rester vrai quand personne ne regarde.
 *
 * ⭐ Deux règles de PRODUIT, et les règles de produit vieillissent plus vite
 *    que le code : une promenade renommée, un identifiant d'image retouché à
 *    la main, et la fiche perd sa photographie en silence — ou, bien pire,
 *    en garde une qui ne montre pas ce parcours.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { WALKS } from "./walks";
import { ILLUSTRATIONS } from "./illustrations";
import { routePromenade, routeEnChemin } from "./router";

describe("les deux routes d'une promenade", () => {
  /**
   * 🔴 LE DÉFAUT QUE CE TEST EMPÊCHE NE SE VOIT QUE DEHORS. Si
   *    `routePromenade` capturait aussi `/en-chemin`, l'ordre des branches
   *    dans App déciderait de tout : quelqu'un qui appuie sur « Partir » au
   *    départ du sentier retomberait sur la fiche, sans GPS, sans comprendre.
   *    C'est le genre de régression qu'on introduit en « simplifiant » une
   *    expression régulière six mois plus tard.
   */
  it("⛔ la fiche ne capture PAS l'écran de navigation", () => {
    expect(routePromenade("/promenade/ile-vierge")).toBe("ile-vierge");
    expect(routePromenade("/promenade/ile-vierge/en-chemin")).toBeNull();
    expect(routeEnChemin("/promenade/ile-vierge/en-chemin")).toBe("ile-vierge");
    expect(routeEnChemin("/promenade/ile-vierge")).toBeNull();
  });

  it("la barre oblique finale ne change rien", () => {
    expect(routePromenade("/promenade/saint-fiacre/")).toBe("saint-fiacre");
    expect(routeEnChemin("/promenade/saint-fiacre/en-chemin/")).toBe("saint-fiacre");
  });

  it("⛔ « Partir » mène à la navigation, jamais à la fiche elle-même", () => {
    const src = readFileSync("src/FichePromenade.tsx", "utf8");
    expect(src).toContain("/en-chemin`}");
    // une fiche qui se lie à elle-même est un bouton qui ne fait rien
    expect(src).not.toMatch(/href=\{`\$\{base\}\/promenade\/\$\{walk\.slug\}`\}/);
  });
});

describe("les illustrations des promenades", () => {
  it("chaque promenade illustrée existe vraiment", () => {
    const slugs = new Set(WALKS.map((w) => w.slug));
    for (const s of Object.keys(ILLUSTRATIONS)) {
      expect(slugs.has(s), `« ${s} » n'est plus une promenade — son illustration est orpheline`).toBe(true);
    }
  });

  /**
   * ⚠️ CE TEST SE TAIT SI LE MANIFESTE N'EST PAS LÀ, et c'est le seul endroit
   *    du dépôt où c'est juste : il vérifie une COHÉRENCE entre deux fichiers,
   *    et l'absence de l'un est déjà signalée, nommément, par
   *    `bibliotheque.test.ts`. Le signaler deux fois ferait deux rouges pour
   *    une cause — et on apprend à ignorer le second.
   */
  it("🔴 toute image de couverture est DOCUMENTAIRE et existe", () => {
    if (!existsSync("src/images/bibliotheque.json")) return;
    const biblio = JSON.parse(readFileSync("src/images/bibliotheque.json", "utf8"));
    const par = new Map(biblio.images.map((i: any) => [i.id, i]));
    for (const [slug, ill] of Object.entries(ILLUSTRATIONS)) {
      for (const id of [ill.couverture, ...(ill.corps ?? [])].filter(Boolean) as string[]) {
        const im: any = par.get(id);
        expect(im, `${slug} : « ${id} » n'est pas dans la bibliothèque`).toBeTruthy();
        // ⛔ Une image d'ambiance en couverture de fiche laisserait croire
        //    qu'elle montre CE parcours. C'est l'interdit central du brief.
        expect(im.documentaire, `${slug} : « ${id} » est une image d'ambiance`).toBe(true);
        expect(im.lieu, `${slug} : « ${id} » n'a pas de lieu`).toBeTruthy();
      }
    }
  });

  it("une promenade sans illustration est un CHOIX, pas un oubli", () => {
    // ⭐ Le test ne réclame pas que les quatre soient illustrées : il constate
    //    l'état et refuse qu'il se dégrade sans qu'on le sache. Deux sur
    //    quatre au 31/10/2026 — si ce nombre tombe, quelque chose a cassé ;
    //    s'il monte, il se met à jour en connaissance.
    const illustrees = WALKS.filter((w) => ILLUSTRATIONS[w.slug]?.couverture).length;
    expect(illustrees, "des promenades ont perdu leur couverture").toBeGreaterThanOrEqual(2);
  });
});

/**
 * 🔴 LE FICHIER DONNÉ AUX ROBOTS D'IA EST UNE PAGE PUBLIQUE, et il ment plus
 *    longtemps que les autres parce que personne ne le lit.
 *    Trouvé le 31/10/2026 : `llms.txt` annonçait deux promenades — « GR34 —
 *    Presqu'île de Crozon » et « Pointe du Raz » — dont AUCUNE n'existe, et
 *    aucune des quatre réelles. Il décrivait aussi une « alerte hors-sentier à
 *    50 m » supprimée depuis, avec sa vibration.
 * ⭐ Une note périmée dans le code coûte une demi-heure à un développeur ; la
 *    même dans un fichier destiné aux moteurs est reprise et republiée.
 */
describe("le fichier servi aux robots d'IA", () => {
  it("🔴 n'annonce que des promenades qui existent", () => {
    const txt = readFileSync("public/llms.txt", "utf8");
    const slugs = new Set(WALKS.map((w) => w.slug));
    const annonces = [...txt.matchAll(/\/promenade\/([a-z0-9-]+)/g)].map((m) => m[1]);
    expect(annonces.length, "llms.txt n'annonce plus aucune promenade").toBeGreaterThan(0);
    for (const a of annonces) {
      expect(slugs.has(a), `llms.txt annonce « ${a} », qui n'existe pas`).toBe(true);
    }
  });

  it("⛔ ne décrit plus l'alerte hors-sentier supprimée", () => {
    const txt = readFileSync("public/llms.txt", "utf8");
    expect(txt).not.toMatch(/alerte hors-sentier à 50\s*m/i);
  });
});

/**
 * 🔴 L'ATTRIBUTION DOIT VOYAGER DANS L'ARTEFACT. Un GPX exporté survit à la
 *    page qui l'a produit : il part dans une montre, un courriel, un autre
 *    logiciel. L'ODbL demande que l'attribution suive la DONNÉE — un crédit
 *    affiché seulement à l'écran ne suit rien.
 * ⭐ Trouvé le 31/10 : le GPX n'en portait aucune depuis le début, alors que
 *    la règle était écrite et respectée partout ailleurs. Une règle appliquée
 *    sur cinq surfaces et oubliée sur la sixième ne se voit pas — sauf par un
 *    test qui compte les porteurs.
 */
describe("le GPX exporté", () => {
  it("🔴 embarque l'attribution OpenStreetMap et la licence ODbL", () => {
    const src = readFileSync("src/Promenade.tsx", "utf8");
    const gpx = src.slice(src.indexOf("function enGpx"), src.indexOf("function telecharger"));
    expect(gpx).toMatch(/OpenStreetMap/);
    expect(gpx).toMatch(/odbl/i);
    expect(gpx).toContain("<copyright");
    expect(gpx).toContain("<desc>");
  });

  it("⛔ et il ne porte TOUJOURS aucune altitude inventée", () => {
    const src = readFileSync("src/Promenade.tsx", "utf8");
    const gpx = src.slice(src.indexOf("function enGpx"), src.indexOf("function telecharger"));
    /* ⚠️ ON ÉCARTE LES COMMENTAIRES, SINON LE TEST S'ATTRAPE LUI-MÊME. Premier
       jet : rouge, parce que la fonction porte un commentaire « PAS DE <ele> »
       expliquant précisément pourquoi elle n'en met pas.
       ⭐ Le même piège que le relevé des `guardedAnswer()` du dépôt principal :
          un fichier qui explique pourquoi il n'a pas quelque chose CONTIENT
          le nom de cette chose. Un motif nu compte les deux. */
    const code = gpx
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join("\n");
    expect(code).not.toMatch(/<ele>/);
  });
});

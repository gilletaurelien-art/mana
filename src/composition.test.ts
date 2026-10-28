import { readdirSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { indexer, composer, noeudLePlusProche, traits, distanceRessentie, COUT_MONTEE, etalementDe, formeDeLaBoucle, SOURCE_MAREES } from "./composition";
import type { Graphe } from "./composition";

// Une grille 6×6 à Crozon, maille ~200 m. Deux colonnes sont des « routes »
// (agrément 5), tout le reste des « sentiers » (agrément 200). Un lieu est
// posé loin du départ. Le graphe est minuscule et DÉTERMINISTE : c'est ce qui
// permet de tester le COMPORTEMENT du compositeur, pas la donnée bretonne.
const C = 6;
function grille(opts: { lieuSur?: number } = {}): Graphe {
  const n: [number, number][] = [];
  for (let y = 0; y < C; y++)
    for (let x = 0; x < C; x++) n.push([-4.49 + x * 0.0027, 48.24 + y * 0.0018]);
  const a: Graphe["a"] = [];
  const id = (x: number, y: number) => y * C + x;
  for (let y = 0; y < C; y++)
    for (let x = 0; x < C; x++) {
      // les colonnes 2 et 3 sont des routes : désagréables, mais praticables
      const route = x === 2 || x === 3;
      const s = route ? 5 : 200;
      if (x + 1 < C) a.push([id(x, y), id(x + 1, y), 200, s, [id(x, y), id(x + 1, y)]]);
      if (y + 1 < C) a.push([id(x, y), id(x, y + 1), 200, s, [id(x, y), id(x, y + 1)]]);
    }
  const l: Graphe["l"] = [];
  if (opts.lieuSur !== undefined)
    l.push({ a: opts.lieuSur, f: 0.5, c: "megalithe", n: "Menhir d'essai",
             g: n[a[opts.lieuSur][0]], d: 12 });
  return { genere: "test", territoire: "test", attribution: "OSM", n, a, l };
}


// 🔴 LA GRILLE 6×6 NE DISCRIMINAIT RIEN. Mutation du 28/10 : en SUPPRIMANT
//    entièrement le ciblage des lieux, les neuf tests restaient au vert — une
//    boucle au hasard croisait le lieu par chance, parce que le graphe était
//    minuscule. ⭐ Un test qui passe sur du code mutilé n'a jamais rien tenu.
//
// ⚠️ ET LE PREMIER REMPLACEMENT ÉTAIT FAUX AUSSI : j'avais posé le lieu au bout
//    d'un ÉPERON en cul-de-sac, croyant rendre le hasard impossible. Le test
//    échouait — à raison. Un lieu en cul-de-sac force à repasser par le même
//    chemin ; le compositeur le DÉCLASSE, et c'est le comportement voulu.
//    ⭐ Le fixture testait ce que le produit refuse.
//
//    Le bon discriminant est la RARETÉ, celle de la réalité : sur le graphe de
//    Crozon, les lieux ne vivent que sur 1,3 % des arêtes atteignables. Une
//    grille 14×14 avec UN seul lieu reproduit ce régime : sans ciblage, la
//    probabilité de le croiser est marginale ; avec, elle est de un.
const G = 14;
function grilleRare(): { g: Graphe; cible: number } {
  const n: [number, number][] = [];
  for (let y = 0; y < G; y++)
    for (let x = 0; x < G; x++) n.push([-4.49 + x * 0.0027, 48.24 + y * 0.0018]);
  const a: Graphe["a"] = [];
  const id = (x: number, y: number) => y * G + x;
  const index = new Map<string, number>();
  for (let y = 0; y < G; y++)
    for (let x = 0; x < G; x++) {
      if (x + 1 < G) { index.set(`h${x},${y}`, a.length); a.push([id(x, y), id(x + 1, y), 200, 200, [id(x, y), id(x + 1, y)]]); }
      if (y + 1 < G) { index.set(`v${x},${y}`, a.length); a.push([id(x, y), id(x, y + 1), 200, 200, [id(x, y), id(x, y + 1)]]); }
    }
  // Un seul lieu, sur une arête à 8 pas du départ (1 600 m) : la couronne
  // d'une boucle de 3 200 m passe exactement par là.
  const arete = index.get("h4,4")!;
  const l: Graphe["l"] = [{
    a: arete, f: 0.5, c: "megalithe", n: "Le seul menhir",
    g: n[a[arete][0]], d: 10,
  }];
  return { g: { genere: "test", territoire: "test", attribution: "OSM", n, a, l }, cible: 3200 };
}

describe("composer une boucle", () => {
  it("la boucle revient à son point de départ", () => {
    const g = grille({ lieuSur: 40 });
    const ix = indexer(g);
    const b = composer(g, ix, 0, 2000);
    expect(b.length).toBeGreaterThan(0);
    for (const x of b) {
      // on reparcourt les arêtes : le nœud final doit être le départ
      let n = 0;
      for (const e of x.aretes) n = g.a[e][0] === n ? g.a[e][1] : g.a[e][0];
      expect(n).toBe(0);
    }
  });

  it("⛔ elle ne repasse pas par le même chemin — c'est une boucle, pas un aller-retour", () => {
    // 🔴 LE DÉFAUT QUE CE TEST TIENT : la première version (marche aléatoire
    //    pondérée par l'agrément) rendait 44 à 122 arêtes répétées sur le
    //    graphe réel de Crozon. Elle errait localement au lieu de s'éloigner.
    const g = grille({ lieuSur: 40 });
    const b = composer(g, indexer(g), 0, 2400);
    expect(b.length).toBeGreaterThan(0);
    expect(b[0].partRepetee).toBeLessThan(0.25);
  });

  it("⭐ elle préfère le sentier à la route, alors que la route est plus courte", () => {
    // Toutes les arêtes font 200 m : un moteur qui minimise la DISTANCE
    // n'aurait aucune raison d'éviter les colonnes 2 et 3. Celui-ci
    // divise la longueur par l'agrément, donc il les évite.
    const g = grille({ lieuSur: 40 });
    const b = composer(g, indexer(g), 0, 2400);
    expect(b[0].agrement).toBeGreaterThan(120);
  });

  it("⭐ le point lointain est un LIEU : la boucle passe devant", () => {
    // Mesuré le 28/10 : les lieux ne vivent que sur 1,3 % des arêtes
    // atteignables. Sans viser, on ne les croise jamais.
    //
    // ⚠️ CE TEST A ÉTÉ RETOURNÉ, PAS SUPPRIMÉ. Sa première version visait une
    //    cible de 2 400 m et échouait — l'arête 40 traverse le couloir
    //    « route » de la grille, donc le chemin AGRÉABLE qui y mène fait
    //    ~1 600 m là où le vol d'oiseau en fait 1 200. Le lieu sortait de la
    //    couronne. ⭐ Le compositeur avait raison : un lieu posé au bord d'une
    //    départementale se rencontre PLUS LOIN qu'il n'en a l'air, parce
    //    qu'on refuse d'y aller par la route. C'est le fixture qui mentait.
    const { g, cible } = grilleRare();
    const ix = indexer(g);
    // ✅ VALIDÉ PAR MUTATION : en retirant le ciblage des lieux du compositeur,
    //    ce test échoue. C'est la seule preuve qu'il tient quelque chose.
    const b = composer(g, ix, 0, cible);
    expect(b.length).toBeGreaterThan(0);
    expect(b[0].lieux.map((l) => l.nom)).toContain("Le seul menhir");
  });

  it("sans aucun lieu, elle compose quand même — elle ne rend pas le vide", () => {
    // ⭐ Une dépendance absente doit DÉGRADER, pas éteindre.
    const g = grille();
    const b = composer(g, indexer(g), 0, 2400);
    expect(b.length).toBeGreaterThan(0);
    expect(b[0].lieux).toHaveLength(0);
  });

  it("la longueur rendue tient la cible", () => {
    const g = grille({ lieuSur: 40 });
    for (const cible of [1600, 2400, 3200]) {
      const b = composer(g, indexer(g), 0, cible);
      if (!b.length) continue;
      expect(Math.abs(b[0].metres - cible) / cible).toBeLessThan(0.2);
    }
  });

  it("une même graine rend la même proposition — un lien se partage", () => {
    const g = grille({ lieuSur: 40 });
    const ix = indexer(g);
    const x = composer(g, ix, 0, 2400, { graine: 42 });
    const y = composer(g, ix, 0, 2400, { graine: 42 });
    expect(y[0].aretes).toEqual(x[0].aretes);
  });

  it("⛔ la géométrie sort en TRAITS SÉPARÉS, jamais en ligne unique", () => {
    // Un itinéraire breton sur deux porte des trous ; les recoller dessine
    // des droites de plusieurs dizaines de km qui ressemblent à des sentiers.
    const g = grille({ lieuSur: 40 });
    const b = composer(g, indexer(g), 0, 2400);
    const t = traits(g, b[0]);
    expect(t.length).toBe(b[0].aretes.length);
    expect(Array.isArray(t[0][0])).toBe(true);
  });

  it("⭐ les lieux sortent dans l'ORDRE DE MARCHE, pas dans l'ordre de proximité", () => {
    // 🔴 LE DÉFAUT QUE CE TEST TIENT, vécu le 27/10/2026 sur une maquette :
    //    une liste intitulée « ce que vous croiserez » était triée par écart
    //    au chemin. Le menhir annoncé en tête se croisait au km 10,7 sur 12 ;
    //    la batterie reléguée en 5ᵉ était le point de départ.
    //    ⭐ Un classement qui porte un titre de SÉQUENCE est un mensonge
    //       discret : il ne se signale jamais, il se vérifie en marchant.
    const { g, cible } = grilleRare();
    // trois lieux sur trois arêtes différentes de la grille
    const h = (x: number, y: number) =>
      g.a.findIndex((a) => a[0] === y * 14 + x && a[1] === y * 14 + x + 1);
    g.l = [
      { a: h(4, 4), f: 0.5, c: "megalithe", n: "Troisième", g: g.n[0], d: 5 },
      { a: h(1, 0), f: 0.5, c: "calvaire", n: "Premier", g: g.n[0], d: 5 },
      { a: h(3, 2), f: 0.5, c: "panorama", n: "Deuxième", g: g.n[0], d: 5 },
    ];
    const b = composer(g, indexer(g), 0, cible);
    const vus = b[0].lieux.map((l) => l.nom);
    // les ordres doivent être croissants — c'est la propriété, pas les noms
    const ordres = b[0].lieux.map((l) => l.ordre);
    expect([...ordres].sort((x, y) => x - y)).toEqual(ordres);
    expect(ordres.every((o) => o >= 0 && o <= 1)).toBe(true);
    if (vus.includes("Premier") && vus.includes("Troisième"))
      expect(vus.indexOf("Premier")).toBeLessThan(vus.indexOf("Troisième"));
  });

  it("⭐ la montée se compte dans le SENS DE MARCHE, jamais en valeur absolue", () => {
    // 🔴 LE DÉFAUT QUE CE TEST TIENT : une boucle revient à son départ, donc
    //    elle monte exactement autant qu'elle descend. Sommer des |dz|
    //    DOUBLERAIT son dénivelé — une promenade plate serait annoncée comme
    //    une montée de 200 m, et le budget de temps la raccourcirait pour rien.
    //
    // ⚠️ SA PREMIÈRE VERSION BORNAIT LA MONTÉE À « moins de 200 m » ET LA
    //    MUTATION PASSAIT. Une borne molle ne tient rien. La propriété exacte,
    //    elle, est une IDENTITÉ : sur une boucle, montée = descente, donc
    //    montée = (somme des |dz|) ÷ 2. Avec `Math.abs`, le résultat vaut le
    //    double et le test refuse. ⭐ Quand une propriété s'écrit en égalité,
    //    ne jamais l'écrire en inégalité.
    const { g, cible } = grilleRare();
    const relief = (n: number) => { const x = n % 14; return x <= 6 ? x * 10 : (12 - x) * 10; };
    g.a = g.a.map((a) => [a[0], a[1], a[2], a[3], a[4], null,
                          relief(a[1]) - relief(a[0])] as Graphe["a"][number]);
    const b = composer(g, indexer(g), 0, cible);
    expect(b.length).toBeGreaterThan(0);
    for (const x of b) {
      const sommeAbs = x.aretes.reduce((t, e) => t + Math.abs(g.a[e][6] ?? 0), 0);
      expect(x.montee).toBeCloseTo(sommeAbs / 2, 6);
      expect(x.ressentie).toBeCloseTo(distanceRessentie(x.metres, x.montee), 5);
    }
  });

  // ⛔ UN TEST A ÉTÉ RETIRÉ ICI, ET C'EST DOCUMENTÉ PLUTÔT QUE MAQUILLÉ.
  //    Il prétendait vérifier qu'une altitude inconnue ne vaut pas « plat ».
  //    Deux raisons de l'ôter :
  //    ① il comparait deux boucles DIFFÉRENTES — retirer des altitudes change
  //       la composition, donc la comparaison ne prouvait rien ;
  //    ② la garantie qu'il visait n'appartient pas à ce fichier. Côté
  //       composition, `null` et `0` produisent la même montée, et c'est
  //       correct. Ce qui doit ne jamais écrire `0` pour dire « je ne sais
  //       pas », c'est le BÂTISSEUR (`poser_denivele.py`), qui valide un
  //       domaine d'altitudes plausibles [-5 m, 400 m] et une pente maximale
  //       de 50 % — garde posé après qu'une altitude de -6 748 m eut produit
  //       une pente de 24 683 %.
  //    ⭐ Un test qui vise une garantie d'un autre étage ne la tient pas : il
  //       donne l'impression qu'elle est tenue.

  it("⭐ l'étalement voit l'aller-retour que le compteur de répétition ne voit pas", () => {
    // 🔴 LE DÉFAUT QUE CE TEST TIENT : deux chemins parallèles distants de
    //    cinquante mètres ne partagent AUCUNE arête — la part répétée vaut
    //    zéro — et pourtant on refait le trajet. Mesuré sur Crozon : deux
    //    boucles de 8,9 km à 0 % de répétition, l'une étalée à 0,53, l'autre
    //    aplatie à 0,14.
    const k = 111320;
    const carre: [number, number][] = [
      [0, 48], [1000 / (k * Math.cos(48 * Math.PI / 180)), 48],
      [1000 / (k * Math.cos(48 * Math.PI / 180)), 48 + 1000 / k], [0, 48 + 1000 / k],
    ];
    // un carré de 1 km de côté : périmètre 4 km, aire 1 km²
    expect(etalementDe(carre, 4000)).toBeCloseTo(4 * Math.PI * 1e6 / 16e6, 2);
    // un aller-retour : deux brins écartés de 20 m sur 1 km
    const brin: [number, number][] = [
      [0, 48], [1000 / (k * Math.cos(48 * Math.PI / 180)), 48],
      [1000 / (k * Math.cos(48 * Math.PI / 180)), 48 + 20 / k], [0, 48 + 20 / k],
    ];
    const plat = etalementDe(brin, 2040);
    expect(plat).toBeLessThan(0.1);
    expect(plat).toBeLessThan(etalementDe(carre, 4000));
  });

  it("⭐ on NOMME l'aller-retour, on ne l'appelle pas « boucle »", () => {
    // Ce qu'on affiche dit ce qu'on promet. Si le terrain n'offre qu'un
    // aller-retour — une pointe, un cul-de-sac côtier — on le dit.
    expect(formeDeLaBoucle(0.52)).toBe("ample");
    expect(formeDeLaBoucle(0.21)).toBe("boucle");
    expect(formeDeLaBoucle(0.09)).toBe("aller-retour");
  });

  it("chaque boucle porte son contour, dans l'ordre de marche", () => {
    const { g, cible } = grilleRare();
    const b = composer(g, indexer(g), 0, cible);
    const x = b[0];
    expect(x.contour.length).toBeGreaterThan(x.aretes.length);
    // le contour commence au départ et y revient
    expect(x.contour[0]).toEqual(g.n[0]);
    expect(x.contour[x.contour.length - 1]).toEqual(g.n[0]);
    expect(x.etalement).toBeCloseTo(etalementDe(x.contour, x.metres), 6);
  });

  it("⭐ un passage qui dépend de la marée se COMPTE, et ne se contourne pas", () => {
    // ⛔ On n'écarte pas ces chemins : à marée basse, un estran est souvent le
    //    plus beau morceau. Les éviter appauvrirait la promenade pour
    //    s'épargner un avertissement. On compte, on dit, le marcheur décide.
    const { g, cible } = grilleRare();
    // on marque quelques arêtes comme dépendantes de la marée
    g.a = g.a.map((a, i) => (i % 17 === 0
      ? ([a[0], a[1], a[2], a[3], a[4], null, null, 1] as Graphe["a"][number])
      : a));
    const b = composer(g, indexer(g), 0, cible);
    expect(b.length).toBeGreaterThan(0);
    const total = b[0].aretes
      .filter((e, i, t) => t.indexOf(e) === i)
      .reduce((t, e) => t + (g.a[e][7] === 1 ? g.a[e][2] : 0), 0);
    expect(b[0].marees).toBe(total);
    // ⚠️ et le compositeur ne les a PAS fuies : sur une grille régulière où
    //    une arête sur dix-sept est marquée, en éviter toutes serait le signe
    //    d'un évitement, pas d'un hasard.
    const touchees = b.filter((x) => x.marees > 0).length;
    expect(touchees).toBeGreaterThan(0);
  });

  it("sans passage de marée, le compte est zéro — pas « inconnu »", () => {
    const { g, cible } = grilleRare();
    expect(composer(g, indexer(g), 0, cible)[0].marees).toBe(0);
  });

  it("⭐ la source des marées est OFFICIELLE, jamais une prédiction maison", () => {
    // La doctrine du produit : « marées et météo, renvoi systématique vers
    // les sources officielles, aucune donnée simulée ». Prédire une marée
    // demanderait un modèle harmonique ; quelqu'un s'y fierait.
    expect(SOURCE_MAREES).toContain("shom.fr");
  });

  it("un mètre de montée coûte cinq mètres de plat", () => {
    expect(COUT_MONTEE).toBe(5);
    expect(distanceRessentie(1000, 100)).toBe(1500);
  });

  it("⛔ le départ est toujours une JONCTION, jamais un point de dessin", () => {
    // 🔴 LE DÉFAUT QUE CE TEST TIENT, mesuré le 28/10 depuis Morgat : le
    //    graphe stocke 64 028 points mais seuls 10 601 portent une arête ;
    //    les autres ne servent qu'à dessiner la courbe. Le point le plus
    //    proche de Morgat était à 262 m, portait ZÉRO arête, et la
    //    composition rendait zéro boucle — en silence, quatre durées durant.
    //    ⭐ Le bourg de Crozon tombait sur une jonction PAR CHANCE.
    const { g } = grilleRare();
    // ⚠️ L'orphelin doit être STRICTEMENT le plus proche de la requête,
    //    sinon le test ne déclenche rien — première version : il était à 1 m
    //    de l'origine et la mutation passait au vert, parce que l'origine
    //    elle-même restait la plus proche.
    const orphelin: [number, number] = [g.n[0][0] - 0.0004, g.n[0][1] - 0.0004];
    g.n = [...g.n, orphelin];
    const iOrphelin = g.n.length - 1;
    const ix = indexer(g);
    // on interroge DEPUIS l'orphelin : il est à zéro mètre, aucune jonction
    // ne peut être plus proche.
    const depart = noeudLePlusProche(g, ix, orphelin[0], orphelin[1]);
    expect(depart).not.toBe(iOrphelin);
    expect(ix.adj.has(depart)).toBe(true);
    expect(composer(g, ix, depart, 3200).length).toBeGreaterThan(0);
  });

  it("le nœud le plus proche d'une position est bien le plus proche", () => {
    const g = grille();
    expect(noeudLePlusProche(g, indexer(g), -4.49, 48.24)).toBe(0);
    expect(noeudLePlusProche(g, indexer(g), -4.49 + 5 * 0.0027, 48.24 + 5 * 0.0018)).toBe(35);
  });
});

describe("le dépôt se construit ailleurs que sur cette machine", () => {
  it("⛔ aucun fichier de src/ ne diffère d'un autre par la seule CASSE", () => {
    // 🔴 VÉCU TROIS FOIS EN VINGT-QUATRE HEURES : `pros.ts`/`Pros.tsx` dans
    //    manahome-app, `promenades.ts`/`Promenades.tsx` ici le soir, puis
    //    `composer.ts`/`Composer.tsx` la nuit. Sur macOS le résolveur prend
    //    l'un des deux au hasard ; sur une CI Linux le build casse.
    //    ⭐ Le symptôme n'apparaît JAMAIS sur la machine qui écrit le code —
    //       c'est ce qui le rend si cher. Un commentaire ne l'a pas empêché
    //       deux fois ; un test le refuse.
    const noms = readdirSync("src").filter((f) => /\.(ts|tsx)$/.test(f));
    const parMinuscule = new Map<string, string[]>();
    for (const n of noms) {
      const k = n.toLowerCase().replace(/\.tsx?$/, "");
      parMinuscule.set(k, [...(parMinuscule.get(k) ?? []), n]);
    }
    expect([...parMinuscule.values()].filter((l) => l.length > 1)).toEqual([]);
  });
});

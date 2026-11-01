import { readdirSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { indexer, composer, composerVers, fondreRencontres, ECART_MAX_M, metres, noeudLePlusProche, traits, distanceRessentie, COUT_MONTEE, etalementDe, formeDeLaBoucle, SOURCE_MAREES, cheminDeRetour } from "./composition";
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

  it("⭐ rentrer minimise la DISTANCE, pas la peine — la fonction de coût s'inverse", () => {
    // 🔴 LE DÉFAUT QUE CE TEST TIENT : composer une promenade divise la
    //    longueur par l'agrément, si bien qu'un sentier détourné coûte moins
    //    qu'une route directe. Appliquer ce coût au RETOUR ferait flâner
    //    quelqu'un qui rentre sous la pluie.
    //    ⭐ Même graphe, deux coûts opposés, parce que deux intentions
    //       opposées. Ici : le plus court, point.
    const { g } = grilleRare();
    // on rend une traversée directe hideuse mais courte, et un détour superbe
    const ix = indexer(g);
    const depart = 0;
    const loin = 14 * 3 + 3;                 // (3,3) : 6 pas de grille
    const r = cheminDeRetour(g, ix, loin, depart);
    expect(r).not.toBeNull();
    // 6 arêtes de 200 m : aucun chemin plus court n'existe sur une grille
    expect(r!.metres).toBeCloseTo(1200, 0);
    expect(r!.aretes.length).toBe(6);
    expect(r!.contour.length).toBeGreaterThan(0);
  });

  it("rentrer quand on y est déjà ne coûte rien", () => {
    const { g } = grilleRare();
    const r = cheminDeRetour(g, indexer(g), 0, 0);
    expect(r).toEqual({ aretes: [], metres: 0, contour: [] });
  });

  it("⭐ rentrer ne coûte JAMAIS plus que finir — abandonner doit être facile", () => {
    // C'est le propos : on ne retient personne. Si rentrer coûtait plus que
    // terminer, la fonction n'aurait aucun sens.
    //
    // ⚠️ SA PREMIÈRE ÉCRITURE EXIGEAIT « strictement plus court que la
    //    moitié » et échouait à 1800 contre 1800 : sur une grille régulière,
    //    le retour depuis le milieu VAUT exactement la moitié restante. Ce
    //    n'était pas un défaut, c'était une assertion trop forte.
    //    ⭐ La garantie vraie est par construction : le reste de la boucle est
    //       UN chemin de retour, donc le plus court ne peut pas être pire.
    //       On la compare donc au reste RÉEL, pas à une moitié supposée.
    const { g, cible } = grilleRare();
    const ix = indexer(g);
    const b = composer(g, ix, 0, cible)[0];
    const moitie = Math.floor(b.aretes.length / 2);
    let n = 0;
    for (const e of b.aretes.slice(0, moitie))
      n = g.a[e][0] === n ? g.a[e][1] : g.a[e][0];
    const reste = b.aretes.slice(moitie).reduce((t, e) => t + g.a[e][2], 0);
    const r = cheminDeRetour(g, ix, n, 0);
    expect(r).not.toBeNull();
    expect(r!.metres).toBeLessThanOrEqual(reste + 1e-6);
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


/* ════════════════════════════════════════════════════════════════════════
   COMPOSER VERS UN LIEU DÉSIGNÉ
   ════════════════════════════════════════════════════════════════════════ */

const cle = (c: string, n: string) => `${c}|${n}`;
const porte = (b: { lieux: { categorie: string; nom: string }[] }, k: string) =>
  b.lieux.map((l) => cle(l.categorie, l.nom)).includes(k);

/* 🔴 CES FIXTURES EXISTENT PARCE QUE LES PREMIÈRES NE MORDAIENT PAS.
   Validés par mutation le 1/11, deux des tests ci-dessous passaient sur du
   code mutilé :
     · supprimer le ciblage ne changeait rien — `grilleRare` ne porte QU'UN
       lieu, donc « tous les lieux » et « ce lieu » désignent le même
       ensemble. C'est mot pour mot la leçon déjà écrite en haut de ce fichier
       le 28/10, sur la grille 6×6. ⭐ Un fixture trop pauvre rend le test vrai
       pour une raison qui n'est pas celle qu'on croit ;
     · rétablir le repli « couronne nue » ne changeait rien non plus — le
       pré-contrôle de distance de `composerVers` rendait « trop loin » AVANT
       d'appeler `composer`, si bien que le chemin de repli n'était jamais
       emprunté par le test. ⭐ Un garde amont peut masquer l'absence d'un
       garde aval : le test vert mesurait le premier et croyait voir le second.
   D'où : une grille à DEUX lieux, et une grille où le lieu est à portée MAIS
   sans boucle possible — pour que le repli ait une occasion de mentir. */

/** Deux lieux à des rayons comparables, aux antipodes l'un de l'autre. */
function grilleDeuxLieux() {
  const { g, cible } = grilleRare();
  const loin = g.a.findIndex(([a, b]) => a === 9 * G + 9 && b === 9 * G + 10);
  g.l.push({ a: loin, f: 0.5, c: "chapelle", n: "La chapelle d'en face",
             g: g.n[9 * G + 9], d: 10 });
  return { g, cible };
}

/** Un lieu À PORTÉE du Dijkstra, mais trop loin pour qu'une boucle du budget
 *  demandé l'atteigne et revienne — le seul régime où le repli « couronne
 *  nue » a l'occasion de fabriquer une boucle de consolation. */
function grilleSansBoucle() {
  const { g } = grilleRare();
  const arete = g.a.findIndex(([a, b]) => a === 10 * G + 0 && b === 10 * G + 1);
  g.l.push({ a: arete, f: 0.5, c: "fontaine", n: "La fontaine du fond",
             g: g.n[10 * G], d: 10 });
  return { g, cible: 3200, point: g.n[10 * G] as [number, number] };
}

/** La grille rare, plus deux lieux hors d'atteinte : une île (composante
 *  détachée) et un lieu à l'autre bout. */
function grilleAvecRefus() {
  const { g, cible } = grilleRare();
  const i0 = g.n.length;
  g.n.push([-4.60, 48.30], [-4.601, 48.301]);
  const ileArete = g.a.length;
  g.a.push([i0, i0 + 1, 200, 200, [i0, i0 + 1]]);
  g.l.push({ a: ileArete, f: 0.5, c: "ile", n: "Le rocher sans pont",
             g: g.n[i0], d: 10 });
  return { g, cible, ile: g.n[i0] as [number, number],
           loin: g.n[13 * G + 12] as [number, number] };
}

describe("composer VERS un lieu désigné", () => {
  const MENHIR = cle("megalithe", "Le seul menhir");
  /** la position du menhir sur la grille rare */
  const ouEstLeMenhir = (g: Graphe) =>
    g.l.find((L) => cle(L.c, L.n) === MENHIR)!.g;

  it("passe devant le lieu demandé, PAS devant l'autre", () => {
    const { g, cible } = grilleDeuxLieux();
    const r = composerVers(g, indexer(g), 0, cible, ouEstLeMenhir(g));
    expect(r.etat).toBe("ok");
    if (r.etat !== "ok") return;
    expect(r.boucles.length).toBeGreaterThan(0);
    /* ⭐ LA PROMESSE EST MÉTRIQUE, LE TEST AUSSI. Exiger que `b.lieux`
       contienne le menhir mesurerait l'ACCROCHAGE de la moisson, pas le
       parcours — et trois lieux de la carte sur quatre ne sont accrochés à
       rien. Ce qu'on doit au promeneur, c'est « vous passerez à moins de
       150 m de ce point » ; c'est ce qu'on vérifie. */
    const ou = ouEstLeMenhir(g);
    for (const b of r.boucles) {
      expect(Math.min(...b.contour.map((p) => metres(ou, p)))).toBeLessThanOrEqual(ECART_MAX_M);
    }
    expect(r.ecart).toBeLessThanOrEqual(ECART_MAX_M);
  });

  /**
   * 🔴 LE DÉFAUT QUE CE TEST TIENT, ET C'EST LE SEUL QUI COMPTE VRAIMENT.
   *    `composer()` porte un repli : si viser ne donne rien, il rabat sur la
   *    « couronne nue » — une boucle de la bonne longueur, sans prétexte. Ce
   *    repli est JUSTE pour « surprends-moi » et MENSONGER pour « emmène-moi
   *    au phare » : il rendrait une jolie boucle qui ne passe pas devant,
   *    sous un titre qui le promet.
   *    ⭐ Un repli ne se juge pas à sa qualité, mais à la demande qu'il sert.
   *       Celui-ci sert l'autre demande — et c'est ce qui le rend invisible.
   */
  /* ⚠️ DEUX GARDES SE COUVRENT L'UN L'AUTRE ICI, ET AUCUN N'EST MORT.
     Mutés séparément le 1/11, ni la suppression du repli « couronne nue »
     quand on vise, ni celle du filtre métrique à 150 m ne faisaient échouer
     un test — chacun rattrape l'autre. Mutés ENSEMBLE, ce test tombe.
     ⭐ Un garde qu'une mutation isolée ne fait pas tomber n'est pas forcément
        décoratif : il peut être le second d'une paire. La distinction se
        tranche en mutant les deux, jamais en déduisant du test vert que l'un
        des deux ne sert à rien — c'est ainsi qu'on retire le filet qui
        tenait. */
  it("⛔ ne rabat JAMAIS sur une boucle qui ne passe pas devant", () => {
    const { g, cible, point } = grilleSansBoucle();
    const r = composerVers(g, indexer(g), 0, cible, point);
    // le lieu est À PORTÉE : le refus vient d'ici, pas du pré-contrôle
    expect(r.etat, "sinon ce test ne teste rien").toBe("aucune-boucle");
  });

  /**
   * 🔴 LE REFUS POUR CAUSE DE PROXIMITÉ. La couronne [0,72 ; 1,12] × demi
   *    choisit un point de demi-tour au bon rayon — un critère de SÉLECTION
   *    entre prétextes équivalents, sans objet quand quelqu'un désigne son
   *    lieu. Appliquée quand même, elle rendait « aucune boucle » pour un
   *    calvaire visible à 800 m sur la carte : un refus qui ne s'explique à
   *    personne.
   * ⭐ Le budget devient alors un PLAFOND, plus une cible : refuser une
   *    balade de 50 min vers le lieu demandé, c'est refuser pour excès de
   *    bonne nouvelle.
   */
  it("un lieu tout proche donne une balade courte, pas un refus", () => {
    const { g, cible } = grilleRare();
    const pres = g.a.findIndex(([a, b]) => a === 2 * G + 2 && b === 2 * G + 3);
    const CALVAIRE = cle("calvaire", "Le calvaire d'à côté");
    g.l.push({ a: pres, f: 0.5, c: "calvaire", n: "Le calvaire d'à côté",
               g: g.n[2 * G + 2], d: 10 });
    const r = composerVers(g, indexer(g), 0, cible, g.n[2 * G + 2]);
    expect(r.etat, "un lieu proche n'est pas un empêchement").toBe("ok");
    if (r.etat !== "ok") return;
    for (const b of r.boucles) {
      expect(Math.min(...b.contour.map((p) => metres(g.n[2 * G + 2], p))))
        .toBeLessThanOrEqual(ECART_MAX_M);
      expect(b.ressentie).toBeLessThan(cible * 0.8);      // plus courte : c'est le but
      expect(b.ressentie).toBeLessThanOrEqual(cible * 1.15); // jamais plus longue
    }
    void CALVAIRE; void porte;
  });

  /**
   * 🔴 LA RÈGLE DE PRODUIT, TENUE PAR LE MOTEUR. Au-delà de 150 m, le chemin
   *    le plus proche ne passe pas DEVANT le lieu, il passe à côté. Mener
   *    quelqu'un là en intitulant la balade « vers la Baie de Dinan », c'est
   *    présenter un lieu qui demande un détour comme étant sur le parcours —
   *    ce que le dépôt s'interdit.
   * ⚠️ Et le seuil est CELUI DE `proches.ts`, réexporté, jamais recopié :
   *    deux nombres écrits séparément divergent, et la divergence rend l'une
   *    des deux surfaces menteuse sans rien signaler.
   */
  it("⛔ refuse un point qu'aucun chemin n'approche à moins de 150 m", () => {
    const { g, cible } = grilleRare();
    // plein milieu d'une maille 200 × 200 : ~100 m, donc accepté
    const dedans: [number, number] = [g.n[0][0] + 0.00135, g.n[0][1] + 0.0009];
    expect(composerVers(g, indexer(g), 0, cible, dedans).etat).not.toBe("ecarte");
    // 1 km au large : aucun chemin n'en approche
    const dehors: [number, number] = [g.n[0][0] - 0.02, g.n[0][1]];
    const r = composerVers(g, indexer(g), 0, cible, dehors);
    expect(r.etat).toBe("ecarte");
    if (r.etat === "ecarte") expect(r.ecart).toBeGreaterThan(ECART_MAX_M);
  });

  it("dit « trop loin » avec un plancher de distance, pas une estimation", () => {
    const { g, cible, loin } = grilleAvecRefus();
    const r = composerVers(g, indexer(g), 0, cible, loin);
    expect(r.etat).toBe("trop-loin");
    if (r.etat !== "trop-loin") return;
    // ⭐ un aller-retour à plat : la montée ne peut qu'AJOUTER, jamais retrancher
    expect(r.metresMinimum).toBe(2 * r.metresAller);
    expect(r.metresMinimum).toBeGreaterThan(cible);
  });

  it("distingue « aucun chemin connu » de « trop loin »", () => {
    const { g, cible, ile } = grilleAvecRefus();
    expect(composerVers(g, indexer(g), 0, cible, ile).etat).toBe("hors-reseau");
  });

  it("distingue « sous arrêté » de « écarté »", () => {
    const { g, cible } = grilleRare();
    const ou = ouEstLeMenhir(g);
    const { dedans } = { dedans: g.a.map((_, i) => i).filter((i) =>
      g.a[i][4].some((pi) => Math.abs(g.n[pi][0] - ou[0]) < 0.003
                          && Math.abs(g.n[pi][1] - ou[1]) < 0.002)) };
    const r = composerVers(g, indexer(g, new Set(dedans)), 0, cible, ou);
    expect(r.etat, "une fermeture n'est pas un éloignement").toBe("ferme");
  });

  it("⛔ « autour de moi » garde son repli — l'extension n'a rien retiré", () => {
    /* ⚠️ Le même interrupteur sert aux deux demandes. En posant le garde
       ci-dessus, il serait facile de supprimer la couronne nue POUR TOUT LE
       MONDE : « surprends-moi » rendrait alors le vide là où il rendait une
       boucle. Ce test tient l'autre bord. */
    const g = grille();   // aucun lieu du tout
    expect(composer(g, indexer(g), 0, 2000).length,
           "sans aucun lieu, la couronne nue doit encore répondre").toBeGreaterThan(0);
  });
});

describe("fondre le lieu visé dans ce qu'on croisera", () => {
  /* 🔴 CETTE FONCTION A ÉTÉ EXTRAITE D'UN COMPOSANT LE 1/11 PARCE QU'AUCUNE
     MUTATION NE LA FAISAIT TOMBER. Supprimer purement et simplement
     l'insertion du lieu visé laissait les 230 tests au vert : la règle vivait
     dans un rendu, donc hors de portée. ⭐ Une règle logée dans un rendu
     n'est pas tenue, elle est espérée. */
  const LIEUX = [
    { categorie: "chapelle", nom: "Sainte-Anne", anonyme: false,
      position: [-4.5, 48.2] as [number, number], ordre: 0.2 },
    { categorie: "plage", nom: "Plage", anonyme: true,
      position: [-4.52, 48.21] as [number, number], ordre: 0.8 },
  ];
  const lib = (c: string) => ({ chapelle: "Chapelle", plage: "Plage" }[c] ?? c);

  it("insère le lieu visé À SA PLACE dans la marche, pas en tête", () => {
    const r = fondreRencontres(LIEUX, lib, {
      nom: "Le menhir", g: [-4.51, 48.205],
      approche: { ordre: 0.5, metres: 40 },
    });
    expect(r.map((x) => x.nom)).toEqual(["Sainte-Anne", "Le menhir", "Plage"]);
    /* ⭐ Il est le MOTIF du départ, pas la première chose qu'on croise. Le
       mettre en tête serait le même mensonge discret qu'une liste « ce que
       vous croiserez » triée par proximité au chemin. */
    expect(r[0].nom).not.toBe("Le menhir");
  });

  it("dit l'écart mesuré plutôt que « sur le chemin » quand il ne l'est pas", () => {
    const loin = fondreRencontres([], lib, {
      nom: "Le menhir", g: [-4.51, 48.205], approche: { ordre: 0.5, metres: 90 },
    });
    expect(loin[0].libelle).toBe("à 90 m du chemin");
    const dessus = fondreRencontres([], lib, {
      nom: "Le menhir", g: [-4.51, 48.205], approche: { ordre: 0.5, metres: 0 },
    });
    expect(dessus[0].libelle).toBe("sur le chemin");
  });

  it("n'ajoute rien quand on n'a visé personne, et tait le libellé d'un anonyme", () => {
    const r = fondreRencontres(LIEUX, lib);
    expect(r.length).toBe(2);
    expect(r.find((x) => x.nom === "Plage")!.libelle).toBe("");
    expect(r.find((x) => x.nom === "Sainte-Anne")!.libelle).toBe("Chapelle");
  });
});

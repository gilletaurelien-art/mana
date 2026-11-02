/**
 * LA PROMENADE D'UN LIEU À UN AUTRE — les règles, en tests.
 *
 * ⭐ Ce fichier existe parce qu'un interdit en commentaire se franchit sans le
 *    savoir. Chacun des cas ci-dessous correspond à une règle de PRODUIT ou à
 *    un défaut qui a MORDU le 2/11 ; aucun ne décrit une forme (un nom de
 *    fonction, un nombre d'arêtes) qui mourrait au premier remaniement.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  indexer, metres, mesurer, accrocherTous, accrocherUn, accroche,
  promenadeVers, propositionsAutour, composerVers,
  AUTOUR_MIN_M, AUTOUR_MAX_M, DETOUR_MAX, BOUCLE_PAR_ALLER, ECART_MAX_M,
  type Graphe,
} from "./composition";
import { aretesTouchees, type Fermetures } from "./fermetures";

/* ── Le fixture : UNE arête longue, et c'est tout l'intérêt ────────────────
   🔴 L'arête porte 21 points de forme sur 4 km. Un lieu posé en son milieu
      est donc à 2 km de ses deux BOUTS tout en étant SUR le chemin : c'est
      exactement le régime de 22 % des lieux nommés de la presqu'île, et
      c'est le cas qu'une mesure au nœud écarte en silence. */
const PAS = 0.0027;                       // ~200 m de longitude à cette latitude
function longueArete() {
  const n: [number, number][] = [];
  for (let i = 0; i <= 20; i++) n.push([-4.49 + i * PAS, 48.24]);
  //      une branche vers le nord depuis le nœud 20, pour avoir où aller
  for (let i = 1; i <= 10; i++) n.push([-4.49 + 20 * PAS, 48.24 + i * 0.0018]);
  const forme = Array.from({ length: 21 }, (_, i) => i);
  const a: Graphe["a"] = [
    [0, 20, 4000, 200, forme],                               // l'arête longue
  ];
  for (let i = 0; i < 10; i++) {
    const de = i === 0 ? 20 : 20 + i, vers = 21 + i;
    a.push([de, vers, 200, 200, [de, vers]]);
  }
  return { genere: "test", territoire: "test", attribution: "OSM", n, a, l: [] } as Graphe;
}

describe("accrocher un point au réseau", () => {

  it("l'écart se mesure au CHEMIN, pas au nœud le plus proche", () => {
    const g = longueArete(); const ix = indexer(g);
    // le milieu exact de l'arête longue : 0 m du chemin, 2 km de chaque bout
    const milieu = g.n[10];
    const a = accrocherUn(g, ix, milieu);
    expect(a.ecart).toBeLessThan(1);
    expect(accroche(a)).toBe(true);
    // la preuve que la mesure au nœud aurait refusé :
    const auNoeud = Math.min(metres(milieu, g.n[0]), metres(milieu, g.n[20]));
    expect(auNoeud).toBeGreaterThan(ECART_MAX_M * 10);
  });

  it("🔴 la case d'un lieu ne dépend pas de la latitude de qui le regarde", () => {
    /* Le défaut du 2/11 : la longitude était projetée avec le cosinus de la
       latitude de CHAQUE point. À −4,5°, 0,1° de latitude déplaçait la case de
       660 m — plus que la case. Deux lieux à la MÊME longitude et à des
       latitudes différentes doivent être accrochés pareil. */
    const g = longueArete(); const ix = indexer(g);
    const [lo] = g.n[20];
    const bas = accrocherUn(g, ix, [lo, 48.24 + 0.0018]);        // sur la branche
    const haut = accrocherUn(g, ix, [lo, 48.24 + 10 * 0.0018]);  // au bout
    expect(bas.ecart).toBeLessThan(1);
    expect(haut.ecart).toBeLessThan(1);
  });

  it("un lieu qu'aucun chemin n'approche porte son écart VRAI, pas l'infini", () => {
    const g = longueArete(); const ix = indexer(g);
    const loin: [number, number] = [-4.49, 48.24 + 0.05];   // ~5,5 km au nord
    const a = accrocherUn(g, ix, loin);
    expect(accroche(a)).toBe(false);
    expect(Number.isFinite(a.ecart)).toBe(true);
    expect(a.ecart).toBeGreaterThan(ECART_MAX_M);
    expect(a.noeud).toBeGreaterThanOrEqual(0);   // on sait quand même d'où marcher
  });

  it("accrocher en une passe donne le MÊME écart que la force brute", () => {
    /* ⭐ LE TEST QUI AURAIT ATTRAPÉ LE DÉFAUT DU 2/11, et le seul : la
       COUVERTURE d'ensemble restait juste (83 % des spots proposables) pendant
       que 39 écarts sur 50 étaient faux. Un nombre d'ensemble peut rester vrai
       pendant qu'on mesure mal chaque cas. */
    const g = longueArete(); const ix = indexer(g);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 20; i += 3) pts.push([g.n[i][0] + 0.0004, 48.2405]);
    for (let i = 0; i < 10; i += 2) pts.push([g.n[21 + i][0] - 0.0003, g.n[21 + i][1]]);
    const mien = accrocherTous(g, ix, pts);
    pts.forEach((p, i) => {
      let brut = Infinity;
      for (const ar of g.a) for (const pi of ar[4]) {
        const m = metres(p, g.n[pi]); if (m < brut) brut = m;
      }
      if (brut <= ECART_MAX_M) expect(mien[i].ecart).toBeCloseTo(brut, 1);
    });
  });
});

describe("la promenade d'un point à un autre", () => {

  it("le parcours TRAVERSE l'arête du lieu visé, il ne rejoint pas son nœud", () => {
    const g = longueArete(); const ix = indexer(g);
    const depart = accrocherUn(g, ix, g.n[30]);              // le bout de la branche
    const cible = g.n[10];                                   // le milieu de l'arête longue
    const vers = accrocherUn(g, ix, cible);
    const p = promenadeVers(g, ix, depart, vers, cible);
    expect(p.etat).toBe("ok");
    if (p.etat !== "ok") return;
    expect(p.parcours.aretes).toContain(vers.aretes[0]);
    // et la promesse est vérifiée au mètre sur le tracé, pas déduite
    const auPlusPres = Math.min(...p.parcours.contour.map((q) => metres(cible, q)));
    expect(auPlusPres).toBeLessThanOrEqual(ECART_MAX_M);
  });

  it("⛔ un lieu à plus de 150 m du chemin est refusé, et le refus DIT l'écart", () => {
    const g = longueArete(); const ix = indexer(g);
    const depart = accrocherUn(g, ix, g.n[0]);
    const loin: [number, number] = [-4.49, 48.24 + 0.05];
    const p = promenadeVers(g, ix, depart, accrocherUn(g, ix, loin), loin);
    expect(p.etat).toBe("ecarte");
    if (p.etat !== "ecarte") return;
    /* « Je ne peux pas » n'est pas une réponse : il faut pouvoir écrire
       « à 5 500 m du chemin le plus proche ». */
    expect(p.ecart).toBeGreaterThan(ECART_MAX_M);
  });

  it("une arête sous arrêté fait répondre « fermé », jamais « hors réseau »", () => {
    /* ⭐ Deux refus qui appellent des gestes opposés : « fermé » dit de
       revenir plus tard, « hors réseau » dit de renoncer. Les confondre, c'est
       rendre le même silence. */
    const g = longueArete();
    const cible = g.n[10];
    const sansLArete = indexer(g, new Set([0]));             // l'arête longue fermée
    const depart = accrocherUn(g, sansLArete, g.n[30]);
    const vers = accrocherTous(g, indexer(g), [cible])[0];   // accroché sur le graphe OUVERT
    expect(promenadeVers(g, sansLArete, depart, vers, cible).etat).toBe("ferme");
  });

  it("le détour d'agrément est PLAFONNÉ par le plus court chemin", () => {
    const g = longueArete(); const ix = indexer(g);
    const depart = accrocherUn(g, ix, g.n[30]);
    const cible = g.n[10];
    const p = promenadeVers(g, ix, depart, accrocherUn(g, ix, cible), cible);
    expect(p.etat).toBe("ok");
    if (p.etat !== "ok") return;
    expect(p.parcours.metres).toBeLessThanOrEqual(p.minimum * DETOUR_MAX + 1);
    expect(p.minimum).toBeGreaterThan(0);
    /* ⭐ ET LE TOTAL ANNONCÉ COMPTE LES DEUX BOUTS HORS RÉSEAU. Le plafond
       porte sur le réseau — c'est lui qu'on choisit ; l'affichage porte sur
       le total — c'est lui qu'on marche. */
    expect(p.metres).toBe(p.approche + p.parcours.metres + p.sortie);
  });
});

describe("mesurer un parcours", () => {

  it("la montée se compte DANS LE SENS DE MARCHE", () => {
    /* Le même aller-retour monte et descend autant : la somme des valeurs
       absolues doublerait le dénivelé. */
    const n: [number, number][] = [[-4.49, 48.24], [-4.487, 48.24]];
    const g: Graphe = { genere: "t", territoire: "t", attribution: "OSM", n,
      a: [[0, 1, 200, 200, [0, 1], null, 30]], l: [] };
    const ix = indexer(g);
    expect(mesurer(g, ix, [0], 0).montee).toBe(30);   // on monte
    expect(mesurer(g, ix, [0], 1).montee).toBe(0);    // on descend
    expect(mesurer(g, ix, [0, 0], 0).montee).toBe(30); // aller-retour : une fois
  });

  it("le bord de mer et la marée ne se comptent pas deux fois, les mètres si", () => {
    const n: [number, number][] = [[-4.49, 48.24], [-4.487, 48.24]];
    const g: Graphe = { genere: "t", territoire: "t", attribution: "OSM", n,
      a: [[0, 1, 200, 200, [0, 1], 10, 0, 1]], l: [] };
    const p = mesurer(g, indexer(g), [0, 0], 0);
    expect(p.metres).toBe(400);      // on a bien marché 400 m
    expect(p.bordDeMer).toBe(200);   // la mer n'était là qu'une fois
    expect(p.marees).toBe(200);
    expect(p.partRepetee).toBe(1);   // et tout était répété
  });
});

/* ════════════════════════════════════════════════════════════════════════
   SUR LE GRAPHE RÉEL — se saute si le graphe local n'est pas présent, qui
   n'est pas versionné. ⚠️ Lecture PARESSEUSE : `skipIf` saute les tests mais
   exécute le corps du `describe` pour les collecter.
   ════════════════════════════════════════════════════════════════════════ */
const CHEMIN = "public/bretagne/g/presquile.json";
const dispo = existsSync(CHEMIN);
let cache: { g: Graphe; ix: ReturnType<typeof indexer>; pos: [number, number][];
             acc: ReturnType<typeof accrocherTous> } | null = null;
function reel() {
  if (!cache) {
    const g: Graphe = JSON.parse(readFileSync(CHEMIN, "utf8"));
    const f: Fermetures = JSON.parse(readFileSync("public/fermetures.json", "utf8"));
    const ix = indexer(g, aretesTouchees(g, f).interdites);
    const inv = JSON.parse(readFileSync("src/lieux.json", "utf8"));
    let loM = Infinity, loX = -Infinity, laM = Infinity, laX = -Infinity;
    for (const [lo, la] of g.n) {
      if (lo < loM) loM = lo; if (lo > loX) loX = lo;
      if (la < laM) laM = la; if (la > laX) laX = la;
    }
    const noms = new Set<string>();
    const pos: [number, number][] = inv.lieux
      .filter((l: { n: string | null; g: [number, number] }) =>
        l.n && l.g[0] >= loM && l.g[0] <= loX && l.g[1] >= laM && l.g[1] <= laX
        && !noms.has(l.n) && noms.add(l.n))
      .map((l: { g: [number, number] }) => l.g);
    cache = { g, ix, pos, acc: accrocherTous(g, ix, pos) };
  }
  return cache;
}

describe.skipIf(!dispo)("sur le graphe réel de la presqu'île", () => {

  it("l'accrochage en une passe reste exact sur la vraie donnée", () => {
    const { g, pos, acc } = reel();
    /* Un échantillon régulier, comparé à la force brute — 16 210 arêtes et
       leurs points de forme pour chacun, donc on en prend peu. */
    for (let i = 0; i < pos.length; i += Math.floor(pos.length / 12)) {
      let brut = Infinity;
      for (const ar of g.a) for (const pi of ar[4]) {
        const m = metres(pos[i], g.n[pi]); if (m < brut) brut = m;
      }
      if (brut <= ECART_MAX_M) expect(acc[i].ecart).toBeCloseTo(brut, 0);
      else expect(accroche(acc[i])).toBe(false);
    }
  }, 60_000);

  it("une majorité franche des spots reçoit TROIS propositions", () => {
    const { g, ix, pos, acc } = reel();
    let praticables = 0, trois = 0;
    for (let i = 0; i < pos.length; i += 5) {
      if (!accroche(acc[i])) continue;
      praticables++;
      if (propositionsAutour(g, ix, acc[i], pos, pos, acc).length >= 3) trois++;
    }
    expect(praticables).toBeGreaterThan(40);
    /* Mesuré à 84 % le 2/11. Le garde porte un PLANCHER large, pas la valeur :
       ⭐ un garde qui recopie sa mesure crie au premier affinage du réseau. */
    expect(trois / praticables).toBeGreaterThan(0.7);
  }, 60_000);

  it("⛔ aucune proposition ne tombe sous le plancher de la bande", () => {
    const { g, ix, pos, acc } = reel();
    let vues = 0;
    for (let i = 0; i < pos.length; i += 7) {
      if (!accroche(acc[i])) continue;
      for (const p of propositionsAutour(g, ix, acc[i], pos, pos, acc)) {
        vues++;
        /* La bande présélectionne sur la distance au nœud ; le parcours
           composé peut la dépasser par le haut (détour d'agrément) mais
           jamais descendre sous un plancher qui existe pour que la promenade
           ne soit pas la traversée d'un parking. */
        expect(p.metres).toBeGreaterThanOrEqual(AUTOUR_MIN_M);
        expect(p.metres).toBeLessThan(AUTOUR_MAX_M * DETOUR_MAX * 1.3);
      }
    }
    expect(vues).toBeGreaterThan(50);
  }, 60_000);

  it("la distance annoncée est celle du CHEMIN, et elle dépasse le vol d'oiseau", () => {
    /* ⛔ Le détour médian est de ×1,27 et monte à ×16 : un spot « à 200 m »
       de l'autre côté d'une anse coûte 3 km à pied. Annoncer le vol d'oiseau
       enverrait quelqu'un pour 200 m. */
    const { g, ix, pos, acc } = reel();
    let compares = 0, pireRapport = Infinity, plusGrandDetour = 0;
    for (let i = 0; i < pos.length; i += 7) {
      if (!accroche(acc[i])) continue;
      for (const p of propositionsAutour(g, ix, acc[i], pos, pos, acc)) {
        const vol = metres(pos[i], pos[p.i]);
        compares++;
        const r = p.metres / Math.max(vol, 1);
        if (r < pireRapport) pireRapport = r;
        if (r > plusGrandDetour) plusGrandDetour = r;
      }
    }
    expect(compares).toBeGreaterThan(50);
    /* ⭐ UN INVARIANT, PAS UNE TENDANCE : approche + réseau + sortie ≥ vol
       d'oiseau par inégalité triangulaire. Tant que le total ne comptait que
       le réseau, ce test tombait — et il avait raison de tomber. */
    expect(pireRapport).toBeGreaterThanOrEqual(1);
    /* Et le détour est RÉEL : s'il restait près de 1, l'écran pourrait
       annoncer le vol d'oiseau sans grand mensonge.
       ⚠️ LE ×16 QUE J'AVAIS ÉCRIT ICI ÉTAIT UN CHIFFRE JUSTE SUR UN AUTRE
          RÉFÉRENTIEL — il se mesure sur les 3 plus proches À VOL D'OISEAU,
          que la bande écarte précisément. Dans le régime de ce test, le pire
          détour relevé est ×2,90. ⭐ Une mesure exacte rapportée au mauvais
          ensemble fabrique un garde qui crie sans défaut. */
    expect(plusGrandDetour).toBeGreaterThan(2);
  }, 60_000);

  it("🔴 le tracé passe AUSSI PRÈS QUE POSSIBLE du lieu, pas seulement à portée", () => {
    /* Le défaut du 2/11, et il était muet parce que les deux cas restent
       sous les 150 m qui autorisent la phrase « vous passez devant » :
       en choisissant la traversée qui minimise la LONGUEUR, 78 % des
       propositions passaient plus de 20 m plus loin que nécessaire — écart
       médian réel 114 m là où 15 m était disponible.
       ⭐ Le garde ne porte pas sur l'écart ABSOLU, qui dépend du réseau, mais
          sur l'écart PERDU : la différence entre ce que le tracé fait et ce
          que l'accrochage rendait possible. C'est la seule des deux
          grandeurs dont nous soyons responsables. */
    const { g, ix, pos, acc } = reel();
    let n = 0, perdu = 0;
    for (let i = 0; i < pos.length; i += 7) {
      if (!accroche(acc[i])) continue;
      for (const p of propositionsAutour(g, ix, acc[i], pos, pos, acc)) {
        n++;
        if (p.sortie - acc[p.i].ecart > 20) perdu++;
      }
    }
    expect(n).toBeGreaterThan(50);
    /* Mesuré à 14 % le 2/11 — le reste étant les cas où l'arête qui passe le
       plus près sort du budget de détour, ce qui est un arbitrage assumé et
       dont l'écart est DIT à l'écran. Le plancher est large : ⭐ un garde qui
       recopie sa mesure crie au premier affinage du réseau. */
    expect(perdu / n, "le tracé renonce trop souvent à passer devant").toBeLessThan(0.35);
  }, 60_000);

  it("⭐ l'option « en boucle » dérive sa cible de l'aller, et elle tient", () => {
    /* 🔴 LA LEÇON DU 2/11. La même fonction mesurée à 58 % de réussite le 1/11
       et à plus de 90 % ici : la différence n'est pas le code, c'est que la
       cible se DÉRIVE de l'aller au lieu d'être un budget décidé d'avance. */
    const { g, ix, pos, acc } = reel();
    let essais = 0, ok = 0;
    for (let i = 0; i < pos.length; i += 11) {
      if (!accroche(acc[i])) continue;
      for (const p of propositionsAutour(g, ix, acc[i], pos, pos, acc)) {
        essais++;
        const v = composerVers(g, ix, acc[i].noeud,
          Math.round(p.parcours.metres * BOUCLE_PAR_ALLER), pos[p.i]);
        if (v.etat === "ok") ok++;
      }
    }
    expect(essais).toBeGreaterThan(30);
    expect(ok / essais).toBeGreaterThan(0.75);
  }, 60_000);
});

#!/usr/bin/env node
// LES SITES REMARQUABLES DU MONDE, EN TUILES STATIQUES
//
//     node scripts/sites-monde.mjs            # le monde entier
//     node scripts/sites-monde.mjs 4 5        # seulement la colonne z3 x=4..5
//
// 🔴 LA MOISSON EXISTE DÉJÀ — c'est la SERVIR qui manquait. Mesuré le
//    14/11/2026 : `ressources` porte 9 474 186 lignes géolocalisées, de −180°
//    à +180°, dont **4 213 113** dans les catégories de sites remarquables et
//    3 191 272 qui portent un vrai nom. Ce script n'ajoute aucune donnée : il
//    découpe ce qui est là en fichiers qu'une application sans serveur peut
//    lire.
//
// ⭐ POURQUOI DES TUILES, ET PAS UNE REQUÊTE. L'application lit des fichiers
//    (c'est déjà vrai des graphes de chemins) : pas de serveur dans le chemin
//    d'un panoramique de carte, et ça marche hors ligne. Le prix est un
//    pipeline et quelques centaines de Mo à héberger — le même marché que
//    pour les graphes, et il a déjà été jugé bon ici.
//
// ⚠️ LE PLAFOND PAR TUILE EST UNE PROMESSE, PAS UNE LIMITE TECHNIQUE, ET IL
//    SE DIT. Mesuré : à z=8 la tuile moyenne porte 360 lieux, la 99ᵉ en porte
//    7 053 et la pire **31 092** (une grande ville). Les poser tous ferait un
//    fichier de ~1,8 Mo et une bouillie d'épingles. On en garde `PLAFOND`, et
//    chaque tuile écrit COMBIEN elle en comptait : l'écran peut dire « 31 092
//    ici, 1 500 montrés » au lieu de laisser croire qu'il n'y en a que 1 500.
//
// ⛔ LA LISTE DES CATÉGORIES EST BLANCHE, ET C'EST NÉCESSAIRE. `mots[1]` porte
//    76 025 valeurs distinctes : le vocabulaire est propre pour la moisson
//    mondiale (parc, sommet, panorama…) mais les lignes françaises y mêlent
//    des catégories administratives — `1901` (547 621 associations loi 1901),
//    `cabinet`, `accouchement`, `boutique`. Une carte des « sites
//    remarquables » qui afficherait des cabinets médicaux ne serait pas une
//    carte des sites remarquables.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, "..");
const SORTIE = resolve(RACINE, "public", "monde", "s");

/** ⚠️ Pas de valeur par défaut : ce dépôt est public. */
const HOTE = process.env.MANA_HOTE_DEPLOIEMENT ?? process.env.MANA_KS5;
if (!HOTE) {
  console.error("🔴 MANA_HOTE_DEPLOIEMENT (ou MANA_KS5) est absente.");
  console.error("   Voir deploiement/cible.local.sh ; ce script lit la base par SSH.");
  process.exit(1);
}

/** Le zoom des tuiles de détail — voir la mesure dans l'en-tête. */
export const ZOOM = 8;
/** Combien de lieux au plus par tuile. */
export const PLAFOND = 1500;

/** Le vocabulaire retenu. ⚠️ Il vient de la moisson MONDIALE, qui l'emploie
 *  proprement ; les mêmes mots couvrent la Bretagne (`lieux.json`). */
export const CATEGORIES = [
  "parc", "sommet", "memorial", "plage", "panorama", "sentier", "baie",
  "site_archeologique", "source_naturelle", "cap", "ruine", "chateau",
  "chapelle", "grotte", "col", "cascade", "calvaire", "moulin", "megalithe",
  "phare", "ile", "rocher", "fontaine", "epave", "musee", "oeuvre", "lande",
  "lieu_de_culte", "fortification", "archeologie", "nature", "memoire",
];

/**
 * 🔴 LA BASE REND DU JSON, PAS DU TSV — et ce n'est pas un raffinement.
 *
 *    La première version séparait les colonnes par des TABULATIONS. Mesuré sur
 *    la seule colonne d'essai : 2 entrées sur 779 170 portaient un titre
 *    contenant un RETOUR À LA LIGNE, qui décale toutes les colonnes d'après.
 *    Résultat : des coordonnées `null`, une catégorie absente — et un dossier
 *    créé sur disque sous le nom `public/monde/s/8/Јордан (Орде)
 *    Чопела-Кулак/`, parce que le titre décalé était devenu l'indice `x` de
 *    la tuile.
 * ⭐ DEUX SUR 779 170, C'EST 0,0003 % — et c'est bien le problème : trop rare
 *    pour se voir, assez pour écrire des fichiers au mauvais endroit. Un
 *    séparateur qui peut apparaître DANS la donnée n'est pas un séparateur.
 *    Le JSON, lui, échappe les retours à la ligne par construction.
 * ⚠️ Une ligne de sortie = une TUILE entière. Aucune colonne, donc aucun
 *    délimiteur à deviner.
 */
/**
 * 🔴 UN LIEU DONT LE NOM EST SA CATÉGORIE EST ANONYME — mesuré le 14/11/2026
 *    sur les tuiles produites : **705 663 entrées sur 2 384 329 (30 %)**
 *    portent « Parc », « Plage », « Point de vue » ou « Calvaire » pour tout
 *    nom. 418 894 « Parc » à elles seules.
 *
 * ⭐ CE N'EST PAS UNE SALETÉ À JETER. Une plage sans nom reste une plage, et
 *    elle a sa place sur une carte. Ce qui serait faux, c'est de la PROPOSER
 *    comme une destination nommée — ce dépôt l'a déjà écrit pour la Bretagne :
 *    « une liste de douze "Plage" ne se choisit pas », et « le drapeau
 *    `anonyme` ne couvre pas tout : la recherche proposait "Calvaire", un nom
 *    qui EST sa catégorie ».
 * ⚠️ On pose donc le même drapeau que `lieux.json` (`a: 1`), et l'écran
 *    décide : une épingle oui, une destination non.
 */
const LIBELLES = {
  parc: "Parc", sommet: "Sommet", memorial: "Mémorial", plage: "Plage",
  panorama: "Point de vue", sentier: "Sentier", baie: "Baie",
  site_archeologique: "Site archéologique", source_naturelle: "Source",
  cap: "Cap", ruine: "Ruines", chateau: "Château", chapelle: "Chapelle",
  grotte: "Grotte", col: "Col", cascade: "Cascade", calvaire: "Calvaire",
  moulin: "Moulin", megalithe: "Mégalithe", phare: "Phare", ile: "Île",
  rocher: "Rocher", fontaine: "Fontaine", epave: "Épave", musee: "Musée",
  oeuvre: "Œuvre", lande: "Lande", lieu_de_culte: "Édifice religieux",
  fortification: "Fortification", archeologie: "Site archéologique",
  nature: "Espace naturel", memoire: "Mémoire",
};
/** ⚠️ Accents et casse retirés — même normalisation que `recherche.ts`. */
const plat = (s) => (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const estAnonyme = (n, c) => {
  const p = plat(n);
  return p === plat(LIBELLES[c] ?? c) || p === plat(c) ||
    /* ⛔ 54 titres sont des marques d'absence venues d'OSM — « ? - ? »,
       « - », « ... ». Rares, et exactement ce qu'il ne faut pas écrire sur
       une carte comme si c'était un nom. */
    /^[\s?\-–—_.]*$/.test(n ?? "");
};

function demanderJson(sql) {
  const payload = `\\pset format unaligned\n\\pset tuples_only on\n${sql}\n`;
  return execFileSync("ssh",
    ["-o", "ConnectTimeout=25", HOTE,
     "sudo docker exec -i pg-repetition psql -U postgres -d postgres"],
    { input: payload, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 })
    .split("\n")
    .filter((l) => l.startsWith("{"))
    .map((l) => JSON.parse(l));
}

const liste = CATEGORIES.map((c) => `'${c}'`).join(",");

/**
 * 🔴 LE PLAFOND COUPAIT PAR ORDRE ALPHABÉTIQUE — mesuré le 15/11/2026, et
 *    c'est le défaut le plus coûteux de ce script. `row_number() … ORDER BY n`
 *    gardait les 1 500 premiers titres de l'alphabet : une tranche ni
 *    géographique, ni priorisée. Sur la tuile de Crozon (8/124/88), 4 665
 *    sites réels, 1 500 servis, dont **627 nommés** — pendant que mana.bzh en
 *    connaît 1 318 dans le même secteur. La moitié des destinations
 *    disparaissait, et avec elle les promenades qui en partaient : le même
 *    point rendait trois propositions avec l'inventaire complet et ZÉRO avec
 *    la tuile.
 *
 * ⭐ LES NOMMÉS D'ABORD, ET ÇA NE COÛTE PAS UN OCTET. Un lieu anonyme ne peut
 *    être ni une destination, ni un résultat de recherche : il n'est qu'une
 *    épingle. Quand il faut choisir 1 500 points sur 4 665, les 705 663
 *    anonymes du monde (30 % des entrées) n'ont aucune raison de passer
 *    devant un nom.
 * ⚠️ ILS NE DISPARAISSENT PAS : ils prennent la place qui reste. Une plage
 *    sans nom reste une plage, et elle a sa place sur une carte — c'est la
 *    règle écrite plus haut, et elle ne change pas. Seul l'ORDRE change.
 *
 * ⛔ ET LA RÈGLE D'ANONYMAT N'EXISTE QU'UNE FOIS. SQL ne la réécrit pas : il
 *    reçoit la table des formes ENGENDRÉE depuis `LIBELLES`/`CATEGORIES`
 *    ci-dessus, et `estAnonyme()` reste l'autorité — le script VÉRIFIE que
 *    les deux sont d'accord sur chaque entrée reçue, et refuse sinon.
 */
/**
 * ⚠️ SANS `unaccent`, ON DÉPOUILLE À LA MAIN — et c'est le garde ci-dessous
 *    qui l'a exigé, dès le premier essai : un lieu nommé « ruÏne » dans la
 *    catégorie `ruine`. `plat()` le rend « ruine » et le déclare anonyme ;
 *    SQL comparait « ruïne » et le déclarait nommé. UNE entrée sur 246 420 —
 *    assez pour trier selon une règle et étiqueter selon une autre.
 * ⭐ Une divergence d'UNE ligne est exactement ce qu'un garde doit attraper :
 *    personne ne l'aurait vue, et elle aurait grandi à chaque moisson.
 */
/* 🔴 ET LA TABLE NE S'ÉCRIT PAS À LA MAIN — deuxième leçon du même garde.
   La première version listait les accents d'Europe de l'Ouest ; la moisson
   mondiale a rendu « Panoramă » (roumain), que `plat()` dépouille et que ma
   liste ignorait. ⭐ Une table de caractères écrite à la main est une liste
   de ce qu'on a rencontré, pas de ce qui existe — et le monde en apporte
   toujours un de plus.
   ⚠️ Elle est donc ENGENDRÉE depuis `plat()` lui-même, sur les blocs latins
      d'Unicode : une seule autorité, et SQL ne fait que la suivre. */
const [ACCENTS, DEPOUILLES] = (() => {
  let a = "", d = "";
  for (let cp = 0xC0; cp <= 0x24F; cp++) {
    const ch = String.fromCodePoint(cp);
    const p = plat(ch);
    if (p.length === 1 && p !== ch && /^[a-z]$/.test(p)) { a += ch; d += p; }
  }
  return [a, d];
})();
const plat_sql = (expr) => `lower(translate(btrim(${expr}), '${ACCENTS}', '${DEPOUILLES}'))`;

const FORMES = [];
for (const c of CATEGORIES) {
  for (const f of new Set([LIBELLES[c] ?? c, c, plat(LIBELLES[c] ?? c), plat(c)])) {
    FORMES.push(`('${c}','${String(f).replace(/'/g, "''")}')`);
  }
}
const TABLE_FORMES = FORMES.join(",");
/* ⭐ LE FILTRE EST ÉCRIT UNE FOIS. Deux requêtes (les tuiles, puis le résumé
   mondial) doivent porter sur EXACTEMENT le même gisement — sinon le total
   annoncé ne serait pas celui des points posés, et personne ne le verrait. */
const GISEMENT = `
  FROM ressources r
 WHERE r.source = 'lieu' AND r.geom IS NOT NULL
   AND r.mots[1] = ANY (ARRAY[${liste}])
   AND r.titre IS NOT NULL AND btrim(r.titre) <> ''
   AND ST_Y(r.geom) BETWEEN -85 AND 85`;

/* Les colonnes de tuiles z3 à traiter — découper la lecture évite de faire
   passer 4,2 M de lignes en une seule fois par SSH. */
const [deb, fin] = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number) : [0, 7];

let total = 0, tuiles = 0, octets = 0, plafonnees = 0, anonymes = 0;
const desaccords = [];
for (let col = deb; col <= fin; col++) {
  const lonMin = -180 + col * 45, lonMax = lonMin + 45;
  const tuilesLues = demanderJson(`
    WITH g AS (
      SELECT r.titre AS n, r.mots[1] AS c,
             round(ST_X(r.geom)::numeric, 4) AS x, round(ST_Y(r.geom)::numeric, 4) AS y
        ${GISEMENT}
         AND ST_X(r.geom) >= ${lonMin} AND ST_X(r.geom) < ${lonMax}),
    formes(c, forme) AS (VALUES ${TABLE_FORMES}),
    t AS (
      SELECT *,
             floor((x + 180) / 360 * ${2 ** ZOOM})::int AS tx,
             floor((1 - ln(tan(radians(y)) + 1/cos(radians(y))) / pi()) / 2 * ${2 ** ZOOM})::int AS ty,
             /* un nom qui EST sa catégorie, ou qui n'est que de la ponctuation */
             (EXISTS (SELECT 1 FROM formes f
                       WHERE f.c = g.c
                         AND ${plat_sql("f.forme")} = ${plat_sql("g.n")})
              OR g.n ~ '^[[:space:]?._-]*$') AS anon
        FROM g),
    r AS (
      /* Les nommés d'abord : voir la note au-dessus de TABLE_FORMES.
         ATTENTION — aucun accent grave dans un commentaire SQL : il est
         DANS un littéral de gabarit JS, et il le fermerait. */
      SELECT *, row_number() OVER (PARTITION BY tx, ty ORDER BY anon, n) AS rg,
             count(*) OVER (PARTITION BY tx, ty) AS total
        FROM t)
    SELECT json_build_object(
             'z', ${ZOOM}, 'x', tx, 'y', ty, 'total', min(total),
             'l', json_agg(json_build_object('n', n, 'c', c, 'anon', anon,
                                             'g', json_build_array(x, y))
                           ORDER BY rg))::text
      FROM r WHERE rg <= ${PLAFOND} GROUP BY tx, ty ORDER BY tx, ty;`);

  for (const tuile of tuilesLues) {
    /* Le drapeau se pose ICI, une fois, plutôt que dans chaque écran qui
       lira les tuiles — deux copies de cette règle divergeraient. */
    for (const e of tuile.l) {
      const anonyme = estAnonyme(e.n, e.c);
      /* ⛔ LE GARDE QUI REND LA DOUBLE ÉCRITURE SÛRE. SQL trie par son propre
         calcul d'anonymat ; `estAnonyme()` reste l'autorité. S'ils divergent,
         on trierait selon une règle et on étiquetterait selon une autre — et
         rien ne le dirait. Le désaccord est donc COMPTÉ, et il arrête le
         script. */
      if (anonyme !== Boolean(e.anon)) desaccords.push(`${e.n} (${e.c})`);
      delete e.anon;
      if (anonyme) e.a = 1;
    }
    const { x: tx, y: ty, total: tot, l } = tuile;
    const dossier = resolve(SORTIE, String(ZOOM), String(tx));
    mkdirSync(dossier, { recursive: true });
    /* ⚠️ `total` EST ÉCRIT MÊME QUAND IL ÉGALE `l.length`. Un champ qui
       n'apparaît que dans le cas rare oblige l'écran à deviner son absence ;
       ici il lit toujours la même chose. */
    const corps = JSON.stringify(tuile) + "\n";
    writeFileSync(resolve(dossier, `${ty}.json`), corps, "utf8");
    octets += Buffer.byteLength(corps);
    tuiles++; total += l.length;
    anonymes += l.filter((e) => e.a).length;
    if (tot > l.length) plafonnees++;
  }
  console.log(`· colonne z3 ${col} (${lonMin}°→${lonMax}°) : ${tuilesLues.length} tuiles`);
}

console.log(`\n✓ ${tuiles} tuiles · ${total.toLocaleString("fr-FR")} lieux posés · `
  + `${Math.round(octets / 1024 / 1024)} Mo · ${plafonnees} tuile(s) plafonnée(s) · `
  + `${anonymes.toLocaleString("fr-FR")} anonyme(s)`);
if (!existsSync(SORTIE)) { console.error("🔴 rien n'a été écrit"); process.exit(1); }
if (desaccords.length) {
  console.error(`\n🔴 ${desaccords.length} entrée(s) où SQL et estAnonyme() ne sont PAS d'accord.`);
  console.error("   Le tri du plafond et le drapeau `a` suivraient alors deux règles.");
  for (const d of desaccords.slice(0, 8)) console.error(`   · ${d}`);
  process.exit(1);
}
console.log("✓ SQL et estAnonyme() d'accord sur toutes les entrées");

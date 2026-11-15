#!/usr/bin/env npx tsx
// LES HÉBERGEMENTS DU MONDE, EN TUILES STATIQUES
//
//     npx tsx scripts/hebergements-monde.ts          # le monde entier
//     npx tsx scripts/hebergements-monde.ts 4 5      # la colonne z3 x=4..5
//
// 🔴 MÊME FORME QUE `sites-monde.mjs`, ET C'EST LE POINT. La carte commune
//    lit déjà des tuiles z8 pour les sites remarquables ; lui faire lire un
//    SECOND format pour les hébergements aurait donné deux chargeurs, deux
//    caches et deux façons de dire « trop loin ». Même zoom, même découpage,
//    même enveloppe — `tuilesDuCadre()` sert les deux.
//
// ⭐ POURQUOI DES TUILES PLUTÔT QUE LES FICHIERS PAR TERRITOIRE. Les trois
//    fichiers existants (`/<contrée>/h/<slug>.json`, 141 hébergements)
//    couvrent ce qui a été moissonné en GRAPHES. La base en porte
//    663 104 positionnés et publics, partout — et manahome revendique le
//    monde. Un calque « hébergements » qui ne répondrait qu'en Bretagne sur
//    une carte mondiale serait la faute d'hier, répétée.
//
// 🔴 LE GARDE DE VIE PRIVÉE PASSE AVANT TOUT, et il n'est pas décoratif.
//    `hebergements_moisson` porte 441 481 lignes marquées `prive` — parmi
//    elles des DOMICILES loués par des particuliers. Mesuré le 14/11/2026 :
//    aucune n'a de géométrie. L'invariante n'a pas été CHOISIE, elle est
//    constatée — donc elle peut cesser d'être vraie à la prochaine moisson,
//    sans que personne ne l'ait décidé. Poser une épingle au bâtiment près
//    sur un domicile, c'est publier une adresse.
//
// ⛔ ET L'ADRESSE NE SORT PAS, MÊME PUBLIQUE — même règle que l'export par
//    territoire : la position suffit à mener sur place, et une adresse en
//    clair dans un fichier servi est une donnée de plus à défendre pour un
//    gain nul.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fusionner, type Hebergement } from "../src/hebergements-du-territoire";

const ICI = dirname(fileURLToPath(import.meta.url));
const SORTIE = resolve(ICI, "..", "public", "monde", "h");

/** ⚠️ Pas de valeur par défaut : ce dépôt est public. */
const HOTE = process.env.MANA_HOTE_DEPLOIEMENT ?? process.env.MANA_KS5;
if (!HOTE) {
  console.error("🔴 MANA_HOTE_DEPLOIEMENT (ou MANA_KS5) est absente.");
  console.error("   Voir deploiement/cible.local.sh ; ce script lit la base par SSH.");
  process.exit(1);
}

/** ⭐ LE MÊME ZOOM QUE LES SITES — voir l'en-tête. */
const ZOOM = 8;
/** ⚠️ Le même plafond aussi : une tuile qui porte 1 500 épingles est déjà
 *  illisible, et chaque tuile écrit COMBIEN elle en comptait. */
const PLAFOND = 1500;

function demanderJson(sql: string): any[] {
  const payload = `\\pset format unaligned\n\\pset tuples_only on\n${sql}\n`;
  return execFileSync("ssh",
    ["-o", "ConnectTimeout=25", HOTE!,
     "sudo docker exec -i pg-repetition psql -U postgres -d postgres"],
    { input: payload, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 })
    .split("\n")
    .filter((l) => l.startsWith("{"))
    .map((l) => JSON.parse(l));
}

/* ══ LE GARDE, AVANT TOUT EXPORT ════════════════════════════════════════ */
const [garde] = demanderJson(
  `SELECT json_build_object('prives_situes', count(*))::text
     FROM hebergements_moisson WHERE prive AND geom IS NOT NULL;`);
if (Number(garde.prives_situes) > 0) {
  console.error(`🔴 ${garde.prives_situes} hébergement(s) PRIVÉ(s) portent une position.`);
  console.error("   L'invariante mesurée le 14/11/2026 — « aucun privé n'est situé » —");
  console.error("   a cessé d'être vraie. Exporter maintenant publierait des DOMICILES");
  console.error("   au bâtiment près. Décidez quoi en faire AVANT de relancer :");
  console.error("   les écarter, ou les flouter — jamais les publier tels quels.");
  process.exit(1);
}
console.log("✓ garde : aucun hébergement privé n'est situé");

/* ⭐ LE FILTRE EST ÉCRIT UNE FOIS — même raison que `sites-monde.mjs` : deux
   requêtes sur des gisements différents donneraient un total qui n'est pas
   celui des points posés, et personne ne le verrait. */
const GISEMENT = `
  FROM hebergements_moisson h
 WHERE NOT h.prive AND h.geom IS NOT NULL
   AND h.titre IS NOT NULL AND btrim(h.titre) <> ''
   AND ST_Y(h.geom) BETWEEN -85 AND 85`;

const [deb, fin] = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number) : [0, 7];

let total = 0, tuiles = 0, octets = 0, plafonnees = 0, fondus = 0;
for (let col = deb; col <= fin; col++) {
  const lonMin = -180 + col * 45, lonMax = lonMin + 45;
  const lues = demanderJson(`
    WITH g AS (
      SELECT h.titre AS n, nullif(btrim(coalesce(h.typologie, '')), '') AS t,
             round(ST_X(h.geom)::numeric, 5) AS x, round(ST_Y(h.geom)::numeric, 5) AS y
        ${GISEMENT}
         AND ST_X(h.geom) >= ${lonMin} AND ST_X(h.geom) < ${lonMax}),
    t AS (
      SELECT *,
             floor((x + 180) / 360 * ${2 ** ZOOM})::int AS tx,
             floor((1 - ln(tan(radians(y)) + 1/cos(radians(y))) / pi()) / 2 * ${2 ** ZOOM})::int AS ty
        FROM g),
    r AS (
      SELECT *, row_number() OVER (PARTITION BY tx, ty ORDER BY n) AS rg,
             count(*) OVER (PARTITION BY tx, ty) AS total
        FROM t)
    SELECT json_build_object(
             'z', ${ZOOM}, 'x', tx, 'y', ty, 'total', min(total),
             'l', json_agg(json_build_object('n', n, 't', t, 'g', json_build_array(x, y))
                           ORDER BY rg))::text
      FROM r WHERE rg <= ${PLAFOND} GROUP BY tx, ty ORDER BY tx, ty;`);

  for (const tuile of lues) {
    /* 🔴 LA FUSION EST CELLE DE L'ÉCRAN ET DE L'EXPORT PAR TERRITOIRE —
       importée, pas réécrite. « Altes Zollhaus » apparaît deux fois à 20 m
       d'écart parce que deux sources décrivent le même hôtel ; mesuré ce
       matin sur les deux fichiers bretons, 15 doublons sur 84.
       ⚠️ Elle agit DANS une tuile. Deux descriptions du même hôtel séparées
          par une frontière de tuile survivront — c'est le prix du découpage,
          il est borné (moins de 200 m, donc les seuls cas sont ceux qui
          longent une frontière de tuile) et il se dit. */
    const avant: Hebergement[] = tuile.l.map((e: any) => ({
      n: e.n, t: e.t ?? null, c: null, g: [e.x ?? e.g[0], e.y ?? e.g[1]] as [number, number],
    }));
    const apres = fusionner(avant);
    fondus += avant.length - apres.length;
    const corps = JSON.stringify({
      z: ZOOM, x: tuile.x, y: tuile.y, total: tuile.total,
      l: apres.map((h) => ({ n: h.n, ...(h.t ? { t: h.t } : {}), g: h.g })),
    }) + "\n";
    const dossier = resolve(SORTIE, String(ZOOM), String(tuile.x));
    mkdirSync(dossier, { recursive: true });
    writeFileSync(resolve(dossier, `${tuile.y}.json`), corps, "utf8");
    octets += Buffer.byteLength(corps);
    tuiles++; total += apres.length;
    if (tuile.total > tuile.l.length) plafonnees++;
  }
  console.log(`· colonne z3 ${col} (${lonMin}°→${lonMax}°) : ${lues.length} tuiles`);
}

console.log(`\n✓ ${tuiles} tuiles · ${total.toLocaleString("fr-FR")} hébergements posés · `
  + `${Math.round(octets / 1024 / 1024)} Mo · ${plafonnees} tuile(s) plafonnée(s) · `
  + `${fondus.toLocaleString("fr-FR")} doublon(s) fondu(s)`);
if (!existsSync(SORTIE)) { console.error("🔴 rien n'a été écrit"); process.exit(1); }

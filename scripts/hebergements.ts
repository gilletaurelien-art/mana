#!/usr/bin/env npx tsx
// LES HÉBERGEMENTS D'UN TERRITOIRE, EN FICHIER STATIQUE
//
//     npx tsx scripts/hebergements.ts            # tous les territoires
//     npx tsx scripts/hebergements.ts mullerthal
//
// ⭐ MÊME FORME QUE LES GRAPHES, ET POUR LA MÊME RAISON. L'application n'a pas
//    de serveur : elle lit des fichiers. Un hébergement de plus ne coûte donc
//    ni requête ni disponibilité — et la carte marche hors ligne. Les fichiers
//    vont à côté des graphes : `public/<contrée>/h/<slug>.json`.
//
// 🔴 LE GARDE QUI COMPTE EST UN GARDE DE VIE PRIVÉE, PAS DE QUALITÉ.
//    `hebergements_moisson` porte 1 109 098 lignes, dont **441 481 marquées
//    `prive`** — parmi elles les « Altri alloggi privati (non gestiti in forma
//    imprenditoriale) » et les « Locazioni tur. non imprenditoriali »
//    italiennes : des DOMICILES loués par des particuliers.
//
// ⭐ MESURÉ LE 14/11/2026 : aucune ligne `prive` n'a de géométrie. Les 663 104
//    lignes positionnées sont TOUTES publiques. Le problème se résout donc
//    tout seul aujourd'hui — et c'est exactement pour ça qu'il faut un garde :
//    une invariante qu'on n'a pas choisie peut cesser d'être vraie à la
//    prochaine moisson, sans que personne ne l'ait décidé. Poser une épingle
//    au bâtiment près sur un domicile, c'est publier une adresse ; ce dépôt
//    l'a déjà payé pour les associations (`adresse_est_un_domicile()`).
//
// ⛔ ET L'ADRESSE NE SORT PAS, MÊME PUBLIQUE. 30 009 lignes en portent une ;
//    la position suffit à mener quelqu'un sur place, et une adresse en clair
//    dans un fichier servi est une donnée de plus à défendre pour un gain nul.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TERRITOIRES, type Territoire } from "../src/territoires";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, "..");

/** ⚠️ Pas de valeur par défaut : ce dépôt est public (voir deployer-mana-bzh.sh). */
const HOTE = process.env.MANA_HOTE_DEPLOIEMENT ?? process.env.MANA_KS5;
if (!HOTE) {
  console.error("🔴 MANA_HOTE_DEPLOIEMENT (ou MANA_KS5) est absente.");
  console.error("   Voir deploiement/cible.local.sh ; ce script lit la base par SSH.");
  process.exit(1);
}

function demander(sql: string): string[][] {
  const payload = `\\pset format unaligned\n\\pset tuples_only on\n\\pset fieldsep '\\t'\n${sql}\n`;
  const out = execFileSync("ssh",
    ["-o", "ConnectTimeout=25", HOTE!,
     "sudo docker exec -i pg-repetition psql -U postgres -d postgres"],
    { input: payload, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return out.split("\n").map((l) => l.trimEnd())
    .filter((l) => l.trim() && !/^(Output format|Tuples only|Field separator)/.test(l))
    .map((l) => l.split("\t"));
}

/* ══ LE GARDE, AVANT TOUT EXPORT ════════════════════════════════════════ */
const [[, prives]] = demander(
  `SELECT 'prives_situes', count(*)::text FROM hebergements_moisson
     WHERE prive AND geom IS NOT NULL;`);
if (Number(prives) > 0) {
  console.error(`🔴 ${prives} hébergement(s) PRIVÉ(s) portent une position.`);
  console.error("   L'invariante mesurée le 14/11/2026 — « aucun privé n'est situé » —");
  console.error("   a cessé d'être vraie. Exporter maintenant publierait des DOMICILES");
  console.error("   au bâtiment près. Décidez quoi en faire AVANT de relancer :");
  console.error("   les écarter, ou les flouter — jamais les publier tels quels.");
  process.exit(1);
}
console.log(`✓ garde : aucun hébergement privé n'est situé (${prives} sur 441 481 privés)`);

/* ══ L'EXPORT ═══════════════════════════════════════════════════════════ */
const demandes = process.argv.slice(2);
const cibles = demandes.length
  ? TERRITOIRES.filter((t) => demandes.includes(t.slug))
  : TERRITOIRES;
if (!cibles.length) {
  console.error(`🔴 aucun territoire ne correspond à « ${demandes.join(" ")} ».`);
  console.error(`   connus : ${TERRITOIRES.map((t) => t.slug).join(", ")}`);
  process.exit(1);
}

/** La contrée donne le dossier servi : `bretagne` chez nous, `monde` ailleurs. */
const dossierDe = (t: Territoire) => (t.contree === "bretagne" ? "bretagne" : "monde");

for (const t of cibles) {
  const [x0, y0, x1, y1] = t.emprise;
  const lignes = demander(
    `SELECT titre, typologie, commune,
            coalesce(couchages::text, ''), coalesce(chambres::text, ''),
            round(ST_X(geom)::numeric, 5)::text, round(ST_Y(geom)::numeric, 5)::text
       FROM hebergements_moisson
      WHERE NOT prive AND geom IS NOT NULL
        AND ST_Intersects(geom, ST_MakeEnvelope(${x0}, ${y0}, ${x1}, ${y1}, 4326))
        AND titre IS NOT NULL AND btrim(titre) <> ''
      ORDER BY titre;`);

  const bruts = lignes.map(([titre, typologie, commune, couchages, chambres, lon, lat]) => ({
    n: titre, t: typologie || null, c: commune || null,
    ...(couchages ? { lits: Number(couchages) } : {}),
    ...(chambres ? { ch: Number(chambres) } : {}),
    g: [Number(lon), Number(lat)] as [number, number],
  }));

  /* 🔴 LE MÊME LIEU, MOISSONNÉ DEUX FOIS — mesuré le 14/11/2026 : « Altes
     Zollhaus » apparaît deux fois dans le Mullerthal, à **20 m** d'écart, une
     fois côté luxembourgeois et une fois côté allemand. Ce n'est pas un
     doublon de base, c'est deux sources qui décrivent le même hôtel.
     ⭐ Environ 5 % des lignes : 3 sur 60 en presqu'île, 2 sur 29 sur l'Aulne,
        3 sur 59 au Mullerthal.
     ⛔ Et ce défaut-là, ce dépôt l'a déjà payé À L'ÉCRAN : « une superposition
        de 2 px cachait 1 site sur 5 proposant deux fois le même lieu ». On
        dédoublonne donc À L'EXPORT — une fois, où c'est mesurable — plutôt
        qu'à l'affichage, où chaque surface devrait y penser.
     ⚠️ MÊME NOM **ET** MOINS DE 200 m. Le nom seul écarterait deux campings
        municipaux de communes différentes ; la distance seule fondrait un
        hôtel et le camping d'en face. Il faut les deux. */
  const metres = (a: [number, number], b: [number, number]) => {
    const r = Math.PI / 180;
    const x = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) * r) / 2);
    return 6371000 * r * Math.hypot(x, b[1] - a[1]);
  };
  const h: typeof bruts = [];
  let fondus = 0;
  for (const x of bruts) {
    const jumeau = h.find((y) => y.n === x.n && metres(y.g, x.g) < 200);
    if (jumeau) {
      fondus++;
      // ⭐ On garde la ligne la PLUS RENSEIGNÉE : entre deux descriptions du
      //    même lieu, celle qui porte les couchages vaut mieux que l'autre.
      if ((x.lits ?? 0) + (x.ch ?? 0) > (jumeau.lits ?? 0) + (jumeau.ch ?? 0))
        h[h.indexOf(jumeau)] = x;
      continue;
    }
    h.push(x);
  }

  // ⚠️ Un fichier VIDE se publie quand même : « nous n'en connaissons aucun
  //    ici » est une réponse, et l'absence de fichier serait un 404 que
  //    l'écran lirait comme une panne.
  const dossier = resolve(RACINE, "public", dossierDe(t), "h");
  mkdirSync(dossier, { recursive: true });
  const fichier = resolve(dossier, `${t.slug}.json`);
  writeFileSync(fichier, JSON.stringify({
    genere: new Date().toISOString(),
    territoire: t.slug,
    /* ⛔ LA SOURCE SE DIT. Ces lignes viennent d'OpenStreetMap et des portails
       touristiques régionaux moissonnés ; les republier sans le dire serait
       s'en attribuer la collecte. */
    attribution: "OpenStreetMap et portails touristiques régionaux — moisson MANA",
    h,
  }) + "\n", "utf8");
  console.log(`✓ ${dossierDe(t)}/h/${t.slug}.json — ${h.length} hébergement(s)`
    + (fondus ? ` (${fondus} doublon(s) fondu(s))` : ""));
}

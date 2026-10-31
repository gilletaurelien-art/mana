/**
 * LE STYLE « VUE AÉRIENNE » — DÉRIVÉ du style plan, jamais écrit à côté.
 *
 * ⭐ DEUX STYLES ÉCRITS À LA MAIN DIVERGENT. Celui-ci reprend les SOURCES et
 *    les ÉTIQUETTES du style plan, et n'ajoute qu'une chose : la couche
 *    raster de l'orthophotographie, dessous. Quand le jeu de tuiles de la
 *    planète change d'horodatage, `carte:style` régénère le plan — et celui-ci
 *    suit par construction, puisqu'il en descend.
 *
 * ⛔ ON NE GARDE QUE LES COUCHES `symbol` — les noms de lieux, les numéros de
 *    route. Les remplissages (forêts, mer, bâti) recouvriraient la
 *    photographie : on aurait payé une image aérienne pour la cacher sous un
 *    dessin.
 *
 * ⚠️ LES TUILES SONT RELAYÉES PAR NOUS, comme tout le reste. En direct, le
 *    navigateur du promeneur dirait à l'IGN son IP ET la zone qu'il regarde.
 *
 *     node scripts/carte-ortho.mjs [--verifier]
 */
import { readFile, writeFile } from "node:fs/promises";

const PLAN = new URL("../public/carte-style.json", import.meta.url);
const SORTIE = new URL("../public/carte-ortho.json", import.meta.url);
const TUILES = "https://mana.bzh/carte/ortho/{z}/{x}/{y}.jpg";

const plan = JSON.parse(await readFile(PLAN, "utf8"));

const etiquettes = plan.layers.filter((l) => l.type === "symbol");

const ortho = {
  version: 8,
  name: "MANA — vue aérienne",
  /* ⛔ L'ATTRIBUTION VOYAGE DANS L'ARTEFACT, pas seulement à l'écran. */
  metadata: {
    attribution: "Vue aérienne © IGN — Géoplateforme · étiquettes © OpenStreetMap, ODbL",
  },
  sprite: plan.sprite,
  glyphs: plan.glyphs,
  sources: {
    ortho: {
      type: "raster",
      tiles: [TUILES],
      tileSize: 256,
      /* relevé dans les capacités WMTS de la couche, le 31/10/2026 */
      minzoom: 6,
      maxzoom: 19,
      attribution: "© IGN",
    },
    openmaptiles: plan.sources.openmaptiles,
  },
  layers: [
    { id: "ortho", type: "raster", source: "ortho" },
    ...etiquettes,
  ],
};

/* ── LES GARDES, AVANT D'ÉCRIRE ────────────────────────────────────────────
   ⚠️ Un script qui écrit puis vérifie laisse un fichier cassé sur le disque. */
const urls = [
  ...Object.values(ortho.sources).flatMap((s) => s.tiles ?? []),
  ortho.sprite, ortho.glyphs,
].filter(Boolean);

const echecs = [];
/* ⚠️ 15, ET CE N'EST PAS UN CHIFFRE ROND CHOISI AU HASARD : le style plan en
   porte 25 au 31/10/2026 (noms d'eau, points d'intérêt, voies, villages,
   villes, pays). Le plancher est posé assez bas pour qu'une refonte amont
   légitime passe, assez haut pour qu'un style qui aurait perdu ses étiquettes
   soit refusé. ⭐ Le seuil a d'abord été écrit à 30 — au-dessus du réel, donc
   il refusait tout : un seuil inventé plutôt que mesuré. */
if (etiquettes.length < 15) echecs.push(`seulement ${etiquettes.length} couches d'étiquettes (25 attendues) — le style plan a-t-il changé de forme ?`);
if (ortho.layers.some((l) => l.type === "fill" || l.type === "background"))
  echecs.push("une couche de remplissage recouvrirait la photographie");
for (const u of urls) {
  if (!/^https:\/\/mana\.bzh\/carte\//.test(u)) echecs.push(`URL hors de notre relais : ${u}`);
  if (/openfreemap|geopf|maptiler|mapbox/.test(u)) echecs.push(`amont nommé en clair : ${u}`);
}
if (!ortho.metadata.attribution.includes("IGN")) echecs.push("attribution IGN absente");

if (echecs.length) {
  console.error("⛔ Rien n'est écrit :");
  for (const e of echecs) console.error("   · " + e);
  process.exit(1);
}

const texte = JSON.stringify(ortho);

if (process.argv.includes("--verifier")) {
  const actuel = await readFile(SORTIE, "utf8").catch(() => "");
  if (actuel !== texte) {
    console.error("⛔ public/carte-ortho.json a dérivé du style plan — lancer `npm run carte:ortho`.");
    process.exit(1);
  }
  console.log(`carte-ortho.json à jour — ${etiquettes.length} couches d'étiquettes`);
} else {
  await writeFile(SORTIE, texte);
  console.log(`écrit : public/carte-ortho.json — ${(texte.length / 1024).toFixed(0)} Ko · ${etiquettes.length} couches d'étiquettes sur la photographie`);
}

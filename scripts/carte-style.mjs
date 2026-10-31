/**
 * Rapatrie le style de carte DANS l'app — troisième consommateur du miroir.
 *
 * ⭐ POURQUOI UN FICHIER EMBARQUÉ PLUTÔT QU'UNE URL. Le 31/10/2026,
 *    `mana.bzh/carte/style.json` a répondu 404 pendant on ne sait combien de
 *    temps : un joker `/carte/*` passait avant son handler dans l'ordre que
 *    Caddy calcule, et tout partait au relais nginx qui ne connaît que quatre
 *    familles de chemins. C'est le PREMIER fichier que maplibre lit — sans lui
 *    rien ne s'affiche, pas même une erreur à l'écran. Faire dépendre toute la
 *    cartographie d'une ligne de configuration d'un serveur tiers était le
 *    défaut ; le 404 n'en était que le symptôme.
 *
 * ⚠️ ON LIT LE SERVEUR, PAS L'AMONT. `tiles.openfreemap.org` est déjà
 *    rapatrié par `scripts/miroir-carte.mjs` (dépôt manafrance-app), qui écrit
 *    `volumes/www/carte/{style,planet}.json` et réécrit toutes les URLs vers
 *    notre relais. Repartir de l'amont ici referait ce travail une seconde
 *    fois, avec une seconde occasion de se tromper — et surtout la copie
 *    embarquée pourrait diverger de ce qui est SERVI. On lit donc ce qui est
 *    servi.
 *
 * ⚠️ LA TILEJSON EST INLINÉE, ET CE N'EST PAS UNE OPTIMISATION. Le style
 *    renvoie à `planet.json`, qui renvoie aux tuiles : deux sauts, deux routes
 *    qui peuvent tomber. Les deux sont tombées le même jour. Inlinée, l'app ne
 *    dépend plus que des chemins qui répondent — tuiles, relief, sprites,
 *    polices.
 *
 * ⚠️ L'URL DES TUILES PORTE UNE DATE (`planet/20260906_080001_pt/`). L'amont
 *    republie la planète régulièrement ; `miroir-carte.mjs` est alors rejoué
 *    côté serveur, et CE script doit l'être ensuite. Sans ça la copie embarquée
 *    pointe sur un jeu retiré — silencieusement, parce qu'un jeu retiré rend
 *    404 sur les tuiles et que maplibre n'en dit rien à l'écran.
 *
 *     node scripts/carte-style.mjs              régénère
 *     node scripts/carte-style.mjs --verifier   ne touche à rien, sort en 1
 *                                               si la copie a divergé
 */
import { readFile, writeFile } from "node:fs/promises";

const RELAIS = "https://mana.bzh/carte";
const SORTIE = new URL("../public/carte-style.json", import.meta.url);
const verifier = process.argv.includes("--verifier");

/** ⛔ Les hébergeurs amont, nommément. Les voir dans le fichier produit veut
 *  dire que l'IP du promeneur sortira de chez nous. */
const AMONT = /openfreemap|maptiler|mapbox|tiles\.openstreetmap/i;

const lire = async (nom) => {
  const r = await fetch(`${RELAIS}/${nom}`, { headers: { Origin: "https://mana.bzh" } });
  if (!r.ok) throw new Error(`${RELAIS}/${nom} → HTTP ${r.status}. La route est-elle encore cassée ?`);
  return r.json();
};

const style = await lire("style.json");
const planet = await lire("planet.json");

const src = style.sources?.openmaptiles;
if (!src) throw new Error("le style ne porte plus de source `openmaptiles` — le miroir a changé de forme");
if (!src.url?.endsWith("planet.json")) {
  throw new Error(`source déjà inlinée ou inattendue : ${JSON.stringify(src).slice(0, 120)}`);
}

style.sources.openmaptiles = {
  type: "vector",
  tiles: planet.tiles,
  minzoom: planet.minzoom,
  maxzoom: planet.maxzoom,
  bounds: planet.bounds,
  attribution: planet.attribution ?? "",
};

/* ── LES GARDES, AVANT D'ÉCRIRE ───────────────────────────────────────────
   ⭐ Un script de génération qui écrit d'abord et vérifie ensuite laisse un
      fichier cassé sur le disque quand il échoue. Ici rien n'est écrit tant
      que les quatre conditions ne tiennent pas. */
const urls = [
  ...Object.values(style.sources).flatMap((s) => s.tiles ?? []),
  style.sprite ?? "",
  style.glyphs ?? "",
].filter(Boolean);

if (urls.length < 4) throw new Error(`seulement ${urls.length} URLs — le style semble tronqué`);
for (const u of urls) {
  if (!u.startsWith(`${RELAIS}/`)) throw new Error(`⛔ URL hors relais : ${u}`);
  if (AMONT.test(u)) throw new Error(`⛔ FUITE : l'URL cite l'amont — ${u}`);
  if (!/\/carte\/(planet|natural_earth|sprites|fonts)\//.test(u)) {
    throw new Error(`⛔ famille de chemin que le serveur ne sert pas : ${u}`);
  }
}
if (!Array.isArray(style.layers) || style.layers.length < 100) {
  throw new Error(`${style.layers?.length ?? 0} couches — le style semble tronqué`);
}

const produit = JSON.stringify(style);
const actuel = await readFile(SORTIE, "utf8").catch(() => null);
const jeu = planet.tiles[0].match(/\/planet\/([^/]+)\//)?.[1] ?? "?";

if (produit === actuel) {
  console.log(`✓ à jour — jeu de tuiles ${jeu}, ${style.layers.length} couches`);
  process.exit(0);
}
if (verifier) {
  const ancien = actuel?.match(/\/planet\/([^/]+)\//)?.[1] ?? "(absent)";
  console.error(`✗ la copie embarquée a divergé.\n  embarqué : ${ancien}\n  servi    : ${jeu}\n  → node scripts/carte-style.mjs`);
  process.exit(1);
}
await writeFile(SORTIE, produit);
console.log(`✓ régénéré — jeu de tuiles ${jeu}, ${style.layers.length} couches, ${(produit.length / 1024).toFixed(1)} Ko`);

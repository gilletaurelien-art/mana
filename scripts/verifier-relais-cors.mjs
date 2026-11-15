#!/usr/bin/env node
/**
 * LE RELAIS RÉPOND-IL À CHACUN DE NOS HÔTES ? — posé le 15/11/2026, après
 * un défaut MESURÉ en production le soir même.
 *
 * 🔴 CE QUI S'EST PASSÉ. manafrance.org a été servi le 15/11 au soir. Sa
 *    carte satellite est restée BLANCHE : la liste blanche d'origines du
 *    relais (`mana-bzh-ks5.caddy`, SIX fois) nommait mana.love, manafamily,
 *    manahome et alliancemana — pas manafrance. Le navigateur refusait donc
 *    chaque tuile, chaque sprite, chaque police.
 * ⛔ ET LE FICHIER DE CONFIGURATION LE PRÉDISAIT, EN TOUTES LETTRES : « une
 *    origine absente n'obtient AUCUN en-tête, et la page reste vide SANS
 *    ERREUR visible à l'écran ». Il prédisait aussi le reste : « recopiée à
 *    l'identique à dessein — si elle change, elle change aux quatre
 *    endroits » (elles sont six). Une prédiction écrite n'est pas un garde.
 *
 * ⭐ CE GARDE MESURE L'EFFET, PAS LA CONFIGURATION. Il ne lit pas le
 *    Caddyfile — il DEMANDE les ressources avec un en-tête `Origin`, et
 *    regarde ce qui revient. Un fichier juste mal rechargé passerait une
 *    relecture et échouerait ici.
 *
 * ⚠️ ET IL VÉRIFIE AUSSI LE REFUS. Un garde qui n'exige que la présence de
 *    l'en-tête resterait vert si quelqu'un ouvrait le relais à `*` — c'est
 *    précisément la protection qu'on croirait tenir. Une origine inconnue
 *    doit repartir SANS en-tête.
 */
import { readFileSync } from "node:fs";

const RACINE = new URL("..", import.meta.url);
const lire = (f) => readFileSync(new URL(f, RACINE), "utf8");

/* ⭐ LES HÔTES SE DÉRIVENT DE `visage()`, ILS NE SE RECOPIENT PAS. La question
   posée ici — « sur quels hôtes cette application est-elle servie ? » — a déjà
   une réponse dans le code, et c'est la seule qui compte. Un cinquième visage
   entrera dans ce contrôle sans que personne n'y pense : c'est exactement ce
   qui a manqué au quatrième. */
function hotesServis() {
  const corps = lire("src/visage.ts").match(
    /export function visage\(\)[\s\S]*?\n}/)?.[0] ?? "";
  const hotes = [...corps.matchAll(/"([a-z0-9-]+\.[a-z.]+)"/g)]
    .map((m) => m[1])
    .filter((h) => !h.startsWith("."));          // les sous-domaines, pas des hôtes
  return [...new Set(hotes)];
}

/**
 * ⭐ LES RESSOURCES SE DÉRIVENT DES FEUILLES DE STYLE ET DU CODE — même règle
 *    que `emporter.ts` : le chemin porte la version du jeu de tuiles
 *    (`…/planet/20260906_080001_pt/…`), et recopié ici il désignerait un jeu
 *    retiré au premier renouvellement. Le garde deviendrait rouge sans
 *    qu'aucune origine n'ait bougé.
 *
 * 🔴 ET LA PREMIÈRE RÉDACTION NE LISAIT QUE LE STYLE SATELLITE. Mutation
 *    posée pour l'éprouver — retirer manafrance d'UNE des six listes du
 *    relais : le garde est resté VERT, parce que la liste touchée gardait un
 *    chemin que le style satellite ne nomme pas. ⛔ C'est le même défaut que
 *    le garde CSS écrit une heure plus tôt, à la même heure, dans le même
 *    travail : un ensemble mesuré sur un échantillon qui n'est pas celui du
 *    défaut. Les DEUX styles sont lus, et les adresses absolues du code avec.
 */
function ressourcesDuRelais() {
  const out = new Set();
  const tuile = (g) => g.replace("{z}", 6).replace("{x}", 32).replace("{y}", 22);

  for (const feuille of ["public/carte-ortho.json", "public/carte-style.json"]) {
    const s = JSON.parse(lire(feuille));
    for (const src of Object.values(s.sources ?? {})) {
      if (Array.isArray(src.tiles) && src.tiles[0]) out.add(tuile(src.tiles[0]));
      /* ⚠️ Une source peut déclarer un TileJSON au lieu de ses tuiles — et
         c'est un AUTRE `handle` côté relais, donc une autre liste blanche. */
      if (src.url) out.add(src.url);
    }
    if (s.sprite) out.add(`${s.sprite}.json`);
    if (s.glyphs) out.add(s.glyphs.replace("{fontstack}", "Noto%20Sans%20Regular")
                                  .replace("{range}", "0-255"));
  }

  /* ⭐ ET LES ADRESSES ABSOLUES ÉCRITES DANS LE CODE — les graphes bretons,
     les communes, les tuiles du monde. Elles ne passent par aucune feuille de
     style, elles vivent dans `catalogue.ts` et `CarteMonde.tsx`, et chacune
     tombe dans un `handle` distinct du relais.
     ⚠️ LES TÉMOINS SONT DES FICHIERS QUI EXISTENT, et un 404 fait ÉCHOUER ce
        garde plutôt que de le laisser passer : un témoin disparu ne mesure
        plus rien, et c'est la panne silencieuse qu'on cherche à éviter. */
  for (const t of [
    "https://mana.bzh/bretagne/g/crozon.json",      // catalogue.ts — BASE
    "https://mana.bzh/promenades/communes.json",    // catalogue.ts — COMMUNES
    "https://mana.bzh/monde/s/8/128/88.json",       // CarteMonde.tsx — TUILES
    /* ⛔ CES DEUX-LÀ NE SONT PAS À NOUS, ET C'EST POUR ÇA QU'ILS SONT ICI.
       Cette application sert sa feuille de style depuis SON hôte
       (`carte-style.json`) ; `/carte/style.json` et `/carte/planet.json` sont
       les TileJSON que le relais sert aux AUTRES cartes de l'écosystème
       (manafrance-org). Ils vivent sur la MÊME liste blanche, dans deux
       `handle` distincts : mesuré le 15/11, muter l'un d'eux laissait ce
       garde vert sur cinq mutations sur six. ⭐ Un garde qui ne couvre que
       son propre usage laisse un trou de la taille des voisins. */
    "https://mana.bzh/carte/style.json",
    "https://mana.bzh/carte/planet.json",
  ]) out.add(t);

  return [...out].filter((u) => u.startsWith("http"));
}

/**
 * ⛔ LE CODE A-T-IL APPRIS UNE FAMILLE D'ADRESSES QUE CE GARDE NE SONDE PAS ?
 *    Chaque premier segment de chemin (`/carte/`, `/bretagne/`, `/monde/`,
 *    `/promenades/`) est un `handle` SÉPARÉ du relais, donc une liste blanche
 *    séparée. Une famille nouvelle apparue dans `src/` et absente d'ici
 *    passerait inaperçue — exactement comme manafrance est passé inaperçu
 *    dans les listes du serveur.
 */
function famillesNonCouvertes(sondees) {
  const couvertes = new Set(sondees.map(
    (u) => u.replace(/^https:\/\/mana\.bzh\//, "").split("/")[0]));
  /* 🔴 ET IL FAUT DÉCAPER LES COMMENTAIRES D'ABORD — le garde est tombé sur sa
     propre documentation à sa première exécution. `CarteMonde.tsx` CITE une
     adresse morte (`https://mana.bzh/presquile.json`) dans le récit du défaut
     qu'elle raconte, et le garde a exigé un témoin pour une famille qui
     n'existe pas. ⭐ Troisième fois dans la même soirée qu'un garde lit de la
     prose pour du code — c'est le piège que `CLAUDE.md` nomme « LA LIGNE
     CITÉE CONFIRME ENCORE ». Un garde qui lit du texte doit lire le texte qui
     s'exécute. */
  const sansProse = (t) =>
    t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[^\n]*?\/\/[^\n]*$/gm, "");
  const trouvees = new Set();
  for (const f of ["src/catalogue.ts", "src/CarteMonde.tsx", "src/carte-fond.ts",
                   "src/Composer.tsx", "src/Hebergements.tsx", "src/Territoire2030.tsx"]) {
    const net = sansProse(lire(f));
    /* ⛔ Et le décapage ne doit pas tout emporter : un fichier vidé ne trouve
       rien, donc ne manque rien — un garde vert sur du vide. */
    if (net.length < 500) {
      throw new Error(`le décapage a vidé ${f} : le garde ne mesurerait rien`);
    }
    for (const m of net.matchAll(/https:\/\/mana\.bzh\/([a-z0-9-]+)/g)) trouvees.add(m[1]);
  }
  return [...trouvees].filter((f) => !couvertes.has(f) && !f.includes("."));
}

async function entete(url, origine) {
  try {
    const r = await fetch(url, { headers: { Origin: origine }, redirect: "follow" });
    return { code: r.status, cors: r.headers.get("access-control-allow-origin") };
  } catch (e) {
    return { code: 0, cors: null, erreur: e.message };
  }
}

const vert = (s) => `\x1b[32m${s}\x1b[0m`;
const rouge = (s) => `\x1b[31m${s}\x1b[0m`;

const hotes = hotesServis();
const ressources = ressourcesDuRelais();

/* ⛔ UN MOTIF QUI NE TROUVE RIEN REND UNE LISTE VIDE, DONC ZÉRO ÉCHEC. Le
   garde passerait au vert en n'ayant rien mesuré — la forme la plus courante
   du contrôle décoratif dans ce dépôt. */
if (hotes.length < 2 || ressources.length < 3) {
  console.error(rouge(`⛔ le garde n'a rien à mesurer : ${hotes.length} hôte(s), `
    + `${ressources.length} ressource(s). Le motif a raté sa cible.`));
  process.exit(1);
}

const orphelines = famillesNonCouvertes(ressources);
if (orphelines.length) {
  console.error(rouge(`⛔ le code demande au relais des familles d'adresses que `
    + `ce garde ne sonde pas : ${orphelines.join(", ")}`));
  console.error("   Chacune est un `handle` distinct, donc une liste blanche distincte.");
  console.error("   Ajoutez un témoin dans `ressourcesDuRelais()`.");
  process.exit(1);
}

let echecs = 0;
for (const hote of hotes) {
  const origine = `https://${hote}`;
  for (const url of ressources) {
    /* même origine : le navigateur ne demande aucun en-tête */
    if (url.startsWith(origine)) continue;
    const { code, cors } = await entete(url, origine);
    const court = url.replace(/^https:\/\/[^/]+\//, "").slice(0, 48);
    if (code === 404) {
      /* ⛔ Un témoin disparu ne mesure plus rien : il doit CRIER, pas passer. */
      console.log(`  ${rouge("✗")} ${hote.padEnd(16)} ${court} → 404, `
        + `le témoin n'existe plus : ce garde ne mesurait rien.`);
      echecs++;
    } else if (cors === origine) {
      console.log(`  ${vert("✓")} ${hote.padEnd(16)} ${court}`);
    } else {
      console.log(`  ${rouge("✗")} ${hote.padEnd(16)} ${court} → ${code}, `
        + `Access-Control-Allow-Origin: ${cors ?? "AUCUN"}`);
      echecs++;
    }
  }
}

/* ⚠️ LE REFUS, mesuré sur la même ressource — sinon « le relais répond » ne
   distingue pas une liste blanche d'une porte ouverte. */
const intrus = "https://ceci-nest-pas-un-hote-de-mana.invalid";
const { cors: fuite } = await entete(ressources[0], intrus);
if (fuite) {
  console.log(`  ${rouge("✗")} le relais répond à une origine INCONNUE `
    + `(Access-Control-Allow-Origin: ${fuite}) — la liste blanche ne filtre plus.`);
  echecs++;
} else {
  console.log(`  ${vert("✓")} une origine inconnue repart sans en-tête`);
}

if (echecs > 0) {
  console.error(rouge(`\n⛔ ${echecs} contrôle(s) de relais en échec.`));
  console.error("   La carte restera BLANCHE sur l'hôte concerné, sans erreur à l'écran.");
  console.error("   La liste blanche vit dans `mana-bzh-ks5.caddy` sur le KS-5 "
    + "(plusieurs occurrences — les changer TOUTES), puis :");
  console.error("   sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy");
  process.exit(1);
}
console.log(vert(`✓ le relais sert les ${hotes.length} hôtes de l'application, et refuse les autres`));

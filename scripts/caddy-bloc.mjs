// Engendre `deploiement/mana-bzh.caddy` depuis `src/routes.ts`.
//
// 🔴 LA LISTE DES CHEMINS DE L'APPLICATION VIT À TROIS ENDROITS qui ne se
//    parlent pas : ce bloc Caddy (quel fichier le serveur rend), le service
//    worker (quelle navigation il garde) et le routeur (quel écran monter).
//    Un désaccord est MUET dans les trois sens.
// ⭐ On n'en recopie donc aucune à la main : celle-ci est ENGENDRÉE, celle du
//    service worker est tenue par un test, et le routeur est la source.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync(new URL("../src/routes.ts", import.meta.url), "utf8");
const fond = readFileSync(new URL("../src/carte-fond.ts", import.meta.url), "utf8");

/**
 * 🔴 CE LECTEUR A ÉTÉ CASSÉ DEUX FOIS, ET LA SECONDE FOIS EN SILENCE — trouvé
 *    le 2/11/2026 en essayant simplement de relancer le générateur.
 *
 *    1. Il exigeait `] as const;`. `FICHIERS_APP` se termine par `];` depuis
 *       l'armement du hors-ligne : le script LEVAIT, donc personne ne pouvait
 *       régénérer le bloc. Bruyant, mais invisible tant qu'on ne relance pas.
 *    2. ⭐ ET LE SECOND DÉFAUT ÉTAIT MUET, DONC PIRE. Une fois la terminaison
 *       admise, l'extraction ne lisait que les chaînes entre GUILLEMETS
 *       DOUBLES. Or les deux noms de style sont des gabarits à accents
 *       graves : `/${NOM_STYLE_PLAN}`. Le bloc sortait avec 18 chemins au
 *       lieu de 20 — sans `/carte-style.json` ni `/carte-ortho.json`.
 *       C'est EXACTEMENT l'accident du 31/10 que ce fichier existe pour
 *       empêcher : « /carte/style.json → 404, aucune carte sur aucun site,
 *       aucune erreur ». Un générateur fait pour empêcher une divergence
 *       muette l'aurait créée à sa prochaine exécution — et sa prochaine
 *       exécution était la bascule vers le KS-5.
 *
 * ⭐ D'OÙ LE GARDE DE COMPTAGE PLUS BAS. Corriger le gabarit à accents graves
 *    ne suffit pas : la prochaine forme qu'on écrira dans `routes.ts` sera
 *    d'un troisième genre. On compte donc les ENTRÉES du tableau et on exige
 *    d'en avoir extrait autant. Une forme illisible fait TOMBER le script au
 *    lieu de raccourcir la liste.
 */
const CONSTANTES = Object.fromEntries(
  [...fond.matchAll(/export const (NOM_STYLE_[A-Z]+)\s*=\s*"([^"]+)"/g)]
    .map((m) => [m[1], m[2]]),
);

const liste = (nom) => {
  const m = src.match(new RegExp(`${nom}\\s*=\\s*\\[([\\s\\S]*?)\\](?: as const)?;`));
  if (!m) throw new Error(`${nom} introuvable dans src/routes.ts`);
  const corps = m[1];

  /* Les entrées du tableau : une par ligne non vide, commentaires retirés. */
  const entrees = corps
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, "").replace(/\/\*[\s\S]*?\*\//g, "").trim())
    .filter((l) => l && l !== ",");

  const chemins = entrees.map((e) => {
    const guillemets = e.match(/^"([^"]+)"/);
    if (guillemets) return guillemets[1];
    const gabarit = e.match(/^`([^`]+)`/);
    if (gabarit) {
      /* `/${NOM_STYLE_PLAN}` → on résout depuis carte-fond.ts, la SOURCE du
         nom. ⚠️ On ne recopie pas la valeur ici : c'est précisément ce que ce
         fichier reproche aux trois listes. */
      const resolu = gabarit[1].replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, k) => {
        if (!(k in CONSTANTES)) {
          throw new Error(
            `${nom} : « ${k} » n'est pas résoluble depuis src/carte-fond.ts. ` +
            `Ajoute-la là-bas, ou écris le chemin en clair — mais ne laisse ` +
            `pas le bloc Caddy sortir sans.`);
        }
        return CONSTANTES[k];
      });
      return resolu;
    }
    throw new Error(
      `${nom} : entrée illisible « ${e} ». Le bloc Caddy serait sorti SANS ` +
      `elle, et un chemin absent de ce bloc est servi par l'ancien site — ` +
      `sans erreur, sans trace. Étends ce lecteur plutôt que de passer outre.`);
  });

  if (chemins.length !== entrees.length) {
    throw new Error(`${nom} : ${entrees.length} entrées, ${chemins.length} lues.`);
  }
  return chemins;
};

const chemins = [
  ...liste("ROUTES_APP"),
  ...liste("PREFIXES_APP").map((p) => `${p}*`),
  ...liste("FICHIERS_APP"),
];

const entete = readFileSync(new URL("../deploiement/mana-bzh.caddy", import.meta.url), "utf8")
  .split("@appbzh {")[0];

/**
 * ⭐ `--verifier` : CALCULER SANS ÉCRIRE.
 *
 * 🔴 LE TEST QUI EXISTAIT GARDAIT L'ARTEFACT, PAS LE PRODUCTEUR — et c'est
 *    exactement pour ça que le bloc en dépôt est resté juste pendant que ce
 *    script, lui, était cassé. `trois-listes.test.ts` compare la ligne `path`
 *    du fichier COMMITÉ aux constantes de `routes.ts` : les deux
 *    concordaient. Personne ne lançait le générateur, donc personne ne voyait
 *    qu'il aurait rendu autre chose.
 * ⭐ Un garde posé sur le résultat d'un outil ne dit rien de l'outil. Ce mode
 *    existe pour qu'un test puisse faire TOURNER le générateur sans toucher à
 *    l'arbre de travail — et pour qu'on puisse le lancer à la main avant une
 *    bascule, qui est le moment où une régénération est le geste naturel.
 */
if (process.argv.includes("--verifier")) {
  const actuel = readFileSync(new URL("../deploiement/mana-bzh.caddy", import.meta.url), "utf8");
  const ligne = actuel.match(/^\s*path (.+)$/m);
  const attendu = chemins.join(" ");
  if (!ligne || ligne[1].trim() !== attendu) {
    console.error("caddy-bloc --verifier : le bloc en dépôt ne correspond plus.");
    console.error(`  engendré (${chemins.length}) : ${attendu}`);
    console.error(`  en dépôt            : ${ligne ? ligne[1].trim() : "(ligne path absente)"}`);
    process.exit(1);
  }
  console.log(`caddy-bloc --verifier : ${chemins.length} chemins, le bloc en dépôt concorde.`);
  process.exit(0);
}

mkdirSync(new URL("../deploiement/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../deploiement/mana-bzh.caddy", import.meta.url),
  `${entete}@appbzh {
    host mana.bzh
    path ${chemins.join(" ")}
}
handle @appbzh {
    root * /srv/www/_app-bzh
    try_files {path} {path}/index.html /index.html
    file_server
}
`,
);
console.log(`caddy-bloc: ${chemins.length} chemins engendrés depuis src/routes.ts`);

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

/* 🔴 DEUX HÔTES, DEUX LISTES — 7/11/2026. mana.love sert la même application
   SANS l'Office : `/balades-office` n'est pas à nous là-bas.
   ⭐ ON NE REVENDIQUE PAS CE QU'ON NE SERT PAS. Garder les 22 chemins
      identiques « pour ne rien changer au garde » aurait fait répondre 200 à
      une adresse dont cet hôte n'a pas la matière — le pire des trois
      désaccords, parce qu'il a l'air de marcher. Et un garde qu'on maintient
      vert en ne lui apprenant rien ne garde plus.
   ⚠️ La liste love est DÉRIVÉE de la liste bzh, jamais recopiée : toute route
      neuve entre dans les deux par construction, seule l'exclusion est
      explicite. C'est la même règle que `ROUTES_LOVE` dans `routes.ts`, et
      le test ci-contre refuse qu'elles divergent. */
const ROUTE_OFFICE = "/balades-office";
const communs = [
  ...liste("PREFIXES_APP").map((p) => `${p}*`),
  ...liste("FICHIERS_APP"),
];
const chemins = [...liste("ROUTES_APP"), ...communs];
const cheminsLove = [
  ...liste("ROUTES_APP").filter((c) => c !== ROUTE_OFFICE),
  ...communs,
];
if (cheminsLove.length !== chemins.length - 1) {
  throw new Error(
    `caddy-bloc : la liste love devrait valoir la liste bzh moins ${ROUTE_OFFICE}, ` +
    `or elle fait ${cheminsLove.length} contre ${chemins.length}. ` +
    `Le chemin de l'Office a-t-il changé de nom ?`);
}

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
  /* ⚠️ LES DEUX BLOCS SE VÉRIFIENT, pas seulement le premier. Ne contrôler
     qu'`@appbzh` laisserait `@applove` dériver en silence — et c'est sur
     mana.love que le chemin de l'Office ne doit surtout pas revenir. */
  const lignes = [...actuel.matchAll(/^\s*path (.+)$/gm)].map((m) => m[1].trim());
  const attendus = [chemins.join(" "), cheminsLove.join(" ")];
  const noms = ["@appbzh", "@applove"];
  if (lignes.length !== attendus.length) {
    console.error(`caddy-bloc --verifier : ${attendus.length} blocs attendus, ${lignes.length} lus.`);
    process.exit(1);
  }
  for (let i = 0; i < attendus.length; i++) {
    if (lignes[i] !== attendus[i]) {
      console.error(`caddy-bloc --verifier : ${noms[i]} ne correspond plus.`);
      console.error(`  engendré : ${attendus[i]}`);
      console.error(`  en dépôt : ${lignes[i]}`);
      process.exit(1);
    }
  }
  console.log(`caddy-bloc --verifier : ${chemins.length} chemins (bzh) et ${cheminsLove.length} (love), les deux blocs concordent.`);
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

# 🔴 mana.love SERT LA MÊME APPLICATION, SANS L'OFFICE DE TOURISME.
# ⚠️ Ce bloc doit être posé AVANT l'attrape-tout @manalove, sinon la coquille
#    love gagne sur tout et l'application n'est jamais atteinte.
# ⭐ /balades-office est ABSENT ici, et c'est le point : on ne revendique
#    pas une adresse dont cet hôte n'a pas la matière.
@applove {
    host mana.love
    path ${cheminsLove.join(" ")}
}
handle @applove {
    root * /srv/www/_app-bzh
    try_files {path} {path}/index.html /index.html
    file_server
}
`,
);
console.log(`caddy-bloc: ${chemins.length} chemins (mana.bzh) et ${cheminsLove.length} (mana.love) engendrés depuis src/routes.ts`);

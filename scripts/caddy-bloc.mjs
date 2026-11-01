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
const liste = (nom) => {
  const m = src.match(new RegExp(`${nom}\\s*=\\s*\\[([\\s\\S]*?)\\] as const;`));
  if (!m) throw new Error(`${nom} introuvable dans src/routes.ts`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
};

const chemins = [
  ...liste("ROUTES_APP"),
  ...liste("PREFIXES_APP").map((p) => `${p}*`),
  ...liste("FICHIERS_APP"),
];

const entete = readFileSync(new URL("../deploiement/mana-bzh.caddy", import.meta.url), "utf8")
  .split("@appbzh {")[0];

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

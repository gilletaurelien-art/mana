/**
 * LES POLICES — la RECETTE, pas le souvenir.
 *
 * 🔴 POURQUOI CE SCRIPT EXISTE. Le 31/10 au matin, les trois polices sont
 *    passées de 405 à 85 Ko : conversion WOFF2 puis sous-ensemble, à la main,
 *    dans un terminal. Excellent résultat, zéro trace. ⭐ Un gain obtenu à la
 *    main est un gain qu'on reperd à la version suivante — et la note qui le
 *    décrit devient un faux témoin le jour où quelqu'un ajoute une police et
 *    publie un fichier de 70 Ko à côté de trois de 28.
 *    Ici, le geste est rejouable : `node scripts/polices.mjs`.
 *
 * ⚠️ IL LIT `jeu-caracteres.txt`, ET CE FICHIER EST PLUS LARGE QUE
 *    L'INTERFACE. Il a été bâti en balayant le code source — donc il a ramassé
 *    les emoji et les flèches des COMMENTAIRES (⚠ ⛔ 🔴 ⭐ → ≈ ①). Aucune
 *    police de texte ne les porte, aucune n'a à les porter : ils retombent sur
 *    la police système, comme avant. C'est sans conséquence ici, mais il faut
 *    le savoir : un jeu trop large rend le contrôle de couverture plus
 *    bavard qu'exact, et on finirait par excuser un caractère qui, lui,
 *    compte vraiment.
 *
 * ⛔ AUCUNE POLICE DISTANTE, JAMAIS. Les fichiers sont téléchargés UNE FOIS,
 *    ici, et versionnés avec leur licence. Une `<link>` vers un CDN de polices
 *    casserait le hors-ligne — le seul argument que le terrain nous reconnaît
 *    — et placerait un tiers dans la chaîne d'exécution.
 */
import subsetFont from "subset-font";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import * as fontkit from "fontkit";

const DOSSIER = "src/fonts";
const JEU = `${DOSSIER}/jeu-caracteres.txt`;

const requis = [...new Set([...readFileSync(JEU, "utf8")])].filter((c) => c.trim() !== "");
const texte = requis.join("");

const ko = (o) => `${(o / 1024).toFixed(1)} Ko`;

/**
 * ⭐ LA LIGNE DE BASE SE MESURE SUR LA POLICE ELLE-MÊME, JAMAIS SUR SA VOISINE.
 *    C'est la faute qui revient le plus souvent dans ce dépôt : une mesure
 *    prise sur un objet, appliquée à un autre. Relevée sur Rubik et appliquée
 *    aux trois, elle a accusé MarelleBaton d'avoir perdu 161 caractères
 *    qu'elle n'avait jamais portés.
 */
function jamaisPortes(cheminOriginal) {
  const f = fontkit.openSync(cheminOriginal);
  if (!("hasGlyphForCodePoint" in f)) throw new Error(`${cheminOriginal} est une collection`);
  return requis.filter((c) => !f.hasGlyphForCodePoint(c.codePointAt(0))).join("");
}

const cible = process.argv.slice(2);
if (cible.length !== 2) {
  console.error("usage : polices.mjs <source.ttf|otf> <sortie.woff2>");
  console.error("        puis relever la couverture d'origine dans couverture-origine.json");
  process.exit(2);
}
const [source, sortie] = cible;

const brut = readFileSync(source);
const avant = brut.length;
const absents = jamaisPortes(source);

const petite = await subsetFont(brut, texte, { targetFormat: "woff2" });
writeFileSync(`${DOSSIER}/${sortie}`, petite);

// ⚠️ ON RELIT LE FICHIER ÉCRIT, pas le tampon en mémoire. Un sous-ensemble qui
//    passe par un format intermédiaire peut perdre des glyphes sans lever :
//    le contrôle doit porter sur l'octet qui sera SERVI.
const relue = fontkit.openSync(`${DOSSIER}/${sortie}`);
const perdus = requis
  .filter((c) => !absents.includes(c))
  .filter((c) => !relue.hasGlyphForCodePoint(c.codePointAt(0)));
if (perdus.length) {
  console.error(`🔴 ${sortie} a PERDU « ${perdus.join("")} » — fichier écrit mais INUTILISABLE`);
  process.exit(1);
}

console.log(`${sortie}`);
console.log(`   ${ko(avant)} → ${ko(petite.length)}  (−${Math.round((1 - petite.length / avant) * 100)} %)`);
console.log(`   ${requis.length - absents.length} caractères portés, zéro perdu`);
console.log(`   jamais portés par l'original (à inscrire dans couverture-origine.json) :`);
console.log(`   ${JSON.stringify(absents)}`);

const total = readdirSync(DOSSIER).filter((f) => /\.woff2$/.test(f))
  .reduce((s, f) => s + statSync(`${DOSSIER}/${f}`).size, 0);
console.log(`\n⚖️  Les polices du site pèsent maintenant ${ko(total)} au total.`);

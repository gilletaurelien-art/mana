/**
 * LES FONDS D'ÉCRAN — encodage et inventaire.
 *
 * ⛔ CE SONT DES ILLUSTRATIONS, ET LE CODE LE SAIT. Elles ne sont pas des
 *    photographies et ne doivent JAMAIS être présentées comme telles : aucun
 *    toponyme, aucune légende de lieu, aucun crédit d'auteur-photographe.
 *    Elles évoquent la Bretagne, elles n'en documentent aucun endroit. C'est
 *    la raison pour laquelle elles vivent ici et non dans
 *    `src/images/bibliotheque.json`, où chaque entrée affirme un lieu réel.
 *
 * ⭐ ET ELLES PEUVENT ÊTRE BIEN PLUS COMPRESSÉES QUE LA BIBLIOTHÈQUE. Une
 *    photographie de fiche se regarde ; un fond vit SOUS un voile kaki à
 *    forte opacité et change toutes les trois secondes. Personne n'y cherche
 *    un détail. On encode donc pour le poids, pas pour la finesse — c'est le
 *    seul endroit du projet où ce compromis est le bon.
 *
 * ⚠️ ORIGINAUX EN 1024×572, DU 16:9 PAYSAGE, POUR UNE APP EN PORTRAIT. Sur un
 *    téléphone de 375×812, `cover` n'en montre que ~26 % de la largeur : les
 *    trois quarts de chaque image sont coupés. On garde donc une largeur
 *    source généreuse malgré la compression, sans quoi la bande visible
 *    serait un agrandissement de 2,3×.
 *
 *   node scripts/fonds.mjs "<dossier source>"
 */
import sharp from "sharp";
import { readdirSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCE = process.argv[2];
if (!SOURCE) { console.error('usage : fonds.mjs "<dossier>"'); process.exit(2); }

const SORTIE = "public/fonds";
/* ⚠️ DEUX LARGEURS, PAS QUATRE. Un fond n'a pas de vignette ni de variante
   d'impression : il couvre l'écran, ou il ne sert pas. Multiplier les
   largeurs multiplierait le poids d'une bibliothèque déjà au-dessus du reste
   du site. */
const LARGEURS = [768, 1280];
mkdirSync(SORTIE, { recursive: true });

const fichiers = readdirSync(SOURCE).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
const manifeste = [];
let total = 0;

for (let i = 0; i < fichiers.length; i++) {
  const id = `fond-${String(i + 1).padStart(2, "0")}`;
  const brut = join(SOURCE, fichiers[i]);
  const meta = await sharp(brut).metadata();
  const variantes = [];
  for (const w of LARGEURS) {
    for (const [fmt, opts] of [["avif", { quality: 42, effort: 6 }], ["webp", { quality: 62 }]]) {
      const nom = `${id}-${w}.${fmt}`;
      const buf = await sharp(brut).rotate()
        .resize({ width: w, withoutEnlargement: true })[fmt](opts).toBuffer();
      writeFileSync(join(SORTIE, nom), buf);
      variantes.push({ fichier: nom, largeur: w, format: fmt, octets: buf.length });
      total += buf.length;
    }
  }
  manifeste.push({ id, source: fichiers[i], largeur: meta.width, hauteur: meta.height, variantes });
  const ko = Math.round(variantes.reduce((s, v) => s + v.octets, 0) / 1024);
  console.log(`✓ ${id}  ${meta.width}×${meta.height} → ${ko} Ko (4 fichiers)`);
}

mkdirSync("src/fonds", { recursive: true });
writeFileSync("src/fonds/fonds.json", JSON.stringify({
  _: "GÉNÉRÉ par `node scripts/fonds.mjs`. ⛔ Ce sont des ILLUSTRATIONS : aucune n'est la photographie d'un lieu réel, et aucune ne doit être légendée comme telle.",
  genere: new Date().toISOString(),
  fonds: manifeste,
}, null, 2) + "\n");

const avif768 = manifeste.reduce((s, f) => s + f.variantes.find(v => v.format === "avif" && v.largeur === 768).octets, 0);
console.log(`\n${manifeste.length} fonds · ${(total / 1048576).toFixed(1)} Mo sur disque`);
console.log(`⚖️  Ce qu'un téléphone télécharge s'il les voit TOUS : ${Math.round(avif768 / 1024)} Ko (AVIF 768)`);
console.log(`   soit ${Math.round(avif768 / 1024 / manifeste.length)} Ko par image, une toutes les 3 s.`);

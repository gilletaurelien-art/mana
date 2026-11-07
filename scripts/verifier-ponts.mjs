/**
 * 🔴 LE SEUL GARDE DES PONTS QUI PUISSE MORDRE — il MESURE, il ne lit pas.
 *
 *    `src/passerelle.ts` déclare, pour chaque chemin que nous ne servons pas
 *    sur mana.love, s'il est EN LIGNE chez l'autre application. De cette
 *    déclaration dépend l'affichage d'un bouton.
 *
 * ⛔ ET AUCUN TEST UNITAIRE NE PEUT LA VÉRIFIER. Mutation faite le 7/11 :
 *    passer `/chat` de `enLigne: false` à `true` laisse les 53 tests VERTS.
 *    C'est normal et ce n'est pas réparable là-bas — `npm test` tourne sans
 *    réseau. Un garde qui ne peut pas mordre n'est pas un garde strict, c'est
 *    une description.
 *
 * ⭐ ET L'ERREUR EST DÉJÀ ARRIVÉE, LE JOUR MÊME. La session qui tient l'autre
 *    application m'a annoncé « /chat existe, vérifié par mutation » — c'était
 *    vrai de son DÉPÔT et faux de l'HÔTE : son `dist/` avait deux jours de
 *    retard. Un commit dit qu'un travail est FAIT, pas qu'il est ARRIVÉ.
 *    Personne n'avait menti ; le référentiel n'était pas le bon.
 *
 * ⚠️ LE SIGNAL N'EST PAS LE CODE HTTP. Tous ces chemins rendent 200 : la
 *    coquille de mana.love répond à TOUT. On compare donc à l'empreinte de
 *    son accueil — même poids, même page. ⭐ Un 200 ne prouve rien sur un
 *    site à repli ; c'est écrit dans ce dépôt depuis des semaines, et c'est
 *    exactement le piège qui s'est refermé.
 */
import { readFileSync } from "node:fs";

const HOTE = process.env.MANA_HOTE ?? "https://mana.love";

const src = readFileSync(new URL("../src/passerelle.ts", import.meta.url), "utf8");
const table = src.match(/export const PONTS[^=]*=\s*\{([\s\S]*?)\n\};/);
if (!table) throw new Error("PONTS introuvable dans src/passerelle.ts");

const ponts = [...table[1].matchAll(
  /(\w+):\s*\{\s*chemin:\s*"([^"]+)",\s*enLigne:\s*(true|false)/g)]
  .map(([, clef, chemin, enLigne]) => ({ clef, chemin, declare: enLigne === "true" }));

if (!ponts.length) throw new Error("aucun pont lu — le format de la table a changé");

const mesurer = async (chemin) => {
  const r = await fetch(HOTE + chemin, { redirect: "follow" });
  const corps = await r.text();
  return { code: r.status, taille: corps.length,
           type: (r.headers.get("content-type") ?? "").split(";")[0] };
};

/* L'accueil EST un pont (le bouton « MANA »), et il sert aussi d'étalon :
   tout ce qui lui ressemble au poids près est la coquille, pas une page. */
const accueil = await mesurer("/");
let faux = 0;
console.log(`étalon : ${HOTE}/ → ${accueil.taille} o (${accueil.type})\n`);

for (const p of ponts) {
  const m = await mesurer(p.chemin);
  /* ⚠️ L'accueil se ressemble à lui-même : il est VRAI par construction. */
  const reel = p.chemin === "/" ? true : m.taille !== accueil.taille;
  const ok = reel === p.declare;
  if (!ok) faux++;
  const etat = reel ? "en ligne" : "la coquille";
  console.log(`${ok ? "✓" : "✗"} ${p.chemin.padEnd(20)} ${String(m.code)} ` +
              `${String(m.taille).padStart(7)} o — ${etat}` +
              (ok ? "" : `  ⚠️ déclaré ${p.declare ? "EN LIGNE" : "fermé"}`));
}

if (faux) {
  console.error(`\n⛔ ${faux} pont(s) déclaré(s) autrement qu'ils ne sont.`);
  console.error(`   Un pont déclaré ouvert à tort met un bouton qui rend l'accueil ;`);
  console.error(`   déclaré fermé à tort, il cache une page qui existe.`);
  console.error(`   Corrigez src/passerelle.ts — en relevant, pas en supposant.`);
  process.exit(1);
}
console.log(`\n✓ les ${ponts.length} ponts sont déclarés tels qu'ils sont.`);

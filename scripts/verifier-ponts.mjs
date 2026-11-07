/**
 * 🔴 LE GARDE DES PONTS — il MESURE, et il SAIT QUAND IL NE PEUT PAS MESURER.
 *
 *    `src/passerelle.ts` déclare, pour chaque chemin que nous ne servons pas
 *    sur mana.love, s'il est EN LIGNE chez l'autre application. De cette
 *    déclaration dépend l'affichage d'un bouton de notre barre.
 *
 * ⛔ AUCUN TEST UNITAIRE NE PEUT LA VÉRIFIER : `npm test` tourne sans réseau.
 *    Mutation faite le 7/11 : déclarer `/chat` en ligne à tort laissait 53
 *    tests VERTS. Un garde qui ne peut pas mordre est une description.
 *
 * 🔴 ET LA PREMIÈRE VERSION DE CE SCRIPT A ÉTÉ PRISE EN DÉFAUT LE SOIR MÊME,
 *    DANS LE SENS QUI ENDORT. Elle comparait chaque pont à l'empreinte de
 *    l'accueil de l'hôte. Or mana.love est une application à routage client :
 *    le serveur rend LA MÊME ENVELOPPE à tout le monde, au même octet.
 *    Mesuré — `/`, `/chat`, `/mon-compte` et un chemin impossible rendent
 *    46 042 octets et le MÊME MD5.
 *    Donc le garde déclarait « la coquille » sur les cinq, ce qui concordait
 *    avec une déclaration périmée, et il imprimait :
 *        « ✓ les 6 ponts sont déclarés tels qu'ils sont »
 *    Un contrôle qui RÉUSSIT sur le mauvais objet endort plus sûrement qu'un
 *    contrôle absent : il porte un ✓.
 *
 * ⭐ TROIS COUCHES DU MÊME PIÈGE, ET LA TROISIÈME EST CELLE-CI :
 *      · le CODE ne prouve rien — tout rend 200 ;
 *      · le POIDS ne prouve rien — le serveur rend la même enveloppe ;
 *      · seul le RENDU tranche, et il est hors de portée d'un script.
 *    Alors ce script ne prétend plus trancher quand il ne peut pas. Il rend
 *    « NON MESURABLE », jamais un succès. ⚠️ Un chemin qu'on n'a pas pu
 *    mesurer n'est pas un chemin conforme.
 *
 * ⭐ ET IL SAIT S'AMÉLIORER SANS CHANGER : si l'autre application pose un
 *    TÉMOIN dans le HTML servi (`<meta name="mana-route" content="chat">`),
 *    ce script le lit et redevient capable de trancher depuis le serveur.
 *    C'est la solution que la session voisine a proposée, et c'est la bonne :
 *    elle rend la frontière mesurable au lieu de la contourner.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const HOTE = process.env.MANA_HOTE ?? "https://mana.love";
/** Un chemin que personne ne sert : l'étalon de « rien à cette adresse ». */
const IMPOSSIBLE = "/zzz-ce-chemin-n-existe-pas-" + "etalon";

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
  const temoin = corps.match(/<meta name="mana-route" content="([^"]*)"/)?.[1] ?? null;
  return { code: r.status, taille: corps.length, temoin,
           empreinte: createHash("sha1").update(corps).digest("hex").slice(0, 12) };
};

const etalon = await mesurer(IMPOSSIBLE);
console.log(`étalon « rien ici » : ${HOTE}${IMPOSSIBLE}`);
console.log(`  ${etalon.code} · ${etalon.taille} o · ${etalon.empreinte}` +
            (etalon.temoin !== null ? ` · témoin « ${etalon.temoin} »` : " · aucun témoin"));

/* ⚠️ L'hôte distingue-t-il seulement ses adresses ? S'il rend la même
   enveloppe à un chemin impossible qu'à sa racine, la réponse est non — et
   aucune comparaison d'empreinte ne vaudra plus rien. On le constate AVANT
   de mesurer quoi que ce soit, au lieu de le déduire de résultats absurdes. */
const accueil = await mesurer("/");
const aveugle = etalon.temoin === null && accueil.empreinte === etalon.empreinte;
if (aveugle) {
  console.log(`\n⚠️  CET HÔTE REND LA MÊME ENVELOPPE À TOUT : sa racine et un chemin`);
  console.log(`    impossible ont la même empreinte (${etalon.empreinte}).`);
  console.log(`    C'est une application à routage client : le serveur ne sait pas`);
  console.log(`    ce qu'il rend, seul le JAVASCRIPT le décide. Depuis ici, on ne`);
  console.log(`    peut donc RIEN conclure — ni « en ligne », ni « la coquille ».`);
  console.log(`    ⭐ Un témoin « <meta name="mana-route"> » dans le HTML servi`);
  console.log(`       rendrait cette frontière mesurable.\n`);
}

let faux = 0, nonMesures = 0;
for (const p of ponts) {
  const m = await mesurer(p.chemin);
  let reel = null;                                   // null = non mesurable
  if (m.temoin !== null) reel = m.temoin !== "";     // le témoin tranche
  else if (!aveugle) reel = m.empreinte !== etalon.empreinte;

  const etat = reel === null ? "NON MESURABLE" : reel ? "en ligne" : "rien à cette adresse";
  if (reel === null) { nonMesures++; }
  else if (reel !== p.declare) { faux++; }
  const marque = reel === null ? "?" : reel === p.declare ? "✓" : "✗";
  console.log(`${marque} ${p.chemin.padEnd(20)} ${m.code} ${String(m.taille).padStart(7)} o — ${etat}` +
              (reel !== null && reel !== p.declare ? `  ⚠️ déclaré ${p.declare ? "EN LIGNE" : "fermé"}` : ""));
}

/* ⛔ L'ORDRE DES VERDICTS COMPTE : on ne dit JAMAIS « tout va bien » quand on
   n'a pas pu regarder. Un ✓ sur une mesure absente est exactement ce qui a
   endormi ce garde le 7/11 au soir. */
if (faux) {
  console.error(`\n⛔ ${faux} pont(s) déclaré(s) autrement qu'ils ne sont.`);
  console.error(`   Déclaré ouvert à tort : un bouton mène à la mauvaise page.`);
  console.error(`   Déclaré fermé à tort : un écran qui existe reste caché.`);
  console.error(`   Corrigez src/passerelle.ts — en relevant, pas en supposant.`);
  process.exit(1);
}
if (nonMesures) {
  console.error(`\n⚠️  ${nonMesures} pont(s) NON MESURABLE(S) depuis le serveur.`);
  console.error(`   Ce n'est PAS une conformité : c'est une absence de mesure.`);
  console.error(`   Vérifiez au navigateur, ou demandez le témoin « mana-route ».`);
  process.exit(0);
}
console.log(`\n✓ les ${ponts.length} ponts sont déclarés tels qu'ils sont — mesurés, pas supposés.`);

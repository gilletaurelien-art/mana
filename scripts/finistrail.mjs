/**
 * LE CATALOGUE FINIS'TRAIL — 41 circuits de Brest Terres Océanes, SANS TRACÉ.
 *
 * ⚠️ LA PRESSE ANNONCE 45, L'INDEX DE LA PLATEFORME EN DONNE 41. Ouest-France
 *    (8/10/2026) et les offices parlent de « 45 circuits balisés » ; les
 *    cartes de `/fr/activites` sont 41. On compte ce qu'on lit, et on écrit
 *    l'écart plutôt que de reprendre le chiffre qui circule.
 *
 * ⛔ ET L'ABSENCE DE TRACÉ EST UNE DÉCISION, PAS UNE LIMITE TECHNIQUE.
 *    Le point d'accès GPX existe (`{base}/gpx/{traceID}`, trouvé dans
 *    `blocParcours.js`), il répond HTTP 200 — et il rend une phrase :
 *      « Rendez-vous sur https://espacestrail.run/fr/finistrail/parcours/<id>
 *        pour accéder à ce fichier gpx »
 *    Ce n'est pas une panne, c'est une porte fermée exprès, en français
 *    lisible. La défaire demanderait de forger un `Referer` ou une session,
 *    sur une donnée tierce sans licence, pour la republier dans un dépôt
 *    PUBLIC. On ne le fait pas.
 *
 * ⭐ CE QU'ON PREND EST CE QUE LA PAGE DONNE À TOUT LE MONDE. Les cartes de
 *    `/fr/activites` portent leurs chiffres en attributs `data-*` : nom,
 *    commune, secteur, difficulté, distance, dénivelé + et −, fourchette de
 *    durée, et UN POINT en Web Mercator. Un point et un lien, c'est de quoi
 *    dire « ce circuit existe, il fait 10 km, il part d'ici, voilà sa fiche ».
 *    C'est la doctrine déjà écrite pour les Offices : MANA ne s'attribue rien
 *    et ne recommande rien, elle constate et elle renvoie.
 *
 * ⚠️ IL EXISTE UN AUTRE POINT D'ACCÈS, `/destination/getTracesGeom`, QUI REND
 *    LA GÉOMÉTRIE. Il n'est pas fermé — c'est lui qui peint la carte du site.
 *    On ne l'appelle pas : s'en servir pour reconstituer les tracés
 *    contournerait par une autre porte celle qui vient d'être refusée.
 *
 * 🔴 « LES SEPT INTERCOMMUNALITÉS DU PAYS DE BREST » EST FAUX, et je l'avais
 *    écrit avant de lire les secteurs. Finis'Trail en a bien SEPT, mais ce ne
 *    sont pas les mêmes :
 *      La Côte des Légendes · Le Pays des Abers · Presqu'Île de Crozon-Aulne
 *      maritime · Iroise Bretagne · Pays de Landerneau-Daoulas ·
 *      **Menez-Hom Atlantique** · **Brest Métropole**
 *    ⭐ Landivisiau est ABSENT, et Menez-Hom Atlantique — qui n'est pas dans le
 *    Pays de Brest, mais côté Châteaulin — est PRÉSENT. Le périmètre de la
 *    plateforme est la DESTINATION touristique « Brest terres océanes », pas
 *    le pôle métropolitain du Pays de Brest. Deux découpages à sept qui se
 *    ressemblent et ne se recouvrent pas : exactement le genre d'écart qu'un
 *    « sept » répété fait disparaître.
 *
 * ⭐ CELA RESTE L'INTERLOCUTEUR DU 24/11 pour six des sept. Une seule
 *    conversation ouvrirait Finis'Trail ET les GPX des cinq offices, qui sont
 *    dans le même flou de licence. Demander vaut mieux que prendre, surtout
 *    quand le détenteur est la personne en face.
 *
 *     node scripts/finistrail.mjs
 */
import { writeFile } from "node:fs/promises";

const SITE = "https://finistrail.bzh";
const LISTE = `${SITE}/fr/activites`;
const SORTIE = new URL("../src/finistrail.json", import.meta.url);

/** Web Mercator (EPSG:3857) → [lon, lat]. ⚠️ Les cartes portent x/y en mètres
 *  projetés, pas en degrés : les lire tels quels poserait les 45 circuits au
 *  large de l'Afrique. */
function enDegres(x, y) {
  const lon = (x / 20037508.34) * 180;
  const lat = (Math.atan(Math.exp(((y / 20037508.34) * Math.PI)) ) * 360) / Math.PI - 90;
  return [+lon.toFixed(5), +lat.toFixed(5)];
}

const html = await (await fetch(LISTE)).text();

/* Les secteurs sont dans les cases à cocher du filtre : l'id porte le numéro,
   le `<label>` porte le nom. ⭐ On les relie plutôt que de recopier sept noms
   — une table recopiée d'un producteur vieillit sans bruit.
   🔴 ET LE PRÉFIXE N'EST PAS UN : la page porte `sect_trail_*` (les sept
   secteurs réels) ET `sect_baseaccueiltrail_*` (trois, pour une autre
   catégorie). Le premier jet codait le second en dur et lisait 3 libellés sur
   7 — 23 circuits sortaient sans secteur, ce qui ressemblait à une donnée
   partielle de l'éditeur et n'était que mon motif. ⭐ Les sept valeurs
   `data-secteur` des cartes étaient là pour le dire : quand un champ manque à
   une PARTIE des lignes, comparer la liste des valeurs présentes à la liste
   des valeurs connues tranche en une seconde. */
const secteurs = {};
for (const m of html.matchAll(/<label[^>]*for="sect_[a-z]+_(\d+)"[^>]*>([^<]{2,80})</g)) {
  secteurs[m[1]] ??= m[2].trim();
}

const attrs = (bloc) => {
  const o = {};
  for (const m of bloc.matchAll(/data-([a-z]+)=(?:"([^"]*)"|([^\s>]+))/gi)) {
    o[m[1].toLowerCase()] = (m[2] ?? m[3] ?? "").trim();
  }
  return o;
};

const circuits = [], rejets = [];
for (const m of html.matchAll(/<div id="trace_(\d+)" class="blocTrace"([^>]*)>/g)) {
  const id = m[1];
  const a = attrs(m[0]);
  const motifs = [];
  if (!a.nom) motifs.push("sans nom");
  const d = +a.distance;
  if (!Number.isFinite(d) || d <= 0) motifs.push(`distance illisible (${a.distance})`);
  const [lon, lat] = enDegres(+a.x, +a.y);
  /* ⛔ LE GARDE DE POSITION : la Bretagne, pas le monde. Un x/y mal lu met le
     circuit au large de l'Afrique — et un point faux sous un nom juste est
     pire qu'un point absent. */
  if (!(lon > -5.4 && lon < -1.0 && lat > 47.2 && lat < 49.0)) motifs.push(`hors Bretagne (${lon},${lat})`);
  if (motifs.length) { rejets.push({ id, nom: a.nom ?? "?", motif: motifs.join(" · ") }); continue; }

  circuits.push({
    id,
    /* le nom tel que l'espace l'écrit — minuscules comprises, on ne retouche
       pas le libellé d'un tiers */
    nom: a.nom,
    commune: a.localite || null,
    secteur: secteurs[a.secteur] ?? null,
    pratique: a.tags || null,
    difficulte: a.difficulte ? +a.difficulte : null,
    km: d,
    denivele: a.devpos ? +a.devpos : null,
    descente: a.devneg ? +a.devneg : null,
    minutes: a.dureemin && a.dureemax ? [+a.dureemin, +a.dureemax] : null,
    g: [lon, lat],
    source: `https://espacestrail.run/fr/finistrail/parcours/${id}`,
  });
}

/* 🔴 LE GARDE DU CHAMP VIDE, MÊME RÈGLE QUE POUR LES OFFICES : un champ absent
   de TOUS est une extraction fausse, pas une donnée manquante. Il court AVANT
   l'écriture. */
let casse = false;
for (const champ of ["commune", "secteur", "pratique", "difficulte", "denivele", "minutes"]) {
  const n = circuits.filter((c) => c[champ] != null && c[champ] !== "").length;
  console.log(`  ${champ} : ${n}/${circuits.length}`);
  if (n === 0) { console.error(`⛔ AUCUN « ${champ} » — extraction fausse.`); casse = true; }
}
if (Object.keys(secteurs).length === 0) { console.error("⛔ aucun secteur lu : le motif des cases à cocher ne mord plus."); casse = true; }
/* ⛔ ET TOUT NUMÉRO PORTÉ PAR UNE CARTE DOIT AVOIR UN NOM. C'est ce garde-ci
   qui aurait dénoncé le préfixe en dur du premier jet, au lieu de laisser
   23 circuits sans secteur sous un total de 18/41 qui ressemble à du partiel. */
const orphelins = [...new Set([...html.matchAll(/data-secteur=(\d+)/g)].map((m) => m[1]))]
  .filter((n) => !secteurs[n]);
if (orphelins.length) {
  console.error(`⛔ secteur(s) sans libellé : ${orphelins.join(", ")} — le motif des <label> ne les atteint pas.`);
  casse = true;
}
if (circuits.length === 0) { console.error("⛔ aucun circuit : le motif des cartes ne mord plus."); casse = true; }
if (casse) { console.error("\nRien n'est écrit."); process.exit(1); }

console.log(`\n${circuits.length} circuits · ${rejets.length} rejeté(s) · ${Object.keys(secteurs).length} secteurs`);
for (const r of rejets) console.log(`  ⛔ ${r.id} ${r.nom} — ${r.motif}`);
for (const [n, s] of Object.entries(secteurs)) {
  console.log(`  · ${s} — ${circuits.filter((c) => c.secteur === s).length} circuit(s)`);
}

const art = {
  genere: new Date().toISOString().slice(0, 10),
  source: "Espace Finis'Trail — destination Brest Terres Océanes",
  lien: "https://finistrail.bzh/",
  /* ⚠️ CET AVERTISSEMENT VOYAGE AVEC LA DONNÉE, comme pour les Offices : un
     artefact se promène sans sa page. */
  avertissement:
    "Catalogue de renvoi : chiffres relevés sur les fiches publiques, SANS les tracés — "
    + "le téléchargement GPX est réservé par l'éditeur à la visite de sa page. "
    + "Aucun accord de reprise n'a été demandé ni obtenu.",
  /* ⛔ LE MARQUEUR QUI EMPÊCHE DE LES PRENDRE POUR DES BALADES. Ces entrées
     n'ont PAS de champ `p` : un écran qui les traiterait comme des `Walk`
     afficherait 45 fiches sans tracé. Le dire dans l'artefact, pas seulement
     dans ce script. */
  sans_trace: true,
  circuits,
};
await writeFile(SORTIE, JSON.stringify(art, null, 1));
console.log(`\nécrit : src/finistrail.json — ${(JSON.stringify(art).length / 1024).toFixed(0)} Ko`);

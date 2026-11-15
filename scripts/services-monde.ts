#!/usr/bin/env npx tsx
// LES SERVICES ET COMMERCES, EN TUILES STATIQUES
//
//     npx tsx scripts/services-monde.ts          # tout
//     npx tsx scripts/services-monde.ts 4 5      # la colonne z3 x=4..5
//
// 🔴 POURQUOI CE FICHIER. Décision d'Aurélien, 15/11/2026 : « offrir dans
//    manahome les mêmes catégories que dans manafrance ». Les deux faces
//    n'avaient alors AUCUNE catégorie commune — treize côté app (calvaire,
//    chapelle, mégalithe, phare…), dix côté manafrance (commerces,
//    restauration, services publics…). Ce n'est donc pas un alignement, c'est
//    un ajout.
//
// ⭐ MÊME FORME QUE `hebergements-monde.ts` ET `sites-monde.mjs`, ET C'EST LE
//    POINT. Même zoom, même découpage, même enveloppe : `tuilesDuCadre()` sert
//    les trois. Un troisième format aurait donné un troisième chargeur, un
//    troisième cache et une troisième façon de dire « trop loin ».
//
// ⛔ ET L'APP N'APPELLE TOUJOURS RIEN. `src/catalogue.ts` le dit : « zéro
//    supabase, zéro rpc dans tout src/ » — parce que le 28/10/2026 quatre
//    fonctions publiques rendaient des adresses de domicile à qui les
//    appelait. Ici il n'y a rien à appeler. Ce script lit la base À LA
//    CONSTRUCTION ; la page, elle, lit des fichiers.
//
// ══ LE GARDE, ET IL EST LA RAISON PRINCIPALE DE LA FORME DE CE FICHIER ══
//
// 🔴 MESURÉ LE 15/11/2026 : sur 2 664 794 lignes des dix familles situées et
//    nommées, **847 146 sont des ASSOCIATIONS** — et leur position est bien
//    STOCKÉE. Le garde `adresse_est_un_domicile()` ne masque `adresse`, `lng`
//    et `lat` qu'à la LECTURE, dans les deux moteurs de recherche. Un export
//    qui lirait `geom` directement publierait exactement ce que le garde
//    protège : le siège déclaré d'une association est très souvent le domicile
//    d'un dirigeant, et une épingle au bâtiment près EST une adresse.
//
// ⭐ ON APPELLE DONC LE GARDE DE LA BASE, ON N'EN RÉÉCRIT PAS UN SEPTIÈME.
//    Aurélien, 15/11 : « le caviardage des adresses vit en cinq exemplaires,
//    plus un sixième en base. Un nouveau domaine, c'est un septième point de
//    pose — et c'est là qu'une adresse de domicile est déjà sortie en clair
//    une fois. » Un motif recopié ici divergerait du jour où la base affine sa
//    règle, et personne ne le verrait.
//
// ⛔ ET L'ADRESSE NE SORT PAS, MÊME POUR UN COMMERCE. Même règle que les
//    hébergements : la position suffit à mener sur place, et une adresse en
//    clair dans un fichier servi est une donnée de plus à défendre pour un
//    gain nul.
//
// ⚠️ CE QUE CE JEU COUVRE, ET IL FAUT LE DIRE EN FACE : la France, presque
//    seulement. Les dix familles viennent des moissons françaises (OSM France,
//    SIRENE, offices de tourisme) ; la moisson MONDE ne connaît que quatre
//    types — sentier, parc, plage, panorama — et `tags-cibles.json` EXCLUT
//    explicitement `shop=*` depuis le 21/10. Sur une carte mondiale, ces
//    calques seront donc vides hors de France tant que cet arbitrage tient.
//    ⭐ C'est écrit ici plutôt que découvert à l'écran : une catégorie qui ne
//       rend jamais rien se lit comme une panne, pas comme une absence.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const SORTIE = resolve(ICI, "..", "public", "monde", "c");

/** ⚠️ Pas de valeur par défaut : ce dépôt est public. */
const HOTE = process.env.MANA_HOTE_DEPLOIEMENT ?? process.env.MANA_KS5;
if (!HOTE) {
  console.error("🔴 MANA_HOTE_DEPLOIEMENT (ou MANA_KS5) est absente.");
  console.error("   Voir deploiement/cible.local.sh ; ce script lit la base par SSH.");
  process.exit(1);
}

/**
 * ⛔ PAS LE MÊME QUADRILLAGE QUE LES SITES, ET C'EST MESURÉ.
 *
 * Au z8 partagé, les 1 846 439 fiches tiennent dans 93 tuiles — dont une à
 * 208 439 — et le plafond de 1 500 n'en poserait que **109 400, soit 6 %**.
 * Pire : l'écrêtage suit `ORDER BY n`, donc des VILLES ENTIÈRES tombent.
 * À z11 : 3 411 tuiles, médiane 213, et 70 % des fiches posées.
 * ⭐ La valeur vit dans `src/tuiles.ts` (`Z_SERVICES`), pas ici : le
 *    générateur et le chargeur doivent lire LA MÊME, sinon la carte demande
 *    des tuiles que personne n'a écrites. C'est le défaut du cache de tuiles
 *    déjà payé dans ce dépôt — deux écritures d'une même valeur divergent.
 */
import { Z_SERVICES } from "../src/tuiles";
const ZOOM = Z_SERVICES;
/** Une tuile qui porte 1 500 épingles est déjà illisible ; chaque tuile écrit
 *  COMBIEN elle en comptait, pour que le plafond ne se cache pas. */
const PLAFOND = 1500;

/**
 * LES DIX FAMILLES, ET LEURS MOTS.
 *
 * ⚠️ `mots` EST UN VOCABULAIRE DE RECHERCHE, PAS UNE TAXONOMIE. `commerce`,
 *    `boutique` et `magasin` désignent les MÊMES fiches : additionner les mots
 *    triplerait le compte. On teste donc un recouvrement de tableau et on
 *    attribue UNE famille par ligne, par ordre de priorité.
 * ⭐ L'ordre compte : une pharmacie porte `sante` ET `commerce` ; on veut
 *    « Santé ». Les familles les plus spécifiques passent donc en premier.
 */
const FAMILLES: { cle: string; nom: string; mots: string[] }[] = [
  { cle: "sante",     nom: "Santé",               mots: ["sante", "medical", "cabinet", "soin"] },
  { cle: "ecole",     nom: "Écoles & enfance",    mots: ["ecole", "college", "lycee", "creche"] },
  { cle: "public",    nom: "Services publics",    mots: ["servicepublic", "administration", "demarche", "guichet"] },
  { cle: "dormir",    nom: "Hébergement",         mots: ["hebergement", "dormir", "loger"] },
  { cle: "manger",    nom: "Restauration",        mots: ["restaurant", "manger", "table"] },
  { cle: "boire",     nom: "Bars & cafés",        mots: ["bar", "pub", "boire"] },
  { cle: "sport",     nom: "Sport & loisirs",     mots: ["sport", "loisir", "activite"] },
  { cle: "garage",    nom: "Garages & auto",      mots: ["garage", "mecanicien", "garagiste"] },
  { cle: "artisan",   nom: "Artisans & bâtiment", mots: ["artisan", "batiment", "chantier", "renovation"] },
  { cle: "commerce",  nom: "Commerces",           mots: ["commerce", "boutique", "magasin"] },
];

const litteral = (xs: string[]) => "array[" + xs.map((m) => `'${m}'`).join(",") + "]";

/** Le CASE qui attribue UNE famille, dans l'ordre de `FAMILLES`. */
const CAS_FAMILLE =
  "case " + FAMILLES.map((f) => `when r.mots && ${litteral(f.mots)} then '${f.cle}'`).join("\n       ") + " end";
const TOUS_LES_MOTS = litteral(FAMILLES.flatMap((f) => f.mots));

function demanderJson(sql: string): any[] {
  const payload = `\\pset format unaligned\n\\pset tuples_only on\n${sql}\n`;
  return execFileSync("ssh",
    ["-o", "ConnectTimeout=25", HOTE!,
     "sudo docker exec -i pg-repetition psql -U postgres -d postgres"],
    { input: payload, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 })
    .split("\n")
    .filter((l) => l.startsWith("{"))
    .map((l) => JSON.parse(l));
}

/* ══ LE GARDE, AVANT TOUT EXPORT ════════════════════════════════════════ */
//
// ⛔ Il ne demande pas « ai-je écrit le filtre ? » mais « le filtre laisse-t-il
//    passer une association ? ». Un garde qui relit sa propre intention est le
//    défaut que ce dépôt a payé plus d'une fois.
const GISEMENT = `
  FROM public.ressources r
 WHERE r.geom IS NOT NULL
   AND r.titre IS NOT NULL AND btrim(r.titre) <> ''
   AND r.mots && ${TOUS_LES_MOTS}
   AND ST_Y(r.geom) BETWEEN -85 AND 85
   AND NOT public.adresse_est_un_domicile(r.source, r.rna, r.naf, r.siret)`;

const [garde] = demanderJson(
  `SELECT json_build_object(
            'exportables', count(*),
            'assos_qui_passent', count(*) FILTER (
               WHERE public.adresse_est_un_domicile(r.source, r.rna, r.naf, r.siret)))::text
     ${GISEMENT};`);
if (Number(garde.assos_qui_passent) > 0) {
  console.error(`🔴 ${garde.assos_qui_passent} association(s) traversent le filtre.`);
  console.error("   Une épingle au bâtiment près sur le siège d'une association,");
  console.error("   c'est publier le domicile d'un bénévole. On n'exporte rien.");
  process.exit(1);
}
console.log(`✓ garde : aucune association ne passe — ${Number(garde.exportables).toLocaleString("fr-FR")} fiches exportables`);

const [deb, fin] = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number) : [0, 7];

/* 🔴 ON EFFACE LES QUADRILLAGES ÉTRANGERS AVANT D'ÉCRIRE. Vécu le 15/11 :
   un essai à z8 avait laissé 19 tuiles sous `c/8/`, et le passage en z11 ne
   les a pas touchées — elles seraient restées servies, muettes et fausses.
   ⭐ C'est la forme de l'orphelin au nom plausible : un fichier périmé coûte
      plus cher qu'un fichier absent, parce qu'absent on cherche et plausible
      on conclut. ⚠️ On ne vide QUE les autres grilles : relancer une colonne
      ne doit pas détruire les tuiles des colonnes voisines. */
if (existsSync(SORTIE)) {
  for (const z of readdirSync(SORTIE)) {
    if (z !== String(ZOOM)) {
      rmSync(`${SORTIE}/${z}`, { recursive: true, force: true });
      console.log(`  ⚠️  quadrillage orphelin retiré : c/${z}/`);
    }
  }
}
mkdirSync(SORTIE, { recursive: true });
let total = 0, tuiles = 0, octets = 0, plafonnees = 0;

for (let col = deb; col <= fin; col++) {
  const lonMin = -180 + col * 45, lonMax = lonMin + 45;
  const lues = demanderJson(`
    WITH g AS (
      SELECT r.titre AS n,
             ${CAS_FAMILLE} AS f,
             nullif(btrim(coalesce(r.commune, '')), '') AS c,
             round(ST_X(r.geom)::numeric, 5) AS x, round(ST_Y(r.geom)::numeric, 5) AS y
        ${GISEMENT}
         AND ST_X(r.geom) >= ${lonMin} AND ST_X(r.geom) < ${lonMax}),
    t AS (
      SELECT *,
             floor((x + 180) / 360 * ${2 ** ZOOM})::int AS tx,
             floor((1 - ln(tan(radians(y)) + 1/cos(radians(y))) / pi()) / 2 * ${2 ** ZOOM})::int AS ty
        FROM g WHERE f IS NOT NULL),
    rr AS (
      SELECT *, row_number() OVER (PARTITION BY tx, ty ORDER BY n) AS rg,
             count(*) OVER (PARTITION BY tx, ty) AS tot
        FROM t)
    SELECT json_build_object(
             'z', ${ZOOM}, 'x', tx, 'y', ty, 'total', min(tot),
             'l', json_agg(json_build_object('n', n, 'f', f, 'c', c,
                                             'g', json_build_array(x, y))
                           ORDER BY rg))::text
      FROM rr WHERE rg <= ${PLAFOND} GROUP BY tx, ty ORDER BY tx, ty;`);

  for (const tuile of lues) {
    const dossier = `${SORTIE}/${tuile.z}/${tuile.x}`;
    mkdirSync(dossier, { recursive: true });
    const texte = JSON.stringify(tuile);
    writeFileSync(`${dossier}/${tuile.y}.json`, texte);
    tuiles++; octets += texte.length; total += tuile.l.length;
    if (tuile.total > tuile.l.length) plafonnees++;
  }
  console.log(`  colonne ${col} : ${lues.length} tuiles`);
}

console.log(`✓ ${tuiles} tuiles · ${total.toLocaleString("fr-FR")} fiches · ${(octets / 1048576).toFixed(1)} Mo`);
if (plafonnees > 0) {
  console.log(`⚠️  ${plafonnees} tuile(s) plafonnée(s) à ${PLAFOND} — leur champ « total » dit le vrai compte.`);
}

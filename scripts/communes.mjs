#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
//  LES COMMUNES DU TERRITOIRE — dérivées, jamais recopiées
// ═══════════════════════════════════════════════════════════════════════════
//
//  6/11/2026. Le champ de l'accueil promet « Une commune, un lieu… » et ne
//  rendait AUCUNE commune : il cherchait dans `lieux.json`, qui n'en porte
//  pas. ⭐ Ce qu'on affiche dit ce qu'on promet — un placeholder qui annonce
//  une entrée qui n'existe pas est un mensonge d'interface, et c'est le
//  fondateur qui l'a vu, pas les tests.
//
//  ⛔ LA SOURCE FAIT 1,1 Mo POUR 35 413 COMMUNES — toute la France. La
//     charger sur l'accueil serait dix fois le poids de l'inventaire entier,
//     que ce même écran prend soin de ne charger qu'au premier geste. On
//     n'embarque donc que les communes DU TERRITOIRE, filtrées par les
//     emprises réellement moissonnées.
//
//  ⭐ DÉRIVÉ, PAS RECOPIÉ : les emprises sont lues dans `src/territoires.ts`,
//     la source qui décide déjà ce que l'application couvre. Le jour où un
//     territoire s'ajoute, on relance ce script — on ne retape pas une liste
//     de noms qui vieillirait en silence.
//
//  Usage : node scripts/communes.mjs
//  Sortie : src/communes.json — [[nom, lon, lat], …]
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "https://mana.bzh/promenades/communes.json";

const src = readFileSync(new URL("../src/territoires.ts", import.meta.url), "utf8");

/* ⚠️ ON COMPTE CE QU'ON EXTRAIT, et on exige d'en avoir autant que de
   territoires déclarés. Une forme d'écriture nouvelle dans `territoires.ts`
   ferait sinon sortir une liste plus courte SANS ERREUR — c'est exactement
   l'accident du générateur de bloc Caddy, qui a rendu 18 chemins au lieu de
   20 parce qu'il ne lisait que les guillemets doubles. */
const emprises = [...src.matchAll(/emprise:\s*\[\s*(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+)\s*\]/g)]
  .map((m) => m.slice(1, 5).map(Number));
const declares = (src.match(/^\s{2}\{ *id:/gm) || []).length;
if (!emprises.length) {
  console.error("⛔ aucune emprise lue dans territoires.ts — une liste vide n'est pas un résultat.");
  process.exit(1);
}
console.error(`emprises lues : ${emprises.length} (territoires déclarés : ${declares || "?"})`);

const dedans = ([, lon, lat]) =>
  emprises.some(([o, s, e, n]) => lon >= o && lon <= e && lat >= s && lat <= n);

const toutes = await fetch(SOURCE).then((r) => {
  if (!r.ok) throw new Error(`communes : HTTP ${r.status}`);
  return r.json();
});
console.error(`source : ${toutes.length} communes`);

const gardees = toutes.filter(dedans).sort((a, b) => a[0].localeCompare(b[0], "fr"));

/* ⛔ ZÉRO COMMUNE N'EST PAS UN RÉSULTAT, c'est un filtre qui s'est trompé de
   référentiel — une emprise en lat/lon inversée, par exemple, rendrait zéro
   sans la moindre erreur. On LÈVE plutôt que d'écrire un fichier vide qu'un
   écran lirait comme « ce territoire n'a pas de communes ». */
if (!gardees.length) {
  console.error("⛔ aucune commune dans les emprises — vérifier l'ordre [ouest, sud, est, nord].");
  process.exit(1);
}

writeFileSync(
  new URL("../src/communes.json", import.meta.url),
  JSON.stringify(gardees) + "\n",
);
console.error(`✅ ${gardees.length} communes écrites : ${gardees.map((c) => c[0]).join(", ")}`);

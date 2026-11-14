// QUELS REFUS ATTEIGNENT VRAIMENT L'ÉCRAN — mesuré, pas lu.
//
// 🔴 CE FICHIER NAÎT D'UNE ERREUR DE MA PART, LE 14/11/2026. J'avais annoncé
//    à Aurélien que l'écran « ment » : cinq refus nommés dans le moteur, trois
//    phrases à l'écran, dont un fourre-tout affirmant « aucun second chemin
//    n'en revient » — faux pour `trop-loin` et `ecarte`.
//
// ⛔ C'ÉTAIT UNE LECTURE, PAS UNE MESURE, ET ELLE ÉTAIT FAUSSE. Dans les
//    conditions de l'application — la cible vient de `propositionsAutour`,
//    le budget vaut `parcours.metres × BOUCLE_PAR_ALLER` — SEULS DEUX ÉTATS
//    se produisent :
//
//        presqu'île   ok 82,9 %   aucune-boucle 17,1 %
//        Mullerthal   ok 70,0 %   aucune-boucle 30,0 %
//        presqu'île, AVEC les 66 arêtes réellement interdites par arrêté :
//                     ok 81,1 %   aucune-boucle 18,9 %
//
//    Jamais `ecarte`, jamais `hors-reseau`, jamais `trop-loin`, jamais
//    `ferme`. Les propositions pré-filtrent : on ne propose pas un lieu
//    qu'on ne sait pas atteindre, donc le refus ne peut pas porter là-dessus.
//
// ⭐ ET LE GARDE QUI EXISTAIT AVAIT RAISON CONTRE MOI. `navigation.test.ts`
//    déclare `ecarte` « empêché en amont » et `trop-loin` « repli commun » —
//    avec le raisonnement juste : `accroche()` et `aretesAutour()` partagent
//    le MÊME seuil, donc une cible accrochée ne peut pas être trouvée
//    écartée. J'ai lu ce garde comme une faiblesse ; c'était une doctrine.
//
// ⚠️ CE QUE CE TEST AJOUTE, et que le garde textuel ne pouvait pas donner :
//    il MESURE au lieu de décrire. Le jour où `propositionsAutour` proposera
//    plus loin, ou bornera autrement, un autre refus atteindra l'écran — et
//    il faudra lui écrire sa phrase. Ce test le dira ce jour-là, en nommant
//    l'état apparu. Un garde sur le TEXTE du code ne l'aurait jamais vu.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { indexer, composerVers, accrocherTous, accrocherUn, accroche,
         propositionsAutour, BOUCLE_PAR_ALLER, type Graphe } from "./composition";
import { aretesTouchees, type Fermetures } from "./fermetures";
import { lieuxDuTerritoire } from "./lieux-du-territoire";
import type { Inventaire } from "./lieux";
import inventaireBrut from "./lieux.json";
import fermeturesBrut from "../public/fermetures.json";

const INV = inventaireBrut as unknown as Inventaire;
const LIBELLE: Record<string, string> = {
  megalithe: "Mégalithe", plage: "Plage", panorama: "Point de vue",
  chateau: "Fortification", calvaire: "Calvaire", chapelle: "Chapelle",
  lieu_de_culte: "Édifice religieux", moulin: "Moulin", phare: "Phare",
  grotte: "Grotte", source: "Source", cascade: "Cascade", ruine: "Ruines",
};
const R = (p: string) => resolve(__dirname, "..", p);
const PRESQUILE = R("public/bretagne/g/presquile.json");

/** Le parcours exact de l'écran : accrocher, proposer, demander la boucle. */
function etatsAtteints(fichier: string, avecFermetures: boolean, combienDeDeparts: number) {
  const g = JSON.parse(readFileSync(fichier, "utf8")) as Graphe;
  const interdites = avecFermetures
    ? aretesTouchees(g, fermeturesBrut as unknown as Fermetures).interdites
    : undefined;
  const ix = indexer(g, interdites);
  const src = lieuxDuTerritoire(INV, g, LIBELLE)!;
  const spots = src.lieux;
  const positions = spots.map((l) => l.g as readonly [number, number]);
  const accroches = accrocherTous(g, ix, positions, { ecartSiLoin: false });

  const jonctions = [...ix.adj.keys()];
  const pas = Math.max(1, Math.floor(jonctions.length / combienDeDeparts));
  const departs = jonctions.filter((_, i) => i % pas === 0).slice(0, combienDeDeparts);

  const vus = new Map<string, number>();
  let demandes = 0;
  for (const d of departs) {
    const a = accrocherUn(g, ix, g.n[d] as [number, number]);
    if (!accroche(a)) continue;
    const props = propositionsAutour(g, ix, a, spots, positions, accroches, {});
    if (!props?.length) continue;
    for (const p of props) {
      const v = composerVers(g, ix, d,
        Math.round(p.parcours.metres * BOUCLE_PAR_ALLER),
        positions[p.i] as [number, number]);
      vus.set(v.etat, (vus.get(v.etat) ?? 0) + 1); demandes++;
    }
  }
  return { vus, demandes, interdites: interdites?.size ?? 0 };
}

describe("les refus qui atteignent l'écran", () => {
  it.skipIf(!existsSync(PRESQUILE))(
    "🔴 DEUX ÉTATS, PAS CINQ — et une phrase de plus serait du bruit", () => {
    const { vus, demandes } = etatsAtteints(PRESQUILE, false, 20);
    // ⛔ Sans cette borne, un jeu de départs dégénéré rendrait « aucun état »
    //    et le test passerait en ne mesurant rien.
    expect(demandes, "il faut de vraies demandes pour que ce test dise quoi que ce soit")
      .toBeGreaterThan(30);
    const etats = [...vus.keys()].sort();
    expect(etats,
      `un refus NOUVEAU atteint l'écran : ${etats.join(", ")}. `
      + `Le bloc de Composer.tsx n'a de phrase que pour « aucune-boucle » et `
      + `« ferme » — écrivez la sienne, ou dites ici pourquoi elle est agrégée.`)
      .toEqual(["aucune-boucle", "ok"]);
  }, 60_000);

  it.skipIf(!existsSync(PRESQUILE))(
    "⛔ et les arrêtés RÉELS n'en font pas apparaître d'autre", () => {
    const { vus, demandes, interdites } = etatsAtteints(PRESQUILE, true, 20);
    // Le test ne prouve rien si aucune fermeture n'est appliquée.
    expect(interdites, "aucune arête interdite : les fermetures ne sont pas appliquées")
      .toBeGreaterThan(0);
    expect(demandes).toBeGreaterThan(30);
    expect([...vus.keys()].sort()).toEqual(["aucune-boucle", "ok"]);
  }, 60_000);

  it("⚠️ la phrase de « ferme » parle de l'ARRIVÉE, pas du retour", () => {
    // 🔴 Elle disait « le chemin du RETOUR est fermé ». `composerVers` rend
    //    « ferme » quand les arêtes près du LIEU VISÉ sont toutes sous arrêté.
    //    Le moteur le documente ; l'écran disait le contraire. Elle ne
    //    s'affiche jamais aujourd'hui — c'est pour ça qu'elle a pu mentir.
    const compo = readFileSync(resolve(__dirname, "Composer.tsx"), "utf8");
    expect(compo).not.toMatch(/chemin du retour est fermé/);
    expect(compo).toMatch(/qui y mènent sont fermés par arrêté/);
  });
});

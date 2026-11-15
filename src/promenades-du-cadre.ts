/**
 * LES PROMENADES QUE CET HÔTE REVENDIQUE — la part calculable de la liste.
 *
 * 🔴 POURQUOI ELLE REVIENT. Le catalogue des 1 032 itinéraires était devenu un
 *    FANTÔME : un producteur, un fichier servi de 160 Ko, une fonction de
 *    chargement, des tests — et plus aucun écran qui l'appelle. Mesuré le
 *    15/11/2026 : `chargerIndex()` n'avait pas un seul appelant hors tests.
 *    Aurélien, le même soir : « remets-la, filtrée par l'hôte ».
 *
 * ⛔ UN SEUL FICHIER, TROIS PORTÉES — ET C'EST POURQUOI ON FILTRE À LA
 *    LECTURE. `mana.bzh/bretagne/index.json` est lu par les TROIS hôtes
 *    (`VITE_GRAPHE_BASE` pointe tous sur mana.bzh). Le couper à la source
 *    pour servir Brest terres océanes aurait rogné manahome et manafrance du
 *    même geste, sans que personne ne l'ait demandé. Le cadre est une
 *    propriété de l'HÔTE, pas de la donnée.
 *
 * ⚠️ ET LE TITRE DIT CE QUE LE FILTRE FAIT — « AU DÉPART DE », jamais
 *    « DANS ». Une session l'a déjà payé le 31/10 en filtrant par rectangle
 *    sous un titre « Presqu'île de Crozon » : la bbox rendait Daoulas et le
 *    Menez-Hom, c'est-à-dire la rade de Brest. ⭐ Son mot tient encore : « un
 *    rectangle n'est pas une presqu'île ». Ici le cadre EST un rectangle (les
 *    six EPCI de BTO le sont par construction), donc le filtre est honnête —
 *    mais l'index ne porte que le point de DÉPART. Un itinéraire qui traverse
 *    le territoire sans y commencer n'y figure pas, et la phrase le dit.
 *
 * Relevé le 15/11/2026 : mana.bzh 69 · manafrance 1 032 · manahome 1 032.
 */
import type { Fiche } from "./catalogue";
import type { Etendue } from "./etendue";

/**
 * Les promenades dont le DÉPART tombe dans le cadre de l'étendue.
 *
 * ⚠️ Une étendue SANS cadre ne filtre rien — et ce n'est pas la même chose
 *    que filtrer sur la boîte du monde : manahome revendique la Terre, et une
 *    promenade dont le départ manque de coordonnées ne doit pas disparaître
 *    de sa liste pour autant.
 */
export function promenadesDuCadre(fiches: readonly Fiche[], e: Etendue): Fiche[] {
  if (!e.cadre) return [...fiches];
  const [o, s, est, n] = e.boite;
  /* ⚠️ PAS DE `Number.isFinite` ICI, ET C'EST MESURÉ. Un premier jet en
     portait un — il paraissait prudent et ne servait à rien : toute
     comparaison avec `NaN` est FAUSSE, donc une fiche sans position est déjà
     écartée par les quatre bornes. La mutation l'a dit : le retirer laissait
     le test vert. ⭐ Un garde qu'on ne peut pas voir refuser est une
     assurance qu'on croit avoir. */
  return fiches.filter((f) =>
    f.x >= o && f.x <= est && f.y >= s && f.y <= n);
}

/**
 * La phrase qui annonce la liste.
 *
 * ⭐ ELLE NOMME LE CADRE ET LE CRITÈRE. « 69 promenades au départ de Brest
 *    terres océanes » se vérifie d'un coup d'œil ; « les promenades de votre
 *    territoire » promettrait l'exhaustivité que le point de départ ne donne
 *    pas.
 * ⚠️ Et le SINGULIER se dit : « 1 promenades » trahit un gabarit, et se lit
 *    comme un défaut du produit entier.
 */
export function direLaListe(n: number, e: Etendue): string {
  const p = `${n.toLocaleString("fr-FR")} promenade${n > 1 ? "s" : ""}`;
  return e.cadre ? `${p} au départ de ${e.nom}` : `${p} à parcourir`;
}

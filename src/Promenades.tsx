import type { Fiche } from "./catalogue";

/**
 * 🔴 CE FICHIER NE PORTE PLUS D'ÉCRAN — depuis le 3/11/2026, fusion de
 *    `/promenades` et `/composer` : « on s'épargne un clic » (demande du
 *    fondateur). Le catalogue qui vivait ici (recherche, filtres, les
 *    7 itinéraires de la presqu'île, les 46 circuits de l'Office) est
 *    maintenant la seconde moitié de l'écran que `Composer.tsx` rend —
 *    composer une promenade EN DIRECT d'abord, parcourir le catalogue
 *    ensuite, sans navigation entre les deux.
 *
 * ⛔ CE FICHIER NE S'APPELLE TOUJOURS PAS `promenades.ts`, ET C'EST VOULU
 *    MALGRÉ LA DISPARITION DU JSX. `Promenades.tsx` (majuscule, `.tsx`)
 *    continue d'exister : deux fichiers qui ne diffèrent que par la CASSE
 *    se résolvent au hasard sur macOS. Déjà vécu deux fois dans
 *    l'écosystème — voir `catalogue.ts` et `composition.ts`. Renommer
 *    celui-ci en minuscule recréerait exactement ce risque, pour gagner
 *    une extension plus honnête.
 *
 * Reste donc ici ce que `Promenades.test.ts` vérifie directement : la
 * définition du territoire que le catalogue filtre, en dehors de tout
 * composant.
 */

/**
 * 🔴 LA PAGE NE MONTRE QUE LA PRESQU'ÎLE — 31/10/2026.
 *
 * ⛔ ET LE FILTRE EST PAR COMMUNE, PAS PAR EMPRISE RECTANGULAIRE. Mesuré :
 *    une bbox (-4,78 / 48,14 / -4,17 / 48,36) rend **13** itinéraires, dont
 *    Daoulas, Plougonvelin, Logonna-Daoulas et le Menez-Hom — la rade de
 *    Brest, pas la presqu'île. Publier ça sous le titre « Presqu'île de
 *    Crozon » serait annoncer un lieu que le fichier ne dit pas.
 *    ⭐ Un rectangle n'est pas une presqu'île, et la géométrie d'un territoire
 *       ne s'approxime pas par ses extrêmes.
 *
 * ⚠️ L'index ne porte QUE la commune de départ et celle d'arrivée (`c` compte
 *    les communes traversées sans les nommer) : un itinéraire qui traverse la
 *    presqu'île sans y commencer ni finir échappe donc au filtre. C'est un
 *    manque assumé — il vaut mieux qu'une liste trop large.
 *
 * Relevé sur l'index réel le 31/10/2026 : **7 itinéraires, 181 km.**
 * Camaret-sur-Mer, Roscanvel, Telgruc-sur-Mer et Landévennec n'apparaissent
 * ni en départ ni en arrivée — c'est l'état de la moisson, pas une omission.
 */
export const PRESQUILE = new Set([
  "Crozon", "Camaret-sur-Mer", "Roscanvel", "Lanvéoc",
  "Telgruc-sur-Mer", "Argol", "Landévennec",
]);

export const surLaPresquile = (f: Fiche): boolean =>
  (f.d !== null && PRESQUILE.has(f.d)) || (f.a !== null && PRESQUILE.has(f.a));

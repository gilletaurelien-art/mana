/**
 * QUAND UNE CARTE MAPLIBRE ACCEPTE-T-ELLE UNE SOURCE ?
 *
 * 🔴 LA MAUVAISE RÉPONSE A TENU DEUX JOURS : `map.isStyleLoaded()`. Le nom
 *    promet « le style est chargé » ; l'implémentation rend `style.loaded()`,
 *    qui exige EN PLUS que toutes les sources aient fini leurs tuiles.
 *    Mesuré dans le navigateur le 15/11/2026, sur le style ortho de MANA, à
 *    l'instant précis où le style vient d'être analysé :
 *
 *        style._loaded ...... true
 *        isStyleLoaded() .... false      ← la porte est fermée
 *        sourceCaches ....... ortho: false · openmaptiles: false
 *        addSource(...) ..... POSÉE      ← et pourtant elle passe
 *
 * ⛔ CONSÉQUENCE EN LIGNE : le relais ortho rend des 504 à froid ; une tuile
 *    qui tarde, et `isStyleLoaded()` reste faux à chacun des cinquante
 *    sondages du guetteur. Au bout de dix secondes il s'arrête, pour
 *    toujours — ni source, ni points, et les vingt-cinq couches d'étiquettes
 *    jamais éteintes.
 *
 * ⭐ LA BONNE QUESTION EST POSÉE PAR LE GESTE LUI-MÊME. `addSource` appelle
 *    `_checkLoaded()`, qui lève « Style is not done loading. » tant que le
 *    style n'est pas analysé — et SEULEMENT pour cette raison. On ne demande
 *    donc plus « es-tu prêt ? » à une fonction qui répond à une autre
 *    question : on pose, et l'échec dit de repasser.
 * ⚠️ Pas de sonde séparée : une sonde mesurerait un instant, et la pose vraie
 *    aurait lieu à un autre. Ici, il n'y a pas d'intervalle entre les deux.
 */

/** Le peu qu'on demande d'une carte — pour que ce module s'éprouve sans navigateur. */
export interface CarteQuiPose {
  addSource(id: string, donnees: unknown): void;
}

/**
 * Pose la source si le style l'accepte. Rend `true` quand elle est en place.
 *
 * ⛔ ET IL FAUT L'APPELER TANT QU'IL REND `false`, JAMAIS APRÈS. Un second
 *    appel après une pose réussie ferait lever « There is already a source
 *    with ID » — qu'on prendrait pour « pas encore prêt », et la carte
 *    resterait nue en boucle. C'est l'appelant qui garde la porte, et le test
 *    jumeau l'éprouve avec une carte qui refuse les doublons comme maplibre.
 */
export function poserLaSource(
  carte: CarteQuiPose, id: string, donnees: unknown,
): boolean {
  try {
    carte.addSource(id, donnees);
    return true;
  } catch {
    return false;
  }
}

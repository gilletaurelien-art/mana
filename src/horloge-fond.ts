/**
 * L'HORLOGE DU FOND — une seule, et tout ce qui tourne s'y accroche.
 *
 * 🔴 POURQUOI UN MODULE PLUTÔT QU'UN SECOND `setInterval`. Le fondateur a
 *    demandé que la balade proposée change EN MÊME TEMPS que l'image. Deux
 *    minuteries de 10 000 ms lancées à deux instants différents ne sont pas
 *    synchrones : elles le paraissent au début, puis l'écart grandit —
 *    l'onglet caché gèle l'une et pas l'autre, un rendu React redémarre
 *    l'une, le navigateur étale les réveils. ⭐ Deux horloges réglées sur la
 *    même durée ne donnent pas la même heure ; elles donnent deux heures qui
 *    se ressemblent de moins en moins.
 *
 * ⭐ Il n'y a donc qu'un BATTEMENT, celui de `Fond`, et les autres s'y
 *    abonnent. La synchronisation n'est pas un réglage à tenir : elle est
 *    vraie par construction, et elle le reste quand la durée change.
 *
 * ⚠️ `Fond` est monté une fois pour toute l'application (hors de la colonne,
 *    voir `App.tsx`) : l'horloge survit donc aux changements de page, comme
 *    l'image qu'elle commande.
 */
type Oreille = (tour: number) => void;

const oreilles = new Set<Oreille>();
let tour = 0;

/** Appelé par `Fond` à chaque changement d'image, et par lui seul. */
export function battre(n: number): void {
  tour = n;
  /* ⚠️ On copie l'ensemble avant de parcourir : une oreille qui se
     désabonne pendant la diffusion modifierait la collection en cours de
     lecture. Le cas arrive à chaque démontage d'écran. */
  for (const o of [...oreilles]) o(n);
}

/** S'abonner au battement. Rend la fonction de désabonnement. */
export function ecouter(o: Oreille): () => void {
  oreilles.add(o);
  return () => { oreilles.delete(o); };
}

/** Le tour courant, pour qui arrive après le départ. */
export const tourActuel = () => tour;

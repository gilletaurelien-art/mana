/**
 * « Y ALLER » — le chaînon qui manquait, et qu'on NE construit PAS.
 *
 * 🔴 LA FONCTION ÉTAIT ABSENTE, relevé par le fondateur le 5/11/2026 :
 *    l'application savait montrer un lieu et composer la promenade qui en
 *    part, jamais comment l'atteindre. Le parcours réel d'un visiteur est
 *    pourtant : voir → s'y rendre → marcher. Il manquait le milieu.
 *
 * ⛔ ET LA BONNE RÉPONSE EST DE PASSER LA MAIN, pas d'écrire un moteur
 *    routier. Deux raisons mesurées, pas deux opinions :
 *
 *    1. NOUS N'AVONS PAS LA DONNÉE. `scripts/graphe.py` lit bien `highway`
 *       (ligne 92) — mais pour en tirer un agrément, et la classe de voirie
 *       n'entre dans AUCUNE des neuf cases d'une arête. Le graphe servi ne
 *       distingue donc pas une départementale d'un layon. On ne peut pas
 *       dire où une voiture passe, encore moins où elle se gare.
 *    2. CE N'EST PAS NOTRE MOITIÉ. Ce que MANA a et que personne d'autre
 *       n'a, c'est la liste de ce qu'on CROISE. Itinérer une voiture est
 *       une commodité que trois applications font déjà mieux, avec le
 *       trafic et les sens interdits que nous n'aurons jamais.
 *
 * ⭐ ON REND DONC LA MAIN À L'APPLICATION QUE LA PERSONNE UTILISE DÉJÀ,
 *    jamais à celle que nous aurions choisie pour elle. C'est la même
 *    doctrine que les tuiles relayées : nous ne décidons pas à qui son
 *    trajet est confié. Sur Android, `geo:` laisse le système ouvrir son
 *    application par défaut ; sur iPhone, Safari ignore `geo:` et il faut
 *    nommer Plans ; ailleurs, OpenStreetMap — dont la donnée est déjà la
 *    nôtre, et qui ne demande pas de compte.
 *
 * ⚠️ CE QU'ON NE SAIT PAS, ON LE DIT. Le point envoyé est celui du LIEU, pas
 *    d'un parking : à 300 m d'un menhir, le dernier tronçon est souvent un
 *    chemin de terre. L'écran l'annonce plutôt que de laisser une voiture le
 *    découvrir.
 */

export type Plateforme = "ios" | "android" | "autre";

/**
 * ⚠️ RENIFLER L'AGENT UTILISATEUR EST FRAGILE, et c'est assumé ici parce que
 *    l'échec est DOUX : une plateforme mal devinée retombe sur
 *    OpenStreetMap, qui s'ouvre dans un navigateur partout. Aucune autre
 *    méthode ne permet de savoir si `geo:` sera résolu — il n'existe pas de
 *    test de capacité pour un protocole d'URL.
 * ⚠️ `maxTouchPoints` POUR L'IPAD : depuis iPadOS 13 il se déclare
 *    « Macintosh ». Sans ce second critère, un iPad recevrait le lien
 *    OpenStreetMap au lieu de Plans.
 */
export function plateformeDe(ua: string, maxTouchPoints = 0): Plateforme {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/macintosh/i.test(ua) && maxTouchPoints > 1) return "ios";
  return "autre";
}

/**
 * Le lien qui ouvre l'itinéraire vers un point, dans l'application de la
 * personne.
 *
 * ⚠️ L'ORDRE lon/lat DE NOS DONNÉES S'INVERSE ICI. GeoJSON et notre graphe
 *    écrivent `[lon, lat]` ; les trois schémas d'URL ci-dessous attendent
 *    `lat,lon`. C'est exactement le genre d'inversion qui donne un point au
 *    milieu de l'océan Indien sans lever la moindre erreur — d'où le test
 *    qui l'épingle sur un lieu réel du Finistère.
 */
export function lienYAller(
  point: readonly [number, number],
  nom: string,
  plateforme: Plateforme,
): string {
  const [lon, lat] = point;
  const ll = `${lat},${lon}`;
  switch (plateforme) {
    /* `daddr` = destination ; sans `saddr`, Plans part de la position
       courante. `dirflg=d` demande la voiture — c'est ce que « y aller »
       veut dire pour qui n'est pas encore sur place. */
    case "ios":
      return `https://maps.apple.com/?daddr=${ll}&dirflg=d&q=${encodeURIComponent(nom)}`;
    /* ⭐ `geo:` est le seul schéma NEUTRE : le système propose les
       applications installées. On ne nomme aucun fournisseur. */
    case "android":
      return `geo:${ll}?q=${ll}(${encodeURIComponent(nom)})`;
    default:
      return `https://www.openstreetmap.org/directions?to=${ll}`;
  }
}

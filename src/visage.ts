/**
 * LES DEUX VISAGES DE LA MÊME APPLICATION — 7/11/2026.
 *
 * 🔴 DÉCISION D'AURÉLIEN : mana.love prend cette app, et mana.bzh devient « une
 *    version ultra light de mana.love » — sans chat, sans astrologie, sans
 *    compte citoyen — avec une fonction EN PLUS : les balades de l'Office de
 *    tourisme Presqu'île de Crozon – Aulne Maritime.
 *
 * ⭐ UNE SEULE APP, DEUX HÔTES — et c'est l'alternative qui a décidé. Porter
 *    la carte dans un second dépôt aurait donné deux codes pour un même
 *    travail, et ce dépôt a déjà payé cette facture : le pipeline français
 *    prenait `nwr` pendant que le pipeline monde prenait `node`, et les plages
 *    du monde sont restées à 5 % pendant SEIZE JOURS — non par ignorance, mais
 *    parce que rien ne confrontait les deux.
 *
 * ⚠️ PAS DE PRÉRENDU DANS CE DÉPÔT (`build` = `vite build`, rien d'autre) :
 *    la branche peut donc être purement cliente, sans risque de servir le
 *    mauvais visage dans un HTML figé.
 */

export type Visage = "bzh" | "love";

/**
 * ⚠️ `?visage=love` EXISTE À DESSEIN, et ce n'est pas une porte dérobée : sans
 *    lui, le visage love serait INVÉRIFIABLE hors production — et une branche
 *    que personne ne peut regarder est une branche que personne ne corrige.
 *    Elle ne retire que l'Office ; elle n'ouvre aucun droit, ne révèle aucune
 *    donnée, et ne change rien à ce que le serveur accepte de servir.
 */
export function visage(): Visage {
  if (typeof location === "undefined") return "bzh";
  const force = new URLSearchParams(location.search).get("visage");
  if (force === "love" || force === "bzh") return force;
  return location.hostname === "mana.love" ? "love" : "bzh";
}

/**
 * ⛔ LE SEUL PRÉDICAT DE CE FICHIER, ET IL EST NOMMÉ PAR CE QU'IL DÉCIDE.
 *    `estBzh()` aurait invité à y accrocher tout ce qui diffère entre les deux
 *    sites ; celui-ci ne répond qu'à « y a-t-il un Office de tourisme ici ? ».
 * ⭐ Une capacité se nomme par la capacité, pas par le site qui l'a : le jour
 *    où un second office rejoint le produit, c'est la liste des territoires
 *    qui change, pas ce prédicat.
 */
export const avecOffice = () => visage() === "bzh";

/**
 * 🔴 LE NOM SOUS LEQUEL ON SIGNE, ET IL DÉPEND DE L'HÔTE — 7/11/2026.
 *    Trouvé sur une capture : `mana.love/promenades` portait le `<title>`
 *    « … — MANA.bzh ». C'est l'onglet du navigateur, et c'est surtout ce que
 *    les moteurs indexent pour ce domaine.
 * ⭐ MÊME FAMILLE QUE L'ÉDITEUR DES MENTIONS LÉGALES, EN MOINS GRAVE : là
 *    c'était une déclaration due par la loi, ici c'est une marque qui annonce
 *    le mauvais domaine. Les deux viennent du même défaut de pensée — une
 *    valeur écrite quand il n'y avait qu'un seul site.
 * ⚠️ Elle est nommée par ce qu'elle EST (la signature), pas par l'endroit où
 *    on la pose : elle sert au titre, au pied, et au courriel de contact.
 */
export const signature = () => (visage() === "love" ? "mana.love" : "MANA.bzh");

/* ⛔ PAS DE `courriel()` ICI, ET C'EST UNE DÉCISION. Je l'avais écrit pour
   réparer `contact@mana.bzh` affiché sur mana.love — puis mesuré : `/contact`
   n'est pas servi sur cet hôte, donc cet écran n'y est jamais atteint. Le
   correctif portait sur une page inatteignable.
   ⭐ Un helper exporté que rien n'appelle a l'air d'un garde posé : la
      session suivante le lit comme « c'est traité », alors qu'il ne s'exécute
      nulle part. Mieux vaut l'absence et cette note. Le jour où `/contact`
      entrera dans la liste love, il faudra l'écrire — et ce paragraphe le
      dit. */

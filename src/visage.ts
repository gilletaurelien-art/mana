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

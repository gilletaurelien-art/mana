/**
 * LA RÈGLE D'AFFICHAGE DU FOND TOURNANT — pure, donc vérifiable.
 *
 * 🔴 EXTRAITE LE 6/11/2026 EN RÉPARANT UN ÉCLAIR SIGNALÉ PAR LE FONDATEUR :
 *    « une image apparaît comme un éclair entre chaque image ». Il voyait
 *    juste, et il voyait même la bonne chose — l'éclair était une TROISIÈME
 *    image, pas un défaut de fondu.
 *
 *    Le CSS, lui, était correct et délibéré : la couche sortante ne s'efface
 *    pas, elle reste opaque SOUS la nouvelle (z-index 0 contre 1) pendant que
 *    celle-ci monte de 0 à 1, puis disparaît d'un coup une fois recouverte.
 *
 *    Le défaut tenait à une seule ligne de JavaScript :
 *        couches = visible === 0 ? [courant, apres] : [apres, courant]
 *    Au basculement, la couche SORTANTE — encore pleinement opaque pendant
 *    une seconde — recevait `apres`, c'est-à-dire l'image i+2. On voyait donc
 *    L(i) → coupure franche vers L(i+2) → fondu vers L(i+1).
 *
 * ⭐ LE DÉFAUT ÉTAIT INVISIBLE AU BANC, et c'est pour ça qu'il a vécu : la
 *    rotation se suspend quand l'onglet n'est pas visible (`visibilityState`),
 *    donc l'observer depuis un panneau caché ne montre RIEN. On ne pouvait
 *    pas le mesurer là où on regarde. Il est donc décrit ici comme une
 *    fonction PURE, que des tests éprouvent sans navigateur, sans horloge et
 *    sans onglet au premier plan.
 */

/** Les deux phases d'un palier. La distinction est le cœur du correctif :
 *  pendant le fondu, la couche cachée doit CONTINUER d'afficher ce qu'elle
 *  montrait ; ce n'est qu'une fois recouverte qu'elle peut précharger la
 *  suivante. */
export type Phase = "fondu" | "repos";

/**
 * Quelles images portent les deux couches, au palier `i`.
 * Rend `[indexCouche0, indexCouche1]` — des index dans la liste.
 *
 * ⚠️ La couche VISIBLE est `i % 2` : l'alternance est portée par le palier
 *    lui-même, et non par un état séparé qui pourrait se désynchroniser.
 */
export function couchesAu(i: number, phase: Phase, n: number): [number, number] {
  if (n < 1) throw new Error("une rotation sans image n'est pas une rotation");
  const mod = (k: number) => ((k % n) + n) % n;
  const visible = i % 2;
  /* ⛔ PENDANT LE FONDU, LA COUCHE CACHÉE GARDE L'IMAGE PRÉCÉDENTE. Elle est
     encore opaque sous la nouvelle : lui changer son image ici, c'est la
     coupure franche que le fondateur a vue. */
  const autre = mod(phase === "fondu" ? i - 1 : i + 1);
  return visible === 0 ? [mod(i), autre] : [autre, mod(i)];
}

/** La couche visible au palier `i`. */
export const coucheVisible = (i: number) => i % 2;

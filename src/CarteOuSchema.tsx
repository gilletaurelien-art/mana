/**
 * LA CARTE, OU LE SCHÉMA — et jamais rien.
 *
 * 🔴 CE REPLI MANQUAIT, ET LA PAGE D'ACCUEIL LE PROMETTAIT DÉJÀ : « le fond de
 *    carte demande du réseau — hors ligne, le parcours s'affiche en schéma ».
 *    Mesuré le 30/10/2026, serveur coupé, sur le build réel : composer une
 *    boucle sans réseau rendait une PAGE BLANCHE.
 *
 *    La cause tient en une propriété de React que `Suspense` masque :
 *    `Suspense` a un repli de CHARGEMENT, pas un repli d'ÉCHEC. Quand l'import
 *    différé de la carte échoue — « Unable to preload CSS for
 *    CarteReelle-*.css » — l'erreur remonte, aucun garde ne l'attrape, et
 *    l'arbre entier se démonte. L'écran promis était le schéma ; l'écran réel
 *    était le vide.
 *
 * ⭐ ET C'EST LE PIRE ENDROIT POSSIBLE POUR UN ÉCRAN BLANC : dehors, sans
 *    réseau, au moment où l'on a le plus besoin de voir où l'on est. Un
 *    produit qui promet le hors-ligne et rend du vide hors ligne ne déçoit pas
 *    — il dément sa propre page d'accueil.
 *
 * ⚠️ Un repli ne se décrète pas, il se VOIT refuser. Le test de ce fichier
 *    force l'import à échouer et vérifie que le schéma s'affiche.
 */
import { Suspense, type ReactNode } from "react";
import { GardeDEcran } from "./garde-ecran";

/* ⭐ LA FRONTIÈRE VIT DÉSORMAIS DANS `garde-ecran.tsx`, ET C'EST TOUT
   L'INTÉRÊT. Cette classe était ici, excellente, et n'a protégé que les
   TROIS écrans qui pensaient à l'importer : six autres `Suspense` sont
   restés nus pendant dix-sept jours. Une leçon rangée dans un composant
   ne se propage pas toute seule — voir `rendez-vous-load.test.ts`, qui a
   appris la même chose sur les cartes le même jour. */

/**
 * Affiche `children` (la carte réelle, chargée à la demande) et retombe sur
 * `schema` dans les DEUX cas où elle n'arrive pas : pendant le chargement, et
 * quand le chargement échoue.
 */
export function CarteOuSchema({
  schema,
  children,
}: {
  schema: ReactNode;
  children: ReactNode;
}) {
  return (
    <GardeDEcran repli={schema}>
      <Suspense fallback={schema}>{children}</Suspense>
    </GardeDEcran>
  );
}

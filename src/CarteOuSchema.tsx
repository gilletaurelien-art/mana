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
import { Component, Suspense, type ReactNode } from "react";

class SiLaCarteTombe extends Component<
  { schema: ReactNode; children: ReactNode },
  { tombee: boolean }
> {
  state = { tombee: false };

  static getDerivedStateFromError() {
    return { tombee: true };
  }

  componentDidCatch() {
    // ⛔ On ne remonte rien nulle part : la position de quelqu'un qui marche
    //    n'a pas à partir dans un rapport d'erreur. Le défaut se voit à
    //    l'écran, il ne se télémètre pas.
  }

  render() {
    return this.state.tombee ? this.props.schema : this.props.children;
  }
}

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
    <SiLaCarteTombe schema={schema}>
      <Suspense fallback={schema}>{children}</Suspense>
    </SiLaCarteTombe>
  );
}

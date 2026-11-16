import { Component, type ReactNode } from "react";

/**
 * LE FILET SOUS UN ÉCRAN — 16/11/2026.
 *
 * 🔴 `Suspense` A UN REPLI DE CHARGEMENT, PAS UN REPLI D'ÉCHEC. C'est écrit
 *    depuis le 30/10 dans `CarteOuSchema.tsx`, et ça n'avait été posé que sur
 *    TROIS sites sur neuf. Reproduit le 16/11 contre le bundle de PRODUCTION,
 *    en sabotant un seul morceau différé de 8 Ko derrière un passe-plat :
 *
 *        témoin .................. #root = 89 nœuds, l'application marche
 *        morceau remplacé ........ #root = 0 nœud, page BLANCHE
 *        socket coupée ........... #root = 0 nœud, page BLANCHE
 *
 *    Quand l'import différé rejette, l'erreur remonte ; sans frontière, React
 *    démonte TOUT l'arbre. Il ne reste ni devise, ni recherche, ni barre du
 *    bas — rien qui dise pourquoi, et rien pour s'en sortir sauf recharger.
 *
 * ⛔ ET CE N'EST PAS SEULEMENT « UN MORCEAU QUI N'ARRIVE PAS ». Même chemin,
 *    trois déclencheurs : le morceau absent (déploiement en cours, onglet
 *    resté ouvert depuis la veille sur des noms hachés qui n'existent plus),
 *    le réseau qui hésite, et `new maplibregl.Map()` qui LÈVE — maplibre jette
 *    « Failed to initialize WebGL » sur une machine sans accélération. Une
 *    erreur jetée dans un effet remonte aussi jusqu'ici.
 * ⚠️ Cela corrige une consolation écrite ailleurs dans ce dépôt — « en fond,
 *    le même échec ne coûte qu'un décor ». C'était vrai de l'échec OBSERVÉ le
 *    14/11, où maplibre ne jette pas et reste muet ; c'est faux de l'échec qui
 *    jette, lequel emportait la page entière.
 *
 * ⭐ LE REPLI SE CHOISIT PAR LE RÔLE DE CE QU'ON GARDE, et `null` est parfois
 *    la bonne réponse : un fond de carte est un DÉCOR, et un message d'erreur
 *    posé derrière la devise d'accueil serait plus laid que son absence. Là où
 *    l'écran EST la carte, le repli doit parler.
 *
 * ⛔ ON NE REMONTE RIEN NULLE PART. La position de quelqu'un qui marche n'a pas
 *    à partir dans un rapport d'erreur : le défaut se voit à l'écran, il ne se
 *    télémètre pas. (Règle reprise de `CarteOuSchema`, qui l'a posée en premier.)
 */
export class GardeDEcran extends Component<
  { repli: ReactNode; children: ReactNode },
  { tombe: boolean }
> {
  state = { tombe: false };

  static getDerivedStateFromError() {
    return { tombe: true };
  }

  /* ⚠️ Déclarée et vide À DESSEIN : sans `componentDidCatch`, React 18 relance
     l'erreur en développement au lieu de la laisser au repli, et l'on croirait
     le filet absent alors qu'il est posé. */
  componentDidCatch() {}

  render() {
    return this.state.tombe ? this.props.repli : this.props.children;
  }
}

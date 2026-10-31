import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// ⚠️ LES TOKENS AVANT LA FEUILLE, et l'ordre n'est pas cosmétique : une
//    variable lue avant d'être définie vaut `unset`, et la couleur tombe
//    silencieusement sur l'héritage. Le défaut ne se voit alors que sur
//    l'écran qu'on ne regarde pas ce jour-là.
import "./tokens.css";
// ⚠️ Les primitives APRÈS les tokens et AVANT la feuille historique : elles
//    lisent les premiers, et la seconde doit pouvoir les surcharger le temps
//    de la reprise écran par écran.
import "./systeme.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA : mise en cache offline des parcours (uniquement en prod,
// jamais en dev ni sur http non sécurisé).
// ⚠️ `localhost` EST UN CONTEXTE SÛR, et sans lui le service worker n'était
//    enregistrable qu'en production — donc jamais éprouvé. C'est ce verrou qui
//    a laissé le hors-ligne non vérifié jusqu'au 30/10/2026, alors qu'il est la
//    promesse centrale du produit.
//    ⭐ Un dispositif qu'on ne peut essayer que sur la vraie machine ne
//       s'essaie pas : il se découvre en panne.
const contexteSur =
  location.protocol === "https:" ||
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1";

/**
 * ⭐ ON TIÈDIT LA CARTE PENDANT QU'IL Y A DU RÉSEAU. Le morceau `CarteReelle`
 *    (~213 Ko gzip) n'est chargé qu'à l'ouverture d'un parcours : quelqu'un
 *    qui consulte l'application chez lui puis part marcher ne l'a jamais
 *    téléchargé, donc le service worker ne l'a jamais gardé — et dehors, sans
 *    réseau, la carte manque au moment exact où elle sert.
 *    Le repli en schéma existe désormais (CarteOuSchema) et c'est lui qui
 *    protège ; ceci est le confort : avoir la vraie carte plutôt que le repli.
 * ⚠️ `requestIdleCallback` et non `load` : on ne dispute pas la bande passante
 *    au premier écran. Et l'échec est muet — c'est du confort, pas une
 *    dépendance.
 */
function tiedirLaCarte() {
  const faire = () => { import("./CarteReelle").catch(() => {}); };
  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, o?: object) => void })
      .requestIdleCallback(faire, { timeout: 8000 });
  } else {
    setTimeout(faire, 4000);
  }
}
window.addEventListener("load", tiedirLaCarte);

if ("serviceWorker" in navigator && contexteSur) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // échec silencieux : la vitrine reste utilisable en ligne
    });
  });
}

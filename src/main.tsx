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

/* 🔴 DEUX APPLICATIONS NE PEUVENT PAS POSSÉDER LE PÉRIMÈTRE « / » D'UNE MÊME
   ORIGINE — et c'est la raison de ce drapeau, pas une préférence. Un service
   worker s'enregistre pour un PÉRIMÈTRE : deux scripts de noms différents
   posés à la racine se remplacent l'un l'autre. Sur mana.bzh, où 63 885 pages
   d'agrégat ont déjà le leur, poser celui-ci les en priverait.
   ⭐ Le hors-ligne n'est donc pas « oublié » sur ce build : il est RETIRÉ, en
      le sachant, jusqu'à ce que l'arbitrage soit pris. Un drapeau explicite
      dit cela ; une omission ne dit rien.

   ⚠️ ET L'ADRESSE VIENT DE LA BASE, PLUS DU CHEMIN COURANT. `"./sw.js"` se
      résout RELATIVEMENT à la page : sur « /promenade/forts-du-goulet » il
      demandait « /promenade/sw.js », qui n'existe pas. Le hors-ligne ne
      s'armait donc que depuis les pages de premier niveau — un défaut muet,
      préexistant, trouvé en préparant cette bascule. */
const SW_VOULU = import.meta.env.VITE_SW !== "0";

if ("serviceWorker" in navigator && contexteSur && SW_VOULU) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // échec silencieux : la vitrine reste utilisable en ligne
    });
  });
}

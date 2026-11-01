// Routeur maison : zéro dépendance (doctrine vitesse).
import { useEffect, useState } from "react";
// GitHub Pages sert index.html pour / et 404.html (copie d'index) pour les
// liens profonds — le JS lit l'URL et rend la bonne page.

const chemin = (): string => {
  const p = window.location.pathname;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return p.startsWith(base) ? p.slice(base.length) || "/" : p;
};

/**
 * 🔴 LA NAVIGATION DEVIENT INTERNE — 1/11/2026, et la raison est la RADIO.
 *
 * Jusqu'ici chaque lien était un rechargement complet : `usePath` lisait
 * `location.pathname` UNE FOIS et rien n'écoutait. Conséquence mesurée : le
 * flux audio s'arrêtait dès qu'on quittait `/radio`, parce que le document
 * entier mourait avec lui. ⭐ « Faire que la radio fonctionne partout » n'est
 * donc pas une affaire de lecteur audio : c'est une affaire de NAVIGATION.
 * Aucun élément ne survit à un rechargement, où qu'on le place.
 *
 * ⚠️ ET ÇA RÉPARE TROIS AUTRES CHOSES AU PASSAGE, qui passaient pour des
 *    fatalités : le fond tournant repartait de zéro à chaque page, `ot.json`
 *    (259 Ko) et `lieux.json` (110 Ko) se retéléchargeaient, et le défilement
 *    revenait en haut d'un coup sec au lieu d'un rendu.
 *
 * ⛔ CE QUI NE CHANGE PAS : les URL. Elles restent réelles, prérendues,
 *    partageables. Un routeur interne qui invente des adresses casserait le
 *    référencement — ici `pushState` écrit la MÊME adresse que le lien.
 */
const auditeurs = new Set<(p: string) => void>();
let pose = false;

function diffuser() {
  const p = chemin();
  for (const f of [...auditeurs]) f(p);
}

/** Navigue sans recharger. Rend `false` si l'adresse n'est pas des nôtres. */
export function aller(href: string): boolean {
  let u: URL;
  try { u = new URL(href, window.location.href); } catch { return false; }
  if (u.origin !== window.location.origin) return false;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (base && !u.pathname.startsWith(base)) return false;
  if (u.href === window.location.href) return false;
  window.history.pushState(null, "", u.href);
  /* ⚠️ On remonte en haut, comme le ferait un vrai chargement. Sans ça, on
     arrive au milieu de l'écran suivant parce qu'on était au milieu du
     précédent — et personne ne comprend pourquoi la page « manque » son
     début. ⛔ Sauf si l'adresse porte une ancre : là, c'est le navigateur
     qui a raison. */
  if (!u.hash) window.scrollTo(0, 0);
  diffuser();
  return true;
}

function poserLecoute() {
  if (pose) return;
  pose = true;

  window.addEventListener("popstate", diffuser);

  /**
   * ⚠️ UN SEUL ÉCOUTEUR, SUR LE DOCUMENT, EN PHASE DE BULLE. Poser un
   *    gestionnaire sur chaque `<a>` demanderait de les connaître tous —
   *    y compris ceux qu'un écran rendra demain.
   * ⛔ ET ON NE DÉTOURNE PAS TOUT CE QUI RESSEMBLE À UN LIEN. Sont laissés au
   *    navigateur, parce que l'intercepter serait lui voler un geste que
   *    l'utilisateur a explicitement demandé :
   *      · les clics avec Cmd/Ctrl/Maj/Alt (nouvel onglet, fenêtre, copie) ;
   *      · le clic du MILIEU et le clic droit (`button !== 0`) ;
   *      · `target="_blank"` — les fiches de l'Office, Wikipédia ;
   *      · `download` ;
   *      · tout ce qui sort de l'origine ou de la base.
   *    Chacune de ces exceptions est un geste qu'on casse si on l'oublie, et
   *    qui ne se voit pas tant qu'on ne l'essaie pas soi-même.
   */
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.("a");
    if (!a) return;
    const lien = a as HTMLAnchorElement;
    if (lien.target && lien.target !== "_self") return;
    if (lien.hasAttribute("download")) return;
    const href = lien.getAttribute("href");
    if (!href) return;
    // une ancre reste une ancre ; `mailto:` et `tel:` sortent du navigateur
    if (href.startsWith("#") || /^(mailto|tel|sms):/i.test(href)) return;
    /* ⭐ Le reste est tranché par `aller`, qui compare l'ORIGINE et la BASE
       sur l'URL résolue — pas sur la chaîne écrite. Un `href="/mana/carte"`
       et un `href="https://mana.bzh/mana/carte"` doivent être traités
       pareil, et seule la résolution le dit. */
    if (aller(lien.href)) e.preventDefault();
  });
}

/** Le chemin courant, et il change SANS rechargement. */
export function usePath(): string {
  const [p, setP] = useState(chemin);
  useEffect(() => {
    poserLecoute();
    auditeurs.add(setP);
    /* ⚠️ Une page ouverte en arrière, puis revenue : l'adresse a pu changer
       entre le rendu initial et l'abonnement. On resynchronise. */
    setP(chemin());
    return () => { auditeurs.delete(setP); };
  }, []);
  return p;
}

export function baseUrl(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

/**
 * ⭐ DEUX ROUTES POUR UNE PROMENADE, PARCE QU'IL Y A DEUX MOMENTS.
 *    `/promenade/<slug>`            → la FICHE : on décide, assis, au calme.
 *    `/promenade/<slug>/en-chemin`  → la NAVIGATION : on y est, debout, dehors.
 *    Les confondre revient à ouvrir le GPS à quelqu'un qui se demande encore
 *    s'il a envie d'y aller — et à faire lire un récit à quelqu'un qui cherche
 *    où tourner.
 * ⚠️ L'ORDRE DES DEUX TESTS COMPTE DANS LE ROUTEUR : `routePromenade` refuse
 *    désormais le suffixe `/en-chemin` (le `$` après le slug), sinon elle
 *    capturerait la navigation et la fiche s'afficherait à sa place — un
 *    défaut qui ne se voit qu'une fois dehors, au pire moment.
 */
export function routePromenade(path: string): string | null {
  const m = path.match(/^\/promenade\/([\w-]+)\/?$/);
  return m ? m[1] : null;
}

export function routeEnChemin(path: string): string | null {
  const m = path.match(/^\/promenade\/([\w-]+)\/en-chemin\/?$/);
  return m ? m[1] : null;
}

/** ÉCRAN 5 — ce qu'on rencontre, trié par distance à soi. */
export function routeRencontres(path: string): string | null {
  const m = path.match(/^\/promenade\/([\w-]+)\/rencontres\/?$/);
  return m ? m[1] : null;
}

/** L'ancienne page complète : export GPX, profil, carte maplibre. */
export function routeComplet(path: string): string | null {
  const m = path.match(/^\/promenade\/([\w-]+)\/complet\/?$/);
  return m ? m[1] : null;
}

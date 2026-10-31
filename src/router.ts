// Routeur minimal maison : zéro dépendance (doctrine vitesse).
// GitHub Pages sert index.html pour / et 404.html (copie d'index) pour les
// liens profonds — le JS lit l'URL et rend la bonne page.

export function usePath(): string {
  const p = window.location.pathname;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return p.startsWith(base) ? p.slice(base.length) || "/" : p;
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

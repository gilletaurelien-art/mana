import { NOM_STYLE_PLAN, NOM_STYLE_ORTHO } from "./carte-fond";

/**
 * 🔴 LES CHEMINS QUI APPARTIENNENT À CETTE APPLICATION — une seule liste,
 *    parce qu'elle vit maintenant en TROIS endroits qui ne se parlent pas.
 *
 * Depuis le 1/11/2026, mana.bzh sert cette application À CÔTÉ d'une autre :
 * 63 885 pages d'agrégat (`/abbeville/associations`, `/crozon/patrimoine`…)
 * continuent d'être servies par l'application historique, sur la même
 * origine. Trois mécanismes doivent donc s'accorder sur « qu'est-ce qui est
 * à nous » :
 *   1. le bloc Caddy `@appbzh` (quel fichier le serveur rend) ;
 *   2. le service worker (quelle navigation il garde, et pour laquelle il
 *      ose rendre notre coquille hors ligne) ;
 *   3. le routeur de l'application (quel écran monter).
 *
 * ⭐ ET LE DÉSACCORD EST MUET DANS LES TROIS SENS. Un chemin oublié côté
 *    Caddy rend l'ancienne app ; oublié côté service worker, il n'est pas
 *    gardé hors ligne ; de trop côté service worker, on rend la coquille des
 *    balades à quelqu'un qui demandait les associations d'Abbeville — et
 *    c'est le pire des trois, parce qu'il a l'air de marcher.
 *
 * ⚠️ Le service worker ne peut PAS importer ce fichier : il est servi tel
 *    quel depuis `public/`, hors de la chaîne de construction. Il en porte
 *    donc une COPIE, et un test refuse qu'elles divergent. Une recopie ne
 *    tient que par ce qui la relie.
 */

/** Les adresses exactes. */
export const ROUTES_APP = [
  "/",
  "/carte",
  "/promenades",
  "/composer",
  "/balades-office",
  "/territoire",
  "/l-application",
  "/reglages",
  "/contact",
  "/mentions-legales",
  "/espace",
  "/radio",
] as const;

/** Les familles d'adresses, par préfixe. */
export const PREFIXES_APP = [
  "/promenade/",
  "/app/",
  "/paysages/",
  "/images/",
] as const;

/** Les fichiers que l'application sert depuis sa propre racine.
 *  ⚠️ Les deux feuilles de style sont DÉRIVÉES de `carte-fond.ts`, jamais
 *     recopiées : un garde de ce dépôt refuse une seconde copie de cette
 *     adresse, et il a crié quand je l'ai écrite ici à la main. */
export const FICHIERS_APP = [
  `/${NOM_STYLE_PLAN}`,
  `/${NOM_STYLE_ORTHO}`,
  "/fermetures.json",
  "/icon.svg",
  "/manifest.webmanifest",
  "/sw.js",
];

/** Ce chemin est-il à nous ? */
export function estANous(chemin: string): boolean {
  if ((ROUTES_APP as readonly string[]).includes(chemin)) return true;
  if (FICHIERS_APP.includes(chemin)) return true;
  return (PREFIXES_APP as readonly string[]).some((p) => chemin.startsWith(p));
}

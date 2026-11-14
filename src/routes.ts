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
/* ⭐ `/hebergements` EXISTE PARTOUT, SEULE LA BARRE DIFFÈRE — 14/11/2026.
   La Bretagne a 57 hébergements relevés, le Mullerthal 57 aussi : aucune
   raison de refuser l'adresse à mana.bzh. Ce qui change d'un hôte à l'autre,
   c'est ce qu'on MET EN AVANT — l'Office chez nous, les hébergements au monde.
   ⚠️ Et la raison vit ICI, pas dans le tableau : `scripts/caddy-bloc.mjs` lit
      ces lignes une à une et REFUSE ce qu'il ne sait pas lire — à raison, un
      chemin tombé du bloc serait servi par l'ancien site, sans erreur. */
export const ROUTES_APP = [
  "/",
  "/carte",
  "/promenades",
  "/composer",
  "/balades-office",
  "/hebergements",
  "/territoire",
  "/l-application",
  "/reglages",
  "/contact",
  "/mentions-legales",
  "/espace",
  "/radio",
] as const;

/**
 * 🔴 LES CHEMINS DU VISAGE LOVE — 7/11/2026, REVU LE MÊME JOUR. mana.love
 *    n'est PAS « cette app moins l'Office » : c'est l'application citoyenne
 *    (dépôt `manafrance-app`) qui tient cet hôte, et la nôtre n'y entre que
 *    par la carte et les promenades. La soustraction est donc de CINQ
 *    chemins, pas d'un.
 *
 * ⭐ ET LA PREMIÈRE VERSION DE CETTE LISTE ÉTAIT FAUSSE DANS LE SENS QUI NE
 *    SE VOIT PAS : elle revendiquait `/`. Un hôte qui rend notre coquille sur
 *    sa racine ne tombe pas en erreur — il affiche une application
 *    plausible à la place d'une autre. Le défaut d'une liste blanche trop
 *    LARGE a toujours l'air de marcher.
 *
 * ⭐ DÉRIVÉE PAR SOUSTRACTION, JAMAIS RECOPIÉE. Une seconde liste écrite à la
 *    main divergerait au premier ajout de route, et en SILENCE — exactement
 *    ce que ce fichier existe pour empêcher entre trois listes. Ici toute
 *    route neuve entre dans les deux par construction ; seule l'exclusion est
 *    explicite, donc visible.
 *
 * ⚠️ ET ON NE REVENDIQUE PAS CE QU'ON NE SERT PAS. Laisser un chemin dans la
 *    liste de mana.love pour « garder les 22 identiques » ferait répondre 200
 *    à une adresse dont nous n'avons pas la matière sur cet hôte. Le confort
 *    d'un garde qu'on n'a rien à réapprendre n'est pas une raison : un garde
 *    qu'on maintient vert en ne lui disant rien ne garde plus, et ne le dit
 *    pas.
 */
export const ROUTE_OFFICE = "/balades-office";

/** Ce que mana.love ne nous laisse pas, et POURQUOI — la raison vit à côté
 *  du chemin, sinon le prochain qui relit la liste la croit arbitraire et
 *  rend l'un d'eux « pour uniformiser ». */
export const ROUTES_HORS_LOVE: Readonly<Record<string, string>> = {
  "/": "la racine reste à l'application citoyenne : elle y porte sa landing, et mana.love est le sur-ensemble — sa porte doit montrer le sur-ensemble, pas la promenade seule",
  [ROUTE_OFFICE]: "pas d'Office de tourisme sur mana.love",
  "/hebergements": "les hébergements sont le produit de MANAhome, pas de mana.love",
  "/reglages": "devient « Mon compte », tenu par l'application citoyenne",
  "/espace": "le compte citoyen de mana.love est le sien, pas le nôtre",
  /* 🔴 CES DEUX-LÀ SONT ARRIVÉS APRÈS LA POSE, et par une question que j'ai
     passée au lieu de la trancher : « mes mentions légales nomment mana.bzh,
     les voulez-vous ? ». La réponse mesurée des deux côtés est pire que
     l'arbitrage attendu — mana.love n'a de mentions légales NULLE PART, dans
     aucun des deux dépôts, et la page de l'autre app nomme mana.bzh elle
     aussi. Ce n'est pas un choix entre deux pages : c'est un TROU.
     ⛔ Et le remplir avec les mentions d'un autre domaine serait une fausse
        déclaration d'éditeur — la mienne nomme MANA.bzh seize fois. En France
        c'est la LCEN, pas une page de confort. Un faux 200 sur une coquille
        est un défaut ; un éditeur faux est une déclaration.
     ⭐ Une question qu'on passe à qui elle revient trouve parfois un défaut
        qui n'était chez aucun des deux. */
  "/contact": "mana.love doit ses propres mentions d'éditeur ; servir les nôtres déclarerait MANA.bzh éditeur de son domaine",
  "/mentions-legales": "idem — mesuré : notre page nomme MANA.bzh seize fois, et mana.love n'a de mentions légales dans aucun des deux dépôts",
  "/radio": "mesuré : /radio existe DÉJÀ chez elle (trois fichiers), et le fondateur a dit « la radio reste radio »",
};

/**
 * 🔴 ET LES FICHIERS DE RACINE SE SOUSTRAIENT AUSSI — c'est le piège que la
 *    liste des ROUTES ne montre pas.
 *
 * ⚠️ `/sw.js` est le plus grave des trois. Un service worker n'est pas une
 *    page : il est enregistré par la racine et PREND TOUTE LA PORTÉE de
 *    l'hôte. Si Caddy rendait NOTRE `sw.js` sur mana.love, l'enregistrement
 *    de l'application citoyenne recevrait notre fichier — son propre service
 *    worker serait remplacé en silence, et ses écrans perdraient leur cache
 *    hors ligne sans qu'une seule requête échoue. Le coût assumé est que nos
 *    deux écrans n'ont pas de hors-ligne sur mana.love ; c'est le bon sens de
 *    la perte.
 * ⚠️ `/manifest.webmanifest` et `/icon.svg` pour la même raison, en plus
 *    doux : ils nomment et dessinent l'application installée. Les rendre,
 *    c'est faire installer « MANA promenades » à qui installe mana.love.
 */
/* ⭐ IL N'EN RESTE QU'UN, ET C'EST UNE RÉPARATION, PAS UN RECUL — 7/11 au
   soir. Le manifeste et l'icône n'ont plus besoin d'être EXCLUS : ils ont
   DÉMÉNAGÉ sous `app/`, qui est à nous sur les deux hôtes par le préfixe.
   Une exclusion dit « cet hôte ne nous le sert pas » ; le déplacement dit
   « il nous le sert ». La seconde réponse est meilleure — elle rend le
   fichier au lieu de s'accommoder de son absence.
   ⚠️ ET LES COMMENTAIRES VIVENT HORS DES TABLEAUX, pas dedans : le lecteur
      de `scripts/caddy-bloc.mjs` a LEVÉ quand j'en avais mis un à
      l'intérieur. Il a bien fait — un bloc Caddy sorti sans un chemin est
      servi par l'ancien site, sans erreur et sans trace. */
export const FICHIERS_HORS_LOVE = [
  "/sw.js",
] as const;

/** ⭐ La soustraction LÈVE si elle ne retire rien : le jour où un de ces
 *  chemins sera renommé, la liste love le garderait en silence — et un chemin
 *  gardé par erreur a l'air de marcher. */
function sans<T extends string>(liste: readonly T[], retirer: readonly string[], ou: string): T[] {
  for (const r of retirer) {
    if (!(liste as readonly string[]).includes(r)) {
      throw new Error(
        `${ou} : « ${r} » n'est plus dans la liste — la soustraction ne retire ` +
        `plus rien. A-t-il changé de nom ? Corrige l'exclusion plutôt que de ` +
        `la laisser sans effet.`);
    }
  }
  return liste.filter((c) => !retirer.includes(c));
}

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
  "/sw.js",
];

/* ⚠️ LES DEUX DÉRIVÉES VIVENT ICI, APRÈS `FICHIERS_APP`, et non à côté de
   leur commentaire : les écrire plus haut les faisait lire une constante pas
   encore initialisée. Une `const` n'est pas remontée — l'application serait
   tombée au chargement, sur toute la planète, pour une question d'ordre de
   lignes. */
export const ROUTES_LOVE = sans(ROUTES_APP, Object.keys(ROUTES_HORS_LOVE), "ROUTES_LOVE");
export const FICHIERS_LOVE = sans(FICHIERS_APP, FICHIERS_HORS_LOVE, "FICHIERS_LOVE");

/** Ce chemin est-il à nous ? */
export function estANous(chemin: string): boolean {
  if ((ROUTES_APP as readonly string[]).includes(chemin)) return true;
  if (FICHIERS_APP.includes(chemin)) return true;
  return (PREFIXES_APP as readonly string[]).some((p) => chemin.startsWith(p));
}

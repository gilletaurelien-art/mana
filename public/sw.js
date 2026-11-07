// Service worker MANA.bzh — ce qui survit quand le réseau s'arrête.
//
// 🔴 CE FICHIER NE TENAIT PAS SA PROMESSE, ET ÇA SE LISAIT DANS SA PREMIÈRE
//    CONDITION. Mesuré le 30/10/2026 sur le site EN LIGNE : le cache
//    `mana-bzh-v2` portait 12 entrées — la coquille, les bundles, les polices —
//    et NI le graphe, NI les fermetures, NI le fond de carte.
//    La cause : `url.origin !== self.location.origin → return`. L'application
//    est servie par github.io, le graphe par mana.bzh. Deux origines. Tout le
//    cross-origin était donc ignoré, et le compositeur se retrouvait sans
//    chemins dès que le réseau manquait — c'est-à-dire exactement dehors, sur
//    la côte, là où le produit prétend servir.
//    ⭐ Le défaut ne demandait pas un test pour se voir : il demandait de LIRE
//       le fichier. Personne ne l'avait lu depuis qu'il avait été écrit.
//
// 🔴 ET LE SECOND DÉFAUT ÉTAIT L'INVERSE DU PREMIER. `fermetures.json` est de
//    même origine, donc il ÉTAIT mis en cache — mais en `cache-first`. Une
//    fermeture publiée par l'office de tourisme ne serait jamais parvenue à
//    quelqu'un ayant déjà ouvert l'application. Le canal d'alerte, qui est
//    tout l'objet du dispositif, était bloqué par sa propre stratégie de cache.
//
// ⭐ D'OÙ TROIS RÉGIMES, ET ILS NE SE CHOISISSENT PAS PAR COMMODITÉ :
//
//    1. LA COQUILLE (documents)       réseau d'abord, cache en secours.
//       Une mise à jour du site doit être visible au rechargement.
//
//    2. LES BIENS IMMUABLES (assets hachés, polices, graphe du territoire)
//       cache d'abord, revalidation en arrière-plan. Leur nom porte leur
//       version : servir l'ancien une fois n'a aucune conséquence, et c'est
//       ce qui fait tenir le hors-ligne.
//
//    3. LES DONNÉES QUI DÉCIDENT (fermetures) RÉSEAU D'ABORD, toujours, cache
//       en secours. ⛔ Jamais `cache-first` : un arrêté municipal qui n'arrive
//       pas est pire qu'une page lente. Hors ligne on sert la dernière version
//       connue — et l'application AFFICHE sa date, parce qu'une absence de
//       fermeture dans un fichier périmé n'est pas une garantie.
//
// ⚠️ CE QUE CE FICHIER NE FAIT PAS, ET NE PRÉTEND PAS FAIRE : il ne met pas en
//    cache les TUILES de la carte. Elles sont des milliers, elles pèsent des
//    dizaines de mégaoctets, et les promettre serait mentir. Sans réseau, le
//    parcours s'affiche en schéma — comportement spécifié, pas accident.
//    Seule la feuille de style de la carte est gardée, parce qu'elle est unique.

/* ⚠️ v4 — 1/11/2026. Le nom du dossier des bundles est passé de « assets » à
   « app » (il heurtait celui de mana.bzh). Les entrées « /assets/… » des
   caches déjà posés pointent vers des fichiers qui n'existent plus : les
   garder ne servirait à rien et occuperait la place. Le ménage d'activation
   les emporte avec l'ancienne clé. */
/* ⚠️ v6 → v7 LE 7/11 : la liste de pré-cache a changé (le manifeste a
   déménagé sous `app/`). Sans ce changement de nom, `activate` ne supprime
   rien — il ne retire que les caches dont la CLÉ diffère — et l'ancienne
   entrée `./manifest.webmanifest` survivrait sous une adresse que plus
   personne ne demande. */
const CACHE = "mana-bzh-v7";

/* ═══════════════════════════════════════════════════════════════════════
   🔴 CE QUI EST À NOUS — COPIE DE `src/routes.ts`, TENUE PAR UN TEST.
   ═══════════════════════════════════════════════════════════════════════
   Sur mana.bzh, cette application partage l'origine avec 63 885 pages
   d'agrégat servies par l'application historique. Sans cette liste, le
   service worker :
     · mettrait en cache CHAQUE navigation, y compris ces 63 885 pages et
       les réponses en erreur ;
     · et rendrait NOTRE coquille hors ligne à quelqu'un qui demandait
       « les associations à Abbeville ».
   ⭐ Le second défaut est le pire : il a l'air de marcher. Une page
      s'affiche, elle est jolie, et elle ne répond pas à la question posée.
      Hors de nos chemins, on préfère échouer franchement — le navigateur
      dit « hors ligne », ce qui est la vérité.
   ⚠️ Ce fichier est servi tel quel depuis `public/` : il ne peut pas
      importer `src/routes.ts`. D'où la copie, et le test qui la tient. */
const ROUTES_APP = [
  "/", "/carte", "/promenades", "/composer", "/balades-office", "/territoire",
  "/l-application",
  "/reglages", "/contact", "/mentions-legales", "/espace", "/radio",
];
const PREFIXES_APP = ["/promenade/", "/app/", "/paysages/", "/images/"];
const FICHIERS_APP = [
  "/carte-style.json", "/carte-ortho.json", "/fermetures.json",
  "/sw.js",
];

/** ⚠️ Le périmètre peut être « /mana/ » (GitHub Pages) ou « / » (mana.bzh) :
 *  on compare le chemin RELATIF au périmètre, jamais le chemin absolu. */
const BASE = new URL("./", self.location).pathname;
const relatif = (pathname) =>
  pathname.startsWith(BASE) ? pathname.slice(BASE.length - 1) : pathname;

/* 🔴 DEUX VISAGES DEPUIS LE 7/11/2026. mana.love sert la même application,
   SANS l'Office de tourisme : `/balades-office` n'est pas à nous là-bas.
   ⛔ ET C'EST ICI QUE LE DÉFAUT SERAIT LE PIRE. Revendiquer ce chemin sur
      mana.love ferait rendre NOTRE coquille, hors ligne, à quelqu'un qui
      demandait une page de l'autre application — en 200, avec un écran qui
      s'affiche et qui ne répond pas à la question posée. C'est le troisième
      désaccord décrit en tête de ce fichier, et le seul qui ait l'air de
      marcher.
   ⚠️ `self.location.hostname` et non une variable de construction : ce
      fichier est servi TEL QUEL, le même octet pour les deux hôtes. C'est
      l'hôte qui le sert qui décide, pas celui qui l'a construit. */
/* 🔴 REVU LE JOUR MÊME : mana.love N'EST PAS « NOUS MOINS L'OFFICE ». C'est
   l'application citoyenne qui tient cet hôte ; la nôtre n'y entre que par la
   carte et les promenades. La soustraction porte sur CINQ routes et TROIS
   fichiers de racine — la copie des exclusions est tenue par un test, comme
   les listes elles-mêmes.
   ⛔ `/sw.js` EST DANS LA SOUSTRACTION, et c'est le plus grave des trois :
      ce fichier-ci ne devrait même pas être servi sur mana.love, sinon
      l'enregistrement de l'autre application recevrait notre service worker
      et remplacerait le sien en silence. La branche ci-dessous est donc une
      SECONDE serrure — si un jour quelqu'un remet `/sw.js` dans la liste
      blanche du serveur à la main, nous ne revendiquons toujours pas ses
      écrans. */
const ROUTE_OFFICE = "/balades-office";
/* ⚠️ `/contact` et `/mentions-legales` ont rejoint la liste après la pose du
   bloc Caddy : servir nos mentions sous mana.love déclarerait MANA.bzh
   éditeur de son domaine (LCEN). Mesuré : notre page le nomme seize fois. */
const ROUTES_HORS_LOVE = ["/", ROUTE_OFFICE, "/reglages", "/espace", "/radio",
                          "/contact", "/mentions-legales"];
const FICHIERS_HORS_LOVE = ["/sw.js"];
const SANS_OFFICE = self.location.hostname === "mana.love";
const routesDuVisage = () =>
  SANS_OFFICE ? ROUTES_APP.filter((r) => !ROUTES_HORS_LOVE.includes(r)) : ROUTES_APP;
const fichiersDuVisage = () =>
  SANS_OFFICE ? FICHIERS_APP.filter((f) => !FICHIERS_HORS_LOVE.includes(f)) : FICHIERS_APP;

const estANous = (pathname) => {
  const c = relatif(pathname);
  return routesDuVisage().includes(c) || fichiersDuVisage().includes(c)
      || PREFIXES_APP.some((p) => c.startsWith(p));
};

/** Les origines dont on garde les biens. ⚠️ Liste BLANCHE explicite : un
 *  service worker qui mettrait en cache n'importe quelle origine garderait
 *  aussi ce qu'il ne doit pas garder. */
/* ⚠️ mana.love REJOINT LA LISTE — 7/11/2026 : sur cet hôte, nos propres biens
   (bundles, polices, paysages) sont servis depuis `https://mana.love`. Sans
   lui, le service worker n'y garderait RIEN et l'app n'aurait pas de hors
   ligne sur ce domaine. ⭐ Liste blanche explicite : un service worker qui
   garderait n'importe quelle origine garderait aussi ce qu'il ne doit pas. */
const ORIGINES = ["https://mana.bzh", "https://mana.love"];

/** Ce qui décide, et qui doit donc être frais. */
const DONNEES = [
  /\/fermetures\.json$/,
  /* 🔴 LE CATALOGUE DES ITINÉRAIRES N'ÉTAIT GARDÉ PAR RIEN — trouvé le 2/11.
     `src/catalogue.ts` charge `/bretagne/index.json` (la liste), puis
     `/bretagne/t/<slug>.json` (un itinéraire), et `/promenades/communes.json`
     (la recherche par proximité). Le seul motif de graphe était
     `/bretagne/g/…`, qui ne couvre ni `index` ni `t/`. Hors ligne, la liste
     des promenades était donc VIDE — et le hors-ligne est notre argument.
     ⭐ DANS `DONNEES` ET NON `IMMUABLES` : ces fichiers changent au rythme de
        la MOISSON, pas de nos déploiements. Réseau d'abord les garde frais ;
        le cache de secours les rend disponibles. Un cache-first servirait un
        catalogue vieux de trois semaines sans jamais se corriger.
     ⚠️ Et ces chemins sont RECOPIÉS ICI, comme les deux qui ont déjà mordu.
        Un test les relie à `catalogue.ts` et tombe s'ils divergent — c'est la
        seule chose qui tienne une recopie. */
  /\/bretagne\/index\.json$/,
  /\/bretagne\/t\/[^/]+\.json$/,
  /\/promenades\/communes\.json$/,
  /* 🔴 LE MANIFESTE ET L'ICÔNE SONT SOUS `app/` DEPUIS LE 7/11, ET ILS NE
     PORTENT PAS DE HACHAGE DANS LEUR NOM. Or `IMMUABLES` attrape TOUT
     `/app/` — c'est la règle des bundles, qui sont hachés : leur nom change
     quand leur contenu change, donc « garder sans fin » est sans risque.
     ⛔ Appliquée à un nom FIXE, la même règle sert une version périmée.
     ⭐ Ils passent donc par `DONNEES`, qui est consulté AVANT `IMMUABLES` :
        réseau d'abord, cache en secours. Un manifeste pèse 434 octets — le
        coût est nul, et la justification écrite du régime immuable (« le
        nom porte sa version ») redevient vraie pour tout ce qui y reste. */
  /\/app\/manifest\.webmanifest$/,
  /\/app\/icon\.svg$/,
];

/** Ce qui est immuable et lourd : on le garde, on le rafraîchit derrière. */
const IMMUABLES = [
  /* 🔴 « app », PAS « assets » — et ce nom DÉPEND DE `vite.config.ts`.
     Mesuré le 1/11 : en renommant le dossier des bundles pour qu'il ne
     heurte pas celui de mana.bzh, ce motif a cessé de correspondre. Les
     bundles n'étaient plus mis en cache — le hors-ligne restait « armé »,
     et il ne gardait plus l'application elle-même.
     ⭐ Une valeur qui dépend de la cible en dépend PARTOUT, et un service
        worker ne peut pas lire la configuration de construction : il ne
        peut que la RECOPIER. Un test relie les deux et tombe si elles
        divergent — c'est la seule chose qui tienne une recopie. */
  /\/app\//,
  /\/bretagne\/g\/.*\.json$/,   // le graphe d'un territoire
  /* 🔴 LES FEUILLES DE STYLE, PAR LEUR NOM RÉEL — corrigé le 1/11. Ce motif
     disait `/carte/style.json`, qui est le chemin de l'application
     HISTORIQUE. Celle-ci sert `/carte-style.json` et `/carte-ortho.json` :
     le style n'était donc jamais gardé, et hors ligne la carte ne pouvait
     même pas démarrer.
     ⭐ Deuxième motif périmé de la journée, après `/assets/`, et exactement
        la même cause : un chemin RECOPIÉ ici qui a changé ailleurs. D'où le
        passage par `FICHIERS_APP`, la copie que le test tient déjà. */
  new RegExp(`(${FICHIERS_APP.filter((f) => f.endsWith(".json") && f.includes("carte"))
    .map((f) => f.replace(/[./]/g, "\\$&")).join("|")})$`),
  /* 🔴 `avif` AJOUTÉ LE 31/10/2026 — et son absence était une panne muette.
     La bibliothèque photographique sert de l'AVIF en premier choix (`<source
     type="image/avif">`) : sans cette extension, le navigateur recevait bien
     l'image en ligne, mais le service worker ne la gardait pas. Hors ligne,
     les fiches se seraient ouvertes avec leur texte, leur tracé, leurs
     fermetures — et un trou à la place de la photographie.
     ⭐ Un motif d'extensions est une liste blanche : il dit non à tout format
        qu'on n'a pas pensé à y inscrire, et il ne se plaint jamais. Le défaut
        n'apparaît que dans le régime qu'on ne regarde pas — ici, hors ligne,
        c'est-à-dire exactement le régime qui fait notre argument. */
  /\.(woff2?|ttf|svg|png|webp|avif|jpe?g)$/,
];

/**
 * 🔴 LES TUILES, ÉCARTÉES AVANT TOUT LE RESTE — défaut trouvé le 2/11.
 *
 *    L'en-tête de ce fichier promet, en toutes lettres : « il ne met pas en
 *    cache les TUILES de la carte. Elles sont des milliers, elles pèsent des
 *    dizaines de mégaoctets, et les promettre serait mentir. » Le motif
 *    d'extensions d'`IMMUABLES` se termine par `|jpe?g)$` — et une tuile ortho
 *    s'appelle `/carte/ortho/14/8000/5700.jpg`. Elles étaient donc TOUTES
 *    gardées, sans borne, et le commentaire disait le contraire.
 *
 * ⭐ C'EST LE MÊME DÉFAUT QUE LES DEUX MOTIFS PÉRIMÉS DU 1/11, PRIS PAR
 *    L'AUTRE BOUT : là, un motif ne correspondait plus à ce qu'il visait ;
 *    ici, il correspond à ce qu'il ne visait pas. Une liste blanche
 *    d'extensions ne sait pas de quel DOSSIER elle parle.
 * ⚠️ `/carte/` AVEC LES DEUX BARRES : les feuilles de style s'appellent
 *    `/carte-style.json` et `/carte-ortho.json` — un tiret, pas une barre.
 *    Elles restent gardées, et c'est voulu : elles sont uniques.
 */
const TUILES = [/^\/carte\//];

const correspond = (motifs, url) => motifs.some((m) => m.test(url.pathname));

/* 🔴 `./index.html` A QUITTÉ CE PRÉ-CACHE LE 7/11, ET IL N'Y ÉTAIT JAMAIS
   ENTRÉ. Mesuré sur les deux hôtes : `/index.html` répond **301** — le
   serveur le redirige vers `/`. Or `cache.put()` REFUSE une réponse
   redirigée, donc `addAll` rejetait, le rattrapage ci-dessous prenait la
   main, et cette entrée-là échouait seule, en silence.
   ⛔ ET LE REPLI HORS LIGNE ALLAIT LA CHERCHER. `caches.match("./index.html")`
      ne trouvait rien : une navigation hors ligne vers une page jamais
      visitée ne rendait RIEN, alors que le hors-ligne est notre argument.
   ⭐ `./` est la bonne adresse, et c'est la seule : c'est elle qui est
      servie, elle qui est gardée, et elle qui porte la coquille. Une liste
      unique, nommée, sert au pré-cache ET au repli — pour qu'ils ne puissent
      plus désigner des choses différentes.
   ⚠️ Le rattrapage reste, et il reste utile : une entrée manquante ne doit
      pas faire échouer TOUTE l'installation. Mais il EFFAÇAIT une erreur
      réelle — c'est pour ça que la liste est maintenant tenue par un test. */
/**
 * ⛔ ON NE GARDE JAMAIS DU HTML À LA PLACE D'UN ACTIF.
 *
 * 🔴 Trouvé le 2/11 : le bloc Caddy de mana.bzh porte
 *    `try_files {path} {path}/index.html /index.html`, donc un fichier ABSENT
 *    sous `/app/`, `/paysages/` ou `/images/` revient en **HTTP 200 avec la
 *    coquille**. Le garde `res.ok` ne voit rien — c'est bien un 200 — et le
 *    cache se remplit de HTML sous le nom d'un bundle. L'application se
 *    casserait alors hors ligne, durablement, sans aucune erreur.
 * ⭐ C'est le piège « un 200 ne prouve rien sur un site à repli SPA » que ce
 *    dépôt documente déjà, pris du côté du CACHE. Le serveur peut mentir ;
 *    c'est à celui qui garde de vérifier ce qu'il garde.
 * ⚠️ Le contrôle porte sur le TYPE renvoyé, pas sur le statut : c'est la
 *    seule chose qui distingue la coquille de l'actif qu'on demandait.
 */
const estDeLaCoquille = (res) =>
  (res.headers.get("content-type") || "").includes("text/html");

const COQUILLE = "./";
const PRECACHE = [COQUILLE, "./app/manifest.webmanifest", "./fermetures.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    /* 🔴 LE PRÉ-CACHE PASSE PAR LE MÊME GARDE QUE LE RESTE — 7/11 au soir,
       trouvé par une relecture adversariale. `addAll` ne regardait PAS ce
       qu'il gardait, alors que ce fichier définit `estDeLaCoquille` juste
       au-dessus et l'applique aux deux autres régimes.
       ⛔ Or les deux blocs Caddy portent `try_files {path} {path}/index.html
          /index.html` : un fichier manquant sous `/app/` revient en **200
          avec la coquille**, jamais en 404. `addAll` RÉUSSIT donc, le
          rattrapage ne voit rien, et du HTML est gravé sous l'adresse du
          manifeste.
       ⭐ Un garde posé à deux endroits sur trois ne garde pas : c'est
          exactement « compter les points de pose est le geste, pas poser le
          garde ». Chaque entrée est donc demandée, VÉRIFIÉE, puis gardée.
       ⚠️ Et une entrée refusée ne fait pas échouer l'installation : sans
          cette tolérance, un seul chemin absent laisse l'application sans
          cache du tout, et le hors-ligne tombe en silence. */
    caches.open(CACHE).then((c) =>
      Promise.all(PRECACHE.map((u) =>
        fetch(u)
          /* ⛔ LA COQUILLE EST DU HTML, ET C'EST NORMAL. Mon premier jet
             appliquait le garde à TOUTES les entrées : il aurait rejeté
             `./` — la seule page que le hors-ligne sert — et supprimé le
             hors-ligne au lieu de le protéger. ⭐ Le garde ne dit pas « le
             HTML est mauvais » : il dit « du HTML sous le nom d'un BIEN est
             la coquille qu'on nous rend à la place ». Il ne s'applique donc
             qu'aux entrées qui ne sont pas la coquille elle-même. */
          .then((res) => (res.ok && (u === COQUILLE || !estDeLaCoquille(res))
            ? c.put(u, res) : null))
          .catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});



self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const memeOrigine = url.origin === self.location.origin;
  if (!memeOrigine && !ORIGINES.includes(url.origin)) return;

  // ── 1. la coquille : réseau d'abord ───────────────────────────────────────
  /* ⚠️ `endsWith("index.html")` A ÉTÉ RETIRÉ — c'était une branche MORTE, et
     une branche morte se lit comme une intention. `estANous("/index.html")`
     rend faux : ce chemin n'est ni dans `ROUTES_APP` ni dans `FICHIERS_APP`,
     donc la ligne suivante sortait toujours. Elle donnait l'impression de
     couvrir un cas qu'elle ne couvrait pas. */
  if (memeOrigine && req.mode === "navigate") {
    /* ⛔ UNE NAVIGATION QUI N'EST PAS À NOUS N'EST PAS LA NÔTRE À SERVIR.
       On ne la garde pas (elle remplirait le cache de pages d'agrégat), et
       hors ligne on ne rend surtout pas notre coquille à sa place. */
    if (!estANous(url.pathname)) return;
    event.respondWith(
      fetch(req)
        .then((res) => {
          /* ⚠️ `res.ok` : sans ce garde, un 404 ou un 502 se mettait en
             cache et se resservait hors ligne comme s'il était la page. */
          if (res.ok) {
            const copie = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copie));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match(COQUILLE)))
    );
    return;
  }

  /* ⛔ LES TUILES NE PASSENT PAS PAR LE CACHE — avant tout autre aiguillage,
     parce que c'est le motif d'extensions d'`IMMUABLES` qui les attrapait. */
  if (correspond(TUILES, url)) return;

  // ── 2. ce qui décide : réseau d'abord, TOUJOURS ───────────────────────────
  if (correspond(DONNEES, url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !estDeLaCoquille(res)) {
            const copie = res.clone(); caches.open(CACHE).then((c) => c.put(req, copie));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // ── 3. l'immuable et le lourd : cache d'abord, revalidation derrière ──────
  if (correspond(IMMUABLES, url)) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const reseau = fetch(req)
          .then((res) => {
            if (res.ok && !estDeLaCoquille(res)) {
              const copie = res.clone(); caches.open(CACHE).then((c) => c.put(req, copie));
            }
            return res;
          })
          .catch(() => hit);          // hors ligne : la version gardée fait l'affaire
        return hit || reseau;
      })
    );
    return;
  }

  // ── le reste (les tuiles) : réseau seul. On ne promet pas de les garder.
});

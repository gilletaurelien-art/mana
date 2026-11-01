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
const CACHE = "mana-bzh-v6";

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
  "/", "/carte", "/promenades", "/composer", "/territoire",
  "/reglages", "/contact", "/mentions-legales", "/espace", "/radio",
];
const PREFIXES_APP = ["/promenade/", "/app/", "/paysages/", "/images/"];
const FICHIERS_APP = [
  "/carte-style.json", "/carte-ortho.json", "/fermetures.json",
  "/icon.svg", "/manifest.webmanifest", "/sw.js",
];

/** ⚠️ Le périmètre peut être « /mana/ » (GitHub Pages) ou « / » (mana.bzh) :
 *  on compare le chemin RELATIF au périmètre, jamais le chemin absolu. */
const BASE = new URL("./", self.location).pathname;
const relatif = (pathname) =>
  pathname.startsWith(BASE) ? pathname.slice(BASE.length - 1) : pathname;

const estANous = (pathname) => {
  const c = relatif(pathname);
  return ROUTES_APP.includes(c) || FICHIERS_APP.includes(c)
      || PREFIXES_APP.some((p) => c.startsWith(p));
};

/** Les origines dont on garde les biens. ⚠️ Liste BLANCHE explicite : un
 *  service worker qui mettrait en cache n'importe quelle origine garderait
 *  aussi ce qu'il ne doit pas garder. */
const ORIGINES = ["https://mana.bzh"];

/** Ce qui décide, et qui doit donc être frais. */
const DONNEES = [/\/fermetures\.json$/];

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

const correspond = (motifs, url) => motifs.some((m) => m.test(url.pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(["./", "./index.html", "./manifest.webmanifest", "./fermetures.json"])
        // ⚠️ Une entrée manquante ne doit pas faire échouer TOUTE l'installation :
        //    sans ce rattrapage, un seul 404 laisse l'application sans cache du
        //    tout, et le hors-ligne tombe en silence.
        .catch(() => Promise.all(
          ["./", "./index.html", "./manifest.webmanifest", "./fermetures.json"]
            .map((u) => c.add(u).catch(() => null))
        ))
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
  if (memeOrigine && (req.mode === "navigate" || url.pathname.endsWith("index.html"))) {
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
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  // ── 2. ce qui décide : réseau d'abord, TOUJOURS ───────────────────────────
  if (correspond(DONNEES, url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copie = res.clone(); caches.open(CACHE).then((c) => c.put(req, copie)); }
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
            if (res.ok) { const copie = res.clone(); caches.open(CACHE).then((c) => c.put(req, copie)); }
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

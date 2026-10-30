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

const CACHE = "mana-bzh-v3";

/** Les origines dont on garde les biens. ⚠️ Liste BLANCHE explicite : un
 *  service worker qui mettrait en cache n'importe quelle origine garderait
 *  aussi ce qu'il ne doit pas garder. */
const ORIGINES = ["https://mana.bzh"];

/** Ce qui décide, et qui doit donc être frais. */
const DONNEES = [/\/fermetures\.json$/];

/** Ce qui est immuable et lourd : on le garde, on le rafraîchit derrière. */
const IMMUABLES = [
  /\/assets\//,
  /\/bretagne\/g\/.*\.json$/,   // le graphe d'un territoire
  /\/carte\/style\.json$/,
  /\.(woff2?|ttf|svg|png|webp)$/,
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
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copie = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copie));
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

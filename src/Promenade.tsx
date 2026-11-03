import { useEffect, useState, lazy, Suspense } from "react";
import { baseUrl } from "./router";
import { WALKS, distAuTrace, distM, effortLisible, MENTION } from "./walks";
import { chargerItineraire } from "./catalogue";
import type { Walk } from "./walks";
import type { WalkPoint } from "./walks";
import { WalkMap } from "./WalkMap";
import { CarteOuSchema } from "./CarteOuSchema";
import { ProchaineEtape } from "./ProchaineEtape";
// ⚠️ CHARGÉE À LA DEMANDE, et ce n'est pas une optimisation de confort :
//    maplibre pèse ~900 Ko. Importée normalement, elle partait dans le bundle
//    d'ACCUEIL — 1,29 Mo au premier écran, pour une carte que l'accueil
//    n'affiche même pas. Elle ne descend que lorsqu'on ouvre un parcours.
const CarteReelle = lazy(() =>
  import("./CarteReelle").then((m) => ({ default: m.CarteReelle }))
);

// Page promenade : GPS navigateur (position + boussole), alerte
// export GPX, SOS, et un REPÈRE hors-sentier — plus une alerte.
//
// 🔴 LE TÉLÉPHONE VIBRAIT POUR VOUS RAPPELER À L'ORDRE, ET C'ÉTAIT UNE FAUTE
//    DE FOND. Au-delà de 50 m du tracé, l'app affichait « Alerte
//    hors-sentier — revenez vers le sentier » et déclenchait `vibrate(200)`.
//    ⭐ Une vibration est une SOMMATION. Or on ne suit pas une promenade, on
//       la prend : les gens coupent, changent d'avis, font une moitié un
//       jour et l'autre un autre jour, prennent le chemin qu'ils veulent.
//       Un parcours proposé n'est pas un itinéraire à exécuter, et sortir du
//       tracé n'est pas une erreur — c'est le propre de la flânerie.
//    ⚠️ Mais un FAIT reste utile près des falaises bretonnes : « vous n'êtes
//       plus sur un chemin cartographié ». On le dit une fois, sans vibrer,
//       sans « revenez », et sans `role="alert"` — ce n'en est pas une.
// Tout client-side — zéro backend, zéro réseau en course.

/** ⚠️ 50 m disait « vous déviez » ; 120 m dit « vous n'êtes plus sur un
 *  chemin ». La première distance juge un écart, la seconde constate un
 *  fait — et seule la seconde est une information. */
const HORS_SENTIER_M = 120;

/** Les erreurs de géolocalisation, dites en français et de façon utile. */
function messageGps(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED)
    return "Vous avez refusé l'accès à votre position. Le parcours reste consultable ; pour vous situer dessus, autorisez la localisation dans les réglages de votre navigateur.";
  if (err.code === err.POSITION_UNAVAILABLE)
    return "Position introuvable pour l'instant — c'est fréquent sous les falaises ou en intérieur. Le parcours reste affiché.";
  if (err.code === err.TIMEOUT)
    return "Le GPS met trop de temps à répondre. Réessayez à l'air libre.";
  return "GPS indisponible.";
}

/* ⚠️ Le type s'élargit à `Walk` — le compositeur produit une promenade qui
   n'est dans aucun catalogue, et elle a le même droit au GPX. Les trois
   gardes de ce fichier (attribution DANS le fichier, aucune altitude
   inventée, licence nommée) valent exactement pareil pour elle. */
export function enGpx(walk: Walk): string {
  // ⛔ TOUJOURS AUCUNE BALISE D'ÉLÉVATION, ET LA RAISON A CHANGÉ LE 3/11/2026.
  //    Avant : nous n'avions aucune altitude. Depuis : nous l'avons au MOMENT
  //    DE BÂTIR le graphe, et le dénivelé y est stocké PAR ARÊTE — dz et
  //    montée cumulée. Mais `walk.points` est une polyligne, et aucun de ses
  //    points ne porte son altitude : la poser demanderait de stocker 78 363
  //    altitudes de nœuds dans le graphe servi (~10 % de plus à télécharger).
  // ⭐ Donc on n'en met pas — pas par manque de donnée, par refus d'en
  //    inventer une par interpolation. La montée TOTALE, elle, est connue et
  //    voyage dans la description : c'est le chiffre qui sert à décider.
  // ⚠️ ET CE COMMENTAIRE EST ÉCRIT EN `//` À DESSEIN. Le garde
  //    « aucune altitude inventée » écarte les lignes commençant par `//`,
  //    `*` ou `/*` ; un bloc dont les lignes de suite commencent par du texte
  //    y échappe, et mon premier jet s'est fait attraper par le piège que le
  //    garde documente lui-même. ⭐ Un fichier qui explique pourquoi il n'a
  //    pas quelque chose contient le nom de cette chose.
  const pts = walk.points
    .map((p) => `      <trkpt lat="${p.lat}" lon="${p.lon}" />`)
    .join("\n");
  /* ⚠️ DEUX MENTIONS QUI MENTAIENT POUR UNE PROMENADE COMPOSÉE — trouvées le
     2/11, dans un fichier qui VOYAGE : il s'ouvre dans une montre six mois
     plus tard, loin de la page qui pouvait le corriger.
       · « Référence : . » — `osmRef` est vide pour un parcours composé, qui
         n'est l'objet OSM de personne. Une référence vide se tait ; elle ne
         s'écrit pas avec un point.
       · « Le tracé sur OpenStreetMap » pointait sur la page de LICENCE, parce
         que c'est ce que `osmUrl` vaut pour une composition. Le lien promettait
         le tracé et donnait le texte juridique.
     ⭐ L'attribution, elle, était déjà juste — c'est l'exactitude de ce qui
        l'accompagne qui ne l'était pas. Un fichier qui porte une licence
        correcte et deux affirmations fausses n'est pas à moitié honnête. */
  const LIEN = {
    trace: "Le tracé sur OpenStreetMap",
    licence: "La licence des données (ODbL)",
  };

  /* 🔴 L'ATTRIBUTION VOYAGE DANS LE FICHIER, PAS SEULEMENT À L'ÉCRAN. Un GPX
     se télécharge, se réexpédie, s'ouvre dans une montre six mois plus tard —
     à ce moment-là, la page qui portait « © OpenStreetMap, ODbL » n'est plus
     là. La licence ODbL demande que l'attribution suive la DONNÉE ; un
     crédit affiché seulement sur la page qui l'exporte ne suit rien.
     ⚠️ `<copyright>` et `<desc>` : la première est lue par les outils, la
        seconde par les humains. Les deux, parce qu'aucune n'atteint les deux. */
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="mana.bzh"
     xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${walk.titre}</name>
    <desc>${MENTION[walk.provenance]}. Tracé d'après OpenStreetMap. © les contributeurs d'OpenStreetMap, sous licence ODbL (opendatacommons.org/licenses/odbl/).${walk.osmRef ? ` Référence : ${walk.osmRef}.` : ""}${walk.monteeM != null ? ` Montée cumulée : ${walk.monteeM} m (modèle d'altitude SRTM, 30 m).` : ""} Pas d'altitude par point : ce fichier n'en porte aucune plutôt qu'une interpolée.</desc>
    <copyright author="les contributeurs d'OpenStreetMap">
      <license>https://opendatacommons.org/licenses/odbl/1-0/</license>
    </copyright>
    <link href="${walk.osmUrl}"><text>${LIEN[walk.provenance === "compose" ? "licence" : "trace"]}</text></link>
  </metadata>
  <trk><name>${walk.titre}</name><trkseg>
${pts}
  </trkseg></trk>
</gpx>`;
}

export function telecharger(nom: string, contenu: string, type: string) {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

function PromenadeEnChemin() {
  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Promenade</p>
        <h1 className="page-titre"><span>Chargement…</span></h1>
      </div>
    </main>
  );
}

function PromenadeInconnue({ slug }: { slug: string }) {
  const B = baseUrl();
  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Introuvable</p>
        <h1 className="page-titre"><span>Cette promenade n'existe pas</span></h1>
        <section className="page-panel">
          <p className="page-intro">
            Aucun parcours ne porte le nom « {slug} ». Il a pu être renommé
            après une mise à jour des tracés.
          </p>
          <div className="est-actions">
            <a className="btn btn-primary" href={`${B}/promenades`}>
              Voir toutes les promenades
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

export function Promenade({ slug }: { slug: string }) {
  const B = baseUrl();
  // 🔴 AVANT, UN SLUG INCONNU RENDAIT `WALKS[0]` : la page affichait une AUTRE
  //    promenade sans rien dire. C'est le mode de panne le plus coûteux — une
  //    page cassée se voit, une page qui montre le mauvais endroit se croit.
  //    Et il est devenu probable le 28/10 : les numéros de portion des tracés
  //    ont été renumérotés par la remoisson, donc tout lien figé pointe
  //    potentiellement ailleurs.
  // ⭐ DEUX SOURCES, DEUX RÔLES — ce n'est pas une duplication.
  //    L'EMBARQUÉ (les quatre de Crozon) s'affiche instantanément et SANS
  //    RÉSEAU : c'est la vitrine, et c'est ce qui tient la promesse hors ligne.
  //    Le DISTANT est le catalogue de la France entière, trop lourd pour le
  //    bundle (~26 600 tracés, plus de 100 Mo).
  const embarquee = WALKS.find((w) => w.slug === slug);
  const [distante, setDistante] = useState<Walk | null>(null);
  const [cherche, setCherche] = useState(!embarquee);

  useEffect(() => {
    if (embarquee) return;
    let vivant = true;
    setCherche(true);
    chargerItineraire(slug)
      .then((w) => vivant && setDistante(w))
      .catch(() => vivant && setDistante(null))
      .finally(() => vivant && setCherche(false));
    return () => { vivant = false; };
  }, [slug, embarquee]);

  const walk = embarquee ?? distante;
  // ⛔ PAS DE RETOUR ANTICIPÉ ICI : des hooks le suivent, et React compte les
  //    hooks d'un rendu à l'autre. Une première version sortait à cet endroit —
  //    « Minified React error #310 », page ENTIÈREMENT BLANCHE, alors que la
  //    donnée arrivait en 200. ⭐ Une page blanche accuse la donnée ; c'était
  //    l'ordre des hooks. Le garde est descendu après TOUS les hooks.

  const [moi, setMoi] = useState<WalkPoint | null>(null);
  const [cap, setCap] = useState<number | null>(null);
  const [horsSentier, setHorsSentier] = useState(false);
  const [gpsErreur, setGpsErreur] = useState("");
  const [horsLigne, setHorsLigne] = useState(!navigator.onLine);

  useEffect(() => {
    if (!walk) return;
    /* 🔴 AUCUNE RESTAURATION, ET C'EST LE CORRECTIF. Cet effet rendait le
       titre par défaut en se démontant — et cette restauration s'exécutait
       APRÈS l'effet de App.tsx qui venait de poser le titre de la page
       SUIVANTE. Mesuré en production le 1/11 : `/radio` affiche son titre à
       froid, et retombe au titre d'accueil quand on y revient depuis une
       fiche de balade.
       ⭐ DEUX ÉCRIVAINS POUR UNE VALEUR, ET L'ORDRE NE NOUS APPARTIENT PAS.
          C'est la leçon du Caddyfile du même jour, transposée à React : on
          ne corrige pas en espérant un ordre, on retire le second écrivain.
          La table de App.tsx repose le titre à CHAQUE changement d'adresse ;
          il n'y a rien à restaurer. */
    document.title = `${walk.titre} — Promenades MANA.bzh`;
  }, [walk?.titre]);

  useEffect(() => {
    const on = () => setHorsLigne(false);
    const off = () => setHorsLigne(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // GPS : watchPosition — continu, précision haute.
  useEffect(() => {
    // ⚠️ `walk` peut être encore absent : la promenade distante n'est pas
    //    arrivée. On ne surveille pas une position contre un tracé inexistant.
    if (!walk) return;
    if (!("geolocation" in navigator)) {
      setGpsErreur("Géolocalisation non disponible sur cet appareil.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p: WalkPoint = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        setMoi(p);
        setCap(pos.coords.heading ?? null);

        const d = distAuTrace(p, walk.points);
        setHorsSentier(d > HORS_SENTIER_M);
        // ⛔ PLUS DE VIBRATION. Elle rappelait à l'ordre quelqu'un qui n'avait
        //    rien fait de mal.

      },
      // ⛔ NE PAS AFFICHER `err.message` : le navigateur le rend dans SA
      //    langue, et en anglais la plupart du temps. Relevé en ligne le
      //    28/10 sur la fiche Cap Fréhel : « User denied Geolocation »,
      //    affiché tel quel au promeneur. ⭐ Un message d'erreur emprunté à
      //    une bibliothèque parle toujours la langue de la bibliothèque.
      (err) => setGpsErreur(messageGps(err)),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [walk]);

  // Boussole : deviceorientation (mobiles avec capteur magnétique).
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const h = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof h === "number") setCap(h);
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, []);

  // Le garde, désormais APRÈS tous les hooks (voir plus haut).
  if (!walk) return cherche ? <PromenadeEnChemin /> : <PromenadeInconnue slug={slug} />;

  const sosHref = moi
    ? `sms:112?&body=${encodeURIComponent(
        `Urgence — ma position GPS : ${moi.lat.toFixed(5)}, ${moi.lon.toFixed(5)} — parcours ${walk.titre} (mana.bzh).`
      )}`
    : "sms:112";

  return (
    <main className="page">
      <div className="wrap">
        {/* ── ÉCRAN 4 · LE BANDEAU « EN CHEMIN » ──────────────────────────
            ⭐ EN TÊTE, AVANT LE TITRE, et c'est tout l'écart entre lire une
               fiche et marcher. Quelqu'un qui a le téléphone en main sur le
               sentier ne cherche pas le nom du parcours — il le connaît : il
               cherche ce qui vient. Le reste de la page ne bouge pas, mais la
               première chose qu'on voit, oui. */}
        <ProchaineEtape walk={walk} moi={moi} />
        <p className="hero-label">Promenade</p>
        <h1 className="page-titre"><span>{walk.titre}</span></h1>

        <section className="page-panel">
          {walk.resume && <p className="page-intro">{walk.resume}</p>}
          <p className="page-note">
            {walk.distanceKm} km · {effortLisible(walk.distanceKm)} ·{" "}
            {walk.boucle ? "boucle" : "aller simple"}. Estimation à 3,5 km/h.
          </p>
          <p className={`fiche-provenance fiche-provenance-${walk.provenance}`}>
            {MENTION[walk.provenance]}
          </p>
          <p className="page-note">
            {/* ⛔ On ne dit PAS la difficulté, l'accès poussette/PMR ni les
                chiens : OpenStreetMap ne les porte pas pour ce sentier, et une
                case « facile » inventée envoie quelqu'un sur une falaise. */}
            Tracé issu d'<a href={walk.osmUrl}>OpenStreetMap</a> (ODbL).
            Difficulté, accessibilité, chiens : non renseignés à la source,
            donc non affichés.
          </p>
          <div className="est-actions" style={{ marginTop: "var(--sp-2)" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => telecharger(`${walk.slug}.gpx`, enGpx(walk), "application/gpx+xml")}
            >
              Exporter en GPX
            </button>
            <a className="btn btn-primary" href={sosHref}>
              SOS — partager ma position
            </a>
          </div>
        </section>

        {horsLigne && (
          <section className="page-panel">
            <p className="apercu-label">Hors ligne</p>
            <p className="page-texte">
              Vous êtes hors ligne. La carte et le parcours restent
              disponibles : ils sont mis en cache par le service worker.
            </p>
          </section>
        )}

        {horsSentier && (
          <section className="page-panel hors-sentier">
            <p className="apercu-label">Vous avez quitté le tracé</p>
            <p className="page-texte">
              C'est votre droit le plus strict — un parcours se prend, il ne
              se suit pas. Sachez seulement que vous n'êtes plus sur un chemin
              cartographié : par ici les falaises sont proches et les sentiers
              fragiles.
            </p>
          </section>
        )}

        {gpsErreur && (
          <section className="page-panel">
            <p className="apercu-label">GPS</p>
            <p className="page-texte">{gpsErreur}</p>
          </section>
        )}

        <section className="page-panel">
          <p className="apercu-label">Carte</p>
          {/* Hors ligne, les tuiles ne viennent pas : on retombe sur le
              schéma SVG, qui ne dépend que du tracé déjà embarqué. */}
          {horsLigne ? (
            <WalkMap walk={walk} moi={moi} capDeg={cap} />
          ) : (
            // ⚠️ `horsLigne` ne suffit pas : `navigator.onLine` peut dire vrai
            //    alors que le morceau de carte n'est pas en cache et que le
            //    réseau est trop mauvais pour l'obtenir. Le repli doit tenir à
            //    l'ÉCHEC, pas au seul drapeau.
            <CarteOuSchema schema={<WalkMap walk={walk} moi={moi} capDeg={cap} />}>
              <CarteReelle walk={walk} moi={moi} />
            </CarteOuSchema>
          )}
          <p className="page-note">
            {moi
              ? `Position GPS : ${moi.lat.toFixed(5)}, ${moi.lon.toFixed(5)}` + (cap !== null ? ` · cap ${Math.round(cap)}°` : "")
              : "En attente du signal GPS…"}
          </p>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Ce que vous croiserez</p>
          {/* ⚠️ DANS L'ORDRE DE LA MARCHE (champ `pos`), jamais par distance :
              sous un titre qui annonce une séquence, un tri par proximité
              ment. Et aucune narration inventée — seulement le nom porté par
              OpenStreetMap. */}
          <ol className="etapes">
            {walk.etapes.map((e) => (
              <li key={e.nom}>
                <strong>{e.nom}</strong>
                <span className="etape-cat">{e.categorie.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Marées, météo, praticabilité</p>
          <p className="page-texte">
            Les horaires de marée, la météo marine et l'état du sentier
            exigent des sources temps réel fiables (SHOM, Météo-France).
            Ces modules sont en sommeil : aucune donnée simulée ne sera
            affichée. Avant de partir, consultez les canaux officiels.
          </p>
        </section>

        <div className="est-actions">
          <a className="btn btn-ghost" href={`${B}/promenades`}>
            Toutes les promenades
          </a>
          <a className="btn btn-primary" href={`${B}/`}>
            Retour à l'accueil
          </a>
        </div>
      </div>
    </main>
  );
}

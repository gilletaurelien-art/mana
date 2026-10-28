import { useEffect, useState, lazy, Suspense } from "react";
import { baseUrl } from "./router";
import { WALKS, distAuTrace, distM, effortLisible } from "./walks";
import { chargerItineraire } from "./catalogue";
import type { Walk } from "./walks";
import type { WalkPoint } from "./walks";
import { WalkMap } from "./WalkMap";
// ⚠️ CHARGÉE À LA DEMANDE, et ce n'est pas une optimisation de confort :
//    maplibre pèse ~900 Ko. Importée normalement, elle partait dans le bundle
//    d'ACCUEIL — 1,29 Mo au premier écran, pour une carte que l'accueil
//    n'affiche même pas. Elle ne descend que lorsqu'on ouvre un parcours.
const CarteReelle = lazy(() =>
  import("./CarteReelle").then((m) => ({ default: m.CarteReelle }))
);

// Page promenade : GPS navigateur (position + boussole), alerte
// hors-sentier à 50 m, export GPX, SOS.
// Tout client-side — zéro backend, zéro réseau en course.

const HORS_SENTIER_M = 50;

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

function enGpx(walk: (typeof WALKS)[number]): string {
  // ⛔ PAS DE <ele> : nous n'avons AUCUNE altitude. Un GPX qui en porterait
  //    une inventée tromperait la montre du promeneur, pas seulement l'écran.
  const pts = walk.points
    .map((p) => `      <trkpt lat="${p.lat}" lon="${p.lon}" />`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="mana.bzh">
  <trk><name>${walk.titre}</name><trkseg>
${pts}
  </trkseg></trk>
</gpx>`;
}

function telecharger(nom: string, contenu: string, type: string) {
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
        <h1 className="page-titre">Chargement…</h1>
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
        <h1 className="page-titre">Cette promenade n'existe pas</h1>
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
    document.title = `${walk.titre} — Promenades MANA.bzh`;
    return () => {
      document.title = "MANA.bzh — Promenades & découvertes en Bretagne";
    };
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
        if (d > HORS_SENTIER_M && navigator.vibrate) navigator.vibrate(200);

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
        <p className="hero-label">Promenade</p>
        <h1 className="page-titre">{walk.titre}</h1>

        <section className="page-panel">
          {walk.resume && <p className="page-intro">{walk.resume}</p>}
          <p className="page-note">
            {walk.distanceKm} km · {effortLisible(walk.distanceKm)} ·{" "}
            {walk.boucle ? "boucle" : "aller simple"}. Estimation à 3,5 km/h.
          </p>
          <p className="page-note">
            {/* ⛔ On ne dit PAS la difficulté, l'accès poussette/PMR ni les
                chiens : OpenStreetMap ne les porte pas pour ce sentier, et une
                case « facile » inventée envoie quelqu'un sur une falaise. */}
            Tracé réel issu d'<a href={walk.osmUrl}>OpenStreetMap</a> (ODbL).
            Difficulté, accessibilité et accueil des chiens ne sont pas
            renseignés à la source : nous ne les affichons pas.
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
          <section className="page-panel hors-sentier" role="alert">
            <p className="apercu-label">Alerte hors-sentier</p>
            <p className="page-texte">
              Vous êtes à plus de {HORS_SENTIER_M} m du tracé. Revenez
              vers le sentier — sentiers fragiles, falaises proches.
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
            <Suspense fallback={<WalkMap walk={walk} moi={moi} capDeg={cap} />}>
              <CarteReelle walk={walk} moi={moi} />
            </Suspense>
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

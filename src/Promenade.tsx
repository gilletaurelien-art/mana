import { useEffect, useState } from "react";
import { baseUrl } from "./router";
import { WALKS, distAuTrace, distM } from "./walks";
import type { WalkPoint } from "./walks";
import { WalkMap } from "./WalkMap";
import { AltitudeProfile } from "./Altitude";
import {
  IconHorloge,
  IconDistance,
  IconRelief,
  IconTele,
  IconSecours,
  IconAlerte,
  IconCoeur,
  iconPourCategorie,
} from "./Icons";

// Écran 3 (fiche éditoriale) + écran 4 (marche) + écran 5 (rencontres).
// GPS navigateur : position + boussole, alerte hors-sentier 50 m,
// export GPX, SOS préparé. Tout client-side — zéro backend.

const HORS_SENTIER_M = 50;

function enGpx(walk: (typeof WALKS)[number]): string {
  const pts = walk.points
    .map((p) => `      <trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.ele}</ele></trkpt>`)
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

export function Promenade({ slug }: { slug: string }) {
  const walk = WALKS.find((w) => w.slug === slug) ?? WALKS[0];
  const B = baseUrl();

  const [moi, setMoi] = useState<WalkPoint | null>(null);
  const [cap, setCap] = useState<number | null>(null);
  const [horsSentier, setHorsSentier] = useState(false);
  const [gpsErreur, setGpsErreur] = useState("");
  const [horsLigne, setHorsLigne] = useState(!navigator.onLine);

  useEffect(() => {
    document.title = `${walk.titre} — MANA`;
    return () => {
      document.title = "MANA — La porte d'entrée de l'écosystème MANA en Bretagne";
    };
  }, [walk.titre]);

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
    if (!("geolocation" in navigator)) {
      setGpsErreur("Géolocalisation non disponible sur cet appareil.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p: WalkPoint = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          ele: pos.coords.altitude ?? 0,
        };
        setMoi(p);
        setCap(pos.coords.heading ?? null);
        const d = distAuTrace(p, walk.points);
        setHorsSentier(d > HORS_SENTIER_M);
        if (d > HORS_SENTIER_M && navigator.vibrate) navigator.vibrate(200);
      },
      (err) => setGpsErreur(err.message || "GPS indisponible."),
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

  const sosHref = moi
    ? `sms:?&body=${encodeURIComponent(
        `Urgence — ma position GPS : ${moi.lat.toFixed(5)}, ${moi.lon.toFixed(5)} — parcours ${walk.titre} (mana.bzh).`
      )}`
    : "sms:?";

  // Prochain point de rencontre (écran 4 : « à 800 m »)
  const prochain = moi
    ? walk.waypoints
        .map((w) => ({ w, d: distM(moi, w.point) }))
        .sort((a, b) => a.d - b.d)[0]
    : null;

  return (
    <main className="fiche">
      {/* ===== Couverture immersive ===== */}
      <div className="fiche-couverture">
        <div className="wrap">
          <a className="fiche-retour" href={`${B}/promenades`}>
            ← Explorer
          </a>
          <h1 className="fiche-titre">{walk.titre}</h1>
          <p className="fiche-lieu">{walk.lieu}</p>
          <div className="fiche-meta">
            <div className="fiche-meta-item">
              <span className="fiche-meta-val">{walk.distanceKm} km</span>
              <span className="fiche-meta-lbl">Distance</span>
            </div>
            <div className="fiche-meta-item">
              <span className="fiche-meta-val">{walk.dureeH} h</span>
              <span className="fiche-meta-lbl">Durée</span>
            </div>
            <div className="fiche-meta-item">
              <span className="fiche-meta-val">{walk.difficulte}</span>
              <span className="fiche-meta-lbl">Difficulté</span>
            </div>
            <div className="fiche-meta-item">
              <span className="fiche-meta-val">{walk.boucle ? "boucle" : "A/R"}</span>
              <span className="fiche-meta-lbl">Forme</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fiche-corps">
        {/* ===== Corps éditorial ===== */}
        <section className="fiche-section">
          <p className="fiche-label">La promenade</p>
          <p className="fiche-texte">{walk.resume}</p>
          <p className="page-note">
            {walk.poussettePmr ? "Accessible poussette/PMR" : "Non accessible PMR"} ·
            chiens {walk.chiens}. Tracé indicatif (prototype) : avant
            publication, le tracé officiel (IGN) sera sourcé.
          </p>
        </section>

        {/* ===== Écran 4 : navigation en marche ===== */}
        <section className="fiche-section">
          <p className="fiche-label">En marche</p>
          <div className="marche-grille">
            <div className="marche-panneau">
              <div className="marche-statut">
                <span className={`statut-point ${horsLigne ? "hors-ligne" : ""} ${horsSentier ? "alerte" : ""}`} />
                <span style={{ fontSize: "var(--text-s)", fontWeight: 600 }}>
                  {horsSentier ? "Hors sentier — revenez vers le tracé" : horsLigne ? "Hors ligne — le parcours reste dans la poche" : "Signal GPS actif"}
                </span>
              </div>
              <div className="marche-chiffres">
                <div className="chiffre">
                  <span className="chiffre-val">{moi ? `${moi.lat.toFixed(4)}, ${moi.lon.toFixed(4)}` : "—"}</span>
                  <span className="chiffre-lbl">{gpsErreur ? gpsErreur : "Position"}</span>
                </div>
                <div className="chiffre">
                  <span className="chiffre-val">{cap !== null ? `${Math.round(cap)}°` : "—"}</span>
                  <span className="chiffre-lbl">Cap</span>
                </div>
              </div>
              {prochain && moi && (
                <p style={{ marginTop: "var(--sp-3)", fontWeight: 600, fontSize: "var(--text-m)" }}>
                  {iconPourCategorie(prochain.w.nom, { size: 16 })}{" "}
                  {prochain.w.nom}{" "}
                  <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                    à {Math.round(prochain.d)} m
                  </span>
                </p>
              )}
            </div>
            <div className="marche-panneau">
              <WalkMap walk={walk} moi={moi} capDeg={cap} />
            </div>
          </div>
        </section>

        {/* ===== Alerte fermeture (terre cuite, jamais neutre) ===== */}
        <section className="fiche-section">
          <div className="alerte-reglementaire" role="note">
            <IconAlerte size={20} />
            <div>
              <p className="alerte-titre">Fermeture du GR34 — Aber / Postolonnec</p>
              <p className="alerte-texte">
                Effondrement de falaise : sentier côtier fermé par arrêté
                municipal depuis février 2026. Consultez les informations
                officielles avant de partir.
              </p>
              <span className="alerte-source">Source : arrêté municipal — commune de Crozon</span>
            </div>
          </div>
        </section>

        {/* ===== Altitude ===== */}
        <section className="fiche-section">
          <p className="fiche-label">Profil d'altitude</p>
          <div className="fiche-altitude">
            <AltitudeProfile points={walk.points} />
          </div>
        </section>

        {/* ===== Écran 5 : ce qu'on rencontre ===== */}
        <section className="fiche-section">
          <p className="fiche-label">Sur votre chemin — {walk.waypoints.length} lieux</p>
          <p className="page-note" style={{ marginBottom: "var(--sp-3)" }}>
            Dans l'ordre réel de la marche. Pas de détour : si c'est listé,
            on passe devant.
          </p>
          <div className="rencontres">
            {walk.waypoints.map((w, i) => (
              <div key={w.nom} className="rencontre">
                <span className="rencontre-pos">{String(i + 1).padStart(2, "0")}</span>
                <div className="rencontre-infos">
                  <p className="rencontre-nom">{w.nom}</p>
                  <p className="rencontre-type">{w.audio}</p>
                </div>
                <span className="rencontre-cat">Rencontre</span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Sources honnêtes ===== */}
        <section className="fiche-section">
          <p className="fiche-label">Marées, météo, praticabilité</p>
          <p className="fiche-texte" style={{ fontSize: "var(--text-s)" }}>
            Les horaires de marée, la météo marine et l'état du sentier
            exigent des sources temps réel fiables (SHOM, Météo-France).
            Aucune donnée simulée : consultez les canaux officiels avant
            de partir.
          </p>
        </section>
      </div>

      {/* ===== Barre d'action flottante ===== */}
      <div className="fiche-barre">
        <button
          type="button"
          className="btn btn-ligne"
          onClick={() => telecharger(`${walk.slug}.gpx`, enGpx(walk), "application/gpx+xml")}
        >
          <IconTele size={15} /> GPX
        </button>
        <a className="btn btn-ocre" href={sosHref}>
          <IconSecours size={15} /> SOS
        </a>
        <a className="btn btn-plein" href={`${B}/promenades`}>
          <IconCoeur size={15} /> Explorer
        </a>
      </div>
    </main>
  );
}

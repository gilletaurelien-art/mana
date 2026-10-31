/**
 * ÉCRAN 4 — EN CHEMIN. Celui qu'on lit debout, une main sur le téléphone.
 *
 * ⭐ TOUT Y EST DIMENSIONNÉ POUR UN BRAS TENDU AU SOLEIL : une information
 *    principale, des cibles de 56 px, un fond sombre sous le texte clair.
 *    Les six panneaux de l'ancienne page de navigation demandaient de lire ;
 *    ici on demande de JETER UN COUP D'ŒIL. Ce n'est pas la même interface,
 *    et ce n'était pas la même question.
 *
 * ⛔ CE QUI EST VITAL A ÉTÉ REPRIS, PAS ABANDONNÉ : l'appel d'urgence avec
 *    position, et le repère hors-sentier. Remplacer un écran de marche sans
 *    emporter ses fonctions de sécurité serait la pire régression possible —
 *    invisible tant que tout va bien.
 *
 * 🔴 ET « METTRE EN PAUSE » FAIT QUELQUE CHOSE DE RÉEL. La maquette dessine ce
 *    bouton ; il n'y a aucun enregistrement à suspendre — nous ne gardons
 *    aucune trace. Mais il y a le SUIVI GPS, qui tourne en continu et vide la
 *    batterie : c'est lui qu'on met en pause, et le libellé le dit. ⭐ Quand
 *    une promesse d'interface n'a rien derrière, on cherche ce qu'elle
 *    pourrait vraiment commander avant de la supprimer — ou de la mimer.
 */
import { useEffect, useRef, useState } from "react";
import { WALKS, distAuTrace } from "./walks";
import type { Walk, WalkPoint, Etape } from "./walks";
import { Atlas } from "./Atlas";
import { Photo, image } from "./images/Photo";
import { ILLUSTRATIONS } from "./illustrations";
import { libelleCategorie } from "./categories";
import { avancement } from "./ProchaineEtape";

/** ⚠️ 50 m disait « vous déviez » ; 120 m dit « vous n'êtes plus sur un
 *  chemin ». La première distance juge un écart, la seconde constate un
 *  fait — et seule la seconde est une information. Reprise telle quelle. */
const HORS_SENTIER_M = 120;

const R = 6371000;
function metres(a: WalkPoint, bLat: number, bLon: number): number {
  const l1 = (a.lat * Math.PI) / 180, l2 = (bLat * Math.PI) / 180;
  const dLa = l2 - l1, dLo = ((bLon - a.lon) * Math.PI) / 180;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(l1) * Math.cos(l2) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
const lisible = (m: number) =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
const km = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export function EnChemin({ base, slug }: { base: string; slug: string }) {
  const walk: Walk | undefined = WALKS.find((w) => w.slug === slug);
  const [moi, setMoi] = useState<WalkPoint | null>(null);
  const [gpsErreur, setGpsErreur] = useState("");
  const [suivi, setSuivi] = useState(true);
  const veille = useRef<number | null>(null);

  useEffect(() => {
    if (walk) document.title = `En chemin — ${walk.titre}`;
  }, [walk]);

  /**
   * ⚠️ LA VEILLE S'ARRÊTE VRAIMENT QUAND ON MET EN PAUSE. Garder le
   *    `watchPosition` actif et se contenter de ne plus afficher le résultat
   *    donnerait un bouton qui ment : la batterie continuerait de se vider
   *    exactement comme avant. `clearWatch`, ou rien.
   */
  useEffect(() => {
    if (!walk || !suivi || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => { setMoi({ lat: p.coords.latitude, lon: p.coords.longitude }); setGpsErreur(""); },
      (err) => setGpsErreur(
        err.code === err.PERMISSION_DENIED
          ? "Vous avez refusé l'accès à votre position. Le parcours reste affiché ; pour vous situer dessus, autorisez la localisation."
          : err.code === err.POSITION_UNAVAILABLE
            ? "Position introuvable — c'est fréquent sous les falaises. Le parcours reste affiché."
            : "Le GPS met du temps à répondre. Réessayez à l'air libre.",
      ),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    veille.current = id;
    return () => { navigator.geolocation.clearWatch(id); veille.current = null; };
  }, [walk, suivi]);

  if (!walk) return null;

  const part = moi ? avancement(walk, moi) : null;
  const horsSentier = moi ? distAuTrace(moi, walk.points) > HORS_SENTIER_M : false;

  /* ⚠️ « Prochaine » se lit sur le CHEMIN quand on sait où l'on en est, et à
     vol d'oiseau sinon — jamais l'un pour l'autre. Une chapelle à 300 m peut
     être derrière vous, de l'autre côté d'une anse. */
  const suivante: Etape | undefined = !moi
    ? undefined
    : part === null
      ? walk.etapes.slice().sort((a, b) => metres(moi, a.lat, a.lon) - metres(moi, b.lat, b.lon))[0]
      : walk.etapes.filter((e) => e.pos > part + 0.005).sort((a, b) => a.pos - b.pos)[0];

  const couverture = ILLUSTRATIONS[walk.slug]?.couverture;
  const im = couverture ? image(couverture) : undefined;

  const sosHref = moi
    ? `sms:112?&body=${encodeURIComponent(
        `Urgence — ma position GPS : ${moi.lat.toFixed(5)}, ${moi.lon.toFixed(5)} — parcours ${walk.titre} (mana.bzh).`)}`
    : "sms:112";

  return (
    <main className="ech">
      {/* ── LE SOL ────────────────────────────────────────────────────────
          🔴 La photographie du parcours s'il en existe une, SON TRACÉ sinon.
             Jamais une belle image d'ailleurs — la même règle qu'à la fiche,
             et elle vaut encore plus ici : quelqu'un qui marche et voit une
             photo croit voir ce qu'il a devant lui. */}
      <div className="ech-sol" aria-hidden="true">
        {im ? (
          <Photo id={im.id} usage="evoque" alt="" sizes="100vw" priorite />
        ) : (
          <div className="ech-atlas">
            <Atlas walks={WALKS} focus={walk.slug} cadrerSurFocus className="ech-atlas-svg" />
          </div>
        )}
      </div>

      {/* ── LA BARRE DU HAUT ────────────────────────────────────────────── */}
      <div className="ech-haut">
        <a className="ech-rond" href={`${base}/promenade/${walk.slug}`}>
          <span className="sr-only">Quitter la navigation et revenir à la fiche</span>
          <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </a>
        <p className="ech-titre">{walk.titre}</p>
        <button
          type="button"
          className={`ech-rond ${suivi ? "ech-rond-actif" : ""}`}
          aria-pressed={suivi}
          onClick={() => setSuivi((v) => !v)}
        >
          <span className="sr-only">
            {suivi ? "Mettre le suivi GPS en pause" : "Reprendre le suivi GPS"}
          </span>
          <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="6" />
          </svg>
        </button>
      </div>

      {/* ── LA CARTE FLOTTANTE ──────────────────────────────────────────── */}
      <div className="ech-bas">
        {horsSentier && (
          /* ⛔ Pas de `role="alert"`, pas de vibration : ce n'est pas une
             sommation. Un parcours se prend, il ne se suit pas — on constate
             un fait, on ne rappelle personne à l'ordre. */
          <p className="ech-hors">
            Vous n'êtes plus sur un chemin cartographié. Les falaises sont
            proches.
          </p>
        )}
        {gpsErreur && <p className="ech-gps" role="status">{gpsErreur}</p>}
        {!suivi && (
          <p className="ech-gps" role="status">
            Suivi en pause. La position n'est plus relevée.
          </p>
        )}

        <section className="ech-carte">
          {suivante ? (
            <div className="ech-etape">
              <span className="ech-pastille" aria-hidden="true">
                {libelleCategorie(suivante.categorie).slice(0, 1)}
              </span>
              <span className="ech-etape-corps">
                <span className="m-etiquette ech-label">
                  {part === null ? "Le plus proche de vous" : "Prochaine étape"}
                </span>
                <span className="ech-nom">{suivante.nom}</span>
                <span className="ech-distance">
                  à {lisible(metres(moi!, suivante.lat, suivante.lon))}
                  <span className="ech-vol"> à vol d'oiseau</span>
                </span>
              </span>
            </div>
          ) : (
            <p className="ech-attente">
              {moi
                ? walk.boucle ? "Retour au point de départ." : "Vers l'arrivée."
                : "Recherche de votre position…"}
            </p>
          )}

          {/* ── LA PROGRESSION ────────────────────────────────────────── */}
          {part !== null ? (
            <>
              <div className="ech-barre" aria-hidden="true">
                <span className="ech-barre-fait" style={{ inlineSize: `${(part * 100).toFixed(1)}%` }} />
                {walk.etapes.map((e) => (
                  <span
                    key={`${e.nom}-${e.pos}`}
                    className={`ech-jalon ${e.pos <= part ? "ech-jalon-passe" : ""}`}
                    style={{ insetInlineStart: `${(e.pos * 100).toFixed(1)}%` }}
                  />
                ))}
                {/* la goutte ocre : où vous êtes, sur la barre */}
                <span className="ech-goutte" style={{ insetInlineStart: `${(part * 100).toFixed(1)}%` }} />
              </div>
              {/* 🔴 DEUX DISTANCES, ET AUCUNE DURÉE. La maquette affiche
                  « 15 min ». Un temps écoulé compté depuis l'ouverture de
                  l'écran serait faux pour qui l'ouvre en cours de route ; un
                  temps restant demanderait une vitesse, et la nôtre est une
                  convention (3,5 km/h), pas une mesure. Les deux distances,
                  elles, se déduisent de la position : ce sont des faits. */}
              <p className="ech-chiffres">
                <strong>{km(walk.distanceKm * part)} km</strong> parcourus ·{" "}
                <strong>{km(walk.distanceKm * (1 - part))} km</strong> restants
              </p>
            </>
          ) : moi ? (
            <p className="ech-indetermine">
              Votre position correspond à 2 endroits du parcours. Nous
              préférons ne pas trancher.
            </p>
          ) : null}

          <div className="ech-actions">
            <button
              type="button"
              className="ech-pause"
              onClick={() => setSuivi((v) => !v)}
            >
              <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
                {suivi ? <><path d="M9 5v14M15 5v14" /></> : <path d="M7 4l12 8-12 8z" />}
              </svg>
              {suivi ? "Mettre le suivi en pause" : "Reprendre le suivi"}
            </button>
            {/* ⛔ L'APPEL D'URGENCE RESTE, ET IL PORTE LA POSITION. C'est la
                seule fonction de cet écran dont l'absence pourrait coûter
                autre chose qu'une déception. */}
            <a className="ech-sos" href={sosHref}>
              <span aria-hidden="true">112</span>
              <span className="sr-only">Appeler les secours avec ma position</span>
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

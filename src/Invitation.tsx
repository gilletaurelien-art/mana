/**
 * L'INVITATION — le premier des trois états.
 *
 * ⭐ ON NE COMMENCE PAS PAR UN CATALOGUE. L'écran précédent empilait une
 *    promenade, sa carte, sa distance et deux boutons : on arrivait dans un
 *    produit. Ici on arrive dans un TERRITOIRE, et on répond à une question.
 *    Le catalogue existe toujours — il est à un geste, pas au premier regard.
 *
 * ⚠️ DEUX ENTRÉES, PAS DIX. « Autour de moi » et « un lieu ». Tout le reste
 *    est en dessous du pli, volontairement : une invitation qui propose six
 *    chemins n'invite plus, elle fait choisir.
 *
 * ⛔ AUCUNE DONNÉE INVENTÉE. Le territoire dessiné derrière est celui des
 *    promenades réelles du projet, et le compte annoncé est leur compte.
 */
import { useState } from "react";
import { Atlas } from "./Atlas";
import { WALKS } from "./walks";

export function Invitation({ base }: { base: string }) {
  const [lieu, setLieu] = useState("");
  const [motGps, setMotGps] = useState("");
  const [cherche, setCherche] = useState(false);

  const partirDuLieu = () => {
    const q = lieu.trim();
    window.location.assign(`${base}/promenades${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  /**
   * ⚠️ LA PERMISSION SE DEMANDE OÙ LA QUESTION SE POSE. On ne renvoie pas vers
   *    le compositeur pour qu'il redemande : on demande ici, et on transmet le
   *    point. Un consentement obtenu deux fois pour la même chose est un
   *    consentement qu'on a mal demandé la première fois.
   * ⛔ Et un refus n'est pas une panne : la page reste entièrement utilisable
   *    par le champ de lieu, et on le DIT.
   */
  const autourDeMoi = () => {
    if (!navigator.geolocation) {
      setMotGps("Votre navigateur ne sait pas vous situer. Indiquez un lieu ci-dessous.");
      return;
    }
    setCherche(true);
    setMotGps("Recherche de votre position…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { longitude: lon, latitude: lat } = p.coords;
        window.location.assign(`${base}/composer?lon=${lon.toFixed(5)}&lat=${lat.toFixed(5)}`);
      },
      () => {
        setCherche(false);
        setMotGps("Position indisponible. Indiquez un lieu ci-dessous — ça marche aussi bien.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <section className="invitation" aria-labelledby="invitation-titre">
      {/* ── LE TERRITOIRE, EN FOND ─────────────────────────────────────────
          ⚠️ `aria-hidden` : l'atlas porte déjà son propre `role="img"` et son
          libellé, mais ici il est DÉCORATIF — l'information utile est dans le
          texte et les deux entrées. Le faire lire deux fois ferait du bruit. */}
      <div className="invitation-atlas" aria-hidden="true">
        <Atlas walks={WALKS} className="invitation-atlas-svg" />
      </div>

      <div className="invitation-contenu">
        <p className="invitation-sur-titre">Bretagne · Exploration</p>
        <h1 id="invitation-titre" className="invitation-titre">
          Le monde commence ici.
        </h1>
        <p className="invitation-question">Où avez-vous envie de vous promener&nbsp;?</p>

        <div className="invitation-entrees">
          <button
            type="button"
            className="invitation-primaire"
            onClick={autourDeMoi}
            disabled={cherche}
          >
            {cherche ? "Recherche…" : "Autour de moi"}
          </button>

          <div className="invitation-ou">ou</div>

          <div className="invitation-champ">
            <label className="sr-only" htmlFor="invitation-lieu">
              Une commune, un lieu
            </label>
            <input
              id="invitation-lieu"
              type="search"
              autoComplete="off"
              placeholder="Une commune, un lieu…"
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && partirDuLieu()}
            />
            <button type="button" onClick={partirDuLieu} aria-label="Chercher ce lieu">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h14" />
                <path d="m12 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* ⚠️ Le message d'état vit SOUS les entrées, jamais en modale : on ne
            bloque pas une page pour dire qu'une permission a été refusée. */}
        {/* ⚠️ TROISIÈME ENTRÉE, ET ELLE EST DÉLIBÉRÉMENT LA PLUS DISCRÈTE.
            « Autour de moi » et le champ répondent à la question posée ;
            explorer la carte, c'est pour qui n'a pas de réponse. Mettre les
            trois au même niveau ferait choisir au lieu d'inviter. */}
        <p className="invitation-carte">
          <a href={`${base}/carte`}>Explorer la carte</a>
        </p>

        {motGps && (
          <p className="invitation-etat" role="status">
            {motGps}
          </p>
        )}

        <p className="invitation-pied">
          {WALKS.length} promenades vérifiées sur la presqu'île de Crozon, et de
          quoi en composer d'autres depuis l'endroit où vous êtes.
        </p>
      </div>
    </section>
  );
}

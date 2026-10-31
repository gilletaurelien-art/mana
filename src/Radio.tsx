import { useEffect, useRef, useState } from "react";

/**
 * MANAradio — le direct, branché le 31/10/2026.
 *
 * ⛔ AUCUN FLUX SIMULÉ. La page affichait « Hors antenne — bientôt » depuis
 *    l'origine : c'était juste, et c'était la bonne façon d'attendre. Elle
 *    affiche désormais l'antenne RÉELLE, et retombe sur un état honnête dès
 *    que l'API ne répond pas — jamais sur un titre inventé ni une horloge
 *    qui tourne dans le vide.
 *
 * ⚠️ `radio.mana.bzh` EST LE SERVEUR, PAS L'ADRESSE PUBLIQUE : sa racine
 *    répond 302 vers `/login`. On n'en consomme que deux chemins, ceux qui
 *    sont déjà câblés dans les quatre sites de l'écosystème — les renommer
 *    casserait les quatre.
 *
 * ⭐ `is_online` EST L'AVIS D'AZURACAST SUR LUI-MÊME. Du silence qui circule
 *    reste « en ligne ». On ne peut pas mesurer le niveau depuis un
 *    navigateur sans lire le flux ; ce qu'on fait, donc, c'est ne RIEN
 *    promettre de plus que ce que l'API dit, et laisser l'oreille trancher.
 */
const FLUX = "https://radio.mana.bzh/listen/mana/radio.mp3";
const API = "https://radio.mana.bzh/api/nowplaying/mana";

/** ⚠️ 20 s, pas 5. L'horloge avance toute seule entre deux appels (voir plus
 *  bas) : interroger plus souvent n'apprendrait rien et ferait porter à un
 *  VPS mutualisé une requête par auditeur et par seconde. */
const SONDAGE_MS = 20_000;

type Titre = { artiste: string; titre: string };
type Antenne = {
  enLigne: boolean;
  actuel: Titre | null;
  suivant: Titre | null;
  /** secondes écoulées AU MOMENT DE LA RÉPONSE */ ecoule: number;
  duree: number;
  /** horodatage local de la réponse, pour recaler l'horloge */ recu: number;
};

const chanson = (s: unknown): Titre | null => {
  const o = s as { artist?: string; title?: string } | undefined;
  if (!o || (!o.artist && !o.title)) return null;
  return { artiste: o.artist ?? "", titre: o.title ?? "" };
};

const mmss = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.max(0, Math.floor(s - m * 60))).padStart(2, "0")}`;
};

export function Radio() {
  const [antenne, setAntenne] = useState<Antenne | null>(null);
  const [erreur, setErreur] = useState(false);
  const [joue, setJoue] = useState(false);
  const [charge, setCharge] = useState(false);
  const [tic, setTic] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let vivant = true;
    const lire = async () => {
      // ⚠️ Un onglet caché n'écoute pas des yeux : on ne sonde pas.
      if (document.visibilityState === "hidden") return;
      try {
        const r = await fetch(API, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        if (!vivant) return;
        setAntenne({
          enLigne: d.is_online === true,
          actuel: chanson(d.now_playing?.song),
          suivant: chanson(d.playing_next?.song),
          ecoule: Number(d.now_playing?.elapsed ?? 0),
          duree: Number(d.now_playing?.duration ?? 0),
          recu: Date.now(),
        });
        setErreur(false);
      } catch {
        if (vivant) setErreur(true);
      }
    };
    lire();
    const t = setInterval(lire, SONDAGE_MS);
    document.addEventListener("visibilitychange", lire);
    return () => {
      vivant = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", lire);
    };
  }, []);

  /* ⭐ L'HORLOGE AVANCE LOCALEMENT, ET CE N'EST PAS UNE SIMULATION : elle
     part d'une valeur MESURÉE (`elapsed`) et se recale à chaque réponse. Ce
     qu'on affiche entre deux appels est une extrapolation de 20 s au plus,
     bornée à la durée du morceau — et elle ne crée aucune information : le
     titre, lui, ne change jamais sans l'API. ⚠️ Sans la borne, un onglet
     laissé ouvert pendant que l'API tombe afficherait « 48:00 » sur un
     morceau de 10 minutes. */
  useEffect(() => {
    const t = setInterval(() => setTic((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  void tic;

  const ecoule = antenne
    ? Math.min(antenne.duree || Infinity, antenne.ecoule + (Date.now() - antenne.recu) / 1000)
    : 0;
  const part = antenne && antenne.duree > 0 ? Math.min(1, ecoule / antenne.duree) : 0;

  const basculer = () => {
    const a = audio.current;
    if (!a) return;
    if (joue) {
      a.pause();
      /* ⚠️ `pause()` ne ferme pas la connexion : le flux continue d'être
         téléchargé en arrière-plan, et un direct ne se reprend pas là où on
         l'a laissé. On coupe la source pour de bon, et on la rouvre au
         besoin — c'est aussi ce qui évite de consommer de la donnée mobile
         en silence. */
      a.removeAttribute("src");
      a.load();
      setJoue(false);
      setCharge(false);
      return;
    }
    setCharge(true);
    a.src = FLUX;
    a.play().then(
      () => { setJoue(true); setCharge(false); },
      () => { setJoue(false); setCharge(false); setErreur(true); },
    );
  };

  const indisponible = erreur || (antenne !== null && !antenne.enLigne);
  const etat = indisponible ? "Hors antenne" : antenne ? "En cours" : "…";

  return (
    <>
      <section className="page-panel radio-player-panel">
        <div className="radio-player">
          <button
            type="button"
            className="radio-play"
            onClick={basculer}
            disabled={indisponible}
            aria-label={joue ? "Couper le son" : "Écouter MANAradio"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {joue
                ? <path d="M8 5.5h3v13H8zM13 5.5h3v13h-3z" />
                : <path d="M8.5 5.5v13l10-6.5z" />}
            </svg>
          </button>
          <div className="radio-infos">
            <p className="radio-etat">{etat}</p>
            {indisponible ? (
              <p className="radio-note">
                {erreur ? "Antenne injoignable. Vérifiez votre connexion." : "Reprise bientôt."}
              </p>
            ) : antenne?.actuel ? (
              <>
                {/* ⭐ ÉTIQUETÉ, PAS DEVINÉ. « Titre — Artiste » oblige à savoir
                    lequel est lequel, et se trompe une fois sur deux sur les
                    annonces vocales, dont l'« artiste » est MANA. Deux lignes
                    nommées coûtent six mots et ne se lisent jamais à l'envers. */}
                <dl className="radio-piste">
                  <dt className="m-etiquette">Artiste</dt>
                  <dd>{antenne.actuel.artiste || "—"}</dd>
                  <dt className="m-etiquette">Titre</dt>
                  <dd>{antenne.actuel.titre || "—"}</dd>
                </dl>
                {antenne.duree > 0 && (
                  <p className="radio-note radio-horloge">
                    {mmss(ecoule)} / {mmss(antenne.duree)}
                  </p>
                )}
              </>
            ) : (
              <p className="radio-note">Lecture de l'antenne…</p>
            )}
          </div>
        </div>
        {!indisponible && antenne && antenne.duree > 0 && (
          <div className="radio-jauge" aria-hidden="true">
            <span className="radio-jauge-fait" style={{ width: `${part * 100}%` }} />
          </div>
        )}
        {charge && <p className="radio-note">Connexion au flux…</p>}
        {/* ⚠️ `preload="none"` : sans lui, Safari ouvre le flux au rendu de la
            page — l'auditeur paie de la donnée pour une radio qu'il n'a pas
            lancée. Le `src` n'est posé qu'au clic, pour la même raison. */}
        <audio ref={audio} preload="none" onEnded={() => setJoue(false)} />
      </section>

      <section className="page-panel">
        <p className="apercu-label">Ensuite</p>
        {indisponible || !antenne?.suivant ? (
          <p className="page-texte">
            {indisponible ? "La programmation s'affichera dès la reprise." : "…"}
          </p>
        ) : (
          <dl className="radio-piste">
            <dt className="m-etiquette">Artiste</dt>
            <dd>{antenne.suivant.artiste || "—"}</dd>
            <dt className="m-etiquette">Titre</dt>
            <dd>{antenne.suivant.titre || "—"}</dd>
          </dl>
        )}
        <p className="page-note">
          MANAradio est une production d'Alliance MANA. Droits acquittés auprès
          de la SACEM.
        </p>
      </section>
    </>
  );
}

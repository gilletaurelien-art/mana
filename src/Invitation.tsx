/**
 * ÉCRAN 1 — L'INVITATION. Disposition reprise de la maquette du 31/10.
 *
 * L'ordre de lecture, de haut en bas, et il n'est pas interchangeable :
 *    MANA                                  ← qui parle
 *    TERRE, MER & LUMIÈRE — BRETAGNE       ← de quoi il s'agit
 *    Le monde commence ici.                ← la promesse
 *    Découvrez ce que vous croiserez…      ← ce qu'on y fait vraiment
 *    [ photographie ]                      ← la preuve
 *    Autour de moi                         ← le geste
 *    (la carte a quitté cet écran le 31/10 : elle est dans la barre
 *     du bas, donc permanente — un geste permanent n'a pas besoin
 *     d'être proposé une seconde fois ici.)
 *
 * 🔴 LE CHAMP « UNE COMMUNE, UN LIEU » A DISPARU, ET IL FAUT LE DIRE. Il
 *    occupait le milieu de cet écran ; la maquette ne le garde pas. Ce n'est
 *    pas une perte tant que la recherche existe ailleurs — et elle est
 *    dessinée en haut de l'écran 2, « Rechercher un lieu… ». ⚠️ Mais elle n'y
 *    est PAS ENCORE CÂBLÉE : tant qu'elle ne l'est pas, le site a perdu son
 *    entrée par le nom de lieu. C'est écrit ici pour qu'on ne l'oublie pas en
 *    trouvant l'accueil plus beau.
 *
 * ⭐ DEUX ENTRÉES, PAS TROIS. La maquette a raison contre la version
 *    précédente : « Autour de moi », « ou », un champ, et un lien vers la
 *    carte, cela faisait quatre décisions sur un écran qui en demande une.
 */
import { useState } from "react";

export function Invitation({ base }: { base: string }) {
  const [motGps, setMotGps] = useState("");
  const [cherche, setCherche] = useState(false);

  /**
   * ⚠️ LA PERMISSION SE DEMANDE OÙ LA QUESTION SE POSE. On ne renvoie pas
   *    vers le compositeur pour qu'il redemande : on demande ici, et on
   *    transmet le point.
   * ⛔ Et un refus n'est pas une panne : on bascule vers la carte, qui marche
   *    sans position, et on le dit — au lieu de laisser un bouton mort.
   */
  const autourDeMoi = () => {
    if (!navigator.geolocation) {
      setMotGps("Votre navigateur ne sait pas vous situer. La carte, elle, fonctionne sans position.");
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
        setMotGps("Position indisponible. Explorez la carte — elle fonctionne sans position.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <section className="inv" aria-labelledby="inv-titre">
      {/* 🔴 L'ACCUEIL N'A PLUS DE FOND PROPRE — 31/10/2026. Il portait une
          photographie fixe ; le fond tournant la remplace sur toute
          l'application. Garder les deux aurait masqué la rotation exactement
          là où l'application se regarde le plus — une fonctionnalité invisible
          sur son premier écran n'existe pas.
          ⭐ Et c'est 42 Ko de moins au premier chargement : l'image d'accueil
             dédiée disparaît, le premier fond la remplace pour 33 Ko. */}

      {/* ── LE FILIGRANE TOPOGRAPHIQUE ───────────────────────────────────
          §7 : « des lignes topographiques en filigrane », « presque
          imperceptibles ». Quatre courbes, 0,10 d'opacité, en haut à droite —
          là où la maquette les place, et là où aucun texte ne passe. */}
      <svg className="inv-filigrane" viewBox="0 0 200 160" aria-hidden="true" preserveAspectRatio="xMaxYMin slice">
        <g fill="none" strokeWidth="1">
          <path d="M210 8C170 14 150 36 120 34S66 10 30 22" />
          <path d="M210 26C168 33 148 56 118 54S60 30 22 44" />
          <path d="M210 46C166 54 146 78 116 76S54 52 14 68" />
          <path d="M210 68C164 77 144 102 114 100S48 76 6 94" />
        </g>
      </svg>

      <div className="inv-contenu">
        <header className="inv-marque">
          <p className="inv-mot">MANA</p>
          <p className="inv-devise">Terre, mer &amp; lumière — Bretagne</p>
        </header>

        <div className="inv-dire">
          <h1 id="inv-titre" className="inv-titre">
            Le monde<br />commence ici.
          </h1>
          <p className="inv-sous">
            Découvrez ce que vous<br />croiserez en chemin.
          </p>
        </div>

        <div className="inv-gestes">
          {/* ⚠️ Un <button>, pas un <a> : il demande une permission au
              navigateur, il ne mène pas à une adresse. Un lien déguisé en
              bouton casse le clic du milieu et la navigation au clavier. */}
          <button type="button" className="inv-primaire" onClick={autourDeMoi} disabled={cherche}>
            <svg className="m-icone inv-pin" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.6" />
            </svg>
            <span className="inv-primaire-mot">{cherche ? "Recherche…" : "Autour de moi"}</span>
            <span className="inv-fleche" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M5 12h12" /><path d="m12 6 6 6-6 6" /></svg>
            </span>
          </button>


          {motGps && <p className="inv-etat" role="status">{motGps}</p>}
        </div>
      </div>
    </section>
  );
}

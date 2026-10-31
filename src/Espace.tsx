/**
 * ÉCRAN 6 — L'ESPACE PERSONNEL.
 *
 * ⭐ IL EST PERSONNEL SANS ÊTRE IDENTIFIÉ, et c'est la position du projet,
 *    pas une limite qu'on subit. Pas de compte, pas de courriel, pas de mot
 *    de passe : ce qui est à vous reste sur votre appareil. L'écran le dit en
 *    toutes lettres, parce qu'un espace « personnel » sans explication fait
 *    chercher le bouton « se connecter ».
 *
 * 🔴 DEUX PROMESSES DE LA MAQUETTE ONT ÉTÉ REFORMULÉES, PAS DESSINÉES :
 *    · « Mes promenades » existe — en local, et c'est écrit.
 *    · « Mode hors-ligne » n'est PAS un interrupteur. Rien à allumer : le
 *      hors-ligne est automatique. On affiche un ÉTAT, qui répond à la vraie
 *      question — « est-ce que ça marchera sans réseau ? » — au lieu de
 *      demander une décision qui n'existe pas.
 */
import { useEffect, useState } from "react";
import { WALKS } from "./walks";
import { lireCarnet, viderCarnet, etatHorsLigne } from "./carnet";
import type { EtatHorsLigne } from "./carnet";
import { GlyphBoussole, GlyphSentier, GlyphSecurite } from "./Glyphs";

export function Espace({ base }: { base: string }) {
  const [carnet, setCarnet] = useState<string[]>([]);
  const [hl, setHl] = useState<EtatHorsLigne | null>(null);

  useEffect(() => {
    setCarnet(lireCarnet());
    let vivant = true;
    etatHorsLigne().then((e) => { if (vivant) setHl(e); });
    return () => { vivant = false; };
  }, []);

  const gardees = WALKS.filter((w) => carnet.includes(w.slug));

  return (
    <main className="espace">
      <header className="espace-entete">
        <p className="m-etiquette">MANA</p>
        <h1 className="m-titre espace-titre">Votre espace.</h1>
      </header>

      <section className="espace-bloc">
        <h2 className="m-etiquette">Mes promenades</h2>
        {gardees.length === 0 ? (
          <p className="m-texte espace-vide">
            Rien de gardé. Le marque-page d'une fiche l'ajoute ici.
          </p>
        ) : (
          <ul className="espace-liste">
            {gardees.map((w) => (
              <li key={w.slug}>
                <a className="espace-item" href={`${base}/promenade/${w.slug}`}>
                  <span className="espace-item-nom">{w.titre}</span>
                  <span className="m-meta">{w.lieu} · {w.distanceKm.toFixed(1)} km</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {/* ⚠️ La phrase est sous la liste, toujours visible, même vide : c'est
            une information sur la NATURE du carnet, pas un avertissement
            qu'on affiche quand il se remplit. */}
        <p className="m-meta">
          Gardé dans ce navigateur. Rien n'est envoyé. Pas de compte.
          {gardees.length > 0 && (
            <>
              {" "}
              <button
                type="button"
                className="espace-vider"
                onClick={() => { viderCarnet(); setCarnet([]); }}
              >
                Tout oublier
              </button>
            </>
          )}
        </p>
      </section>

      {/* ── L'ÉTAT DU HORS-LIGNE, PAS SON INTERRUPTEUR ────────────────────  */}
      <section className="espace-bloc">
        <h2 className="m-etiquette">Sans réseau</h2>
        <div className="espace-etat">
          <span
            className={`espace-pastille ${hl?.pret ? "espace-pastille-prete" : ""}`}
            aria-hidden="true"
          />
          <p className="m-texte">
            {hl === null
              ? "Vérification…"
              : hl.pret
                ? `Prêt. ${hl.entrees} éléments gardés${hl.graphe ? ", territoire compris" : ""}.`
                : "Pas encore prêt. Les pages se gardent quand vous les ouvrez."}
          </p>
        </div>
        {/* 🔴 LA LIMITE EST DITE, ET C'EST CELLE QUI COMPTE SUR LE TERRAIN.
            Le cache se remplit à la PREMIÈRE visite d'une page, donc une page
            jamais ouverte n'est pas disponible hors ligne. Quelqu'un qui
            installe l'application la veille au soir et part sans l'ouvrir
            n'aura rien. Le taire serait vendre une promesse qu'on ne tient
            qu'à moitié. */}
        <p className="m-meta">
          Une page se garde quand vous l'ouvrez. Avant de partir&nbsp;: ouvrez
          votre fiche une fois, et laissez-la charger.
        </p>
        {hl && !hl.graphe && (
          <p className="m-meta">
            Territoire pas encore gardé&nbsp;:{" "}
            <a className="m-lien" href={`${base}/carte`}>ouvrez la carte</a> une
            fois pour composer sans réseau.
          </p>
        )}
      </section>

      <section className="espace-bloc">
        <h2 className="m-etiquette">Ce que MANA ne fait pas</h2>
        {/* ⭐ UNE PAGE « À PROPOS » DIT CE QU'ON FAIT ; CELLE-CI DIT CE QU'ON
            S'INTERDIT. C'est plus court, plus vérifiable, et c'est ce qui
            distingue vraiment — tout le monde promet la découverte, personne
            n'écrit la liste de ses renoncements. */}
        <ul className="espace-renoncements">
          <li><GlyphSecurite size={20} /><span>Aucun compte, aucune donnée personnelle.</span></li>
          <li><GlyphBoussole size={20} /><span>Aucune marée ni météo calculée ici&nbsp;: renvoi aux sources officielles. Jamais de prévision simulée.</span></li>
          <li><GlyphSentier size={20} /><span>Aucun itinéraire présenté comme validé par un office de tourisme.</span></li>
        </ul>
      </section>

      <footer className="espace-pied">
        <p className="m-meta">
          Tracés et lieux&nbsp;: © les contributeurs d'OpenStreetMap, ODbL.
          Photographies&nbsp;: Wikimedia Commons, créditées sur chaque image.
        </p>
        <p className="espace-liens">
          <a className="m-lien" href={`${base}/mentions-legales`}>Mentions légales</a>
          <a className="m-lien" href={`${base}/contact`}>Nous écrire</a>
        </p>
      </footer>
    </main>
  );
}

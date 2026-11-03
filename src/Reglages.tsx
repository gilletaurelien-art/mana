import { ATTRIBUTION, lireFond, poserFond, type Fond } from "./carte-fond";
import { useEffect, useState } from "react";

/**
 * RÉGLAGES — ce que l'application sait de vous, d'où vient ce qu'elle montre,
 * et par où la joindre.
 *
 * ⭐ UNE PAGE DE RÉGLAGES EST UNE PAGE DE COMPTES RENDUS. Elle ne doit pas
 *    exposer des interrupteurs pour faire sérieux : elle doit dire ce qui est
 *    vrai — y compris quand la réponse est « rien ».
 *
 * ⛔ PAS DE SÉLECTEUR DE LANGUE. L'application n'a aucune traduction : il n'y
 *    a rien dans ce dépôt qui ressemble à un catalogue de messages. Dessiner
 *    un menu qui ne commute rien serait exactement la faute qu'on s'interdit
 *    ailleurs — une promesse d'interface qu'on ne peut pas tenir. On DIT donc
 *    l'état, et le breton y est nommé parce que c'est lui qui compte ici.
 */
export function Reglages({ base }: { base: string }) {
  const [fond, setFond] = useState<Fond>("ortho");
  useEffect(() => { setFond(lireFond()); }, []);

  return (
    <main className="page reg">
      <div className="wrap">
        {/* 🔴 EN-TÊTE KAKI — 3/11/2026, même thème que `/carte`. */}
        <header className="entete-kaki">
          <p className="hero-label">Réglages</p>
          <h1 className="page-titre"><span>Réglages</span></h1>
        </header>

        {/* ── LE FOND DE CARTE ─────────────────────────────────────────── */}
        <section className="reg-bloc">
          <h2 className="reg-titre">Fond de carte</h2>
          <p className="reg-mot">
            Le choix vaut pour toutes les fiches de balade. Il vit dans ce
            navigateur et n’est transmis à personne.
          </p>
          <div className="reg-choix" role="radiogroup" aria-label="Fond de carte">
            {([["ortho", "Vue aérienne"], ["plan", "Plan"]] as const).map(([clef, nom]) => (
              <button
                key={clef} type="button" role="radio" aria-checked={fond === clef}
                className={fond === clef ? "reg-opt reg-opt-active" : "reg-opt"}
                onClick={() => { setFond(clef); poserFond(clef); }}
              >
                {nom}
              </button>
            ))}
          </div>
          <p className="reg-fine">{ATTRIBUTION[fond]}</p>
        </section>

        {/* ── LA LANGUE ────────────────────────────────────────────────── */}
        <section className="reg-bloc">
          <h2 className="reg-titre">Langue</h2>
          <p className="reg-mot">
            L’application est en français, et en français seulement. Il n’y a
            pas de sélecteur ici parce qu’il n’y a rien à sélectionner : une
            traduction bretonne se fera quand les textes existeront, pas
            quand un menu les annoncera.
          </p>
        </section>

        {/* ── LES SOURCES ──────────────────────────────────────────────── */}
        <section className="reg-bloc">
          <h2 className="reg-titre">D’où vient ce que vous voyez</h2>
          {/* ⛔ CHAQUE LIGNE NOMME CE QU'ELLE APPORTE, pas seulement qui la
              fournit. « © OpenStreetMap » sans dire ce qu'OSM donne ici n'est
              pas une information, c'est une formalité. */}
          <dl className="reg-sources">
            <div>
              <dt>Chemins, lieux, fond « Plan »</dt>
              <dd>OpenStreetMap, sous licence ODbL — par OpenFreeMap, relayé par nos serveurs.</dd>
            </div>
            <div>
              <dt>Fond « Vue aérienne »</dt>
              <dd>Orthophotographie de l’IGN, par la Géoplateforme — relayée par nos serveurs.</dd>
            </div>
            <div>
              <dt>Les 46 circuits balisés</dt>
              <dd>
                Office de tourisme Presqu’île de Crozon – Aulne Maritime.
                Les tracés, les durées et les dénivelés sont les leurs.{" "}
                {/* ⛔ L'ACCORD N'EST PAS SIGNÉ, ET ON LE DIT ICI AUSSI. Le
                    taire sur la page qui s'appelle « d'où vient ce que vous
                    voyez » serait le taire à l'endroit exact où quelqu'un le
                    cherche. */}
                <strong>Accord de reprise en cours.</strong>
              </dd>
            </div>
            <div>
              <dt>Les communes</dt>
              <dd>Base Adresse Nationale — interrogée à la construction, jamais depuis votre appareil.</dd>
            </div>
            <div>
              <dt>Le relief des zooms lointains</dt>
              <dd>Natural Earth, domaine public.</dd>
            </div>
          </dl>
        </section>

        {/* ── CE QU'ON NE FAIT PAS ─────────────────────────────────────── */}
        <section className="reg-bloc">
          <h2 className="reg-titre">Ce que l’application ne fait pas</h2>
          <ul className="reg-liste">
            <li>Aucun compte, aucun mot de passe, aucune adresse enregistrée.</li>
            <li>Aucun traceur, aucune mesure d’audience tierce.</li>
            <li>
              Les tuiles de carte passent par nos serveurs : ni OpenStreetMap
              ni l’IGN n’apprennent votre adresse IP ni la zone que vous
              regardez.
            </li>
            <li>
              Votre position, quand vous la donnez, ne quitte pas l’appareil :
              elle sert à vous situer sur la carte, elle n’est pas envoyée.
            </li>
          </ul>
        </section>

        <nav className="reg-liens" aria-label="Pages">
          <a className="m-action-fine" href={`${base}/mentions-legales`}>Mentions légales</a>
          <a className="m-action-fine" href={`${base}/contact`}>Nous écrire</a>
        </nav>
      </div>
    </main>
  );
}

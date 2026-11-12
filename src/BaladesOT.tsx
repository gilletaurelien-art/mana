import { useEffect, useState } from "react";
import { chargerOT, PRATIQUE, type ItineraireOT } from "./ot";
import { MENTION } from "./walks";
import { SwipeBalades } from "./SwipeBalades";
import { baseUrl } from "./router";

/**
 * LES BALADES DE L'OFFICE — ÉCRAN À PART, DEPUIS LE 3/11/2026.
 *
 * 🔴 EXTRAIT DE `Composer.tsx`, demande du fondateur : « carte = premier
 *    onglet (sites + nos propositions), deuxième onglet = les balades de
 *    l'OT ». Les 46 circuits balisés vivaient en bas du catalogue MANA,
 *    après 1 032 itinéraires qui SONT les nôtres — la distinction entre
 *    « ce que MANA calcule » et « ce que l'Office a tracé » se perdait dans
 *    le défilement. Une adresse à part la rend visible dès la barre du bas.
 *
 * 🔴 LES CARTES EN TÊTE — demande du fondateur, en pointant le jeu de
 *    cartes de `/carte` (le bouton « Balades ») : une carte aérienne, le
 *    tracé dessus, les chiffres déclarés par l'Office, un cœur, une flèche
 *    pour la suivante. `SwipeBalades` les porte déjà — ce sont LES MÊMES
 *    46 circuits (`chargerOT()`), rien à reconstruire. La liste texte qui
 *    vivait seule ici reste EN DESSOUS : le jeu feuillette un circuit à la
 *    fois, la liste les balaie tous d'un coup — deux lectures, pas une
 *    redondance.
 * ⚠️ DEUX `<main>` SUR CETTE PAGE, ET C'EST ASSUMÉ. `SwipeBalades` est un
 *    écran complet ailleurs dans l'app (`/carte`, bouton « Balades ») ; le
 *    rejouer ici tel quel évite de le découper en sachant que la moitié
 *    settings-sensible (glisser, mesurer la feuille, filtrer) reste intacte
 *    et éprouvée. Un second `<main>` imbriqué est imparfait, pas invalide :
 *    aucun navigateur ne le refuse, et le découper proprement est un
 *    chantier à part, pas un geste du soir.
 *
 * ⛔ CE NE SONT PAS DES ITINÉRAIRES MANA — voir `ot.ts`. Le lien mène à LEUR
 *    fiche : c'est elle qui fait foi, et c'est eux qui entretiennent le
 *    balisage.
 * ⚠️ L'ACCORD DE REPRISE RESTE À OBTENIR (voir `ot.ts`) — c'est le sujet du
 *    rendez-vous du 6/11. Une page à part le rend plus facile à retirer d'un
 *    coup si l'accord ne se signe pas : elle ne touche à rien d'autre.
 */
export function BaladesOT() {
  const B = baseUrl();
  const [ot, setOt] = useState<ItineraireOT[] | null>(null);
  const [pratique, setPratique] = useState<ItineraireOT["pratique"] | "tous">("tous");

  useEffect(() => {
    chargerOT().then((r) => setOt(r.itineraires)).catch(() => setOt([]));
  }, []);

  return (
    <>
      {/* ⚠️ `surCarte` MÈNE À LA CARTE DU TERRITOIRE, SANS Y CENTRER LE POINT.
          Depuis `/carte`, ce geste centre la carte sur le lieu visé — un état
          interne à `EcranTerritoire`. Cette page est une adresse à part, sans
          cet état : elle mène honnêtement à la carte, elle ne prétend pas la
          recentrer. */}
      <SwipeBalades surCarte={() => { window.location.href = `${B}/carte`; }} />

      <main className="page page-composer">
        <div className="wrap">
          <header className="cp-entree">
            <div className="cp-entree-dire">
              <p className="hero-label">Office de tourisme</p>
              {/* 🔄 « de l'Office » → « des Offices de Tourisme », demande du
                  fondateur le 12/11/2026. Le singulier datait du temps où
                  Crozon était seul ; ils sont CINQ depuis l'ajout d'Iroise et
                  de Landerneau-Daoulas. */}
              <h1 className="cp-titre">Les balades des Offices de Tourisme</h1>
              {ot && (
                <p className="cp-compte">
                  {ot.length} circuit{ot.length > 1 ? "s" : ""} balisé{ot.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </header>

          <div className="cp-corps">
            {ot === null && (
              <p className="page-note">Chargement des circuits…</p>
            )}
            {ot !== null && ot.length === 0 && (
              <p className="page-note">
                Aucun circuit à afficher pour l'instant.
              </p>
            )}
            {ot !== null && ot.length > 0 && (
              <section className="page-panel">
                <p className="apercu-label">Tous les circuits</p>
                <p className="fiche-provenance fiche-provenance-ot">{MENTION.ot}</p>

                <div className="ot-filtres" role="group" aria-label="Pratique">
                  {(["tous", "pied", "vtt", "velo", "trail"] as const).map((k) => (
                    <button key={k} type="button"
                      className={k === pratique ? "ot-filtre ot-filtre-actif" : "ot-filtre"}
                      aria-pressed={k === pratique}
                      onClick={() => setPratique(k)}>
                      {k === "tous" ? "Tous" : PRATIQUE[k]}
                    </button>
                  ))}
                </div>

                <ul className="ot-liste">
                  {ot.filter((i) => pratique === "tous" || i.pratique === pratique).map((i) => (
                    <li key={i.slug}>
                      <a className="ot-item" href={i.source} target="_blank" rel="noreferrer noopener">
                        <span className="ot-item-titre">{i.titre}</span>
                        <span className="ot-item-meta">
                          {PRATIQUE[i.pratique]} ·{" "}
                          {/* ⚠️ Le kilométrage est MESURÉ sur le tracé, pas repris
                              de leur fiche : les deux diffèrent de 1,2 % en
                              médiane et de 17 % au pire. On affiche ce qu'on a
                              vérifié. */}
                          {i.km.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km ·{" "}
                          {i.boucle ? "boucle" : "aller simple"}
                          {i.difficulte && ` · ${i.difficulte}`}
                          {i.commune && ` · ${i.commune}`}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

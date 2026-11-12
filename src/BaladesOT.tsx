import { useEffect, useState } from "react";
import { chargerOT, MOT_CLEF_OFFICE, PRATIQUE, type ItineraireOT, type Recueil } from "./ot";
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
  /**
   * 🔴 CHOISIR SON PAYS — 12/11/2026, demande du fondateur : « sélectionner
   *    un pays pour l'OT ». Les circuits viennent de CINQ offices depuis le
   *    11/11 ; sans ce filtre, qui cherche une balade aux Abers déroule aussi
   *    Crozon, l'Iroise, Landerneau et la Côte des Légendes.
   */
  const [pays, setPays] = useState<string>("tous");
  /**
   * ⭐ LES OFFICES VIENNENT DE L'ARTEFACT, PAS D'UNE LISTE ÉCRITE ICI. Le
   *    recueil porte sa propre table (`Recueil.offices`) précisément pour
   *    qu'un nom d'office n'existe qu'à un endroit — il est passé de un à
   *    trois puis à cinq en huit jours, et une liste recopiée dans un écran
   *    aurait vieilli à chaque ajout, sans bruit.
   */
  const [offices, setOffices] = useState<Recueil["offices"]>([]);

  useEffect(() => {
    chargerOT()
      .then((r) => { setOt(r.itineraires); setOffices(r.offices); })
      .catch(() => setOt([]));
  }, []);

  /* ⚠️ ON NE PROPOSE QUE LES PAYS QUI ONT DES CIRCUITS. Un bouton qui rend
     une liste vide est un cul-de-sac : il a l'air de marcher et ne mène
     nulle part. L'ordre reste celui de l'artefact — c'est le sien, pas un
     tri inventé ici. */
  const paysPresents = offices.filter((o) => (ot ?? []).some((i) => i.ot === o.ot));
  const visibles = (ot ?? []).filter(
    (i) => (pratique === "tous" || i.pratique === pratique)
        && (pays === "tous" || i.ot === pays),
  );

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
                {/* ⚠️ L'ÉTIQUETTE DIT CE QU'ON VOIT, PAS CE QU'IL Y A. Elle
                    annonçait « Tous les circuits » quoi qu'on ait filtré —
                    et avec deux filtres au lieu d'un, le décalage entre le
                    titre et la liste devient la règle plutôt que l'exception.
                    ⭐ Le compte de l'en-tête, lui, reste le TOTAL : il décrit
                       le recueil, pas la vue. Deux nombres qui disent deux
                       choses différentes, et chacun le dit. */}
                <p className="apercu-label">
                  {visibles.length} circuit{visibles.length > 1 ? "s" : ""}
                  {pays !== "tous" &&
                    ` · ${MOT_CLEF_OFFICE[pays] ?? paysPresents.find((o) => o.ot === pays)?.nom ?? pays}`}
                </p>
                <p className="fiche-provenance fiche-provenance-ot">{MENTION.ot}</p>

                {/* 🔴 LE PAYS AVANT LA PRATIQUE, et ce n'est pas l'ordre
                    d'écriture : on choisit d'abord OÙ l'on va, ensuite
                    COMMENT. L'inverse ferait filtrer une pratique sur cinq
                    territoires avant de savoir lequel nous concerne.
                    ⚠️ Rendu seulement s'il y a plus d'un pays : un
                       commutateur à une seule position est un faux choix. */}
                {paysPresents.length > 1 && (
                  <div className="ot-filtres" role="group" aria-label="Pays">
                    <button type="button"
                      className={pays === "tous" ? "ot-filtre ot-filtre-actif" : "ot-filtre"}
                      aria-pressed={pays === "tous"}
                      onClick={() => setPays("tous")}>
                      Tous les pays
                    </button>
                    {paysPresents.map((o) => (
                      <button key={o.ot} type="button"
                        className={o.ot === pays ? "ot-filtre ot-filtre-actif" : "ot-filtre"}
                        aria-pressed={o.ot === pays}
                        /* ⭐ LE MOT COURT À L'ÉCRAN, LE NOM COMPLET POUR QUI
                           ÉCOUTE. « Abers » tient dans une pastille ; « Office
                           de tourisme du Pays des Abers » est ce qu'un lecteur
                           d'écran doit entendre. Le mot court vient de
                           `MOT_CLEF_OFFICE`, déjà tenu par des tests. */
                        aria-label={o.nom}
                        title={o.nom}
                        onClick={() => setPays(o.ot)}>
                        {MOT_CLEF_OFFICE[o.ot] ?? o.nom}
                      </button>
                    ))}
                  </div>
                )}

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
                  {visibles.map((i) => (
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
                {/* ⛔ UN CROISEMENT PEUT NE RIEN RENDRE — « VTT » aux Abers,
                    par exemple. Sans cette phrase, la liste disparaît et
                    l'écran ressemble à un chargement qui n'a pas abouti.
                    ⭐ Une liste vide se DIT, sinon elle se lit comme une
                       panne. */}
                {visibles.length === 0 && (
                  <p className="page-note">
                    Aucun circuit ne réunit ces deux choix. Essayez une autre
                    pratique, ou un autre pays.
                  </p>
                )}
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

import { useEffect, useState } from "react";
import { chargerOT, PRATIQUE, type ItineraireOT } from "./ot";
import { ATTRIBUTION, lireFond } from "./carte-fond";

/**
 * UNE BALADE SUR L'ACCUEIL — la même fiche que l'écran du territoire, avec
 * deux actions au lieu du feuilletage.
 *
 * ⭐ POURQUOI UNE FICHE ET PAS UNE VIGNETTE : l'accueil ne doit pas promettre
 *    autre chose que ce qu'on trouvera. Montrer ici exactement la feuille de
 *    l'écran suivant — mêmes chiffres, mêmes mentions, même dessin — c'est le
 *    seul moyen que « voir les balades » tienne ce qu'il annonce.
 *
 * ⚠️ 259 Ko CHARGÉS À LA DEMANDE, ET C'EST UN ARBITRAGE. `ot.json` est le prix
 *    de cette fiche ; il part APRÈS le premier rendu, jamais dans le lot
 *    principal, et la fiche apparaît quand il arrive. ⛔ `lieux.json` (110 Ko),
 *    lui, NE part PAS : la ligne « à moins de 150 m » vaut son poids sur un
 *    écran qu'on feuillette, pas sur une page d'accueil qu'on traverse.
 *
 * ⛔ LA PREMIÈRE À PIED, PAS « LA BALADE DU JOUR ». Un libellé qui promet une
 *    rotation qu'on ne fait pas est un mensonge d'interface : on n'en met
 *    aucun, et la fiche est simplement la première du jeu — celle que l'écran
 *    du territoire ouvrira.
 */
const DIFFICULTE: Record<string, string> = {
  facile: "Facile", moyen: "Moyen", difficile: "Difficile",
};

export function InvitationBalade({ base }: { base: string }) {
  const [w, setW] = useState<ItineraireOT | null>(null);

  useEffect(() => {
    let vivant = true;
    chargerOT()
      .then((r) => {
        if (!vivant) return;
        setW(r.itineraires.find((x) => x.pratique === "pied") ?? r.itineraires[0] ?? null);
      })
      .catch(() => { /* ⚠️ l'accueil reste entier sans elle : elle s'ajoute, elle ne porte rien */ });
    return () => { vivant = false; };
  }, []);

  if (!w) return null;

  return (
    <article className="inv-balade">
      <p className="jeu-bandeau">
        <span className="jeu-pratique">{PRATIQUE[w.pratique]}</span>
        <span className="jeu-forme">{w.boucle ? "Boucle" : "Aller simple"}</span>
        {w.difficulte && <span className="jeu-forme">{DIFFICULTE[w.difficulte]}</span>}
        <span className="jeu-bandeau-lieu">
          {w.commune ?? w.depart ?? "Presqu’île de Crozon"}
        </span>
      </p>

      <h2 className="jeu-nom">{w.titre}</h2>

      <p className="jeu-faits">
        {w.duree && (
          <span className="jeu-fait">
            <svg className="jeu-fait-icone" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
            <span className="sr-only">Durée </span>{w.duree}
          </span>
        )}
        <span className="jeu-fait jeu-km">
          <svg className="jeu-fait-icone" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3" />
          </svg>
          <span className="sr-only">Distance </span>{w.km.toLocaleString("fr-FR")} km
        </span>
        {w.denivele != null && (
          <span className="jeu-fait jeu-km">
            <svg className="jeu-fait-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 19h18M4 17l7-9 4 5 5-7" />
            </svg>
            <span className="sr-only">Dénivelé </span>+{w.denivele} m
          </span>
        )}
      </p>

      {/* ⛔ LES MENTIONS VOYAGENT AVEC LA FICHE, pas avec l'écran. Elles sont
          les mêmes ici que sur le territoire : qui a balisé, qui a déclaré les
          chiffres, d'où vient le fond. Une fiche qui se déplace sans elles
          devient une fiche MANA au premier coup d'œil. */}
      <p className="jeu-provenance">
        <a href={w.source} target="_blank" rel="noreferrer" className="jeu-source">
          Office de tourisme
          <svg className="jeu-source-icone" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 4h6v6M20 4 11 13" />
          </svg>
        </a>
        {" · chiffres déclarés · "}{ATTRIBUTION[lireFond()]}
      </p>

      {/* 🔴 « EN SAVOIR PLUS » EST PARTI — 1/11. Il menait à `w.source`, c'est-
          à-dire EXACTEMENT où mène déjà le crédit « Office de tourisme ↗ »
          deux lignes plus haut. Deux contrôles, une destination, sur une
          fiche de cinq lignes.
          ⭐ Le doublon n'était pas celui qu'on croyait : ce n'est pas « En
             savoir plus » et « Voir sur la carte » qui se répétaient — elles
             mènent à deux endroits différents, l'Office et notre territoire —
             c'est « En savoir plus » et le CRÉDIT. Un bouton et un lien
             discret se ressemblent si peu qu'on ne les compare pas ; seule
             l'URL le dit.
          ⚠️ Et c'est le bouton qui part, pas le crédit : le crédit est une
             obligation, le bouton était un confort. */}
      <div className="inv-balade-actions">
        <a className="m-action inv-balade-lien" href={`${base}/carte`}>
          <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7z" /><path d="M9 4v13M15 7v13" />
          </svg>
          Voir sur la carte
          <span className="inv-fleche" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 12h12" /><path d="m12 6 6 6-6 6" /></svg>
          </span>
        </a>
      </div>
    </article>
  );
}

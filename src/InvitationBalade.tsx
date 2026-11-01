import { useEffect, useState } from "react";
import { ecouter } from "./horloge-fond";
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
  const [liste, setListe] = useState<ItineraireOT[]>([]);
  const [rang, setRang] = useState(0);
  /**
   * ⚠️ LA ROTATION S'ARRÊTE DÈS QU'ON TOUCHE LA FICHE. Elle porte DEUX
   *    LIENS : changer la balade sous un doigt qui descend vers « BALADES »,
   *    c'est lui faire ouvrir autre chose que ce qu'il visait.
   * ⭐ Ce n'est pas une politesse : un contenu qui se met à jour tout seul
   *    doit pouvoir être arrêté (WCAG 2.2.2).
   * 🔴 ET LA PREMIÈRE VERSION NE TENAIT QUE PAR LE SURVOL — c'est-à-dire pour
   *    personne sur un téléphone, là où cette application se regarde. Un
   *    garde qui ne protège que la souris ne protège pas les marcheurs.
   *    On gèle donc au POINTEUR POSÉ (le doigt compte), au survol (bonus de
   *    bureau) et au focus clavier. Et le gel est DÉFINITIF pour la visite :
   *    quelqu'un qui a touché la carte a manifesté qu'il la lisait.
   */
  const [fige, setFige] = useState(false);

  useEffect(() => {
    let vivant = true;
    chargerOT()
      .then((r) => {
        if (!vivant) return;
        /* ⭐ À PIED D'ABORD, comme le jeu de fiches : sur 46 circuits, 21 sont
           à vélo, en VTT ou en trail. Le reste suit, pour que la rotation
           finisse par tout montrer. */
        const pied = r.itineraires.filter((x) => x.pratique === "pied");
        const autres = r.itineraires.filter((x) => x.pratique !== "pied");
        setListe([...pied, ...autres]);
      })
      .catch(() => { /* ⚠️ l'accueil reste entier sans elle */ });
    return () => { vivant = false; };
  }, []);

  /**
   * ⭐ LA FICHE TOURNE AVEC L'IMAGE, sur L'HORLOGE DU FOND — pas sur une
   *    minuterie à elle. Deux minuteries de même durée ne donnent pas la
   *    même heure : elles donnent deux heures qui se ressemblent de moins en
   *    moins. Voir `horloge-fond.ts`.
   * ⚠️ `prefers-reduced-motion` est déjà tenu à la source : `Fond` cesse de
   *    battre, donc la fiche cesse de tourner. Une seconde vérification ici
   *    serait une seconde règle à maintenir juste.
   */
  useEffect(() => {
    if (fige) return;
    return ecouter(() => setRang((n) => n + 1));
  }, [fige]);

  const w = liste.length ? liste[rang % liste.length] : null;

  /* ⭐ L'ENVELOPPE EXISTE AVANT LES DONNÉES. Les deux portes sont DANS la
     fiche (demande du 1/11) — mais `ot.json` pèse 259 Ko et arrive après le
     premier rendu. Rendre `null` en attendant ferait disparaître la seule
     porte de l'accueil pendant une seconde, et pour toujours si l'artefact
     n'arrive pas. La carte est donc là d'emblée ; ce sont ses CHIFFRES qui
     se remplissent. */
  return (
    <article
      className="inv-balade"
      onPointerDown={() => setFige(true)}
      onPointerOver={() => setFige(true)}
      onFocusCapture={() => setFige(true)}
    >
      <p className="jeu-bandeau">
        <span className="jeu-pratique">{w ? PRATIQUE[w.pratique] : "À pied"}</span>
        <span className="jeu-forme">{w ? (w.boucle ? "Boucle" : "Aller simple") : "Boucle"}</span>
        {w?.difficulte && <span className="jeu-forme">{DIFFICULTE[w.difficulte]}</span>}
        <span className="jeu-bandeau-lieu">
          {w?.commune ?? w?.depart ?? "Presqu’île de Crozon"}
        </span>
      </p>

      <h2 className="jeu-nom">{w?.titre ?? "Lecture des circuits…"}</h2>

      <p className="jeu-faits">
        {w?.duree && (
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
          <span className="sr-only">Distance </span>{w ? `${w.km.toLocaleString("fr-FR")} km` : "—"}
        </span>
        {w?.denivele != null && (
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
        <a href={w?.source ?? "https://www.crozon-tourisme.bzh/"} target="_blank" rel="noreferrer" className="jeu-source">
          Office de tourisme
          <svg className="jeu-source-icone" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 4h6v6M20 4 11 13" />
          </svg>
        </a>
        {" · chiffres déclarés · "}{ATTRIBUTION[lireFond()]}
      </p>

      {/* ⭐ LES DEUX PORTES SONT DANS LA FICHE — 1/11, demande du fondateur.
          ⚠️ Elles y reviennent SANS en dépendre : l'enveloppe est rendue
             avant les données (voir plus haut), donc les boutons existent
             même si `ot.json` n'arrive jamais. C'était la seule objection à
             les y mettre, et elle est levée par construction. */}
      <nav className="inv-balade-actions" aria-label="Entrer">
        <a className="inv-primaire" href={`${base}/carte`}>
          <svg className="m-icone inv-pin" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.6" />
          </svg>
          <span className="inv-primaire-mot">Balades</span>
          <span className="inv-fleche" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 12h12" /><path d="m12 6 6 6-6 6" /></svg>
          </span>
        </a>
        <a className="inv-primaire" href={`${base}/carte?vue=carte`}>
          <svg className="m-icone inv-pin" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7z" /><path d="M9 4v13M15 7v13" />
          </svg>
          <span className="inv-primaire-mot">Carte</span>
          <span className="inv-fleche" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 12h12" /><path d="m12 6 6 6-6 6" /></svg>
          </span>
        </a>
      </nav>
    </article>
  );
}

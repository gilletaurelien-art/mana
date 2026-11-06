/**
 * LE MOTEUR DE RECHERCHE, SUR L'ACCUEIL — 6/11/2026, demande du fondateur :
 * « plutôt que de proposer une balade, on va poser le moteur de recherche ».
 *
 * 🔴 CE CHAMP RÉPARE UNE PERTE QUE LE CODE AVAIT CONSIGNÉE. `Invitation.tsx`
 *    portait depuis le 1/11 : « LE CHAMP "UNE COMMUNE, UN LIEU" A DISPARU, ET
 *    IL FAUT LE DIRE […] le site a perdu son entrée par le nom de lieu. C'est
 *    écrit ici pour qu'on ne l'oublie pas en trouvant l'accueil plus beau. »
 *    Cinq jours plus tard, personne n'était revenu la refermer.
 *    ⭐ Une note honnête ne répare rien. Elle attend quelqu'un.
 *
 * ⭐ AUCUN SECOND MOTEUR : `recherche.ts` est celui de la carte, extrait le
 *    même jour. Deux moteurs pour un même travail, c'est le défaut qui a
 *    laissé les plages du monde à 5 % pendant seize jours.
 *
 * 🔴 ET L'INTERDIT QU'IL A FALLU FRANCHIR EN LE SACHANT. Un test disait :
 *    « elle ne charge PAS l'inventaire : la ligne "à moins de 150 m" vaut ses
 *    110 Ko sur un écran qu'on feuillette, pas sur une page d'accueil qu'on
 *    traverse ». La règle est juste, et sa RAISON l'est encore : qui traverse
 *    l'accueil ne doit pas payer 110 Ko.
 *    ⚠️ On ne charge donc rien au premier rendu : l'inventaire n'arrive qu'au
 *       premier geste — une mise au point dans le champ, ou la première
 *       lettre. Qui traverse ne paie toujours rien ; qui cherche paie une
 *       fois. Le test est RETOURNÉ vers cette propriété-là, pas supprimé.
 *
 * ⚠️ LA DESTINATION N'INVENTE AUCUNE URL. Le contrat existait déjà et il est
 *    écrit dans `Composer.tsx` : « `lon`/`lat` disent d'où l'on part ; `vers`
 *    dit où l'on va », et `q` porte le texte. Choisir un lieu, c'est donc
 *    partir DE lui — ce que la doctrine du produit demande : un lieu choisi,
 *    trois promenades proposées autour.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { chargerLieux, type Inventaire } from "./lieux";
import { chercher, LONGUEUR_MIN, type Resultat } from "./recherche";
import { libelleCategorie } from "./categories";

export function RechercheAccueil({ base }: { base: string }) {
  const [requete, setRequete] = useState("");
  const [inv, setInv] = useState<Inventaire | null>(null);
  /** ⚠️ `undefined` = jamais demandé · `null` = demandé et refusé. Les deux
   *  ne doivent pas se confondre : l'un attend un geste, l'autre est un
   *  échec dont il faut parler. */
  const [etat, setEtat] = useState<"repos" | "charge" | "echec">("repos");
  const champ = useRef<HTMLInputElement>(null);

  /** ⭐ LE CHARGEMENT SUIT L'INTENTION, pas le rendu. */
  const eveiller = () => {
    if (etat !== "repos") return;
    setEtat("charge");
    chargerLieux().then(setInv).catch(() => setEtat("echec"));
  };

  const resultats = useMemo<Resultat[]>(
    () => (inv ? chercher(requete, {
      lieux: inv.lieux,
      libelle: (c) => inv.libelles[c] ?? libelleCategorie(c),
    }) : []),
    [requete, inv],
  );

  const assezLong = requete.trim().length >= LONGUEUR_MIN;

  /** Partir DE ce lieu. ⚠️ `encodeURIComponent` sur le nom : « Pointe de
   *  Pen-Hir » ne s'écrit pas comme il se lit. */
  const versLieu = (r: Resultat) =>
    `${base}/promenades?lon=${r.g[0]}&lat=${r.g[1]}&nom=${encodeURIComponent(r.nom)}`;

  /* ⭐ ENTRÉE SANS CHOISIR MÈNE QUAND MÊME QUELQUE PART. `/promenades` lit
     déjà `?q=` (Composer.tsx). Sans ça, taper puis valider ne ferait rien —
     et un champ qui ne répond pas à la touche Entrée est un champ cassé pour
     qui n'emploie pas la souris. */
  const soumettre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assezLong) return;
    if (resultats.length) { window.location.href = versLieu(resultats[0]); return; }
    window.location.href = `${base}/promenades?q=${encodeURIComponent(requete.trim())}`;
  };

  useEffect(() => { if (inv) champ.current?.focus({ preventScroll: true }); }, [inv]);

  return (
    <search className="rech">
      <form className="rech-forme" onSubmit={soumettre} role="search">
        <label className="sr-only" htmlFor="rech-q">Une commune, un lieu</label>
        <svg className="rech-loupe" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-4.3-4.3" />
        </svg>
        <input
          id="rech-q" ref={champ} type="search" className="rech-champ"
          placeholder="Une commune, un lieu…"
          autoComplete="off" enterKeyHint="search"
          value={requete}
          onFocus={eveiller}
          onChange={(e) => { eveiller(); setRequete(e.target.value); }}
          /* ⚠️ `aria-expanded` dit à un lecteur d'écran qu'une liste s'est
             ouverte SOUS le champ : sans lui, les résultats apparaissent pour
             l'œil et pour personne d'autre. */
          role="combobox" aria-expanded={resultats.length > 0}
          aria-controls="rech-liste" aria-autocomplete="list"
        />
        {requete && (
          <button type="button" className="rech-vider" onClick={() => { setRequete(""); champ.current?.focus(); }}>
            <span className="sr-only">Effacer la recherche</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        )}
      </form>

      {/* ⛔ CHAQUE ÉTAT SE DIT. Un champ qui ne répond rien laisse croire
          qu'il n'a rien trouvé, alors qu'il n'a parfois rien reçu — c'est la
          différence entre « aucun résultat » et « l'index n'est pas là », et
          elle se voit au moment où elle compte. */}
      {assezLong && etat === "echec" && (
        <p className="rech-mot">L’inventaire n’a pas pu être chargé. La carte reste accessible.</p>
      )}
      {assezLong && etat === "charge" && !inv && (
        <p className="rech-mot">Lecture de l’inventaire…</p>
      )}
      {assezLong && inv && resultats.length === 0 && (
        <p className="rech-mot">Aucun lieu de ce nom. Essayez une commune, une pointe, une plage.</p>
      )}

      {/* ⭐ UNE PORTE AU REPOS. Le champ ne propose rien tant qu'on n'a pas
          tapé : un accueil dont le premier écran n'offre aucun geste ne dit
          pas ce que le site fait. Une seule, et qui ne double aucun onglet
          de la barre du bas — le doublon « deux contrôles pour un seul
          endroit » est le défaut que le fondateur a déjà trouvé ici en
          septembre, et qu'un test tient depuis.
          ⚠️ Elle ne dépend d'AUCUNE donnée : elle existe même si
             l'inventaire n'arrive jamais. */}
      {!requete && (
        <p className="rech-ou">
          ou <a className="rech-porte" href={`${base}/promenades`}>composer une promenade</a>
        </p>
      )}

      {resultats.length > 0 && (
        <ul className="rech-liste" id="rech-liste" role="listbox" aria-label="Lieux trouvés">
          {resultats.map((r) => (
            <li key={`${r.nom}-${r.g[0]}-${r.g[1]}`} role="option" aria-selected="false">
              <a className="rech-item" href={versLieu(r)}>
                <span className="rech-item-nom">{r.nom}</span>
                <span className="rech-item-detail">{r.detail}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </search>
  );
}

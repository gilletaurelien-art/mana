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
import { avecOffice, visage } from "./visage";

import { chargerLieux, ETENDUE, type Inventaire } from "./lieux";
import { chercher, LONGUEUR_MIN, type Resultat } from "./recherche";
/* ⚠️ UN JSON S'IMPORTE EN `(string | number)[][]`, pas en tuple : TypeScript
   ne peut pas deviner qu'un tableau de trois cases est [nom, lon, lat]. On
   NOMME la forme ici, une fois — plutôt que de la forcer à chaque usage.
   ⭐ Et c'est `tsc` qui l'a dit, pas le build : vite ne vérifie pas les
      types. Deuxième fois aujourd'hui. */
import communesBrutes from "./communes.json";
import type { Commune } from "./recherche";
const communes = communesBrutes as unknown as Commune[];
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
      /* ⭐ 724 OCTETS, EMBARQUÉS. La source nationale fait 1,1 Mo pour 35 413
         communes ; `scripts/communes.mjs` n'en garde que celles des emprises
         réellement moissonnées — 23. Charger la France entière sur un écran
         qui prend soin de différer 110 Ko aurait été absurde. */
      communes,
      libelle: (c) => inv.libelles[c] ?? libelleCategorie(c),
    }) : []),
    [requete, inv],
  );

  const assezLong = requete.trim().length >= LONGUEUR_MIN;

  /**
   * 🔴 DIRE OÙ L'ON CHERCHE, QUAND CE N'EST PAS LÀ OÙ L'ON EST — 14/11/2026.
   *    Mesuré sur manahome.org : taper « Rome » rend CINQ propositions, toutes
   *    bretonnes — Grotte de Roméo, Château de Troménec, Menhir de Tromel,
   *    Chapelle Saint-Laurent de Troménec, Église Saint-Jérôme. Le moteur
   *    compare des sous-chaînes sans accents (`recherche.ts`), donc « rome »
   *    est bien dans « T-rome-nec » et dans « Jé-rôme ». Chaque ligne est
   *    exacte ; l'ensemble est un mensonge.
   *
   * ⛔ ET C'EST PIRE QU'UNE LISTE VIDE. Un vide se comprend du premier coup
   *    d'œil ; une liste de noms plausibles se CROIT. « Berlin » tombait, lui,
   *    sur un refus honnête — c'est le cas chanceux, pas la règle.
   *
   * ⭐ ON NE RESTREINT PAS LE MOTEUR, ON NOMME CE QU'IL FOUILLE. Serrer la
   *    comparaison (début de mot plutôt que sous-chaîne) ferait disparaître
   *    quatre des cinq lignes et laisserait la cinquième — une grotte bretonne
   *    offerte à qui cherche Rome — en paraissant réparé. Le défaut n'est pas
   *    la souplesse de la comparaison, c'est que l'écran ne dit pas DANS QUOI
   *    il cherche. Alors il le dit, une fois, au-dessus de la liste.
   *
   * ⛔ ET PAS LIGNE PAR LIGNE, C'EST MESURÉ. Première idée : étiqueter chaque
   *    résultat de son territoire (`territoireDe`). 79 % des 5 676 lieux sont
   *    hors des deux emprises déclarées — quatre résultats sur cinq
   *    n'auraient porté aucune étiquette, et l'absence se serait lue comme
   *    « celui-là est ailleurs ». Une information partielle sur une ligne est
   *    pire qu'une information franche sur l'ensemble.
   *
   * ⚠️ SEULEMENT HORS DE mana.bzh. Là-bas l'index EST le territoire du site :
   *    annoncer « la Bretagne » à qui est déjà sur mana.bzh serait répéter ce
   *    que le domaine dit. Ailleurs — manahome, mana.love — le site promet
   *    autre chose que ce que l'index tient, et c'est cet écart qui se lit.
   */
  const ailleurs = visage() !== "bzh";

  /** Partir DE ce lieu. ⚠️ `encodeURIComponent` sur le nom : « Pointe de
   *  Pen-Hir » ne s'écrit pas comme il se lit. */
  const versLieu = (r: Resultat) =>
    `${base}/promenades?lon=${r.g[0]}&lat=${r.g[1]}&nom=${encodeURIComponent(r.nom)}`;

  /**
   * 🔴 CE COMMENTAIRE A MENTI PENDANT HUIT JOURS, ET LE CODE AVEC LUI. Il
   *    disait : « ENTRÉE SANS CHOISIR MÈNE QUAND MÊME QUELQUE PART.
   *    `/promenades` lit déjà `?q=` (Composer.tsx). Sans ça, taper puis
   *    valider ne ferait rien. » Le raisonnement est juste. Le code qu'il
   *    décrit n'existe pas : mesuré le 14/11/2026, les SEULS paramètres que
   *    cette application lit sont `lon`, `lat`, `dest`, `nom`, `vers`, `vue`
   *    et `visage`. Personne, nulle part, ne lit `q`.
   *
   * ⛔ CE QUE ÇA DONNAIT EN LIGNE : taper « Berlin » sur manahome.org et
   *    valider menait à une boucle de 1,7 km au départ du MENHIR DE CROZON,
   *    sans une mention de Berlin nulle part. Le composeur ignorait la
   *    requête et retombait sur son défaut breton — un écran plein de
   *    confiance, et faux de bout en bout.
   * ⭐ C'est le défaut nommé dans CLAUDE.md : une description fidèle à la
   *    place du comportement. Elle était datée, argumentée, exacte dans son
   *    intention — et c'est ce qui l'a rendue invisible.
   *
   * ⚠️ ON NE VA DONC NULLE PART SANS RÉSULTAT, et le champ n'est pas cassé
   *    pour autant : les trois états se disent déjà juste en dessous
   *    (« Lecture de l'inventaire… », « L'inventaire n'a pas pu être
   *    chargé », « Aucun lieu de ce nom »). Rester en place en DISANT
   *    pourquoi vaut mieux que partir ailleurs en silence.
   * ⏳ Le jour où `/promenades` saura lire un NOM, cette porte se rouvrira —
   *    et il faudra que `?q=` soit lu avant que ce code ne l'écrive, pas
   *    l'inverse. Un garde de `recherche-accueil.test.ts` tient cet ordre.
   */
  const soumettre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assezLong) return;
    if (resultats.length) { window.location.href = versLieu(resultats[0]); return; }
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
        /* ⚠️ DEUX PHRASES, PARCE QUE CE N'EST PAS LE MÊME REFUS. Sur mana.bzh,
           « aucun lieu de ce nom » est vrai et suffisant : l'index couvre le
           territoire du site. Ailleurs, le même mot laisserait croire que
           Berlin n'existe pas — alors que c'est la recherche qui ne va pas
           jusque-là. ⛔ Un refus qui attribue le manque au MONDE plutôt qu'à
           soi est un refus malhonnête.
           ⭐ Et il dit où la suite se trouve : la carte, elle, porte le
              monde entier. Un refus sans porte de sortie est une porte
              fermée ; avec, c'est un aiguillage. */
        <p className="rech-mot">
          {ailleurs
            ? `Ce nom n’est pas dans l’index. La recherche ne couvre encore que `
              + `${ETENDUE.mot} — le reste du monde est sur la carte, pas encore ici.`
            : "Aucun lieu de ce nom. Essayez une commune, une pointe, une plage."}
        </p>
      )}

      {/* ⭐ UNE PORTE AU REPOS. Le champ ne propose rien tant qu'on n'a pas
          tapé : un accueil dont le premier écran n'offre aucun geste ne dit
          pas ce que le site fait. Une seule, et qui ne double aucun onglet
          de la barre du bas — le doublon « deux contrôles pour un seul
          endroit » est le défaut que le fondateur a déjà trouvé ici en
          septembre, et qu'un test tient depuis.
          ⚠️ Elle ne dépend d'AUCUNE donnée : elle existe même si
             l'inventaire n'arrive jamais. */}
      {/* 🔴 LES DEUX PORTES DISPARAISSENT CHEZ MANAHOME — Aurélien,
          14/11/2026 : « supprime les 2 boutons de la landing qui ne servent à
          rien ». ⭐ Et il a raison, c'est mesurable : « Où dormir autour de
          moi » est DÉJÀ la deuxième icône de la barre du bas, et la barre est
          sur tous les écrans. Deux chemins vers la même page, à trois
          centimètres l'un de l'autre, ce n'est pas un raccourci — c'est une
          hésitation offerte.
          ⚠️ Le champ de recherche RESTE : lui n'a pas de jumeau dans la
             barre, et c'est par lui qu'on entre dans un lieu.
          ⛔ Sur mana.bzh elles restent : là-bas « Les balades des Offices de
             Tourisme » n'est qu'une icône sans mot dans la barre, et c'est le
             SEUL endroit de l'accueil où l'Office est nommé comme une
             destination — la note qui l'explique est juste en dessous. */}
      {!requete && avecOffice() && (
        <nav className="rech-portes" aria-label="Entrer">
          {/* 🔄 6/11/2026, demande du fondateur : « composer une promenade =
              fais en bouton », et « créer un bouton les balades, lien vers
              OT ». C'était un lien de texte au milieu d'une phrase — il se
              lisait comme une note, pas comme une porte. */}
          <a className="rech-porte" href={`${base}/promenades`}>
            Composer une promenade
          </a>
          {/* ⛔ CE BOUTON DOUBLE UN ONGLET DE LA BARRE DU BAS, et c'est
              assumé — voir le garde retourné dans `swipe.test.ts`. La barre
              ne porte qu'une ICÔNE sans libellé : personne ne devine que les
              étincelles mènent aux balades de l'Office. Un libellé qui nomme
              le partenaire n'est pas le doublon de septembre (deux boutons
              TEXTE voisins vers le même écran) ; c'est le seul endroit de
              l'accueil où l'Office est nommé comme une destination. */}
          {/* 🔴 ET CETTE PORTE CHANGE DE MÉTIER SELON L'HÔTE — 14/11/2026.
              La barre du bas avait été corrigée le matin même ; CELLE-CI
              était restée, et manahome.org proposait donc encore « Les
              balades des Offices de Tourisme » sur sa page d'accueil, au
              monde entier. ⭐ Corriger une surface ne corrige pas les autres :
              c'est le même métier offert à deux endroits, et il fallait
              chercher les DEUX. */}
          {avecOffice() ? (
            <a className="rech-porte rech-porte-fine" href={`${base}/balades-office`}>
              Les balades des Offices de Tourisme
            </a>
          ) : (
            <a className="rech-porte rech-porte-fine" href={`${base}/hebergements`}>
              Où dormir autour de moi
            </a>
          )}
        </nav>
      )}

      {/* ⭐ LA PORTÉE SE DIT AVANT LA LISTE, pas après : qui lit « Grotte de
          Roméo » après avoir tapé Rome a déjà conclu. */}
      {ailleurs && resultats.length > 0 && (
        <p className="rech-portee">Dans {ETENDUE.mot} — le reste du monde est sur la carte.</p>
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

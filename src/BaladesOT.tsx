import { useEffect, useState } from "react";
import { chargerOT, MOT_CLEF_OFFICE, PRATIQUE, type ItineraireOT, type Recueil } from "./ot";
import { CarteBalades } from "./CarteBalades";
import { lireFond, type Fond } from "./carte-fond";
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
 * 🔴 LE JEU DE CARTES A CÉDÉ LA PLACE À LA CARTE DU FINISTÈRE — 12/11/2026,
 *    demande du fondateur : « la carte à afficher est celle du Finistère avec
 *    tous les tracés de balade. Chaque tracé est cliquable. »
 *
 *    Du 3 au 12/11, cette page ouvrait sur `SwipeBalades` : une carte par
 *    circuit, qu'on feuilletait. ⭐ C'était la bonne réponse à « montre-moi
 *    CE circuit » et la mauvaise à « y a-t-il une balade près de chez moi ? » —
 *    il fallait traverser cent seize fiches pour le savoir. Une vue
 *    d'ensemble répond en un regard ; feuilleter répond en cent seize gestes.
 *
 * ⚠️ LE JEU N'EST PAS SUPPRIMÉ, IL EST RENDU À SON ÉCRAN. `SwipeBalades`
 *    reste la vue « Balades » de `/carte` (`EcranTerritoire`), où elle a sa
 *    place et où ses tests la tiennent. Vérifié avant de la retirer d'ici :
 *    elle y a toujours un appelant. ⭐ Et l'ancien commentaire des « deux
 *    `<main>` imbriqués » part avec elle — le défaut qu'il assumait n'existe
 *    plus, et une note qui survit à sa cause devient un faux témoin.
 *
 * ⭐ DEUX LECTURES RESTENT, ET ELLES COMMANDENT LE MÊME ÉTAT : la carte
 *    (où ça va) et la liste (ce que c'est). Cliquer un tracé allume sa ligne ;
 *    parcourir la liste au clavier allume son tracé. Une couche maplibre ne
 *    se focalise pas — la liste EST le chemin clavier de cette carte, ce
 *    n'est pas un oubli.
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
  /**
   * 🔴 LE TRACÉ QU'ON TIENT — 12/11/2026 : « chaque tracé est cliquable ».
   *    Il est désigné par son `slug`, pas par un index : les filtres
   *    réordonnent la liste à chaque clic, et un index y pointerait sur un
   *    autre circuit d'un filtre à l'autre.
   */
  const [choisi, setChoisi] = useState<string | null>(null);
  /* ⚠️ LE FOND SE LIT APRÈS LE PREMIER RENDU, comme partout ailleurs :
     `localStorage` n'existe pas au rendu serveur du prérendu, et l'état
     initial doit être le DÉFAUT, pas l'autre valeur. */
  const [fond, setFond] = useState<Fond>("plan");
  useEffect(() => { setFond(lireFond()); }, []);

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
  /* ⛔ UN CHOIX QUE LE FILTRE VIENT DE MASQUER NE SE GARDE PAS. Sans ceci, on
     choisit un circuit à Crozon, on bascule sur « Abers », et la bulle
     continue d'annoncer un circuit qui n'est plus ni sur la carte ni dans la
     liste — une sélection invisible est pire qu'aucune. */
  const tenu = visibles.find((i) => i.slug === choisi) ?? null;

  return (
    <>

      <main className="page page-composer">
        <div className="wrap">
          {/* ══ LA BANNIÈRE PORTE TOUT — 12/11/2026, demande du fondateur :
              « tous les textes sous la bannière verte doivent migrer dans la
              bannière verte. Il y a de la redondance : simplifie. »
              ⛔ LA REDONDANCE SE COMPTAIT : « Office de tourisme » était écrit
                 TROIS fois au-dessus de la liste — en surtitre, dans le titre,
                 et dans la mention de provenance — et le nombre de circuits
                 DEUX fois, à quatre centimètres d'écart (« 116 circuits
                 balisés » dans la bannière, « 116 CIRCUITS » sous elle).
              ⭐ CE QUI RESTE EST CE QUI DIT QUELQUE CHOSE : le titre nomme,
                 le compte suit la vue, la provenance dit ce que le titre ne
                 dit pas — que MANA ne fait que recenser. Trois surfaces au
                 lieu de cinq, et aucune ne répète sa voisine. */}
          <header className="cp-entree ot-entete">
            <div className="cp-entree-dire">
              {/* 🔄 « de l'Office » → « des Offices de Tourisme », demande du
                  fondateur le 12/11/2026. Le singulier datait du temps où
                  Crozon était seul ; ils sont CINQ depuis l'ajout d'Iroise et
                  de Landerneau-Daoulas. */}
              <h1 className="cp-titre">Les balades des Offices de Tourisme</h1>
              {/* 🔴 LE COMPTE EST PARTI LE 12/11/2026, demande du fondateur
                  — « supprime : 116 circuits balisés », dans la même phrase
                  que « compacte l'écran ».
                  ⚠️ CE QU'IL DISAIT N'EST PAS PERDU : la liste, sous la
                     carte, EST le compte — on la parcourt, on la voit
                     s'allonger ou se réduire quand on touche un filtre. Un
                     nombre écrit au-dessus répétait ce que la page montre.
                  ⭐ Et c'est la troisième surface retirée de cette bannière
                     en une journée : surtitre, mention de provenance,
                     compte. Chacune disait quelque chose de vrai ; aucune ne
                     disait quelque chose que la page ne montrait pas déjà. */}
              {/* 🔴 LA LIGNE DE PROVENANCE EST PARTIE LE 12/11/2026, sur
                  demande du fondateur — elle disait « Balisés et entretenus
                  par les Offices — MANA ne fait que les recenser ».
                  ⚠️ CE QU'ELLE PORTAIT N'EST PAS PERDU, ET C'EST LA CONDITION
                     POUR LA RETIRER. Le crédit vit à QUATRE autres endroits,
                     vérifiés avant de l'effacer : le titre de cette page
                     nomme les Offices ; le compte dit « balisés » ; chaque
                     carte du jeu porte « Office de tourisme · chiffres
                     déclarés · © OpenStreetMap » avec le lien vers la fiche
                     qui fait foi ; et chaque ligne de la liste EST ce lien.
                  ⛔ Le garde `⛔ CE NE SONT PAS DES ITINÉRAIRES MANA` d'`ot.ts`
                     reste donc tenu — par le mécanisme (chaque entrée renvoie
                     à son Office), pas par une phrase. C'est la forme la plus
                     solide : une phrase se supprime, un lien par entrée se
                     verrait manquer. */}
            </div>

            {/* ══ LA CARTE DU FINISTÈRE, AVEC TOUS LES TRACÉS ════════════
                🔴 12/11/2026, demande du fondateur : « la carte à afficher est
                celle du Finistère avec tous les tracés de balade. Chaque tracé
                est cliquable. » La page ouvrait sur un JEU DE CARTES qui
                montrait un circuit à la fois : pour savoir s'il y a une balade
                près de chez soi, il fallait feuilleter cent seize fiches.
                ⭐ LE JEU N'EST PAS PERDU — il reste l'écran « Balades » de
                   `/carte`, où il a sa place : on y feuillette, ici on balaie.
                   Deux lectures d'une même donnée, pas une redondance.
                ⚠️ ET LA CARTE SUIT LES FILTRES DE LA BANNIÈRE, comme la liste.
                   Une carte qui montrerait les 116 pendant que la liste en
                   montre 17 ferait deux écrans qui se contredisent. */}
            {ot !== null && ot.length > 0 && (
              <CarteBalades
                circuits={visibles}
                fond={fond}
                choisi={tenu?.slug ?? null}
                onChoisir={setChoisi}
                hauteur="44vh"
              />
            )}

            {/* 🔴 LE PARCOURS CHOISI S'AFFICHE SOUS LA CARTE — 12/11/2026,
                demande du fondateur, exemple à l'appui : « Circuit VTT -
                Trémet · VTT · 20,6 km · boucle · facile · Crozon », en lien.
                ⭐ SOUS LA CARTE, PAS SOUS LA BANNIÈRE. Elle vivait trois
                   cents pixels plus bas, après les deux rangées de filtres :
                   on touchait un tracé et la réponse paraissait hors de
                   l'écran. Une réponse qui n'est pas là où l'on a posé le
                   doigt n'est pas une réponse.
                ⭐ ET C'EST UN SEUL LIEN, titre et chiffres compris — comme
                   dans l'exemple. Deux cibles côte à côte pour un seul geste
                   font hésiter ; et le lien vers la fiche de l'Office EST le
                   crédit de ce circuit. */}
            {tenu && (
              <a className="ot-choisi" href={tenu.source}
                 target="_blank" rel="noreferrer noopener">
                <span className="ot-choisi-titre">{tenu.titre}</span>
                <span className="ot-choisi-meta">
                  {PRATIQUE[tenu.pratique]} ·{" "}
                  {tenu.km.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km ·{" "}
                  {tenu.boucle ? "boucle" : "aller simple"}
                  {tenu.difficulte && ` · ${tenu.difficulte}`}
                  {tenu.commune && ` · ${tenu.commune}`}
                </span>
              </a>
            )}

            {/* 🔴 LES DEUX FILTRES MONTENT DANS LA BANNIÈRE. Ils vivaient dans
                le panneau, sous elle : on lisait le titre, le compte, la
                provenance, puis on redescendait choisir. ⚠️ Et le panneau
                n'avait plus qu'eux et la liste — le compte qu'il portait
                faisait doublon avec celui d'au-dessus. */}
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
                       ÉCOUTE. « Abers » tient dans une pastille ; « Office de
                       tourisme du Pays des Abers » est ce qu'un lecteur
                       d'écran doit entendre. */
                    aria-label={o.nom}
                    title={o.nom}
                    onClick={() => setPays(o.ot)}>
                    {MOT_CLEF_OFFICE[o.ot] ?? o.nom}
                  </button>
                ))}
              </div>
            )}

            {/* 🔴 LE PAYS AVANT LA PRATIQUE : on choisit d'abord OÙ l'on va,
                ensuite COMMENT. ⭐ Et les deux ouvrent sur « tous » — demande
                du fondateur, 12/11 : « par défaut = tous les pays + Tous ».
                Un filtre dont la valeur initiale exclut quoi que ce soit ne
                paraît pas trop serré : il fait croire que le reste n'existe
                pas. Ce dépôt l'a déjà payé sur la durée de marche, où le cran
                par défaut cachait les dix-sept plus longs itinéraires. */}
            <div className="ot-filtres" role="group" aria-label="Pratique">
              {(["tous", "pied", "vtt", "velo", "trail"] as const).map((k) => (
                /* ⭐ LA PRATIQUE VOYAGE EN ATTRIBUT, pas en classe : la
                   feuille peut alors nommer chaque teinte une seule fois
                   (`[data-pratique="vtt"]`) au lieu de quatre classes qu'il
                   faudrait garder d'accord avec quatre clefs. ⚠️ Et « tous »
                   en porte un aussi — c'est la feuille qui décide qu'il n'a
                   pas de couleur, pas le JSX : une absence décidée ici se
                   lirait comme un oubli là-bas. */
                <button key={k} type="button"
                  data-pratique={k}
                  className={k === pratique ? "ot-filtre ot-filtre-actif" : "ot-filtre"}
                  aria-pressed={k === pratique}
                  onClick={() => setPratique(k)}>
                  {k === "tous" ? "Tous" : PRATIQUE[k]}
                </button>
              ))}
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
                <ul className="ot-liste">
                  {visibles.map((i) => (
                    <li key={i.slug}>
                      {/* ⭐ LE FOCUS ALLUME LE TRACÉ — c'est le chemin
                          CLAVIER de cette carte. Une couche maplibre ne se
                          focalise pas ; en parcourant la liste au clavier, on
                          voit donc où va chaque circuit sur la carte, et les
                          deux surfaces commandent le même état. ⚠️ `onFocus`
                          et non `onMouseEnter` : survoler cent seize lignes
                          en descendant ferait clignoter la carte. */}
                      <a className={i.slug === tenu?.slug ? "ot-item est-tenu" : "ot-item"}
                         aria-current={i.slug === tenu?.slug ? "true" : undefined}
                         onFocus={() => setChoisi(i.slug)}
                         href={i.source} target="_blank" rel="noreferrer noopener">
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

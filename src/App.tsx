import { useState, lazy, Suspense } from "react";
import { useEffect, useRef, useLayoutEffect } from "react";
import { usePath, baseUrl, routePromenade, routeEnChemin, routeRencontres, routeComplet } from "./router";
import { GlyphRadio, GlyphEtincelles, GlyphReglages, GlyphNavigation, GlyphSecurite, GlyphDecouverte, GlyphCarte, GlyphSentier, GlyphSablier, GlyphContribution } from "./Glyphs";
import { Invitation } from "./Invitation";
import { LApplication } from "./LApplication";
import { avecOffice, visage, signature, titrePourLHote, poserCanonique } from "./visage";
import { entreesBarre, liensPied } from "./barre";
import { carteEnFond, CARTE_EN_ACCUEIL } from "./fond-du-monde";
import { couper, ecouterPoste, etatPoste, lire } from "./poste";
import { Reglages } from "./Reglages";
import { Hebergements } from "./Hebergements";
import { Contribuer } from "./Contribuer";
const CarteMonde = lazy(() => import("./CarteMonde").then((m) => ({ default: m.CarteMonde })));
import { EcranTerritoire } from "./EcranTerritoire";
import { Composer } from "./Composer";
import { BaladesOT } from "./BaladesOT";
import { Radio } from "./Radio";
import { Promenade } from "./Promenade";
import { FichePromenade } from "./FichePromenade";
import { EnChemin } from "./EnChemin";
import { Fond } from "./Fond";
import { Rencontres } from "./Rencontres";
import { Espace } from "./Espace";
import { Territoire } from "./Territoire";
import { MentionsLegales } from "./MentionsLegales";
import { ContactForm } from "./ContactForm";

const B = baseUrl();

// 🔴 CETTE LIGNE A DIT « EN SOMMEIL » PENDANT DOUZE JOURS. Elle annonçait
// « la radio de l'écosystème, en sommeil comme le backend (aucun flux
// simulé), mais positionnée » — juste le jour de son écriture, faux depuis
// le 31/10/2026, quand `Radio.tsx` a branché le direct. Mesuré le 12/11 :
// l'API rend `is_online: true`, le flux répond en `audio/mpeg`, et le poste
// de l'application l'a joué (9,6 s lues à l'écran).
// ⭐ Elle était au bon endroit, bien écrite, et personne ne la relisait —
//    c'est le portrait du faux témoin. MANAradio émet ; la barre du bas la
//    commute, `/radio` en est la façade détaillée.



/**
 * 🔴 UN TITRE PAR ADRESSE — et une seule table pour tous. Posé le 1/11/2026,
 *    le jour où mana.bzh a commencé à servir cette application.
 *
 * ⭐ UNE ADRESSE À SOI APPELLE UN TITRE À SOI. Cinq routes n'en avaient pas :
 *    `/radio`, `/carte`, `/reglages`, `/espace`, `/contact`. Dans un résultat
 *    de recherche, chacune disait exactement la même chose que l'accueil —
 *    et `/radio` est une URL INDEXÉE, qui servait jusqu'à ce matin une page
 *    intitulée « MANARADIO — l'antenne de MANA, en direct ». On reprend ses
 *    mots : l'adresse change de contenu, elle ne doit pas changer de sens.
 *
 * ⚠️ ET C'EST UNE TABLE, PAS CINQ CORRECTIFS. Les titres vivaient dans les
 *    composants, et ils avaient DÉJÀ divergé : deux d'entre eux restauraient
 *    « La porte d'entrée de l'écosystème MANA en Bretagne », deux autres
 *    « Promenades & découvertes en Bretagne ». Personne n'avait menti —
 *    chaque copie était juste le jour de son écriture.
 *
 * ⛔ Les pages DYNAMIQUES gardent le leur : le titre d'une promenade est son
 *    nom, il ne peut pas tenir dans une table. Un test tient la frontière.
 */
/**
 * ⭐ LES ÉCRANS QUI N'ONT PAS DE PIED DE PAGE — ce sont les écrans-CARTES.
 *    Le territoire depuis le 31/10/2026, le compositeur depuis le 12/11, à la
 *    demande du fondateur et avec le même argument : une carte se tient
 *    debout, dehors, et un pied de site qui dépasse sous la barre flottante y
 *    est un bout d'autre chose.
 * ⚠️ Rien n'y devient inatteignable : mentions légales et contact vivent
 *    aussi dans la barre du bas, sur toutes les pages.
 */
/* 🔴 `CARTE_EN_ACCUEIL` ET LA RÈGLE DE FOND ONT DÉMÉNAGÉ ENSEMBLE dans
   `fond-du-monde.ts`, le 14/11/2026 — voir l'en-tête de ce fichier. Ce sont
   les deux moitiés d'une seule question (« qui montre la carte du monde sur
   cet écran ? ») et, séparées, elles pouvaient répondre « les deux ». */

const SANS_PIED = new Set(["/carte", "/promenades", "/composer"]);

export const TITRE_DEFAUT = "MANA.bzh — Promenades & découvertes en Bretagne";

export const TITRES: Record<string, string> = {
  "/": TITRE_DEFAUT,
  "/carte": "La carte du territoire — presqu'île de Crozon & Aulne maritime — MANA.bzh",
  /* ⭐ MÊME TITRE AUX DEUX ADRESSES, DEPUIS LE 3/11/2026 : c'est la MÊME
     page, affichée par le même composant — un titre qui varierait selon
     l'URL d'arrivée décrirait deux pages là où il n'y en a qu'une. */
  "/promenades": "Composer une promenade — presqu'île de Crozon & Aulne maritime — MANA.bzh",
  "/composer": "Composer une promenade — presqu'île de Crozon & Aulne maritime — MANA.bzh",
  "/radio": "MANARADIO — l'antenne de MANA, en direct — MANA.bzh",
  "/balades-office": "Les balades des Offices de Tourisme — Pays de Brest — MANA.bzh",
  "/territoire": "Le territoire — MANA.bzh",
  /* ⚠️ CE TITRE EST CELUI D'UNE PAGE D'ENTRÉE, pas d'un sous-écran : c'est
     lui qui paraît dans un résultat de recherche pour « application
     randonnée Crozon ». Il nomme le territoire, parce qu'une page qui ne dit
     pas OÙ elle s'applique ne répond à personne. */
  "/l-application": "Ce que fait l'application — promenades, hors ligne et sécurité en presqu'île de Crozon — MANA.bzh",
  "/contribuer": "Contribuer à la carte — ajouter ou corriger un lieu — MANA.bzh",
  "/hebergements": "Où dormir autour de moi — MANA.bzh",
  "/reglages": "Réglages, sources et mentions — MANA.bzh",
  "/espace": "Mon espace — MANA.bzh",
  "/contact": "Contact — MANA.bzh",
  "/mentions-legales": "Mentions légales — MANA.bzh",
};


/**
 * CE QUE LE PIED DISAIT — devenu un composant, parce qu'il a déménagé.
 *
 * 🔴 ARBITRAGE D'AURÉLIEN, 14/11/2026 : « le footer doit disparaître partout,
 *    et vivre dans l'onglet réglages ».
 * ⭐ EXTRAIT PLUTÔT QUE RECOPIÉ. Le même contenu doit servir à deux endroits
 *    pendant la transition — le pied, là où il reste, et Réglages. Deux
 *    copies divergeraient au premier lien ajouté, et en silence : personne ne
 *    compare un pied de page à un écran de réglages.
 */
export function ContenuDuPied({ B }: { B: string }) {
  return (
<div className="wrap footer-colonnes">
          <div>
            {/* 🔴 LA MARQUE DU PIED ÉTAIT ÉCRITE EN DUR — « MANA.bzh » sur
                manahome.org, relevé sur la page servie le 14/11/2026, dans le
                pied de TOUTES les pages. ⭐ `signature()` existait et disait
                déjà le bon nom trois lignes plus haut, dans le `<title>` : ce
                n'est pas une règle qui manquait, c'est un endroit qui ne la
                lisait pas. ⚠️ L'`<em>` porte le style, pas le sens : on coupe
                donc après « MANA » quel que soit le nom. */}
            <p className="brand">
              {(() => {
                const s = signature();
                return s.toUpperCase().startsWith("MANA")
                  ? <>MANA<em>{s.slice(4)}</em></>
                  : <em>{s}</em>;
              })()}
            </p>
            {/* 🔄 « Presqu'île de Crozon » → « Finistère », demande du
                fondateur le 12/11/2026. Le pied annonçait un territoire que
                l'offre a dépassé : 116 circuits de CINQ offices, de la pointe
                de Pen-Hir aux dunes de Keremma. ⭐ Un périmètre écrit plus
                étroit que la matière fait passer pour local ce qui ne l'est
                plus — et personne ne va chercher aux abers une app qui dit
                « presqu'île de Crozon ». */}
            {/* ⚠️ « Finistère » NE SE DIT QUE CHEZ NOUS. Le reste de la
                phrase est vrai partout — hors ligne, GPS, GPX, gratuit, aucune
                donnée revendue —, c'est le TERRITOIRE qui ne l'est pas. ⛔ Et
                on n'écrit pas « le monde » à la place : annoncer un périmètre
                plus large que la matière est la faute symétrique de celle que
                la note du 12/11 corrigeait en élargissant à « Finistère ». */}
            <p className="footer-note">
              {avecOffice() && "Finistère. "}Hors ligne, GPS, GPX. Gratuit, aucune
              donnée revendue.
            </p>
            <ContactForm />
          </div>
          <nav className="footer-nav" aria-label="Pied de page">
            {/* ⚠️ Les trois liens vers nos promenades sont partis le 31/10 avec
                leur retrait de la vitrine. Les URL, elles, répondent toujours —
                c'est le pied de page qui cesse de les annoncer, pas le site qui
                les perd. */}
            {/* ⭐ EN TÊTE DU PIED, ET SUR TOUTES LES PAGES. Une page
                indexable qu'aucun lien interne ne désigne est une page que
                les moteurs trouvent mal et que personne ne traverse. Le pied
                est le seul endroit présent partout. */}
            {liensPied(visage()).map((l) => (
              <a key={l.chemin} href={`${B}${l.chemin}`}>{l.libelle}</a>
            ))}
          </nav>
        </div>
  );
}

export default function App() {
  const path = usePath();
  /**
   * 🔴 LA BARRE COMMANDE LE POSTE — 12/11/2026, demande du fondateur : « le
   *    bouton MANAradio devient un commutateur ON/OFF ».
   *
   * ⭐ RIEN DE NEUF SOUS LE BOUTON, ET C'EST TOUT L'INTÉRÊT. `poste.ts` vit
   *    déjà hors de React, au niveau du document, précisément pour que le
   *    direct survive aux changements d'écran. Il offre `lire`, `couper` et
   *    un abonnement ; la barre devient une seconde façade du même poste,
   *    exactement comme `/radio`. Deux surfaces, un seul élément audio — pas
   *    deux connexions au flux, pas deux instants de la même antenne.
   * ⚠️ ET L'ABONNEMENT N'EST PAS DÉCORATIF : le casque débranché, un appel
   *    entrant ou le contrôle du système mettent en pause sans passer par
   *    nous. Sans lui, l'anneau tournerait sur un poste muet.
   */
  const [poste, setPoste] = useState(etatPoste);
  useEffect(() => ecouterPoste(setPoste), []);
  /* ⭐ LE DRAPEAU `cherche` EST PARTI AVEC LA SECONDE ICÔNE DE CARTE. Il
     n'existait que pour distinguer deux repères qui s'allumaient ensemble sur
     `/carte` ; il n'y a plus qu'une porte vers cette page. Un drapeau qui
     survit à ce qu'il départageait devient une condition que personne ne sait
     plus relire. */

  /**
   * 🔴 LA BARRE DIT ELLE-MÊME LA PLACE QU'ELLE PREND.
   *
   * `body { padding-bottom: 84px }` était juste le jour de son écriture, et
   * faux dès que les icônes sont passées de 24 à 48 : mesuré le 31/10, la
   * barre occupait 100 px pour 84 compensés, et elle RECOUVRAIT la carte de
   * promenade. ⭐ Une valeur vivante recopiée dans une feuille de style se
   * périme en silence — on ne la corrige pas, on cesse de l'écrire.
   *
   * L'observateur relève la hauteur réelle à chaque changement de taille et la
   * publie en variable. La page n'a plus à connaître la barre.
   */
  /**
   * ⭐ QUI COMMANDE LE VOILE DU FOND. Deux régimes : la craie sur les écrans
   *    de lecture, le kaki sur les écrans immersifs (accueil, marche). Le
   *    voile est au-dessus du fond tournant et sous tout le contenu — c'est
   *    LUI qui tient les contrastes, pas l'image, qui change toutes les trois
   *    secondes. L'attribut vit sur la racine pour qu'une seule règle CSS
   *    suffise, sans que chaque écran ait à connaître le fond.
   */
  /* 🔴 `useLayoutEffect`, PAS `useEffect`. Posé après la peinture, l'attribut
     laissait le premier cadre en régime « lecture » : colonne opaque en
     sable, texte clair par-dessus — l'accueil s'affichait BLANC pendant une
     image avant de basculer. ⭐ Un défaut d'une seule frame ne se voit pas
     sur une capture d'écran et se voit à chaque navigation. */
  useLayoutEffect(() => {
    const immersif = path === "/" || /\/en-chemin\/?$/.test(path);
    document.documentElement.dataset.fond = immersif ? "immersif" : "lecture";
    /* ⚠️ Seulement les adresses de la table : une page dynamique pose le sien
       et ne doit pas se le faire écraser au prochain rendu. */
    const titre = TITRES[path];
    /* ⚠️ LA SIGNATURE EST SUBSTITUÉE AU MOMENT DE POSER, pas écrite dix fois
       dans la table. Dix chaînes à corriger à la main divergeraient au
       premier titre ajouté — et en silence, puisqu'un titre faux s'affiche
       parfaitement. La table dit le sujet, l'hôte dit la signature. */
    if (titre) document.title = titrePourLHote(titre);

    /* 🔴 LA CANONIQUE, POSÉE POUR TOUTES LES ADRESSES — y compris celles
       qui ne sont pas dans la table des titres. C'est la différence qui
       compte : le titre ne vaut que pour les pages statiques, puisqu'une
       page dynamique pose le sien ; la canonique vaut pour TOUTES, car une
       fiche de promenade est dupliquée sur les deux hôtes exactement comme
       `/carte`.
       ⚠️ HORS du `if (titre)`, et un test l'éprouve en appelant la fonction
          plutôt qu'en relisant ces lignes. */
    poserCanonique(document, path);
    /* ⭐ LE VISAGE SUR LA RACINE, POUR QUE LE CSS PUISSE EN DÉPENDRE. Une
       feuille de style ne peut pas appeler `visage()` ; sans cet attribut, la
       nuit céleste aurait dû être posée en `style=` depuis React — c'est-à-
       dire une couleur de fond écrite dans deux langages, qui divergent.
       ⚠️ Posé ICI, à côté de la canonique, parce que les deux répondent à la
          même question — « sur quel hôte sommes-nous ? » — et qu'une réponse
          écrite à deux endroits finit par différer. */
    document.documentElement.dataset.visage = visage();
  }, [path]);

  const barreRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const el = barreRef.current;
    if (!el) return;
    const poser = () => {
      const r = el.getBoundingClientRect();
      // du haut de la barre au bas de la fenêtre : hauteur ET décollement
      const occupe = Math.max(0, window.innerHeight - r.top);
      document.documentElement.style.setProperty("--barre-espace", `${Math.round(occupe)}px`);
    };
    poser();
    const ro = new ResizeObserver(poser);
    ro.observe(el);
    window.addEventListener("resize", poser);
    return () => { ro.disconnect(); window.removeEventListener("resize", poser); };
  }, []);
  /* ⚠️ L'état du carrousel de promenades, le champ de recherche et la
     navigation vers `/promenades` vivaient ici : ils servaient l'ancien héros
     et SEULEMENT lui. Ils sont partis avec. Le même travail se fait
     maintenant dans `Invitation`, au plus près de l'endroit où l'on clique.
     ⭐ Du code mort laissé « au cas où » est un faux témoin : la session
        suivante le lit et croit qu'un carrousel existe encore quelque part. */

  return (
    <>
      {/* ⭐ LE FOND EST HORS DU FLUX ET HORS DE LA COLONNE. Monté une seule
          fois, en tête de l'arbre : il ne se remonte pas d'une page à
          l'autre, donc la rotation ne repart jamais de zéro quand on navigue.
          ⚠️ C'est aussi pour ça qu'il n'est PAS dans le composant de page :
          un fond qui se réinitialise à chaque clic ferait clignoter
          l'application au lieu de la tenir. */}
      {/* 🔴 MANAHOME N'A PAS DE FOND DU TOUT — Aurélien, 14/11/2026, après
          avoir écarté successivement une fresque murale, un fond blanc à
          pixels et une nuit étoilée : « pas de fond du tout ».
          ⛔ ON NE REND PAS LE COMPOSANT, on ne lui donne pas une liste vide.
             `couchesAu()` LÈVE sur une liste vide — « une rotation sans image
             n'est pas une rotation », une invariante posée exprès et tenue par
             un test. Lui passer `[]` a rendu l'écran NOIR, racine React à zéro
             enfant, sans une ligne en console : le composant jetait avant le
             premier rendu. ⭐ Contourner une invariante documentée coûte
             toujours plus cher que de la respecter. */}
      {visage() !== "home" && <Fond />}
      {/* 🔴 LA CARTE SATELLITE EST LE FOND D'ÉCRAN DE TOUT MANAHOME —
          Aurélien, 14/11/2026 : « on va modifier la politique de fonds
          d'écran = carte plein écran vue satellite sur chaque page ». Elle
          n'était en arrière-plan que de l'accueil depuis le matin.
          ⭐ Elle remplace le fond que manahome n'avait plus, et elle le fait
             MIEUX qu'une image : ce qu'on voit derrière le contenu, ce sont
             les lieux que MANA connaît — pas une illustration d'ambiance.
          ⭐ ET C'EST L'EMPLOI SÛR DE CE COMPOSANT. En plein écran, son refus
             d'initialisation rendait la page blanche ; en fond, le même échec
             ne coûte qu'un décor : le contenu reste lisible par-dessus.
          ⚠️ LA RÈGLE EST DANS `fond-du-monde.ts`, PAS ICI — elle doit
             s'interroger, parce qu'elle a deux versants à tenir d'accord :
             où le fond s'affiche, et quels écrans portent déjà une carte.
             « Chaque page » ne peut pas vouloir dire une carte derrière une
             carte : invisible, et un second contexte WebGL sur un téléphone
             est une ressource que le navigateur sacrifie sans prévenir.
          ⚠️ ET ELLE EST HORS DE `.app-colonne`, DONC MONTÉE UNE SEULE FOIS :
             naviguer d'un écran de contenu à l'autre ne recrée pas la carte,
             ne redemande pas ses tuiles et ne perd pas le cadrage. */}
      {carteEnFond(visage(), path) && (
        /* 🔴 VIVANTE SUR L'ACCUEIL — Aurélien, 15/11/2026 : « j'ai demandé la
           carte en plein écran ». L'accueil de MANAhome n'est plus une image
           de carte derrière du texte : c'est LA carte, qu'on déplace et dont
           on clique les sites, avec la devise, la recherche et la barre
           posées dessus.
           ⚠️ Sur les autres écrans elle reste FIGÉE : une carte vivante sous
              un écran de réglages avalerait les gestes destinés aux
              commandes, et personne ne l'a demandée là. */
        <Suspense fallback={null}>
          <CarteMonde enFond vivante={path === "/"} />
        </Suspense>
      )}
      {/* ⭐ LA COLONNE. « Les bulles s'affichent au format mobile partout —
          mobile, desktop, tablette ; seul le fond s'élargit » (31/10). Une
          application, pas un site qui s'étale : le chrome garde la largeur
          d'un téléphone à toutes les tailles d'écran, et le fond tournant
          occupe ce qui dépasse.
          ⚠️ Elle enveloppe TOUT sauf le fond — en-tête, contenu, pied — sinon
             la barre du haut s'étirerait sur un écran large pendant que le
             reste resterait étroit, et l'illusion d'application tomberait au
             premier regard de bureau. */}
      <div className="app-colonne">
      <header className="site-header" ref={barreRef}>
        <div className="wrap">
          {/* ⭐ CINQ ENTRÉES, DANS CET ORDRE — 1/11/2026, décision du
              fondateur : carte · sentiers · MANA · radio · réglages.
              La marque est au CENTRE, et les quatre fonctions se répartissent
              deux à deux autour d'elle. ⚠️ Ce n'est pas qu'une symétrie
              d'allure : au pouce, le centre d'une barre est le point le plus
              difficile à atteindre d'une main — c'est donc la place de ce qui
              se touche le moins, et « revenir à l'accueil » se touche moins
              qu'« ouvrir la carte ».
              ⚠️ ET LES LIBELLÉS SONT PARTIS avec le passage à cinq : à
              28,8 px d'icône et 440 px de colonne, cinq paires icône+mot ne
              tiennent pas. Chacun garde son nom en `.sr-only` — ce qui est
              retiré, c'est le texte À L'ÉCRAN, pas le nom de la commande. */}
          <nav className="nav">
            {/* ⭐ UNE CARTE, PLUS UNE LOUPE — 1/11, demande du fondateur :
                « car il mène vers carte ». L'icône disait « chercher » et
                déposait sur la carte du territoire : le dessin promettait un
                geste, la destination en donnait un autre.
                ⚠️ ET LE COMPORTEMENT SUIT LE DESSIN, pas l'inverse : le
                   `?chercher=1` qui ouvrait le clavier part avec la loupe.
                   Garder le focus sous une icône de carte aurait déplacé
                   l'incohérence au lieu de la corriger — on arriverait sur
                   une carte avec un clavier qu'on n'a pas demandé. */}
            {entreesBarre(visage()).map((e) => {
              const glyphe = (
                <>
                  {e.glyphe === "carte" && <GlyphCarte />}
                  {e.glyphe === "etincelles" && <GlyphEtincelles />}
                  {e.glyphe === "radio" && <GlyphRadio />}
                  {e.glyphe === "reglages" && <GlyphReglages />}
                  {e.glyphe === "sablier" && <GlyphSablier />}
                  {e.glyphe === "contribution" && <GlyphContribution />}
                </>
              );
              /* ⭐ L'ENTRÉE QUI COMMUTE EST UN BOUTON, PAS UN LIEN DÉTOURNÉ.
                 Un `<a href>` dont on annule la navigation laisse une cible
                 qui s'ouvre dans un nouvel onglet au clic du milieu et qui
                 s'annonce « lien » à un lecteur d'écran. Ce qui agit sur la
                 page est un bouton ; ce qui emmène est un lien. */
              if (e.commute === "radio") {
                /* ⛔ ON NE PRÉTEND PAS JOUER QUAND LE POSTE A ÉCHOUÉ. Trois
                   états, trois noms : en lecture, en train de se brancher,
                   indisponible. ⚠️ Le troisième est le plus important —
                   `radio.mana.bzh` peut ne pas répondre, et un anneau qui
                   tourne sur du silence est exactement la promesse que ce
                   dépôt refuse ailleurs sur les marées et la météo. */
                const etat = poste.erreur && !poste.joue
                  ? "sourd"
                  : poste.joue ? "joue" : poste.charge ? "branche" : "muet";
                const dit = {
                  joue: "MANAradio — en écoute, appuyez pour couper",
                  branche: "MANAradio — connexion au direct…",
                  sourd: "MANAradio — le direct ne répond pas, appuyez pour réessayer",
                  muet: "MANAradio — appuyez pour écouter le direct",
                }[etat];
                return (
                  <button
                    key={e.clef}
                    type="button"
                    className={`nav-poste est-${etat}`}
                    aria-pressed={poste.joue}
                    onClick={() => (poste.joue ? couper() : lire())}
                  >
                    {/* ⚠️ L'ANNEAU EST DÉCORATIF ET IL LE DIT. Ce qui porte
                        l'état pour un lecteur d'écran est `aria-pressed` et
                        le nom ci-dessous, jamais le dessin : un liseré doré
                        ne s'entend pas. */}
                    <span className="nav-poste-anneau" aria-hidden="true" />
                    {glyphe}
                    <span className="sr-only">{dit}</span>
                  </button>
                );
              }
              return (
                <a key={e.clef}
                   className={e.glyphe === "marque" ? "brand" : undefined}
                   /* ⚠️ Un lien EXTERNE ne prend pas le préfixe de base, et
                      il s'ouvre ailleurs : `rel` posé parce qu'une cible
                      nouvelle sans lui donne au site ouvert la main sur le
                      nôtre (`window.opener`). */
                   href={e.externe ? e.chemin : `${B}${e.chemin}`}
                   {...(e.externe ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                   aria-current={path === e.chemin.split("?")[0] ? "page" : undefined}>
                  {glyphe}
                  {e.glyphe === "marque"
                    ? e.libelle
                    : <span className={e.motVisible ? "nav-mot" : "sr-only"}>{e.libelle}</span>}
                </a>
              );
            })}
          </nav>
        </div>
      </header>

      {path === "/radio" ? (
        <main className="page">
          <div className="wrap">
            {/* 🔴 EN-TÊTE KAKI — 3/11/2026, même thème que `/carte`. */}
            <header className="entete-kaki">
              <p className="hero-label">Écouter</p>
              <h1 className="page-titre"><span>MANAradio</span></h1>
            </header>

            <Radio />
          </div>
        </main>
      ) : path === "/composer" ? (
        <Composer />
      ) : path === "/promenades" ? (
        /* 🔴 MÊME ÉCRAN QUE `/composer`, DEPUIS LE 3/11/2026 — fusion
           demandée par le fondateur : « on s'épargne un clic ». Les deux
           branches restent SÉPARÉES dans ce ternaire plutôt que combinées
           en `["/composer","/promenades"].includes(path)` : un garde de
           `prefixe.test.ts` extrait chaque route par le motif littéral
           `path === "/…"` pour vérifier qu'elle a son titre — un test qui
           ne lit que le texte du fichier, pas son AST. Les fondre aurait
           rendu `/promenades` invisible à ce garde, silencieusement.
           ⭐ Le catalogue des 1 032 itinéraires, qui vivait dans
           `Promenades.tsx`, est maintenant la seconde moitié de l'écran que
           `Composer.tsx` rend : composer d'abord, parcourir ensuite, sans
           changer d'adresse. `Promenades.tsx` ne garde que les deux
           fonctions pures que `Promenades.test.ts` vérifie
           (`surLaPresquile`, `PRESQUILE`) — plus de composant, plus de JSX. */
        <Composer />
      ) : path === "/balades-office" && avecOffice() ? (
        /* 🔴 EXTRAIT DE `Composer.tsx` LE 3/11/2026 — demande du fondateur :
           carte = nos sites et nos propositions, second onglet = les
           balades de l'Office. Voir `BaladesOT.tsx`. */
        <BaladesOT />
      ) : path === "/espace" ? (
        <Espace base={B} />
      ) : routeRencontres(path) ? (
        <Rencontres base={B} slug={routeRencontres(path)!} />
      ) : routeEnChemin(path) ? (
        /* debout, dehors : une information, des cibles de 56 px, le SOS */
        <EnChemin base={B} slug={routeEnChemin(path)!} />
      ) : routeComplet(path) ? (
        /* ⚠️ L'ANCIENNE PAGE RESTE ATTEIGNABLE, et ce n'est pas de
           l'indécision : elle porte l'export GPX, le profil et la carte
           maplibre, que l'écran de marche n'emporte pas. On ne supprime pas
           une page tant que ce qu'elle seule sait faire n'a pas de toit. */
        <Promenade slug={routeComplet(path)!} />
      ) : routePromenade(path) ? (
        /* assis, au calme : la fiche éditoriale */
        <FichePromenade base={B} slug={routePromenade(path)!} />
      ) : path === "/carte" ? (
        <EcranTerritoire base={B} />
      ) : path === "/territoire" ? (
        <Territoire />
      ) : path === "/l-application" ? (
        <LApplication base={B} />
      ) : path === "/" && visage() === "home" && CARTE_EN_ACCUEIL ? (
        /* 🔴 CHEZ MANAHOME, L'ACCUEIL EST LA CARTE — Aurélien, 14/11/2026 :
           « la page d'accueil est la carte des sites remarquables », puis
           « tout va se faire via la carte => pas de listing ».
           ⚠️ mana.bzh garde son accueil : la devise, la recherche, les trois
              portes. On ne touche qu'à manahome. */
        <Suspense fallback={<main className="page"><div className="wrap">
          <p className="page-texte">Carte…</p></div></main>}>
          <CarteMonde />
        </Suspense>
      ) : path === "/hebergements" ? (
        <Hebergements />
      ) : path === "/contribuer" ? (
        /* 🔴 15/11/2026 : la deuxième colonne de la barre de MANAhome devient
           une porte de contribution — « ajouter / corriger un lieu sur la
           carte + ajouter une photo ». Voir `Contribuer.tsx` pour ce que cet
           écran promet, et surtout pour ce qu'il refuse de promettre. */
        <Contribuer />
      ) : path === "/reglages" ? (
        <Reglages base={B} />
      ) : path === "/mentions-legales" ? (
        <MentionsLegales />
      ) : path === "/contact" ? (
        <main className="page">
          <div className="wrap">
            <p className="hero-label">Nous joindre</p>
            <h1 className="page-titre"><span>Contact</span></h1>
            <section className="page-panel">
              <p className="page-intro">
                Une question sur les promenades, le territoire, un
                partenariat ? Écrivez-nous — nous répondons vite,
                honnêtement, sans prospection forcée.
              </p>
              <ContactForm />
            </section>
          </div>
        </main>
      ) : (
        <>
          {/* ═══ ÉTAT 1 — L'INVITATION ══════════════════════════════════
              ⭐ CE QUI DISPARAÎT ICI N'EST PAS PERDU. L'ancien héros empilait
              un moteur de recherche, UNE promenade, sa vignette, sa distance
              et deux boutons : on arrivait dans un produit, et le territoire
              servait d'illustration. Les quatre promenades restent
              atteignables — par la barre, par le pied de page, par la
              recherche — et l'atlas les montre toutes à la fois.
              ⚠️ Les sections éditoriales qui suivent sont CONSERVÉES : elles
              portent les capacités réelles (hors ligne, sécurité côte, carnet,
              radio). Les supprimer pour alléger la maquette aurait été
              détruire du contenu au nom du design. */}
          <Invitation base={B} />
        </>
      )}

      {/* ⭐ PAS DE PIED SUR LES ÉCRANS-CARTES — 31/10/2026 pour le territoire,
          12/11/2026 pour le compositeur, la même demande du fondateur mot
          pour mot : « masque le footer, la carte est plein écran ». Une carte
          est un OUTIL qu'on tient debout, dehors : un pied de site qui dépasse
          sous la barre flottante y est un bout d'autre chose.
          ⚠️ CE QUE ÇA DÉPLACE, ET IL FAUT LE VÉRIFIER : les mentions légales
             et le contact vivent dans ce pied. Ils restent sur TOUTES les
             autres pages, atteignables en un geste par la barre du bas — on
             masque un chemin, on n'en supprime aucun.
          ⛔ L'attribution des données, elle, ne part PAS avec : elle est sur
             la carte elle-même, parce qu'elle doit voyager avec ce qu'elle
             crédite et non avec la page.
          ⚠️ UNE LISTE, PAS UNE CHAÎNE DE `!==`. Les deux adresses du
             compositeur y sont nommées SÉPARÉMENT (`/promenades` et
             `/composer` rendent le même écran depuis la fusion du 3/11) :
             les fondre en un préfixe masquerait le pied sur une adresse
             future qui commencerait pareil, sans que personne l'ait voulu. */}
      {/* 🔴 LE PIED A DÉMÉNAGÉ DANS RÉGLAGES — Aurélien, 14/11/2026 : « le
          footer doit disparaître partout, et vivre dans l'onglet réglages ».
          ⛔ Borné à manahome, parce que la consigne qui tient depuis ce matin
             est « on ne touche qu'à manahome.org ». Sur mana.bzh le pied
             reste — ⏳ à étendre d'un mot si « partout » voulait dire les deux.
          ⚠️ ET CE RETRAIT A UN COÛT QUI SE DIT : le pied était le SEUL
             endroit présent sur toutes les pages, donc le seul à désigner les
             pages indexables par un lien interne. Les déplacer dans Réglages
             les laisse atteignables par un humain, mais un moteur qui ne
             traverse pas cet écran ne les verra plus se faire citer. */}
      {!SANS_PIED.has(path) && visage() !== "home" && (
      <footer className="site-footer">
        <ContenuDuPied B={B} />
      </footer>
      )}
      </div>
    </>
  );
}

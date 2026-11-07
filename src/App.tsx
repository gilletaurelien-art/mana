import { useState } from "react";
import { useEffect, useRef, useLayoutEffect } from "react";
import { usePath, baseUrl, routePromenade, routeEnChemin, routeRencontres, routeComplet } from "./router";
import {
  GlyphRadio,
  GlyphEtincelles,
  GlyphReglages,
  GlyphNavigation,
  GlyphSecurite,
  GlyphDecouverte,
  GlyphCarte,
  GlyphSentier,
} from "./Glyphs";
import { Invitation } from "./Invitation";
import { LApplication } from "./LApplication";
import { avecOffice, visage, titrePourLHote } from "./visage";
import { entreesBarre, liensPied } from "./barre";
import { Reglages } from "./Reglages";
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

// MANAradio : au centre du hub — la radio de l'écosystème, en
// sommeil comme le backend (aucun flux simulé), mais positionnée.



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
  "/balades-office": "Les balades de l'Office de tourisme — presqu'île de Crozon & Aulne maritime — MANA.bzh",
  "/territoire": "Le territoire — MANA.bzh",
  /* ⚠️ CE TITRE EST CELUI D'UNE PAGE D'ENTRÉE, pas d'un sous-écran : c'est
     lui qui paraît dans un résultat de recherche pour « application
     randonnée Crozon ». Il nomme le territoire, parce qu'une page qui ne dit
     pas OÙ elle s'applique ne répond à personne. */
  "/l-application": "Ce que fait l'application — promenades, hors ligne et sécurité en presqu'île de Crozon — MANA.bzh",
  "/reglages": "Réglages, sources et mentions — MANA.bzh",
  "/espace": "Mon espace — MANA.bzh",
  "/contact": "Contact — MANA.bzh",
  "/mentions-legales": "Mentions légales — MANA.bzh",
};

export default function App() {
  const path = usePath();
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
      <Fond />
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
            {entreesBarre(visage()).map((e) => (
              <a key={e.clef}
                 className={e.glyphe === "marque" ? "brand" : undefined}
                 href={`${B}${e.chemin}`}
                 aria-current={path === e.chemin.split("?")[0] ? "page" : undefined}>
                {e.glyphe === "carte" && <GlyphCarte />}
                {e.glyphe === "etincelles" && <GlyphEtincelles />}
                {e.glyphe === "radio" && <GlyphRadio />}
                {e.glyphe === "reglages" && <GlyphReglages />}
                {e.glyphe === "marque"
                  ? e.libelle
                  : <span className={e.motVisible ? "nav-mot" : "sr-only"}>{e.libelle}</span>}
              </a>
            ))}
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
        /* debout, dehors : une information, des cibles de 56 px, le 112 */
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

      {/* ⭐ PAS DE PIED SUR L'ÉCRAN DU TERRITOIRE — 31/10/2026, demande du
          fondateur : « masque le footer, carte en plein écran ». Le jeu de
          cartes est un OUTIL qu'on tient debout, dehors : un pied de site qui
          dépasse sous la barre flottante y est un bout d'autre chose.
          ⚠️ CE QUE ÇA DÉPLACE, ET IL FAUT LE VÉRIFIER : les mentions légales
             et le contact vivent dans ce pied. Ils restent sur TOUTES les
             autres pages, atteignables en un geste par la barre du bas — on
             masque un chemin, on n'en supprime aucun.
          ⛔ L'attribution des données, elle, ne part PAS avec : elle est sur
             la carte elle-même, parce qu'elle doit voyager avec ce qu'elle
             crédite et non avec la page. */}
      {path !== "/carte" && (
      <footer className="site-footer">
        <div className="wrap footer-colonnes">
          <div>
            <p className="brand">
              MANA<em>.bzh</em>
            </p>
            <p className="footer-note">
              Presqu'île de Crozon. Hors ligne, GPS, GPX. Gratuit, aucune
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
      </footer>
      )}
      </div>
    </>
  );
}

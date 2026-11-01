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
import { Promenades } from "./Promenades";
import { Invitation } from "./Invitation";
import { Reglages } from "./Reglages";
import { EcranTerritoire } from "./EcranTerritoire";
import { Composer } from "./Composer";
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
 * LES CINQ SECTIONS DE L'ACCUEIL — développées pour le référencement
 * (SEO), les moteurs génératifs (GEO) et les moteurs de réponse (AEO).
 * Demande du fondateur, 1/11/2026.
 *
 * ⭐ CE QU'UN MOTEUR DE RÉPONSE SAIT EXTRAIRE, C'EST UNE PHRASE QUI RÉPOND —
 *    pas une phrase qui vend. « Une expérience unique au cœur de la
 *    Bretagne » n'est citable par personne ; « 46 circuits balisés par
 *    l'Office de tourisme, 708 km, sur 11 communes » l'est. D'où des
 *    déclaratives courtes, des entités nommées et des NOMBRES RÉELS.
 *
 * ⛔ ET CHAQUE CHIFFRE A ÉTÉ COMPTÉ DANS L'ARTEFACT, PAS RAPPELÉ. 46 · 708 km
 *    · 11 communes · 1 358 lieux · 624 nommés · 196 fortifications · 118
 *    plages · 85 mégalithes : tous relevés le 1/11 dans `ot.json` et
 *    `lieux.json`. Un nombre écrit de mémoire sur une page d'accueil est le
 *    faux témoin le plus coûteux qui soit — il est cité par des machines.
 *
 * 🔴 ET CHAQUE PROMESSE A ÉTÉ VÉRIFIÉE DANS LE CODE AVANT D'ÊTRE ÉCRITE :
 *    le SOS 112 par SMS avec la position (`EnChemin.tsx`), la boussole
 *    (`deviceorientation`, `Promenade.tsx`), l'export GPX (`Promenade.tsx`),
 *    le renvoi au SHOM pour les marées. ⭐ Ce fichier porte déjà la cicatrice
 *    de l'inverse : il a annoncé pendant trois jours des filtres
 *    « poussette/PMR » retirés précisément pour que personne ne parte en
 *    poussette sur un sentier de falaise.
 *
 * ⚠️ LES `faits` NE SONT PAS DES ARGUMENTS, ce sont des FAITS — trois par
 *    section, vérifiables, qu'un moteur peut citer sans nous citer.
 */
const MODULES = [
  {
    glyphe: GlyphNavigation,
    num: "01",
    titre: "Navigation & cartographie hors ligne",
    accroche: "Le parcours dans la poche.",
    texte:
      "Le tracé de la promenade reste disponible sans réseau : il est stocké dans le navigateur au premier chargement. La position et le cap viennent du GPS et de la boussole de l’appareil, et ne quittent jamais le téléphone. Hors ligne, le parcours s’affiche en schéma — le fond de carte, lui, demande du réseau, et nous le disons plutôt que de laisser un écran blanc l’apprendre au promeneur.",
    faits: [
      "16 210 tronçons de chemin relevés sur la presqu’île de Crozon, 20 779 sur l’Aulne maritime.",
      "Fonds de carte au choix : plan OpenStreetMap ou vue aérienne de l’IGN.",
      "Les tuiles passent par nos serveurs : ni OpenStreetMap ni l’IGN n’apprennent votre adresse IP.",
    ],
    cta: { label: "Voir les sentiers", href: "/promenades" },
  },
  {
    glyphe: GlyphSecurite,
    num: "02",
    titre: "Sécurité sur la côte",
    accroche: "Prudence honnête.",
    texte:
      "Un bouton d’appel au 112 prépare un SMS contenant votre position GPS, à envoyer aux secours ou à un proche — vous relisez avant d’envoyer, rien ne part tout seul. Les marées et la météo ne sont jamais calculées ici : l’application renvoie au SHOM et à Météo-France. Une prévision simulée sur un sentier de falaise n’est pas une approximation, c’est un danger.",
    faits: [
      "SOS 112 : la position est écrite dans le SMS, pas envoyée à un serveur.",
      "Marées : renvoi au SHOM. Météo : renvoi aux sources officielles. Aucune donnée simulée.",
      "Le relief et le trait de côte ne sont pas dessinés : nous n’affichons que ce que la donnée contient.",
    ],
    cta: { label: "Découvrir", href: "/promenades" },
  },
  {
    glyphe: GlyphDecouverte,
    num: "03",
    titre: "Patrimoine de la presqu’île",
    accroche: "Ce qu’on croise en chemin.",
    /* 🔴 CE TEXTE PROMETTAIT LES FILTRES « POUSSETTE/PMR » ET « CHIENS »,
       retirés le 28/10/2026 parce qu'OpenStreetMap ne porte pas ces attributs
       — et retirés précisément pour que personne ne parte en poussette sur un
       sentier de falaise. La page d'accueil a continué de les annoncer.
       ⭐ Une suppression se fait dans le code ET dans ce qui la promet. Le
          premier endroit où une fonction existe encore après sa mort, c'est
          la phrase qui la vendait. */
    texte:
      "L’application recense 1 358 sites remarquables sur la presqu’île de Crozon et l’Aulne maritime, dont 624 portent un nom : fortifications du goulet, alignements mégalithiques, fontaines, calvaires, plages, pointes et épaves. Chaque fiche de balade indique les sites situés à moins de 150 mètres du tracé — à proximité, jamais « sur le chemin », parce qu’un détour annoncé comme une étape envoie chercher ce qui n’est pas là.",
    faits: [
      "196 fortifications, 183 fontaines et lavoirs, 138 calvaires, 118 plages, 85 mégalithes.",
      "Les 734 sites sans nom sont dessinés sur la carte, mais ne sont jamais cités seuls.",
      "Sources : OpenStreetMap sous licence ODbL. Chaque lieu renvoie à son objet d’origine.",
    ],
    cta: { label: "Explorer les lieux", href: "/carte?vue=carte" },
  },
  {
    glyphe: GlyphSentier,
    num: "04",
    titre: "Carnet, export GPX et circuits balisés",
    accroche: "Gardez la trace.",
    texte:
      "Chaque promenade s’exporte en GPX, lisible par toutes les montres et applications de randonnée. Le carnet garde vos balades dans ce navigateur, sans compte ni adresse : ce qui n’est pas stocké ne fuit pas. L’application présente aussi les 46 circuits balisés par l’Office de tourisme Presqu’île de Crozon – Aulne Maritime, crédités comme tels — MANA ne s’attribue rien et ne recommande rien.",
    faits: [
      "46 circuits balisés, 708 km, sur 11 communes : Crozon, Camaret-sur-Mer, Roscanvel, Landévennec, Argol, Telgruc-sur-Mer, Lanvéoc, Le Faou, Pont-de-Buis-lès-Quimerch, Plomodiern, Hanvec.",
      "25 à pied, 12 en VTT, 5 à vélo, 4 en trail. Durées et dénivelés déclarés par l’Office.",
      "Export GPX, fonctionne hors ligne. Aucun compte, aucune donnée personnelle enregistrée.",
    ],
    cta: { label: "Ouvrir un parcours", href: "/promenades" },
  },
];

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
            <a href={`${B}/carte?vue=carte`}
               aria-current={path === "/carte" ? "page" : undefined}>
              <GlyphCarte />
              <span className="sr-only">La carte du territoire</span>
            </a>
            {/* ⭐ DES ÉTINCELLES, PLUS UNE CARTE — 1/11, demande du fondateur.
                Elle mène à `/promenades`, qui s'intitule « Les sentiers » :
                7 itinéraires tracés d'après OpenStreetMap et les 46 circuits
                de l'Office. ⚠️ PAS à `/carte` — l'icône n°1 y mène déjà, et
                deux portes voisines vers la même page ne se distinguent que
                par leur dessin. C'est la troisième fois en deux jours que ce
                doublon-là se présente ; il se vérifie maintenant en lisant
                les `href`, jamais les libellés. */}
            <a href={`${B}/promenades`} aria-current={path === "/promenades" ? "page" : undefined}>
              <GlyphEtincelles />
              <span className="sr-only">Les sentiers</span>
            </a>
            {/* ⚠️ « MANA » seul ICI, « MANA.bzh » dans le pied : ce n'est pas
                une incohérence. Le pied est l'endroit où l'on signe. */}
            <a className="brand" href={`${B}/`} aria-current={path === "/" ? "page" : undefined}>
              MANA
            </a>
            <a href={`${B}/radio`} aria-current={path === "/radio" ? "page" : undefined}>
              <GlyphRadio />
              <span className="sr-only">MANAradio</span>
            </a>
            <a href={`${B}/reglages`} aria-current={path === "/reglages" ? "page" : undefined}>
              <GlyphReglages />
              <span className="sr-only">Réglages</span>
            </a>
          </nav>
        </div>
      </header>

      {path === "/radio" ? (
        <main className="page">
          <div className="wrap">
            <p className="hero-label">Écouter</p>
            <h1 className="page-titre"><span>MANAradio</span></h1>

            <Radio />
          </div>
        </main>
      ) : path === "/composer" ? (
        <Composer />
      ) : path === "/promenades" ? (
        <Promenades />
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

          <main className="wrap">
            {MODULES.map((m) => {
              const G = m.glyphe;
              return (
              <section key={m.num} className="landing-section bulle">
                <p className="section-num">{m.num}</p>
                <G size={36} />
                <h2 className="section-title">{m.titre}</h2>
                <p className="section-accroche-courte">{m.accroche}</p>
                <p className="section-texte">{m.texte}</p>
                {/* ⭐ TROIS FAITS, EN LISTE. Un moteur de réponse extrait une
                    liste bien mieux qu'un paragraphe : chaque élément est une
                    affirmation close, avec son sujet et son chiffre. Et la
                    liste sert aussi l'œil humain qui balaie — ce n'est pas
                    une concession faite aux machines. */}
                <ul className="section-faits">
                  {m.faits.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <div className="est-actions">
                  <a className="btn btn-primary" href={`${B}${m.cta.href}`}>
                    {m.cta.label}
                  </a>
                </div>
              </section>
              );
            })}

            {/* 05 — MANAradio : en ligne */}
            <section className="landing-section bulle">
              <p className="section-num">05</p>
              <GlyphRadio size={36} />
              <h2 className="section-title">MANAradio</h2>
              <div className="sous-bulle">
                {/* ⛔ CETTE LIGNE DISAIT « En ligne. » EN DUR. Une affirmation
                    d'état écrite dans le code est vraie tant que l'état l'est —
                    et la page d'accueil aurait annoncé l'antenne ouverte un
                    soir où elle est coupée. L'état vivant se lit sur /radio,
                    où il est mesuré ; ici on nomme la chose, pas son état. */}
                <p className="section-accroche-courte">La radio de l'Alliance.</p>
                <p className="section-texte">
                  Une antenne continue, à écouter en marchant ou au coin du
                  feu. La lecture se poursuit d'un écran à l'autre : on peut
                  ouvrir la carte, lire une fiche de balade ou régler le fond
                  sans couper le son. Le titre et l'artiste en cours
                  s'affichent sur la page de la radio, lus à la source —
                  jamais devinés entre deux morceaux.
                </p>
                {/* ⛔ CE QU'ON N'ÉCRIT PAS ICI : une programmation, des
                    horaires, un nombre d'auditeurs. Rien de tout cela n'est
                    mesuré depuis cette page, et un chiffre d'audience sur une
                    page d'accueil est exactement le genre d'affirmation que
                    personne ne revient corriger. ⭐ Les trois faits ci-dessous
                    sont des propriétés du dispositif, pas des promesses
                    d'antenne — ils restent vrais quelle que soit la grille. */}
                <ul className="section-faits">
                  <li>Le flux continue quand on navigue dans l'application.</li>
                  <li>Couper arrête vraiment le téléchargement : aucune donnée mobile consommée en silence.</li>
                  <li>Aucun compte, aucun traceur, aucune mesure d'audience tierce.</li>
                </ul>
                <div className="est-actions">
                  <a className="btn btn-clair" href={`${B}/radio`}>
                    Écouter MANAradio
                  </a>
                </div>
              </div>
            </section>
          </main>
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
            <a href={`${B}/promenades`}>Promenades</a>
            <a href={`${B}/carte`}>La carte</a>
            <a href={`${B}/radio`}>MANAradio</a>
            <a href={`${B}/territoire`}>Le territoire</a>
            <a href={`${B}/contact`}>Contact</a>
            <a href={`${B}/mentions-legales`}>Mentions légales</a>
          </nav>
        </div>
      </footer>
      )}
      </div>
    </>
  );
}

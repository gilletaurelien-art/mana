import { useState } from "react";
import { useEffect, useRef, useLayoutEffect } from "react";
import { usePath, baseUrl, routePromenade, routeEnChemin, routeRencontres, routeComplet } from "./router";
import {
  GlyphRadio,
  GlyphNavigation,
  GlyphSecurite,
  GlyphDecouverte,
  GlyphCarte,
  GlyphSentier,
} from "./Glyphs";
import { Promenades } from "./Promenades";
import { Invitation } from "./Invitation";
import { Territoire2030 } from "./Territoire2030";
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

// Les 4 modules de la promenade, autour de la radio.
const MODULES = [
  {
    glyphe: GlyphNavigation,
    num: "01",
    titre: "Navigation & cartographie",
    accroche: "Le parcours dans la poche.",
    texte:
      "Le tracé reste dans la poche sans réseau. GPS et boussole, aucun rappel à l'ordre si vous coupez ailleurs. Hors ligne, le parcours s'affiche en schéma : le fond de carte, lui, demande du réseau.",
    cta: { label: "Voir les parcours", href: "/promenades" },
  },
  {
    glyphe: GlyphSecurite,
    num: "02",
    titre: "Sécurité côte",
    accroche: "Prudence honnête.",
    texte:
      "SOS en un geste : position GPS par SMS, aux secours ou aux proches. Marées et météo : renvoi aux sources officielles. Aucune donnée simulée.",
    cta: { label: "Découvrir", href: "/promenade/forts-du-goulet" },
  },
  {
    glyphe: GlyphDecouverte,
    num: "03",
    titre: "Découverte & patrimoine",
    accroche: "Ce qu'on croise.",
    /* 🔴 CE TEXTE PROMETTAIT LES FILTRES « POUSSETTE/PMR » ET « CHIENS »,
       retirés le 28/10/2026 parce qu'OpenStreetMap ne porte pas ces attributs
       — et retirés précisément pour que personne ne parte en poussette sur un
       sentier de falaise. La page d'accueil a continué de les annoncer.
       ⭐ Une suppression se fait dans le code ET dans ce qui la promet. Le
          premier endroit où une fonction existe encore après sa mort, c'est
          la phrase qui la vendait. */
    texte:
      "Lieux, faune et flore croisés sur le parcours. Filtres : durée, boucle ou aller simple.",
    cta: { label: "Explorer", href: "/promenades" },
  },
  {
    glyphe: GlyphSentier,
    num: "04",
    titre: "Carnet & export",
    accroche: "Gardez la trace.",
    texte:
      "Export GPX, lisible par toutes les montres et applications. Fonctionne hors ligne.",
    cta: { label: "Ouvrir un parcours", href: "/promenade/anse-saint-nicolas" },
  },
];

export default function App() {
  const path = usePath();

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
          <nav className="nav">
            {/* ⚠️ « ici » n'est pas « cette URL exactement ». Une fiche de
                promenade (`/promenade/anse-saint-nicolas`) est DANS la section
                Promenades : l'or doit y rester allumé, sinon il s'éteint
                précisément au moment où l'on s'enfonce dans la section. */}
            <a href={`${B}/radio`} aria-current={path === "/radio" ? "page" : undefined}>
              <GlyphRadio size={48} />
              <span>Radio</span>
            </a>
            {/* La barre du bas garde Radio et la Carte, de part et d'autre
                de la marque.
                ⭐ LA CARTE REMPLACE LES PROMENADES — 31/10/2026. La boussole
                qui occupait cette place menait à la LISTE ; la carte, elle,
                est le geste qu'on fait debout, dehors, avec le pouce. Et le
                bouton « Explorer la carte » de l'accueil part avec ce
                changement : une fonction à deux endroits, dont l'un est
                permanent, est une fonction dupliquée.
                ⚠️ `/promenades` n'est pas orpheline pour autant : elle reste
                dans le pied, sur toutes les pages, et c'est la seule chose
                qui comptait.
                ⚠️ « MANA » seul ICI, « MANA.bzh » dans le pied : ce n'est pas
                une incohérence. Le pied est l'endroit où l'on signe. */}
            <a className="brand" href={`${B}/`} aria-current={path === "/" ? "page" : undefined}>
              MANA
            </a>
            <a
              href={`${B}/carte`}
              aria-current={path === "/carte" ? "page" : undefined}
            >
              <GlyphCarte size={48} />
              <span>Carte</span>
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
        <Territoire2030 base={B} />
      ) : path === "/territoire" ? (
        <Territoire />
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
                <p className="section-texte">{m.texte}</p>
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
                <p className="section-accroche">La radio de l'Alliance.</p>
                <p className="section-texte">
                  À écouter en marchant — ou au coin du feu.
                </p>
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
            <a href={`${B}/promenades`}>Promenades</a>
            <a href={`${B}/promenade/forts-du-goulet`}>Les forts du goulet</a>
            <a href={`${B}/promenade/saint-fiacre`}>Saint-Fiacre</a>
            <a href={`${B}/promenade/anse-saint-nicolas`}>L'Anse Saint-Nicolas</a>
            <a href={`${B}/radio`}>MANAradio</a>
            <a href={`${B}/territoire`}>Le territoire</a>
            <a href={`${B}/contact`}>Contact</a>
            <a href={`${B}/mentions-legales`}>Mentions légales</a>
          </nav>
        </div>
      </footer>
      </div>
    </>
  );
}

import { useState } from "react";
import { useRef, useLayoutEffect } from "react";
import { usePath, baseUrl, routePromenade } from "./router";
import {
  GlyphRadio,
  GlyphNavigation,
  GlyphSecurite,
  GlyphDecouverte,
  GlyphBoussole,
  GlyphSentier,
} from "./Glyphs";
import { Promenades } from "./Promenades";
import { Invitation } from "./Invitation";
import { Composer } from "./Composer";
import { Promenade } from "./Promenade";
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
      "Le tracé reste dans la poche sans réseau. GPS en temps réel avec boussole — et aucun rappel à l'ordre si vous coupez ailleurs : un parcours se prend, il ne se suit pas. Le fond de carte, lui, demande du réseau — hors ligne, le parcours s'affiche en schéma.",
    cta: { label: "Voir les parcours", href: "/promenades" },
  },
  {
    glyphe: GlyphSecurite,
    num: "02",
    titre: "Sécurité côte",
    accroche: "Prudence honnête.",
    texte:
      "SOS en un geste : position GPS partagée par SMS aux secours ou aux proches. Marées et météo : renvoi systématique vers les sources officielles — aucune donnée simulée.",
    cta: { label: "Découvrir", href: "/promenade/forts-du-goulet" },
  },
  {
    glyphe: GlyphDecouverte,
    num: "03",
    titre: "Découverte & patrimoine",
    accroche: "La Bretagne racontée.",
    texte:
      "Anecdotes du littoral, faune et flore, filtres concrets : durée, poussette/PMR, chiens, boucle ou aller-retour.",
    cta: { label: "Explorer", href: "/promenades" },
  },
  {
    glyphe: GlyphSentier,
    num: "04",
    titre: "Carnet & export",
    accroche: "Gardez la trace.",
    texte:
      "Export GPX en un clic, lisible par toutes les montres et applications. Fonctionne hors ligne, du cap à la grève — le réseau n'attendra pas, nous non plus.",
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
            {/* La barre du bas ne garde que Radio et Promenades, de part et
                d'autre de la marque. La recherche pointait vers l'accueil — un
                bouton qui ne cherche rien — et « Territoire » reste atteignable
                depuis le pied de page, sur toutes les pages : la page n'est
                donc pas orpheline, ce qui est la seule chose qui comptait.
                ⚠️ « MANA » seul ICI, « MANA.bzh » dans le pied : ce n'est pas
                une incohérence. Le pied est l'endroit où l'on signe. */}
            <a className="brand" href={`${B}/`} aria-current={path === "/" ? "page" : undefined}>
              MANA
            </a>
            <a
              href={`${B}/promenades`}
              aria-current={path.startsWith("/promenade") ? "page" : undefined}
            >
              <GlyphBoussole size={48} />
              <span>Promenades</span>
            </a>
          </nav>
        </div>
      </header>

      {path === "/radio" ? (
        <main className="page">
          <div className="wrap">
            <p className="hero-label">Écouter</p>
            <h1 className="page-titre"><span>MANAradio</span></h1>

            <section className="page-panel radio-player-panel">
              <div className="radio-player">
                <button
                  type="button"
                  className="radio-play"
                  aria-label="Lecture"
                  title="Hors antenne — bientôt"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.5 5.5v13l10-6.5z" />
                  </svg>
                </button>
                <div className="radio-infos">
                  <p className="radio-etat">Hors antenne</p>
                  <p className="radio-note">Le direct arrivera bientôt — aucun flux simulé.</p>
                </div>
              </div>
            </section>

            <section className="page-panel">
              <p className="apercu-label">En cours</p>
              <p className="page-texte">
                Aucun titre à l'antenne pour l'instant. Les épisodes
                et la programmation s'afficheront ici dès la première
                émission réelle.
              </p>
            </section>
          </div>
        </main>
      ) : path === "/composer" ? (
        <Composer />
      ) : path === "/promenades" ? (
        <Promenades />
      ) : routePromenade(path) ? (
        <Promenade slug={routePromenade(path)!} />
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
                <p className="section-accroche">En ligne.</p>
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
              Promenades bretonnes — hors ligne, GPS, GPX. Gratuit,
              sobre, aucune donnée revendue.
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
    </>
  );
}

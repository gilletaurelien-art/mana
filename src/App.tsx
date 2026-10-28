import { useState } from "react";
import { usePath, baseUrl, routePromenade } from "./router";
import { WALKS } from "./walks";
import {
  GlyphRecherche,
  GlyphRadio,
  GlyphNavigation,
  GlyphSecurite,
  GlyphDecouverte,
  GlyphSentier,
  GlyphTerritoire,
} from "./Glyphs";
import { WalkMap } from "./WalkMap";
import { Promenades } from "./Promenades";
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
      "Hors ligne (PWA) : carte et parcours restent sans réseau. GPS en temps réel avec boussole, alerte si vous vous éloignez de 50 m du sentier, profil d'altitude lisible.",
    cta: { label: "Voir les parcours", href: "/promenades" },
  },
  {
    glyphe: GlyphSecurite,
    num: "02",
    titre: "Sécurité côte",
    accroche: "Prudence honnête.",
    texte:
      "SOS en un geste : position GPS partagée par SMS aux secours ou aux proches. Marées et météo : renvoi systématique vers les sources officielles — aucune donnée simulée.",
    cta: { label: "Découvrir", href: "/promenade/gr34-crozon" },
  },
  {
    glyphe: GlyphDecouverte,
    num: "03",
    titre: "Découverte & patrimoine",
    accroche: "La Bretagne racontée.",
    texte:
      "Audio-guide vocal discret aux points d'intérêt, anecdotes du littoral, filtres concrets : durée, poussette/PMR, chiens, boucle ou aller-retour.",
    cta: { label: "Explorer", href: "/promenades" },
  },
  {
    glyphe: GlyphSentier,
    num: "04",
    titre: "Carnet & export",
    accroche: "Gardez la trace.",
    texte:
      "Export GPX en un clic, lisible par toutes les montres et applications. Fonctionne hors ligne, du cap à la grève — le réseau n'attendra pas, nous non plus.",
    cta: { label: "Ouvrir un parcours", href: "/promenade/pointe-du-raz" },
  },
];

export default function App() {
  const path = usePath();
  const [lieu, setLieu] = useState("");

  const chercher = () => {
    const q = lieu.trim();
    window.location.assign(`${B}/promenades${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <nav className="nav">
            <a href={`${B}/`} aria-label="Rechercher — accueil" title="Rechercher">
              <GlyphRecherche />
              <span className="sr-only">Rechercher</span>
            </a>
            <a href={`${B}/radio`}>
              <GlyphRadio />
              <span>Radio</span>
            </a>
            <a className="brand" href={`${B}/`}>
              MANA<em>.bzh</em>
            </a>
            <a href={`${B}/promenades`}>
              <GlyphSentier />
              <span>Promenades</span>
            </a>
            <a href={`${B}/territoire`}>
              <GlyphTerritoire />
              <span>Territoire</span>
            </a>
          </nav>
        </div>
      </header>

      {path === "/radio" ? (
        <main className="page">
          <div className="wrap">
            <p className="hero-label">Écouter</p>
            <h1 className="page-titre">MANAradio</h1>
            <section className="page-panel">
              <p className="page-intro">
                La radio du territoire : histoires de promenades,
                légendes du littoral, voix de celles et ceux qui
                font la Bretagne. Épisode après épisode, à écouter
                en marchant.
              </p>
              <div className="est-actions" style={{ marginTop: "var(--sp-2)" }}>
                <a className="btn btn-primary" href="mailto:radio@mana.bzh">
                  Proposer une histoire
                </a>
              </div>
              <p className="page-note">
                Lecteur audio et épisodes en préparation — aucune
                émission simulée en attendant les vraies.
              </p>
            </section>
          </div>
        </main>
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
            <h1 className="page-titre">Contact</h1>
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
          <section className="hero">
            <div className="wrap bulle-xl hero-moteur">
              <p className="hero-label">Terre, Mer & Lumière — Bretagne</p>
              <h1 className="brand-grand">Promenons nous</h1>
              <p className="hero-label">en Armor & Argoat</p>

              {/* Moteur de saisie de localité */}
              <div className="moteur-barre" role="search" aria-label="Rechercher une localité">
                <svg className="moteur-loupe" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m15.5 15.5 4.5 4.5" />
                </svg>
                <input
                  id="moteur-lieu"
                  type="search"
                  autoComplete="off"
                  placeholder="Au départ de…"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && chercher()}
                />
                <button
                  type="button"
                  className="moteur-fleche"
                  aria-label="Rechercher"
                  onClick={chercher}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 12h15" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </button>
              </div>

              {/* La balade : une seule, avec sa carte */}
              <a className="balade-unique" href={`${B}/promenade/${WALKS[0].slug}`}>
                <div className="balade-carte">
                  <WalkMap walk={WALKS[0]} width={280} height={180} />
                </div>
                <p className="swipe-lieu">{WALKS[0].lieu}</p>
                <p className="swipe-titre">{WALKS[0].titre}</p>
                <p className="swipe-meta">
                  {WALKS[0].distanceKm} km · {WALKS[0].dureeH} h · {WALKS[0].difficulte}
                </p>
              </a>
            </div>
          </section>

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
                  La radio du territoire émet : histoires bretonnes,
                  voix des promeneurs, murmures du littoral. À écouter
                  en marchant — ou au coin du feu.
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
              Les promenades bretonnes : parcours hors ligne (PWA),
              GPS et sécurité, découverte du patrimoine, export GPX.
              Gratuit, sobre, sans traceur publicitaire ; aucune
              donnée ni lead n'est revendu. MANAradio, au centre,
              émettra bientôt.
            </p>
            <ContactForm />
          </div>
          <nav className="footer-nav" aria-label="Pied de page">
            <a href={`${B}/promenades`}>Promenades</a>
            <a href={`${B}/promenade/gr34-crozon`}>GR34 — Crozon</a>
            <a href={`${B}/promenade/pointe-du-raz`}>Pointe du Raz</a>
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

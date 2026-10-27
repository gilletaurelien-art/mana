import { useState } from "react";
import {
  GlyphPorte,
  GlyphMaison,
  GlyphRencontre,
  GlyphFrance,
  GlyphTerritoire,
  GlyphEcosysteme,
} from "./Glyphs";
import { usePath, baseUrl, routePromenade } from "./router";
import { Ecosysteme } from "./Ecosysteme";
import { Territoire } from "./Territoire";
import { Promenades } from "./Promenades";
import { Promenade } from "./Promenade";
import { MentionsLegales } from "./MentionsLegales";
import { ContactForm } from "./ContactForm";
import { GlyphSentier } from "./Glyphs";

const B = baseUrl();

// Hero-moteur : la porte d'entrée EST le produit.
// Segments : les services MANA + le territoire ; le champ affine
// l'intention (« Commune ou projet ») et la flèche route.
const MOTEUR_CATEGORIES = [
  { v: "home", l: "Home", glyph: GlyphMaison },
  { v: "love", l: "Love", glyph: GlyphRencontre },
  { v: "france", l: "France", glyph: GlyphFrance },
  { v: "territoire", l: "Le territoire", glyph: GlyphTerritoire },
];

const SECTIONS = [
  {
    glyphe: GlyphEcosysteme,
    num: "01",
    titre: "L'écosystème MANA",
    accroche: "Quatre services, une même exigence.",
    texte:
      "mana.bzh est la porte ; manahome.org couvre l'habitat ; mana.love la rencontre ; manafrance.org l'horizon national. Gratuité des services grand public, aucune revente de données, sobriété : les mêmes règles partout.",
    cta: { label: "Découvrir l'écosystème", href: "/ecosysteme" },
  },
  {
    glyphe: GlyphTerritoire,
    num: "02",
    titre: "Un territoire, des services",
    accroche: "La Bretagne, concrètement.",
    texte:
      "Trouver un logement, comprendre une commune, s'installer durablement : l'écosystème MANA travaille le territoire réel — données sourcées (geo.api.gouv.fr), présentation honnête, zéro compteur de vanité.",
    cta: { label: "Découvrir le territoire", href: "/territoire" },
  },
  {
    glyphe: GlyphMaison,
    num: "03",
    titre: "L'habitat, autrement",
    accroche: "Gratuit, accompagné, lisible par les IA.",
    texte:
      "manahome.org — le pilote territorial de Crozon (Finistère) : annonces gratuites, estimation indicative, services à l'habitat, index des communes. Sans commission, sans mise en avant payante.",
    cta: { label: "Voir manahome.org", href: "https://manahome.org/" },
  },
  {
    glyphe: GlyphSentier,
    num: "04",
    titre: "Promenades & découvertes",
    accroche: "Le territoire, à pied.",
    texte:
      "Des parcours bretons qui marchent hors ligne : carte et profil d'altitude dans la poche, GPS et alerte hors-sentier, audio-guide discret, export GPX. Marées et météo : sources officielles uniquement.",
    cta: { label: "Découvrir les promenades", href: "/promenades" },
  },
];

export default function App() {
  const path = usePath();
  const [moteurCategorie, setMoteurCategorie] = useState("home");
  const [moteurLieu, setMoteurLieu] = useState("");

  const moteurRechercher = () => {
    if (moteurCategorie === "territoire") {
      window.location.assign(`${B}/territoire`);
      return;
    }
    const q = moteurLieu.trim();
    if (moteurCategorie === "home") {
      window.location.assign(
        `https://manahome.org/${q ? `annonces/${encodeURIComponent(q)}` : ""}`
      );
    } else if (moteurCategorie === "love") {
      window.location.assign("https://mana.love/");
    } else {
      window.location.assign("https://manafrance.org/");
    }
  };

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <a className="brand" href={`${B}/`}>
            MANA<em>.bzh</em>
          </a>
          <nav className="nav">
            <a href={`${B}/ecosysteme`}>
              <GlyphEcosysteme />
              <span>Écosystème</span>
            </a>
            <a href={`${B}/territoire`}>
              <GlyphTerritoire />
              <span>Territoire</span>
            </a>
            <a href={`${B}/promenades`}>
              <GlyphSentier />
              <span>Promenades</span>
            </a>
            <a href="https://manahome.org/" target="_blank" rel="noopener noreferrer">
              <GlyphMaison />
              <span>MANAhome</span>
            </a>
            <a href="https://mana.love/" target="_blank" rel="noopener noreferrer">
              <GlyphRencontre />
              <span>MANA.love</span>
            </a>
            <a href="https://manafrance.org/" target="_blank" rel="noopener noreferrer">
              <GlyphFrance />
              <span>MANAfrance</span>
            </a>
          </nav>
        </div>
      </header>

      {path === "/ecosysteme" ? (
        <Ecosysteme />
      ) : path === "/territoire" ? (
        <Territoire />
      ) : path === "/promenades" ? (
        <Promenades />
      ) : routePromenade(path) ? (
        <Promenade slug={routePromenade(path)!} />
      ) : path === "/mentions-legales" ? (
        <MentionsLegales />
      ) : path === "/contact" ? (
        <main className="page">
          <div className="wrap">
            <p className="hero-label">Nous joindre</p>
            <h1 className="page-titre">Contact</h1>
            <section className="page-panel">
              <p className="page-intro">
                Une question sur l'écosystème MANA, le territoire, un
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
              <p className="hero-label">Élégance côtière & sauvage — Bretagne</p>
              <h1 className="brand-grand">
                MANA<em>.bzh</em>
              </h1>
              <p className="lede">
                La porte d'entrée de l'écosystème MANA en Bretagne.
              </p>
              <div className="moteur">
                <div className="moteur-categories" role="group" aria-label="Découvrir les services MANA">
                  {MOTEUR_CATEGORIES.map((c) => (
                    <button
                      key={c.v}
                      type="button"
                      className={`moteur-categorie-btn ${moteurCategorie === c.v ? "on" : ""}`}
                      aria-pressed={moteurCategorie === c.v}
                      onClick={() => setMoteurCategorie(c.v)}
                    >
                      {c.l}
                    </button>
                  ))}
                </div>

                <div className="moteur-barre">
                  <svg className="moteur-loupe" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="m15.5 15.5 4.5 4.5" />
                  </svg>
                  <input
                    id="moteur-lieu"
                    type="search"
                    autoComplete="off"
                    placeholder={
                      moteurCategorie === "territoire"
                        ? "Commune ou envie"
                        : "Commune ou projet"
                    }
                    value={moteurLieu}
                    onChange={(e) => setMoteurLieu(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && moteurRechercher()}
                  />
                  <button
                    type="button"
                    className="moteur-fleche"
                    aria-label="Découvrir"
                    onClick={moteurRechercher}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 12h15" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </button>
                </div>

                <p className="moteur-note">
                  Home : l'habitat territorial. Love : la rencontre.
                  France : l'horizon national. Le territoire : la
                  Bretagne, éditoriale.
                </p>
              </div>
            </div>
          </section>

          <main className="wrap">
            {SECTIONS.map((s) => (
              <section key={s.num} className="landing-section bulle">
                <p className="section-num">{s.num}</p>
                <s.glyphe size={36} />
                <h2 className="section-title">{s.titre}</h2>
                <div className="sous-bulle">
                  <p className="section-accroche">{s.accroche}</p>
                  <p className="section-texte">{s.texte}</p>
                  <div className="est-actions">
                    {s.cta.href.startsWith("http") ? (
                      <a
                        className="btn btn-clair"
                        href={s.cta.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.cta.label}
                      </a>
                    ) : (
                      <a className="btn btn-clair" href={`${B}${s.cta.href}`}>
                        {s.cta.label}
                      </a>
                    )}
                  </div>
                </div>
              </section>
            ))}
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
              Porte d'entrée de l'écosystème MANA en Bretagne — vitrine
              territoriale de manahome.org, mana.love et manafrance.org.
              Gratuit, sobre, sans traceur publicitaire ; aucune donnée
              ni lead n'est revendu.
            </p>
            <ContactForm />
          </div>
          <nav className="footer-nav" aria-label="Pied de page">
            <a href={`${B}/ecosysteme`}>L'écosystème MANA</a>
            <a href={`${B}/territoire`}>Le territoire</a>
            <a href={`${B}/promenades`}>Promenades & découvertes</a>
            <a href="https://manahome.org/" target="_blank" rel="noopener noreferrer">manahome.org — l'habitat</a>
            <a href="https://mana.love/" target="_blank" rel="noopener noreferrer">mana.love — la rencontre</a>
            <a href="https://manafrance.org/" target="_blank" rel="noopener noreferrer">manafrance.org — l'horizon</a>
            <a href={`${B}/contact`}>Contact</a>
            <a href={`${B}/mentions-legales`}>Mentions légales</a>
          </nav>
        </div>
      </footer>
    </>
  );
}

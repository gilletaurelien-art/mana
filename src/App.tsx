import { usePath, baseUrl, routePromenade } from "./router";
import { WALKS } from "./walks";
import {
  GlyphRadio,
  GlyphNavigation,
  GlyphSecurite,
  GlyphDecouverte,
  GlyphSentier,
  GlyphTerritoire,
} from "./Glyphs";
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

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <a className="brand" href={`${B}/`}>
            MANA<em>.bzh</em>
          </a>
          <nav className="nav">
            <a href={`${B}/promenades`}>
              <GlyphSentier />
              <span>Promenades</span>
            </a>
            <a href={`${B}/radio`}>
              <GlyphRadio />
              <span>Radio</span>
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
              <h1 className="brand-grand">
                MANA<em>.bzh</em>
              </h1>
              <p className="lede">
                Promenades bretonnes.
              </p>

              {/* Swipe des balades : scroll manuel, jamais auto */}
              <div className="swipe-balades" role="region" aria-label="Les balades — glisser pour explorer">
                {WALKS.map((w) => (
                  <a
                    key={w.slug}
                    className="swipe-carte"
                    href={`${B}/promenade/${w.slug}`}
                  >
                    <p className="swipe-lieu">{w.lieu}</p>
                    <p className="swipe-titre">{w.titre}</p>
                    <p className="swipe-meta">
                      {w.distanceKm} km · {w.dureeH} h · {w.difficulte}
                    </p>
                  </a>
                ))}
              </div>
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
                <div className="sous-bulle">
                  <p className="section-accroche">{m.accroche}</p>
                  <p className="section-texte">{m.texte}</p>
                  <div className="est-actions">
                    <a className="btn btn-clair" href={`${B}${m.cta.href}`}>
                      {m.cta.label}
                    </a>
                  </div>
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

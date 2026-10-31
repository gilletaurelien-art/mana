import { useState } from "react";
import { useRef, useLayoutEffect } from "react";
import { usePath, baseUrl, routePromenade } from "./router";
import { WALKS } from "./walks";
import {
  GlyphRadio,
  GlyphNavigation,
  GlyphSecurite,
  GlyphDecouverte,
  GlyphBoussole,
  GlyphSentier,
} from "./Glyphs";
import { WalkMap } from "./WalkMap";
import { Promenades } from "./Promenades";
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
  const [lieu, setLieu] = useState("");
  const [walkIndex, setWalkIndex] = useState(0);

  const walkSuivant = () => setWalkIndex((i) => (i + 1) % WALKS.length);
  const walk = WALKS[walkIndex];

  const chercher = () => {
    const q = lieu.trim();
    window.location.assign(`${B}/promenades${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

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
          <section className="hero">
            <div className="wrap bulle-xl hero-moteur">
              {/* ⚠️ TROIS NIVEAUX, PAS TROIS SLOGANS. « en Armor & Argoat »
                  était une troisième accroche là où il fallait une PROMESSE :
                  trois formules poétiques d'affilée disent d'où l'on parle,
                  jamais ce que le produit fait. La signature territoriale
                  reste, le nom reste, et la place libérée dit l'essentiel. */}
              <p className="hero-label">Terre, Mer & Lumière — Bretagne</p>
              <h1 className="brand-grand">Promenades</h1>
              <p className="hero-promesse">
                Découvrez ce que vous croiserez en chemin.
              </p>

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

              {/* ⚠️ CE LIEN NE CRÉE AUCUNE FONCTION : il mène au compositeur,
                  qui sait DÉJÀ partir de la position (« Partir d'où je suis »,
                  géolocalisation traitée dans le téléphone). On expose une
                  capacité existante depuis l'endroit où la question se pose —
                  on n'en invente pas une pour embellir l'écran. */}
              <p className="hero-ou">
                ou <a href={`${B}/composer`}>partir d'où je suis</a>
              </p>

              {/* La balade : une seule, avec sa carte — croix/coeur */}
              <div className="balade-unique">
                <div className="balade-carte">
                  <WalkMap walk={walk} width={280} height={180} />
                </div>
                {/* ⭐ LE TITRE D'ABORD. La commune en capitales passait devant
                    le nom de la promenade : on lisait « ROSCANVEL » avant de
                    savoir ce qu'on regardait. */}
                <h2 className="swipe-titre">{walk.titre}</h2>
                <p className="swipe-lieu">{walk.lieu}</p>
                <p className="swipe-meta">
                  {walk.distanceKm} km · ≈ {walk.dureeEstimeeH} h de marche ·{" "}
                  {walk.boucle ? "boucle" : "aller simple"}
                </p>

                {/* ⭐ CE QUE MANA A ET QU'UN TOPOGUIDE N'A PAS — et la donnée
                    existait déjà, inutilisée. Chaque étape porte `pos`, sa
                    position LE LONG du chemin : ce sont donc des lieux qu'on
                    rencontre, pas des lieux « à proximité » qui demanderaient
                    un détour. ⛔ On n'affiche que ce que la donnée contient,
                    et on dit le reste par un compte, jamais par un « etc. ». */}
                {walk.etapes.length > 0 && (
                  <p className="swipe-chemin">
                    <span className="swipe-chemin-label">Sur le chemin</span>{" "}
                    {walk.etapes.slice(0, 3).map((e) => e.nom).join(" · ")}
                    {walk.etapes.length > 3 && (
                      <span className="swipe-chemin-reste">
                        {" "}et {walk.etapes.length - 3} autres
                      </span>
                    )}
                  </p>
                )}
                {/* 🔴 LES DEUX ICÔNES MENTAIENT. Une croix veut dire « écarter »
                    et ce bouton fait défiler les quatre promenades ; un cœur
                    veut dire « enregistrer » et ce lien OUVRE la fiche — rien
                    n'est enregistré nulle part, il n'y a pas de compte.
                    Les `aria-label` étaient justes depuis le début : c'est le
                    dessin qui disait autre chose. ⭐ Un libellé lu par un
                    lecteur d'écran et démenti par l'image ne protège que la
                    moitié des gens. */}
                <div className="balade-actions">
                  <button
                    type="button"
                    className="balade-action balade-action-second"
                    onClick={walkSuivant}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 12h14" />
                      <path d="m12 6 6 6-6 6" />
                    </svg>
                    Suivante
                  </button>
                  <a
                    className="balade-action balade-action-premier"
                    href={`${B}/promenade/${walk.slug}`}
                  >
                    Découvrir
                  </a>
                </div>
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

import { useState } from "react";
import { usePath, baseUrl, routePromenade } from "./router";
import { WALKS } from "./walks";
import {
  IconPosition,
  IconCarte,
  IconSentier,
  IconLoupe,
  IconFleche,
  IconProfil,
  IconFavoris,
  IconPlus,
} from "./Icons";
import { Promenades } from "./Promenades";
import { Promenade } from "./Promenade";
import { Territoire } from "./Territoire";
import { MentionsLegales } from "./MentionsLegales";
import { ContactForm } from "./ContactForm";

const B = baseUrl();

/* ============================================================
   MANA — « Atlas vivant » 2030
   Six univers : accueil, exploration, fiche, marche,
   rencontres, espace personnel.
   ============================================================ */

function TabBar({ actif }: { actif: string }) {
  return (
    <nav className="tab-bar" aria-label="Navigation principale">
      <a href={`${B}/`} className={actif === "accueil" ? "actif" : ""} aria-label="Accueil">
        <IconPosition size={17} />
        <span className="sr-only">Accueil</span>
      </a>
      <a href={`${B}/promenades`} className={actif === "explorer" ? "actif" : ""}>
        <IconCarte size={17} />
        <span>Explorer</span>
      </a>
      <a className="tab-brand" href={`${B}/`}>
        MANA<em>.</em>
      </a>
      <a href={`${B}/favoris`} className={actif === "favoris" ? "actif" : ""}>
        <IconFavoris size={17} />
        <span>Favoris</span>
      </a>
      <a href={`${B}/espace`} className={actif === "espace" ? "actif" : ""}>
        <IconPlus size={17} />
        <span>Plus</span>
      </a>
    </nav>
  );
}

/* ---------- Écran 1 : accueil immersif ---------- */
function Accueil() {
  const [lieu, setLieu] = useState("");
  const chercher = () => {
    const q = lieu.trim();
    window.location.assign(`${B}/promenades${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };
  const walk = WALKS[0];

  return (
    <div className="accueil">
      <div className="accueil-fond" aria-hidden="true" />
      <div className="accueil-contenu">
        <header>
          <p className="accueil-logo">MANA<em>.</em></p>
          <p className="accueil-territoire">Terre, Mer & Lumière — Bretagne</p>
        </header>
        <div className="reveal">
          <h1 className="accueil-accroche">Le monde commence ici.</h1>
          <p className="accueil-sous">
            Découvrez ce que vous croiserez en chemin — les lieux,
            les paysages, le patrimoine, dans l'ordre réel de la marche.
          </p>
        </div>
        <div className="depart-barre reveal-2" role="search" aria-label="Rechercher une localité">
          <IconPosition size={17} className="depart-icone" style={{ marginLeft: 18, color: "var(--kaki-sauge)" }} />
          <input
            type="search"
            autoComplete="off"
            placeholder="Autour de moi — ou une commune…"
            value={lieu}
            onChange={(e) => setLieu(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && chercher()}
            aria-label="Lieu de départ"
          />
          <button type="button" className="depart-btn" onClick={chercher}>
            Explorer
            <IconFleche size={15} />
          </button>
        </div>
        <a className="accueil-secondaire reveal-3" href={`${B}/promenades`}>
          <IconCarte size={15} />
          Explorer la carte du territoire
        </a>
      </div>
      <div aria-hidden="true" style={{ position: "absolute", bottom: 96, left: 0, right: 0, textAlign: "center", zIndex: 1 }}>
        <span style={{ color: "rgba(238,235,221,0.4)", fontSize: "var(--text-xs)", letterSpacing: "0.1em" }}>
          {walk.lieu} — {walk.distanceKm} km de sentiers réels
        </span>
      </div>
      <TabBar actif="accueil" />
    </div>
  );
}

/* ---------- Écran 6 : espace personnel ---------- */
function Espace() {
  return (
    <>
      <main className="page">
        <div className="wrap espace">
          <p className="page-label">MANA</p>
          <h1 className="espace-titre">Votre espace</h1>
          <p className="espace-sous">
            Une exploration responsable et partagée du territoire.
            Tout ce qui compte, rien de plus.
          </p>
          <div className="espace-liste">
            <a className="espace-item" href={`${B}/promenades`}>
              <IconSentier size={20} />
              <div>
                <p className="espace-nom" style={{ margin: 0 }}>Mes promenades</p>
                <p className="espace-desc">Les parcours du territoire, hors ligne dans la poche</p>
              </div>
            </a>
            <a className="espace-item" href={`${B}/radio`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><circle cx="12" cy="12" r="1.6" /><path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2" /></svg>
              <div>
                <p className="espace-nom" style={{ margin: 0 }}>MANAradio</p>
                <p className="espace-desc">La radio du territoire — hors antenne pour l'instant</p>
              </div>
            </a>
            <a className="espace-item" href={`${B}/territoire`}>
              <IconCarte size={20} />
              <div>
                <p className="espace-nom" style={{ margin: 0 }}>Le territoire</p>
                <p className="espace-desc">Terre & lumière — les données réelles derrière MANA</p>
              </div>
            </a>
            <a className="espace-item" href={`${B}/contact`}>
              <IconProfil size={20} />
              <div>
                <p className="espace-nom" style={{ margin: 0 }}>Nous contacter</p>
                <p className="espace-desc">Une question, un partenariat — réponse rapide et honnête</p>
              </div>
            </a>
            <a className="espace-item" href={`${B}/mentions-legales`}>
              <IconPlus size={20} />
              <div>
                <p className="espace-nom" style={{ margin: 0 }}>À propos & mentions</p>
                <p className="espace-desc">Gratuit, sobre, aucune donnée revendue</p>
              </div>
            </a>
          </div>
        </div>
      </main>
      <TabBar actif="espace" />
    </>
  );
}

/* ---------- Favoris (écran léger — pas de compte, juste l'accès aux parcours) ---------- */
function Favoris() {
  return (
    <>
      <main className="page">
        <div className="wrap espace">
          <p className="page-label">Vos découvertes</p>
          <h1 className="espace-titre">Favoris</h1>
          <p className="espace-sous">
            Sans compte, MANA ne stocke rien sur vous — c'est la doctrine.
            Vos parcours restent dans votre navigateur : ajoutez-les à
            l'écran d'accueil de votre téléphone (PWA), ou téléchargez
            leurs traces GPX avant de partir.
          </p>
          <div className="espace-liste">
            {WALKS.map((w) => (
              <a key={w.slug} className="espace-item" href={`${B}/promenade/${w.slug}`}>
                <IconSentier size={20} />
                <div>
                  <p className="espace-nom" style={{ margin: 0 }}>{w.titre}</p>
                  <p className="espace-desc">{w.lieu} · {w.distanceKm} km</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>
      <TabBar actif="favoris" />
    </>
  );
}

/* ---------- Pages éditoriales génériques ---------- */
function PageSimple({ label, titre, children }: { label: string; titre: string; children: React.ReactNode }) {
  return (
    <>
      <main className="page">
        <div className="wrap">
          <p className="page-label">{label}</p>
          <h1 className="page-titre">{titre}</h1>
          {children}
        </div>
      </main>
      <TabBar actif="" />
    </>
  );
}

export default function App() {
  const path = usePath();

  if (path === "/radio") {
    return (
      <PageSimple label="Écouter" titre="MANAradio">
        <section className="page-panneau">
          <div className="radio-joueur">
            <button type="button" className="radio-bouton" aria-label="Lecture" title="Hors antenne — bientôt">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.5v13l10-6.5z" /></svg>
            </button>
            <div>
              <p className="radio-etat">Hors antenne</p>
              <p className="radio-note">Le direct arrivera bientôt — aucun flux simulé.</p>
            </div>
          </div>
        </section>
        <section className="page-panneau">
          <p className="page-label" style={{ fontSize: "var(--text-xs)" }}>En cours</p>
          <p className="page-texte">
            Aucun titre à l'antenne pour l'instant. Les épisodes s'afficheront
            dès la première émission réelle.
          </p>
        </section>
      </PageSimple>
    );
  }

  if (path === "/promenades") return <><Promenades /><TabBar actif="explorer" /></>;
  if (routePromenade(path)) return <><Promenade slug={routePromenade(path)!} /><TabBar actif="explorer" /></>;
  if (path === "/territoire") return <><Territoire /><TabBar actif="" /></>;
  if (path === "/mentions-legales") return <PageSimple label="Informations légales" titre="Mentions légales"><MentionsLegales /></PageSimple>;
  if (path === "/contact") {
    return (
      <PageSimple label="Nous joindre" titre="Contact">
        <section className="page-panneau">
          <p className="page-texte" style={{ marginBottom: "var(--sp-3)" }}>
            Une question sur les promenades, le territoire, un partenariat ?
            Écrivez-nous — nous répondons vite, honnêtement.
          </p>
          <ContactForm />
        </section>
      </PageSimple>
    );
  }
  if (path === "/favoris") return <Favoris />;
  if (path === "/espace") return <Espace />;

  return <Accueil />;
}

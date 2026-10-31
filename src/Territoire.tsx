import { useEffect } from "react";
import { baseUrl } from "./router";
import { GlyphTerritoire } from "./Glyphs";

// Le territoire : page éditoriale Bretagne — honnête, sans compteur.

const FACETTES = [
  {
    titre: "Une péninsule ouverte sur la mer",
    texte:
      "2 800 km de côtes. Du Finistère au golfe du Morbihan, la mer structure les paysages, les métiers et les rythmes.",
  },
  {
    titre: "Des villes qui vivent, des campagnes qui habitent",
    texte:
      "Rennes, Brest, Vannes, Lorient, Quimper, Nantes aux portes : 6 pôles reliés par un réseau de communes à taille humaine.",
  },
  {
    titre: "Une langue et une culture vivantes",
    texte:
      "Breton et gallo, fest-noz, sonneurs : une culture qui se pratique, pas un décor.",
  },
  {
    titre: "Un territoire qui se réinvente",
    texte:
      "Marine, agroalimentaire, numérique, énergies marines : 4 filières qui engagent l'avenir sans renier la terre.",
  },
];

export function Territoire() {
  useEffect(() => {
    document.title = "Le territoire — MANA.bzh";
    return () => {
      document.title = "MANA.bzh — La porte d'entrée de l'écosystème MANA en Bretagne";
    };
  }, []);

  const B = baseUrl();

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Terre & lumière</p>
        <h1 className="page-titre"><span>Le territoire</span></h1>

        <section className="page-panel">
          <p className="page-intro">
            Des paysages, des villes, une culture. Ni carte postale, ni
            compteur de vanité.
          </p>
        </section>

        <section className="landing-section bulle" style={{ marginBottom: "var(--sp-4)" }}>
          <GlyphTerritoire size={36} />
          <h2 className="section-title">S'installer en Bretagne</h2>
          <div className="sous-bulle">
            <p className="section-accroche">
              Un territoire, des services.
            </p>
            <p className="section-texte">
              Marcher, écouter, comprendre : chaque promenade MANA
              s'appuie sur des données territoriales réelles, sourcées,
              vérifiées quand c'est possible.
            </p>
            <div className="est-actions">
              <a className="btn btn-clair" href={`${B}/promenades`}>
                Découvrir les promenades
              </a>
            </div>
          </div>
        </section>

        {FACETTES.map((f) => (
          <section key={f.titre} className="page-panel">
            <p className="apercu-label">{f.titre}</p>
            <p className="page-texte">{f.texte}</p>
          </section>
        ))}

        <section className="page-panel">
          <p className="page-note" style={{ marginTop: 0 }}>
            Les informations territoriales publiées par l'écosystème MANA
            s'appuient sur des sources publiques réelles (notamment
            geo.api.gouv.fr pour les communes) — jamais sur des chiffres
            inventés.
          </p>
        </section>
      </div>
    </main>
  );
}

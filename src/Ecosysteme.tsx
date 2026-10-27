import { useEffect } from "react";
import { baseUrl } from "./router";
import {
  GlyphPorte,
  GlyphMaison,
  GlyphRencontre,
  GlyphFrance,
} from "./Glyphs";

// L'écosystème : les quatre piliers, chacun dans sa bulle.

const PILIERS = [
  {
    num: "01",
    glyphe: GlyphPorte,
    titre: "MANA.bzh",
    sous: "La porte",
    accroche: "La porte d'entrée de l'écosystème en Bretagne.",
    texte:
      "Cette vitrine territoriale présente l'écosystème MANA et le territoire breton : qui fait quoi, où aller, comment ça s'articule. Un point d'entrée clair, sans compteur ni artifice.",
  },
  {
    num: "02",
    glyphe: GlyphMaison,
    titre: "MANAhome",
    sous: "L'habitat territorial",
    accroche: "L'immobilier et l'habitat, autrement.",
    texte:
      "manahome.org : portail immobilier territorial gratuit — vente, location, estimation indicative, services à l'habitat et index des communes. Pilote : Crozon (Finistère).",
    cta: { label: "Découvrir manahome.org", href: "https://manahome.org/" },
  },
  {
    num: "03",
    glyphe: GlyphRencontre,
    titre: "MANA.love",
    sous: "La rencontre",
    accroche: "La rencontre, sincère.",
    texte:
      "mana.love : le service de rencontre de l'écosystème MANA — sobre, honnête, sans revente de données.",
    cta: { label: "Découvrir mana.love", href: "https://mana.love/" },
  },
  {
    num: "04",
    glyphe: GlyphFrance,
    titre: "MANAfrance",
    sous: "L'horizon national",
    accroche: "L'écosystème au-delà de la Bretagne.",
    texte:
      "manafrance.org : la déclinaison nationale de l'écosystème MANA — la même exigence : gratuité des services grand public, sobriété, données réelles.",
    cta: { label: "Découvrir manafrance.org", href: "https://manafrance.org/" },
  },
];

export function Ecosysteme() {
  useEffect(() => {
    document.title = "L'écosystème MANA — MANA.bzh";
    return () => {
      document.title = "MANA.bzh — La porte d'entrée de l'écosystème MANA en Bretagne";
    };
  }, []);

  const B = baseUrl();

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Quatre piliers</p>
        <h1 className="page-titre">L'écosystème MANA</h1>
        <section className="page-panel">
          <p className="page-intro">
            MANA est un écosystème de services territoriaux : la porte
            (mana.bzh), l'habitat (manahome.org), la rencontre (mana.love),
            l'horizon national (manafrance.org). Des règles communes à
            tous : gratuité des services grand public, aucune revente de
            données ou de leads, aucun traceur publicitaire, sobriété.
          </p>
        </section>

        {PILIERS.map((p) => {
          const G = p.glyphe;
          return (
          <section key={p.num} className="landing-section bulle" style={{ marginBottom: "var(--sp-4)" }}>
            <p className="section-num">{p.num} — {p.sous}</p>
            <G size={36} />
            <h2 className="section-title">{p.titre}</h2>
            <div className="sous-bulle">
              <p className="section-accroche">{p.accroche}</p>
              <p className="section-texte">{p.texte}</p>
              <div className="est-actions">
                {p.cta ? (
                  <a
                    className="btn btn-clair"
                    href={p.cta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {p.cta.label}
                  </a>
                ) : (
                  <a className="btn btn-clair" href={`${B}/`}>
                    Vous êtes déjà ici
                  </a>
                )}
              </div>
            </div>
          </section>
          );
        })}
      </div>
    </main>
  );
}

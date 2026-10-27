import { useEffect } from "react";
import { baseUrl } from "./router";

// Mentions légales — page minimale, honnête : pas de revente de
// données, hébergement GitHub Pages. L'éditeur complet (raison
// sociale, adresse, SIREN) sera publié avec la structure juridique
// définitive de l'écosystème MANA.

export function MentionsLegales() {
  useEffect(() => {
    document.title = "Mentions légales — MANA.bzh";
    return () => {
      document.title = "MANA.bzh — La porte d'entrée de l'écosystème MANA en Bretagne";
    };
  }, []);

  const B = baseUrl();

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Informations légales</p>
        <h1 className="page-titre">Mentions légales</h1>

        <section className="page-panel">
          <p className="apercu-label">Éditeur</p>
          <p className="page-intro">
            MANA.bzh est édité par l'écosystème MANA (manahome.org,
            mana.love, manafrance.org), dans le cadre de la vitrine
            territoriale bretonne. Les coordonnées complètes de l'éditeur
            seront publiées avec la structure juridique définitive du
            projet.
          </p>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Hébergement</p>
          <p className="page-intro">
            Site statique hébergé sur GitHub Pages (GitHub, Inc.). Aucune
            donnée personnelle n'est collectée par le site en l'état :
            MANA.bzh est une vitrine territoriale, sans compte ni backend.
          </p>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Nature du service</p>
          <p className="page-intro">
            MANA.bzh est une porte d'entrée : il présente l'écosystème MANA
            et le territoire breton, et renvoie vers les services
            (manahome.org, mana.love, manafrance.org). Chaque service
            applique ses propres conditions, publiées sur son site.
          </p>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Données personnelles</p>
          <p className="page-intro">
            Aucune donnée ni lead n'est revendu. Aucun traceur
            publicitaire. Vous pouvez demander la suppression de vos
            données à tout moment — la suppression est une exclusion
            définitive.
          </p>
        </section>

        <div className="est-actions">
          <a className="btn btn-ghost" href={`${B}/ecosysteme`}>
            L'écosystème MANA
          </a>
          <a className="btn btn-primary" href={`${B}/`}>
            Retour à l'accueil
          </a>
        </div>
      </div>
    </main>
  );
}

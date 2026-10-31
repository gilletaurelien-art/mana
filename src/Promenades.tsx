import { useEffect, useState } from "react";
import { baseUrl } from "./router";
import { WALKS } from "./walks";
import { WalkMap } from "./WalkMap";
import { IconHorloge, IconDistance, IconRelief, IconLoupe } from "./Icons";

// Écran 2 — exploration cartographique.
// La carte est le cœur ; les parcours en panneau contextuel.

type FiltreBoucle = "tous" | "boucle" | "ar";

export function Promenades() {
  const B = baseUrl();
  const [q, setQ] = useState("");
  const [boucle, setBoucle] = useState<FiltreBoucle>("tous");

  useEffect(() => {
    setQ((new URLSearchParams(window.location.search).get("q") ?? "").toLowerCase());
  }, []);

  useEffect(() => {
    document.title = "Explorer — MANA";
    return () => {
      document.title = "MANA — La porte d'entrée de l'écosystème MANA en Bretagne";
    };
  }, []);

  const resultats = WALKS.filter(
    (w) =>
      (boucle === "tous" || (boucle === "boucle" ? w.boucle : !w.boucle)) &&
      (!q || w.lieu.toLowerCase().includes(q) || w.titre.toLowerCase().includes(q))
  );

  // Le parcours recommandé : le premier résultat (ou le premier tout court).
  const recommande = resultats[0] ?? WALKS[0];

  return (
    <main className="exploration">
      <div className="wrap">
        <div className="exploration-tete">
          <h1 className="exploration-titre">Explorer</h1>
          <p className="exploration-sous">
            {WALKS.length} parcours réels sur la presqu'île — avec ce
            qu'on croise en chemin.
          </p>
        </div>

        {/* La grande carte vitrine */}
        <div className="carte-vitrine fond-cartesque">
          <WalkMap walk={recommande} width={860} height={420} />
        </div>

        {/* Panneau contextuel — la promenade recommandée */}
        <div className="panier-contexte reveal">
          <span className="panier-tag">Boucle recommandée</span>
          <h2 className="panier-titre">{recommande.titre}</h2>
          <p className="panier-lieu">{recommande.lieu}</p>
          <div className="panier-meta">
            <span><IconDistance size={14} /> <strong>{recommande.distanceKm} km</strong></span>
            <span><IconHorloge size={14} /> <strong>{recommande.dureeH} h</strong></span>
            <span><IconRelief size={14} /> <strong>{recommande.difficulte}</strong></span>
          </div>
          <div className="panier-actions">
            <a className="btn btn-ocre" href={`${B}/promenade/${recommande.slug}`}>
              Lancer la balade
            </a>
            <a className="btn btn-ligne" href={`${B}/promenade/${recommande.slug}`}>
              Voir le détail
            </a>
          </div>
        </div>

        {/* Recherche + filtres */}
        <div className="page-panneau" style={{ marginTop: "var(--sp-4)" }}>
          <div className="filtres" style={{ marginBottom: "var(--sp-3)" }}>
            <div className="depart-barre" style={{ background: "var(--surface-raised)", borderColor: "var(--border-strong)", maxWidth: 360, flex: 1 }}>
              <IconLoupe size={15} style={{ marginLeft: 16, color: "var(--text-faint)" }} />
              <input
                type="search"
                placeholder="Rechercher un lieu…"
                value={q}
                onChange={(e) => setQ(e.target.value.toLowerCase())}
                aria-label="Rechercher"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>
          <div className="filtres">
            <button className={`filtre-chip ${boucle === "tous" ? "actif" : ""}`} onClick={() => setBoucle("tous")}>Tous</button>
            <button className={`filtre-chip ${boucle === "boucle" ? "actif" : ""}`} onClick={() => setBoucle("boucle")}>Boucles</button>
            <button className={`filtre-chip ${boucle === "ar" ? "actif" : ""}`} onClick={() => setBoucle("ar")}>Aller-retour</button>
          </div>
        </div>

        {/* Les parcours — cartes éditoriales */}
        <div className="promenade-ligne" style={{ marginTop: "var(--sp-4)" }}>
          {resultats.map((w) => (
            <a key={w.slug} className="promenade-carte" href={`${B}/promenade/${w.slug}`}>
              <div className="promenade-carte-visuel">
                <WalkMap walk={w} width={380} height={150} />
              </div>
              <div className="promenade-carte-corps">
                <h3 className="promenade-carte-titre">{w.titre}</h3>
                <p className="promenade-carte-lieu">{w.lieu}</p>
                <div className="promenade-carte-meta">
                  <span><strong>{w.distanceKm} km</strong></span>
                  <span><strong>{w.dureeH} h</strong></span>
                  <span>{w.boucle ? "boucle" : "aller-retour"}</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {resultats.length === 0 && (
          <div className="page-panneau" style={{ marginTop: "var(--sp-4)" }}>
            <p className="page-texte">Aucun parcours ne correspond — essayez un autre lieu.</p>
          </div>
        )}
      </div>
    </main>
  );
}

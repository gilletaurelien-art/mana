import { useEffect, useState } from "react";
import { baseUrl } from "./router";
import { WALKS } from "./walks";

// Index des promenades.
//
// ⛔ LES FILTRES « POUSSETTE/PMR » ET « CHIENS » ONT ÉTÉ RETIRÉS LE 28/10/2026.
//    OpenStreetMap ne porte pas ces attributs pour ces sentiers. Ils étaient
//    branchés sur des champs inventés ; une fois les données réelles posées,
//    ils auraient rendu TOUS les parcours quel que soit le choix.
//    ⭐ Un filtre qui ne filtre rien ne paraît pas cassé : il paraît
//       PERMISSIF. L'utilisateur croit avoir trié, et part avec une poussette.

type FiltreBoucle = "tous" | "boucle" | "ar";

export function Promenades() {
  const B = baseUrl();
  const [dureeMax, setDureeMax] = useState(4);
  const [boucle, setBoucle] = useState<FiltreBoucle>("tous");
  const [q, setQ] = useState("");

  useEffect(() => {
    setQ((new URLSearchParams(window.location.search).get("q") ?? "").toLowerCase());
  }, []);

  useEffect(() => {
    document.title = "Promenades — MANA.bzh";
    return () => {
      document.title = "MANA.bzh — La porte d'entrée de l'écosystème MANA en Bretagne";
    };
  }, []);

  const resultats = WALKS.filter(
    (w) =>
      w.dureeEstimeeH <= dureeMax &&
      (boucle === "tous" || (boucle === "boucle" ? w.boucle : !w.boucle)) &&
      (!q ||
        w.lieu.toLowerCase().includes(q) ||
        w.titre.toLowerCase().includes(q))
  );

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Balades & découvertes</p>
        <h1 className="page-titre">Promenades</h1>

        <section className="page-panel">
          <p className="page-intro">
            Des parcours réels, tracés d'après OpenStreetMap. Deux
            seulement pour l'instant : ce sont les deux tracés bretons
            qui passent notre contrôle géométrique. Les autres attendent
            une remoisson — nous préférons deux parcours justes à vingt
            parcours approximatifs.
          </p>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Filtres</p>
          <div className="est-actions" style={{ marginBottom: "var(--sp-2)" }}>
            <label className="filtre">
              Durée ≤ {dureeMax} h
              <input
                type="range"
                min={1}
                max={4}
                step={0.5}
                value={dureeMax}
                onChange={(e) => setDureeMax(Number(e.target.value))}
              />
            </label>
            <select
              value={boucle}
              onChange={(e) => setBoucle(e.target.value as FiltreBoucle)}
              className="filtre-select"
              aria-label="Type de parcours"
            >
              <option value="tous">Boucle ou aller-retour</option>
              <option value="boucle">Boucle</option>
              <option value="ar">Aller-retour</option>
            </select>
          </div>
          <p className="page-note">
            {q && <strong>Recherche « {q} » — </strong>}
            {resultats.length} parcours — la pause crêperie arrive avec
            les données réelles (aucun établissement inventé).
          </p>
        </section>

        {resultats.map((w) => (
          <section key={w.slug} className="page-panel">
            <p className="apercu-label">{w.lieu}</p>
            <h2 className="section-title" style={{ marginBottom: "var(--sp-2)" }}>{w.titre}</h2>
            <p className="page-texte">{w.resume}</p>
            <p className="page-note">
              {w.distanceKm} km · ≈ {w.dureeEstimeeH} h de marche ·{" "}
              {w.boucle ? "boucle" : "aller simple"}
            </p>
            <div className="est-actions" style={{ marginTop: "var(--sp-2)", marginBottom: 0 }}>
              <a className="btn btn-primary" href={`${B}/promenade/${w.slug}`}>
                Ouvrir le parcours
              </a>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

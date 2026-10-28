import { useEffect, useMemo, useState } from "react";
import { baseUrl } from "./router";
import { WALKS } from "./walks";
import { chargerIndex, chargerCommunes, chercher } from "./catalogue";
import type { Fiche, Commune } from "./catalogue";

// Recherche des promenades — sur TOUTE LA FRANCE.
//
// ⛔ LES FILTRES « POUSSETTE/PMR » ET « CHIENS » ONT ÉTÉ RETIRÉS LE 28/10/2026.
//    OpenStreetMap ne porte pas ces attributs. Ils étaient branchés sur des
//    champs inventés ; une fois les données réelles posées, ils auraient rendu
//    TOUS les parcours quel que soit le choix.
//    ⭐ Un filtre qui ne filtre rien ne paraît pas cassé : il paraît PERMISSIF.
//       L'utilisateur croit avoir trié, et part avec une poussette.
//
// ⚠️ ON N'AFFICHE RIEN TANT QU'AUCUNE LOCALITÉ N'EST SAISIE. Lister 26 600
//    promenades par ordre arbitraire ne répond à aucune question. La promenade
//    se cherche « au départ de quelque part ».

type FiltreBoucle = "tous" | "boucle" | "ar";
const MAX_AFFICHES = 40;

export function Promenades() {
  const B = baseUrl();
  const [dureeMax, setDureeMax] = useState(6);
  const [boucle, setBoucle] = useState<FiltreBoucle>("tous");
  const [q, setQ] = useState("");
  const [fiches, setFiches] = useState<Fiche[] | null>(null);
  const [lieux, setLieux] = useState<Commune[] | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    setQ(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);

  useEffect(() => {
    document.title = "Promenades — MANA.bzh";
    return () => {
      document.title = "MANA.bzh — Promenades & découvertes en Bretagne";
    };
  }, []);

  useEffect(() => {
    // ⚠️ L'échec des communes n'est PAS bloquant : sans elles, la recherche
    //    retombe sur le texte. Un index chargé vaut mieux qu'une page morte.
    chargerCommunes().then(setLieux).catch(() => setLieux(null));
    chargerIndex()
      .then(setFiches)
      // ⚠️ UNE ERREUR SE DIT. Sans ce message, un refus CORS ou une coupure
      //    rendrait une page vide et silencieuse — le visiteur conclurait
      //    qu'il n'existe aucune promenade.
      .catch(() => setErreur("Le catalogue des promenades n'a pas pu être chargé. Vérifiez votre connexion."));
  }, []);

  const resultats = useMemo(() => {
    if (!fiches) return [];
    return chercher(fiches, q, lieux)
      .filter((f) => f.k / 3.5 <= dureeMax)
      .filter((f) => boucle === "tous" || (boucle === "boucle" ? f.b : !f.b))
      // déjà trié par distance dans chercher()
      ;
  }, [fiches, lieux, q, dureeMax, boucle]);

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Où marcher</p>
        <h1 className="page-titre">Promenades</h1>

        <section className="page-panel">
          <p className="page-intro">
            Des parcours réels, tracés d'après OpenStreetMap, sur toute la
            France. Cherchez une commune : les promenades qui en partent ou qui
            la traversent s'affichent, les plus riches en points de découverte
            d'abord.
          </p>
          <div className="moteur-barre" role="search">
            <svg className="moteur-loupe" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m15.5 15.5 4.5 4.5" />
            </svg>
            <input
              type="search"
              autoComplete="off"
              placeholder="Au départ de…"
              aria-label="Chercher une commune"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <p className="page-note">
            {erreur ? (
              <strong>{erreur}</strong>
            ) : !fiches ? (
              "Chargement du catalogue…"
            ) : !q.trim() ? (
              `${fiches.length.toLocaleString("fr-FR")} promenades en base. Tapez une commune pour commencer.`
            ) : (
              `${resultats.length.toLocaleString("fr-FR")} promenade${resultats.length > 1 ? "s" : ""} pour « ${q} »`
            )}
          </p>
        </section>

        {fiches && q.trim() !== "" && (
          <section className="page-panel">
            <p className="apercu-label">Filtres</p>
            <div className="est-actions" style={{ marginBottom: 0 }}>
              <label className="filtre">
                Durée ≤ {dureeMax} h
                <input
                  type="range"
                  min={1}
                  max={6}
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
                <option value="tous">Boucle ou aller simple</option>
                <option value="boucle">Boucle</option>
                <option value="ar">Aller simple</option>
              </select>
            </div>
          </section>
        )}

        {resultats.slice(0, MAX_AFFICHES).map((f) => (
          <section key={f.s} className="page-panel">
            <p className="apercu-label">{f.c ?? f.r}</p>
            <h2 className="section-title" style={{ marginBottom: "var(--sp-2)" }}>
              {f.t}
            </h2>
            <p className="page-note">
              {f.k} km · ≈ {Math.round((f.k / 3.5) * 2) / 2} h de marche ·{" "}
              {f.b ? "boucle" : "aller simple"}
              {f.e > 0 && ` · ${f.e} point${f.e > 1 ? "s" : ""} de découverte`}
            </p>
            <div className="est-actions" style={{ marginTop: "var(--sp-2)", marginBottom: 0 }}>
              <a className="btn btn-primary" href={`${B}/promenade/${f.s}`}>
                Ouvrir le parcours
              </a>
            </div>
          </section>
        ))}

        {resultats.length > MAX_AFFICHES && (
          <section className="page-panel">
            <p className="page-note">
              {resultats.length - MAX_AFFICHES} autres promenades correspondent.
              Précisez la commune pour les voir.
            </p>
          </section>
        )}

        {fiches && q.trim() !== "" && resultats.length === 0 && (
          <section className="page-panel">
            <p className="page-texte">
              Aucune promenade pour « {q} ». Essayez une commune voisine — la
              couverture suit OpenStreetMap, elle est inégale selon les
              territoires.
            </p>
          </section>
        )}

        {/* La vitrine, toujours accessible : elle est embarquée, donc elle
            s'affiche même sans réseau. */}
        <section className="page-panel">
          <p className="apercu-label">La presqu'île de Crozon</p>
          <p className="page-texte">
            Quatre promenades choisies et vérifiées, disponibles hors ligne.
          </p>
          <div className="est-actions" style={{ marginBottom: 0 }}>
            {WALKS.map((w) => (
              <a key={w.slug} className="btn btn-ghost" href={`${B}/promenade/${w.slug}`}>
                {w.titre}
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

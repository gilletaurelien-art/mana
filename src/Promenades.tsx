import { useEffect, useMemo, useState } from "react";
import { baseUrl } from "./router";
import { VITRINE, effortLisible } from "./walks";
import { chargerIndex, chargerCommunes, chercher, trajet, estContinu } from "./catalogue";
import { chargerOT, PRATIQUE, type ItineraireOT } from "./ot";
import { MENTION } from "./walks";
import type { Fiche, Commune } from "./catalogue";

// Les sentiers de randonnée de BRETAGNE — 1 032 itinéraires, 14 540 km.
//
// ⭐ ON LISTE AU LIEU D'EXIGER UNE RECHERCHE, ET C'EST LE VOLUME QUI LE DIT.
//    Le catalogue France portait 26 665 parcours : les lister par un ordre
//    arbitraire ne répondait à aucune question, donc la page restait vide
//    jusqu'à ce qu'on saisisse une commune. Mille entrées, elles, se
//    parcourent. ⚠️ Si ce catalogue redevient national, cette page redevient
//    muette par défaut — le choix suit le NOMBRE, pas le goût.
//
// ⛔ LES FILTRES « POUSSETTE/PMR » ET « CHIENS » ONT ÉTÉ RETIRÉS LE 28/10/2026 :
//    OpenStreetMap ne porte pas ces attributs. ⭐ Un filtre qui ne filtre rien
//    ne paraît pas cassé, il paraît PERMISSIF — et quelqu'un part avec une
//    poussette.

/**
 * 🔴 LA PAGE NE MONTRE PLUS QUE LA PRESQU'ÎLE — 31/10/2026.
 *
 * ⛔ ET LE FILTRE EST PAR COMMUNE, PAS PAR EMPRISE RECTANGULAIRE. Mesuré :
 *    une bbox (-4,78 / 48,14 / -4,17 / 48,36) rend **13** itinéraires, dont
 *    Daoulas, Plougonvelin, Logonna-Daoulas et le Menez-Hom — la rade de
 *    Brest, pas la presqu'île. Publier ça sous le titre « Presqu'île de
 *    Crozon » serait annoncer un lieu que le fichier ne dit pas.
 *    ⭐ Un rectangle n'est pas une presqu'île, et la géométrie d'un territoire
 *       ne s'approxime pas par ses extrêmes.
 *
 * ⚠️ L'index ne porte QUE la commune de départ et celle d'arrivée (`c` compte
 *    les communes traversées sans les nommer) : un itinéraire qui traverse la
 *    presqu'île sans y commencer ni finir échappe donc au filtre. C'est un
 *    manque assumé — il vaut mieux qu'une liste trop large.
 *
 * Relevé sur l'index réel le 31/10/2026 : **7 itinéraires, 181 km.**
 * Camaret-sur-Mer, Roscanvel, Telgruc-sur-Mer et Landévennec n'apparaissent
 * ni en départ ni en arrivée — c'est l'état de la moisson, pas une omission.
 */
export const PRESQUILE = new Set([
  "Crozon", "Camaret-sur-Mer", "Roscanvel", "Lanvéoc",
  "Telgruc-sur-Mer", "Argol", "Landévennec",
]);

export const surLaPresquile = (f: Fiche): boolean =>
  (f.d !== null && PRESQUILE.has(f.d)) || (f.a !== null && PRESQUILE.has(f.a));

type FiltreForme = "tous" | "boucle" | "aller";
const MAX_AFFICHES = 40;

/**
 * 🔴 LE CRAN LE PLUS À DROITE VEUT DIRE « SANS LIMITE », ET C'EST UN CORRECTIF.
 *
 * Mesuré à l'écran le 28/10/2026 : le filtre plafonnait à 24 h de marche, soit
 * 84 km. La page annonçait « 1 032 itinéraires » et en affichait **1 015** —
 * les 17 plus longs, dont « De Douarnenez à Redon » (355 km) et le Chemin de
 * Halage (315 km), étaient invisibles **par défaut**.
 * ⭐ Un filtre dont la valeur initiale exclut les pièces maîtresses du
 *    catalogue ne paraît pas trop serré : il fait croire qu'elles n'existent
 *    pas. Et le compte affiché à côté le contredisait sans que rien ne le dise.
 */
const DUREE_SANS_LIMITE = 25;


export function Promenades() {
  const B = baseUrl();
  const [dureeMax, setDureeMax] = useState(DUREE_SANS_LIMITE);
  const [forme, setForme] = useState<FiltreForme>("tous");
  const [q, setQ] = useState("");
  const [fiches, setFiches] = useState<Fiche[] | null>(null);
  const [lieux, setLieux] = useState<Commune[] | null>(null);
  const [erreur, setErreur] = useState("");
  /* ⚠️ Chargé À LA DEMANDE : 258 Ko de tracés que personne ne paie avant
     d'arriver sur cette page. */
  const [ot, setOt] = useState<ItineraireOT[] | null>(null);
  const [pratique, setPratique] = useState<ItineraireOT["pratique"] | "tous">("tous");

  useEffect(() => {
    setQ(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);

  useEffect(() => {
    return () => {
    };
  }, []);

  useEffect(() => {
    // ⚠️ L'échec des communes n'est PAS bloquant : sans elles, la recherche
    //    retombe sur le texte. Un index chargé vaut mieux qu'une page morte.
    chargerCommunes().then(setLieux).catch(() => setLieux(null));
    chargerOT().then((r) => setOt(r.itineraires)).catch(() => setOt([]));
    chargerIndex()
      .then(setFiches)
      // ⚠️ UNE ERREUR SE DIT. Sans ce message, un refus CORS ou une coupure
      //    rendrait une page vide et silencieuse — le visiteur conclurait
      //    qu'il n'existe aucun sentier.
      .catch(() =>
        setErreur(
          "Sentiers indisponibles. Vérifiez votre connexion."
        )
      );
  }, []);

  const resultats = useMemo(() => {
    if (!fiches) return [];
    // Sans recherche, on montre TOUT, du plus long au plus court : l'index est
    // déjà trié ainsi, et les grands itinéraires sont ceux qu'on reconnaît.
    const ici = fiches.filter(surLaPresquile);
    const base = q.trim() ? chercher(ici, q, lieux) : ici;
    return base
      .filter((f) => dureeMax >= DUREE_SANS_LIMITE || f.k / 3.5 <= dureeMax)
      .filter((f) => forme === "tous" || (forme === "boucle" ? f.o : !f.o));
  }, [fiches, lieux, q, dureeMax, forme]);

  return (
    <main className="page">
      <div className="wrap">
        {/* 🔴 L'OUTIL D'ABORD, EN TÊTE DE PAGE — arbitrage du fondateur,
            3/11/2026. Ce bloc vivait APRÈS la liste des sentiers, avec une
            raison écrite le 31/10 : « on propose de fabriquer une promenade
            à qui n'en a pas trouvé une, pas à qui vient d'arriver ». Cette
            raison n'était pas fausse — elle a été ANNULÉE : la page doit
            montrer ce que MANA sait faire de propre avant de montrer ce
            qu'elle a moissonné d'ailleurs. ⭐ Les 1 032 itinéraires restent
            juste en dessous, entiers — ce n'est pas un remplacement, c'est
            un ordre. */}
        <section className="page-panel">
          <p className="apercu-label">Notre outil</p>
          <h2 className="section-title" style={{ marginBottom: "var(--sp-2)" }}>
            Composer votre propre promenade
          </h2>
          <p className="page-texte">
            Une boucle depuis où vous êtes, par les chemins, devant ce qu'il
            y a à voir.
          </p>
          <div className="est-actions" style={{ marginBottom: 0 }}>
            <a className="btn btn-primary" href={`${B}/composer`}>
              Composer une promenade
            </a>
          </div>
        </section>

        {/* ⚠️ « Presqu'île de Crozon » jusqu'au 31/10 — faux depuis que la
            page porte les 46 circuits de l'Office, dont ceux de Pont-de-Buis
            et du Faou. ⭐ Ajouter du contenu requalifie le CADRE : un titre
            qui survit à ce qu'il annonce devient un faux témoin.
            ⚠️ TITRE DE NIVEAU 2, PAS 1 — depuis que le compositeur tient le
            haut de page. Un seul h1 par page ; celui-ci porte désormais le
            catalogue, pas la page entière. */}
        <p className="hero-label">Presqu'île de Crozon &amp; Aulne maritime</p>
        <h2 className="page-titre"><span>Les sentiers</span></h2>

        <section className="page-panel">
          <p className="page-intro">
            7 itinéraires tracés d'après OpenStreetMap, 181 km. Et les
            46 circuits balisés de l'Office, plus bas.
          </p>
          <div className="moteur-barre" role="search">
            <svg className="moteur-loupe" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m15.5 15.5 4.5 4.5" />
            </svg>
            <input
              type="search"
              autoComplete="off"
              placeholder="Une commune, un nom de sentier…"
              aria-label="Chercher une commune ou un sentier"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <p className="page-note">
            {erreur ? (
              <strong>{erreur}</strong>
            ) : !fiches ? (
              "Chargement des sentiers…"
            ) : (
              `${resultats.length.toLocaleString("fr-FR")} itinéraire${
                resultats.length > 1 ? "s" : ""
              }${q.trim() ? ` pour « ${q} »` : ""}`
            )}
          </p>
        </section>

        {fiches && (
          <section className="page-panel">
            <p className="apercu-label">Filtres</p>
            <div className="est-actions" style={{ marginBottom: 0 }}>
              <label className="filtre">
                {dureeMax >= DUREE_SANS_LIMITE
                  ? "Toutes les durées"
                  : `Marche ≤ ${dureeMax} h`}
                <input
                  type="range"
                  min={1}
                  max={DUREE_SANS_LIMITE}
                  step={1}
                  value={dureeMax}
                  onChange={(e) => setDureeMax(Number(e.target.value))}
                />
              </label>
              <select
                value={forme}
                onChange={(e) => setForme(e.target.value as FiltreForme)}
                className="filtre-select"
                aria-label="Forme du parcours"
              >
                <option value="tous">Boucle ou traversée</option>
                <option value="boucle">Boucle</option>
                <option value="aller">Traversée</option>
              </select>
            </div>
          </section>
        )}

        {resultats.slice(0, MAX_AFFICHES).map((f) => (
          <section key={f.s} className="page-panel">
            <p className="apercu-label">{trajet(f)}</p>
            <h2 className="section-title" style={{ marginBottom: "var(--sp-2)" }}>
              {f.n}
            </h2>
            <p className="page-note">
              {f.k} km · {effortLisible(f.k)} · {f.c} commune
              {f.c > 1 ? "s" : ""}
              {/* ⚠️ ON LE DIT. Un itinéraire morcelé s'affiche en plusieurs
                   traits sur la carte, et le visiteur doit savoir pourquoi
                   AVANT de l'ouvrir, pas en découvrant un trou. */}
              {!estContinu(f) && ` · tracé incomplet dans OpenStreetMap`}
            </p>
            <div
              className="est-actions"
              style={{ marginTop: "var(--sp-2)", marginBottom: 0 }}
            >
              <a className="btn btn-primary" href={`${B}/promenade/${f.s}`}>
                Ouvrir l'itinéraire
              </a>
            </div>
          </section>
        ))}

        {resultats.length > MAX_AFFICHES && (
          <section className="page-panel">
            <p className="page-note">
              {resultats.length - MAX_AFFICHES} autres itinéraires
              correspondent. Cherchez une commune, ou resserrez la durée.
            </p>
          </section>
        )}

        {fiches && resultats.length === 0 && (
          <section className="page-panel">
            <p className="page-texte">
              Aucun itinéraire ne correspond. ⚠️ La recherche compare au{" "}
              <strong>point de départ</strong> : un grand sentier qui traverse
              la commune sans en partir ne sortira pas. Essayez une commune
              voisine, ou le nom du sentier.
            </p>
          </section>
        )}

        {/* ⚠️ VIDE DEPUIS LE 31/10 — `VITRINE` est une liste vide, et cette
            section ne s'affiche donc pas. Elle reste écrite : le jour où les
            promenades MANA reviennent, il n'y a rien à reconstruire.
            ⭐ Une section conditionnée par ses données se tait toute seule ;
               une section supprimée demande qu'on la réinvente. */}
        {VITRINE.length > 0 && (
          <section className="page-panel">
            <p className="apercu-label">Vérifiées</p>
            <p className="page-texte">
              {VITRINE.length} promenade{VITRINE.length > 1 ? "s" : ""} vérifiée
              {VITRINE.length > 1 ? "s" : ""}, hors ligne.
            </p>
            <div className="est-actions" style={{ marginBottom: 0 }}>
              {VITRINE.map((w) => (
                <a key={w.slug} className="btn btn-ghost" href={`${B}/promenade/${w.slug}`}>
                  {w.titre}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── LES ITINÉRAIRES BALISÉS ─────────────────────────────────────
            ⛔ CE NE SONT PAS LES NÔTRES, et le libellé le dit. « Balisé par
               l'Office de tourisme » est un fait qui se constate sur un
               poteau ; « recommandé par » serait un avis sur un tiers.
            ⚠️ Le lien mène à LEUR fiche : c'est elle qui fait foi, et c'est
               eux qui entretiennent le balisage. */}
        {ot !== null && ot.length > 0 && (
          <section className="page-panel">
            <p className="apercu-label">Balisés</p>
            <h2 className="section-title" style={{ marginBottom: "var(--sp-1)" }}>
              Les {ot.length} circuits de l'Office de tourisme
            </h2>
            <p className="fiche-provenance fiche-provenance-ot">{MENTION.ot}</p>

            <div className="ot-filtres" role="group" aria-label="Pratique">
              {(["tous", "pied", "vtt", "velo", "trail"] as const).map((k) => (
                <button key={k} type="button"
                  className={k === pratique ? "ot-filtre ot-filtre-actif" : "ot-filtre"}
                  aria-pressed={k === pratique}
                  onClick={() => setPratique(k)}>
                  {k === "tous" ? "Tous" : PRATIQUE[k]}
                </button>
              ))}
            </div>

            <ul className="ot-liste">
              {ot.filter((i) => pratique === "tous" || i.pratique === pratique).map((i) => (
                <li key={i.slug}>
                  <a className="ot-item" href={i.source} target="_blank" rel="noreferrer noopener">
                    <span className="ot-item-titre">{i.titre}</span>
                    <span className="ot-item-meta">
                      {PRATIQUE[i.pratique]} ·{" "}
                      {/* ⚠️ Le kilométrage est MESURÉ sur le tracé, pas repris
                          de leur fiche : les deux diffèrent de 1,2 % en
                          médiane et de 17 % au pire. On affiche ce qu'on a
                          vérifié. */}
                      {i.km.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km ·{" "}
                      {i.boucle ? "boucle" : "aller simple"}
                      {i.difficulte && ` · ${i.difficulte}`}
                      {i.commune && ` · ${i.commune}`}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

      </div>
    </main>
  );
}

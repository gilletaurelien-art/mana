import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { indexer, composer, noeudLePlusProche, traits, formeDeLaBoucle } from "./composition";
import type { Graphe, Boucle } from "./composition";
import type { Walk } from "./walks";

const CarteReelle = lazy(() =>
  import("./CarteReelle").then((m) => ({ default: m.CarteReelle }))
);

// Composer une promenade — « je suis ici, j'ai deux heures ».
//
// ⭐ TOUT LE CALCUL SE FAIT DANS CE NAVIGATEUR. La position ne part nulle
//    part ; il n'y a aucun service de composition à appeler. Ce n'est pas une
//    économie de moyens : un serveur de routage RECEVRAIT la position d'une
//    personne qui est dehors, à cet instant. C'est la même classe de défaut
//    que les quatre fonctions publiques qui rendaient des adresses de
//    domicile, fermées le 28/10/2026.
//
// ⚠️ LE GRAPHE PÈSE 744 Ko COMPRESSÉS et ne se charge qu'ICI, jamais à
//    l'accueil. Une fois chargé, il reste en cache : on peut composer une
//    autre boucle sans réseau.

const CROZON: [number, number] = [-4.4895, 48.2472];
const BASE = "https://mana.bzh/bretagne/g";

/** ⚠️ 3 km/h, pas 4. Une promenade s'arrête, regarde, revient sur ses pas. */
const ALLURE_KMH = 3;

/**
 * ⭐ LE BUDGET PORTE SUR LA DISTANCE RESSENTIE, PAS SUR LES KILOMÈTRES.
 *    Un mètre de montée coûte cinq mètres de plat (règle de Naismith). Donc
 *    « deux heures » dans un terrain qui monte rend une boucle PLUS COURTE —
 *    mesuré sur Crozon : 5,2 km réels au lieu de 6, pour 97 m de montée.
 *    C'est le seul endroit où le dénivelé doit agir : il n'est pas un
 *    désagrément, c'est de l'effort. Le point de vue est en haut.
 */
const budget = (heures: number) => heures * ALLURE_KMH * 1000;

/**
 * ⭐ ON NOMME LA FORME, ON NE LA CACHE PAS. Un parcours peut ne répéter aucune
 *    arête et rester un aller-retour : deux chemins parallèles à cinquante
 *    mètres l'un de l'autre. Mesuré sur Crozon — deux boucles de 8,9 km, 0 %
 *    de répétition toutes les deux, étalement 0,53 contre 0,14.
 *    Annoncer « boucle » pour la seconde est un mensonge qui se vérifie en
 *    marchant. Quand le terrain n'offre qu'un aller-retour (une pointe, un
 *    cul-de-sac côtier), on le dit, et c'est une information utile.
 */
const FORME: Record<string, string> = {
  ample: "boucle ample",
  boucle: "boucle",
  "aller-retour": "aller-retour",
};

const LIBELLE: Record<string, string> = {
  megalithe: "Mégalithe", plage: "Plage", panorama: "Point de vue",
  chateau: "Fortification", calvaire: "Calvaire", chapelle: "Chapelle",
  lieu_de_culte: "Édifice religieux", moulin: "Moulin", phare: "Phare",
  grotte: "Grotte", source: "Source", cascade: "Cascade", ruine: "Ruines",
};

export function Composer() {
  const [graphe, setGraphe] = useState<Graphe | null>(null);
  const [erreur, setErreur] = useState("");
  const [heures, setHeures] = useState(2);
  const [position, setPosition] = useState<[number, number]>(CROZON);
  const [situe, setSitue] = useState(false);
  const [motGps, setMotGps] = useState("");
  const [boucles, setBoucles] = useState<Boucle[] | null>(null);
  const [choisie, setChoisie] = useState(0);
  const [duree, setDuree] = useState(0);
  const graine = useRef(1);

  useEffect(() => {
    document.title = "Composer une promenade — MANA.bzh";
    return () => { document.title = "MANA.bzh — Promenades & découvertes en Bretagne"; };
  }, []);

  useEffect(() => {
    fetch(`${BASE}/crozon.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setGraphe)
      // ⚠️ UNE ERREUR SE DIT. Sans ce message, un refus CORS rendrait une page
      //    vide et silencieuse — le visiteur conclurait qu'il n'y a rien ici.
      .catch(() => setErreur("Les chemins n'ont pas pu être chargés. Vérifiez votre connexion."));
  }, []);

  const ix = useMemo(() => (graphe ? indexer(graphe) : null), [graphe]);

  const localiser = () => {
    if (!navigator.geolocation) { setMotGps("Votre navigateur ne sait pas vous situer."); return; }
    setMotGps("Recherche de votre position…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition([p.coords.longitude, p.coords.latitude]);
        setSitue(true);
        setMotGps("");
      },
      // ⭐ Un refus de localisation n'est pas une panne : la page reste
      //    utilisable depuis le bourg de Crozon, et on le dit.
      () => setMotGps("Position indisponible — on compose depuis le bourg de Crozon."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const lancer = () => {
    if (!graphe || !ix) return;
    const t0 = performance.now();
    const depart = noeudLePlusProche(graphe, position[0], position[1]);
    const b = composer(graphe, ix, depart, budget(heures), { graine: graine.current });
    setDuree(Math.round(performance.now() - t0));
    setBoucles(b);
    setChoisie(0);
  };

  const autre = () => { graine.current = (graine.current * 7919 + 13) >>> 0; lancer(); };

  const b = boucles?.[choisie] ?? null;

  // La carte attend un `Walk` : on lui en fabrique un, avec les TRAITS
  // séparés — jamais une ligne unique (voir Walk.traits).
  const walk: Walk | null = useMemo(() => {
    if (!graphe || !b) return null;
    const t = traits(graphe, b).map((l) => l.map(([lon, lat]) => ({ lon, lat })));
    return {
      slug: "composee", titre: "Votre promenade", lieu: "Crozon", resume: "",
      distanceKm: Math.round(b.metres / 100) / 10,
      // ⚠️ La durée se calcule sur le RESSENTI, pas sur les kilomètres :
      //    annoncer 2 h pour une boucle qui monte de 200 m, c'est promettre
      //    ce qu'on ne tient pas.
      dureeEstimeeH: Math.round((b.ressentie / 1000 / ALLURE_KMH) * 2) / 2,
      boucle: true, osmUrl: "https://www.openstreetmap.org/copyright", osmRef: "",
      points: t.flat(), traits: t,
      etapes: b.lieux.map((l, i) => ({
        nom: l.nom, categorie: l.categorie, pos: i, lat: l.position[1], lon: l.position[0],
      })),
    };
  }, [graphe, b]);

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Je suis ici, j'ai du temps</p>
        <h1 className="page-titre">Composer une promenade</h1>

        <section className="page-panel">
          <p className="page-intro">
            On ne vous propose pas un topoguide : on fabrique une boucle depuis
            l'endroit où vous êtes, par les chemins plutôt que par les routes,
            et qui passe <strong>devant</strong> ce qu'il y a à voir.
          </p>
          <p className="page-note">
            {erreur ? <strong>{erreur}</strong>
              : !graphe ? "Chargement des chemins de la presqu'île…"
              : `${graphe.a.length.toLocaleString("fr-FR")} tronçons de chemin · ${graphe.l.length} lieux remarquables`}
          </p>
          {/* ⭐ Dit une fois, la mesure est un argument ; répétée, c'est du décor. */}
          {graphe && (
            <p className="page-note">
              Tout est calculé dans votre téléphone. Votre position n'est
              envoyée nulle part.
            </p>
          )}
        </section>

        {graphe && (
          <section className="page-panel">
            <p className="apercu-label">Votre promenade</p>
            <div className="est-actions" style={{ marginBottom: "var(--sp-2)" }}>
              <label className="filtre">
                {heures} h de marche
                <span className="page-note">
                  {" "}— plus le terrain monte, plus la boucle sera courte
                </span>
                <input type="range" min={1} max={5} step={0.5} value={heures}
                       onChange={(e) => setHeures(Number(e.target.value))} />
              </label>
            </div>
            <div className="est-actions" style={{ marginBottom: 0 }}>
              <button className="btn btn-ghost" onClick={localiser}>
                {situe ? "Me resituer" : "Partir d'où je suis"}
              </button>
              <button className="btn btn-primary" onClick={lancer}>
                Composer
              </button>
              {boucles && boucles.length > 1 && (
                <button className="btn btn-ghost" onClick={autre}>Autre chose</button>
              )}
            </div>
            {motGps && <p className="page-note">{motGps}</p>}
            {!situe && !motGps && (
              <p className="page-note">Par défaut, on part du bourg de Crozon.</p>
            )}
          </section>
        )}

        {boucles && boucles.length === 0 && (
          <section className="page-panel">
            <p className="page-texte">
              Aucune boucle de cette longueur ne part d'ici. Essayez une durée
              différente — ou rapprochez-vous d'un chemin : la presqu'île est
              bien maillée, mais pas partout.
            </p>
          </section>
        )}

        {boucles && boucles.length > 1 && (
          <section className="page-panel">
            <p className="apercu-label">Trois façons de marcher autant</p>
            {/* 🔴 ON NE CHOISIT PAS À LA PLACE DU MARCHEUR, ET C'EST UNE
                MESURE QUI L'IMPOSE. Sur une cible de 6 km, les deux
                meilleures boucles étaient séparées de 4 points sur 138 — un
                écart dans le bruit — et elles ne se ressemblaient pas du tout :
                l'une longeait la mer sur 28 % de son parcours, l'autre sur 4 %.
                ⭐ Les poids du score (14 par lieu, 220 pour la longueur) sont
                   des opinions que personne n'a validées en marchant. Quand un
                   classement ne sait pas trancher, il ne doit pas trancher :
                   il doit PROPOSER — et c'est aussi l'argument de dispersion
                   des flux, qui veut cinq promenades plutôt que la meilleure. */}
            <div className="est-actions" style={{ marginBottom: 0, flexWrap: "wrap" }}>
              {boucles.slice(0, 3).map((x, i) => (
                <button
                  key={i}
                  className={i === choisie ? "btn btn-primary" : "btn btn-ghost"}
                  onClick={() => setChoisie(i)}
                >
                  {(x.metres / 1000).toFixed(1)} km
                  {` · ${FORME[formeDeLaBoucle(x.etalement)]}`}
                  {x.montee >= 40 && ` · +${Math.round(x.montee)} m`}
                  {x.bordDeMer > 300 && ` · ${(x.bordDeMer / 1000).toFixed(1)} km de mer`}
                  {x.lieux.length > 0 && ` · ${x.lieux.length} lieux`}
                </button>
              ))}
            </div>
          </section>
        )}

        {b && walk && (
          <>
            <section className="page-panel">
              <h2 className="section-title" style={{ marginBottom: "var(--sp-2)" }}>
                {walk.distanceKm} km · environ {walk.dureeEstimeeH} h
              </h2>
              <p className="page-note">
                {FORME[formeDeLaBoucle(b.etalement)]}
                {formeDeLaBoucle(b.etalement) === "aller-retour" &&
                  " — on revient par un chemin voisin, pas par une autre boucle"}
                {" · "}
                {b.lieux.length > 0
                  ? `${b.lieux.length} lieu${b.lieux.length > 1 ? "x" : ""} sur le chemin`
                  : "Aucun lieu remarquable sur ce parcours — c'est la marche qui compte"}
                {b.montee >= 40 && ` · ${Math.round(b.montee)} m de montée`}
                {b.bordDeMer > 300 &&
                  ` · ${(b.bordDeMer / 1000).toFixed(1)} km au bord de mer`}
                {b.partRepetee > 0.1 && " · une portion se parcourt deux fois"}
                {" · calculé en "}{duree} ms
              </p>
            </section>

            <section className="page-panel" style={{ padding: 0, overflow: "hidden" }}>
              <Suspense fallback={<p className="page-note" style={{ padding: "var(--sp-3)" }}>Chargement de la carte…</p>}>
                <CarteReelle walk={walk} />
              </Suspense>
            </section>

            {b.lieux.length > 0 && (
              <section className="page-panel">
                <p className="apercu-label">Ce que vous croiserez</p>
                {/* ⭐ DANS L'ORDRE DE MARCHE. Un classement qui porte un titre
                    de séquence et trie par autre chose est un mensonge qui ne
                    se signale jamais : il se vérifie en marchant. */}
                <ol className="page-texte" style={{ paddingLeft: "1.2em" }}>
                  {b.lieux.map((l, i) => (
                    <li key={`${l.nom}-${i}`} style={{ marginBottom: ".4em" }}>
                      {l.nom}
                      {l.anonyme ? "" : <span className="page-note"> · {LIBELLE[l.categorie] ?? l.categorie}</span>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className="page-panel">
              <p className="page-note">
                Chemins et lieux d'après{" "}
                <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>{" "}
                (ODbL). Difficulté, accessibilité et accueil des chiens ne sont
                pas renseignés à la source : nous ne les affichons pas.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

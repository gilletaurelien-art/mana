/**
 * ÉCRAN 3 — LA FICHE PROMENADE. Éditoriale, photographique, aérée.
 *
 * ⭐ CE N'EST PAS L'ÉCRAN DE NAVIGATION, ET LA DISTINCTION EST LE SUJET.
 *    `Promenade.tsx` répond à « où suis-je, et où vais-je ? » : GPS, boussole,
 *    repère hors-sentier, SOS. Elle se lit DEHORS, une main sur le téléphone.
 *    Celle-ci répond à « est-ce que j'ai envie d'y aller ? » et se lit AVANT,
 *    assis, au calme. Deux questions, deux rythmes, deux mises en page — les
 *    empiler dans un seul écran, c'est ce que fait une application de
 *    randonnée standard, et le brief le refuse nommément.
 *
 * 🔴 LA COUVERTURE NE MENT JAMAIS. Soit on possède une photographie d'un lieu
 *    que ce parcours traverse — et elle est créditée, située, documentaire —,
 *    soit on n'en a pas, et la fiche s'ouvre sur SON PROPRE TRACÉ dessiné
 *    depuis nos données. Jamais une belle image d'ailleurs. Sur nos quatre
 *    promenades, deux ont leur photographie et deux n'en ont pas : l'écran
 *    doit être bon dans les deux cas, pas beau dans un et bricolé dans l'autre.
 *
 * ⛔ L'ATTRIBUTION OpenStreetMap VOYAGE AVEC LA DONNÉE, pas seulement à
 *    l'écran : elle est dans le GPX exporté, parce que c'est le fichier qui
 *    survit à la page.
 */
import { lazy, useEffect, useState } from "react";
import { WALKS, effortLisible, MENTION } from "./walks";
import type { Walk } from "./walks";
import { Atlas } from "./Atlas";
import { Photo, image } from "./images/Photo";
import { ILLUSTRATIONS } from "./illustrations";
import { libelleCategorie } from "./categories";
import { WalkMap } from "./WalkMap";
import { CarteOuSchema } from "./CarteOuSchema";
import { FICHIER_FERMETURES, fermeturesSurLeParcours } from "./fermetures";
import { lireCarnet, basculerCarnet } from "./carnet";
import type { Fermetures, Fermeture } from "./fermetures";

/** ⚠️ Arrondi à la dizaine de mètres : nos tracés viennent d'OSM, dont la
 *  précision ne justifie pas le mètre. Un chiffre plus précis que sa source
 *  est une affirmation qu'on ne peut pas tenir. */
const distance = (km: number) =>
  km < 10
    ? `${km.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
    : `${Math.round(km)} km`;

/* ⚠️ La carte réelle reste en import DIFFÉRÉ : son morceau pèse 805 Ko de JS
   et 65 Ko de CSS (maplibre). Le charger avec la fiche ferait payer la carte à
   qui vient seulement lire si la promenade lui plaît. */
const CarteReelle = lazy(() =>
  import("./CarteReelle").then((m) => ({ default: m.CarteReelle }))
);

export function FichePromenade({ base, slug }: { base: string; slug: string }) {
  const walk = WALKS.find((w) => w.slug === slug);
  const [fermetures, setFermetures] = useState<Fermetures | null>(null);
  const [garde, setGarde] = useState(false);

  useEffect(() => {
    // ⚠️ Un échec de chargement des fermetures n'est PAS silencieux dans son
    //    effet : il laisse la liste vide, donc la fiche n'affiche aucune
    //    restriction. C'est le bon défaut — on n'invente pas d'interdiction —
    //    mais il faut savoir que « rien d'affiché » peut vouloir dire « rien
    //    de connu ». Le pied de page le dit.
    let vivant = true;
    fetch(`${base}/${FICHIER_FERMETURES}`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivant) setFermetures(j); })
      .catch(() => { if (vivant) setFermetures(null); });
    return () => { vivant = false; };
  }, [base]);

  // ⚠️ Lu APRÈS le montage, jamais pendant le rendu : `localStorage` n'existe
  //    pas au moment où un rendu serveur ou un prérendu s'exécute, et y
  //    toucher ferait échouer la génération de la page entière.
  useEffect(() => { setGarde(lireCarnet().includes(slug)); }, [slug]);

  if (!walk) {
    return (
      <section className="fiche-vide">
        <h1 className="m-titre">Cette promenade n'existe pas</h1>
        <p className="m-texte">
          Elle a peut-être été renommée. <a className="m-lien" href={`${base}/carte`}>Voir le territoire</a>.
        </p>
      </section>
    );
  }

  const illus = ILLUSTRATIONS[walk.slug];
  const couverture = illus?.couverture ? image(illus.couverture) : undefined;
  const touchees: Fermeture[] = fermeturesSurLeParcours(walk.points, fermetures);
  const interdites = touchees.filter((f) => f.effet === "interdit");
  const avertissements = touchees.filter((f) => f.effet === "avertir");

  const marquePage = (
    /* ⭐ Un marque-page, pas un « favori » : on n'aime pas une promenade, on
       la met de côté pour y revenir. Et il ne demande aucun compte — le
       libellé accessible le dit, parce qu'un cœur dans un coin fait chercher
       la connexion qui n'existe pas. */
    <button
      type="button"
      className={`fiche-marque ${garde ? "fiche-marque-prise" : ""}`}
      aria-pressed={garde}
      onClick={() => setGarde(basculerCarnet(walk.slug).includes(walk.slug))}
    >
      <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4h12v16l-6-4-6 4z" fill={garde ? "currentColor" : "none"} />
      </svg>
      <span className="sr-only">
        {garde ? "Retirer de mes promenades" : "Garder dans mes promenades, sur cet appareil"}
      </span>
    </button>
  );

  return (
    <article className="fiche">
      {marquePage}
      {/* ── LA COUVERTURE : LA CARTE OSM ──────────────────────────────────
          ⭐ UNE SEULE COUVERTURE DÉSORMAIS, LA MÊME POUR LES QUATRE. Il y en
             avait deux — photographie quand on en possédait une, atlas au
             trait sinon — et l'écran était donc bon dans deux dialectes. La
             carte répond mieux que les deux à la question que cette page
             pose : « est-ce que j'ai envie d'y aller ? » se tranche en voyant
             OÙ, pas en voyant un joli rocher.
          ⚠️ Le titre est SOUS la carte, jamais dessus : du texte posé sur un
             fond de carte clair serait illisible, et un voile assez sombre
             pour le porter effacerait la carte qu'on vient d'afficher. C'est
             la règle qui valait déjà pour l'atlas au trait.
          ⚠️ `CarteOuSchema` et pas `CarteReelle` nue : hors ligne, l'import
             différé échoue, et un `Suspense` seul démonterait l'arbre entier
             — écran blanc, dehors, sans réseau. */}
      <header className="fiche-couverture fiche-couverture-carte">
        <div className="fiche-carte" aria-hidden="true">
          <CarteOuSchema schema={<WalkMap walk={walk} />}>
            <CarteReelle walk={walk} marge={1.1} />
          </CarteOuSchema>
        </div>
        <div className="fiche-couverture-texte fiche-couverture-texte-bas">
          <p className="fiche-pastilles">
            <span className="fiche-pastille">{walk.boucle ? "Boucle" : "Aller simple"}</span>
          </p>
          <p className="m-etiquette fiche-sur-titre">{walk.lieu}</p>
          <h1 className="m-accroche fiche-titre">{walk.titre}</h1>
          {/* ⛔ QUI RÉPOND DE CE TRACÉ, sous le titre et jamais plus bas. Un
              marcheur qui décide s'il part lit le titre et la distance ; s'il
              doit descendre pour apprendre que le parcours n'est pas balisé,
              il l'apprendra sur le terrain. */}
          <p className={`fiche-provenance fiche-provenance-${walk.provenance}`}>
            {MENTION[walk.provenance]}
          </p>
        </div>
      </header>

      <div className="fiche-corps">
        <p className="m-chapeau fiche-resume">{walk.resume}</p>

        {/* ⭐ LA PHOTOGRAPHIE DE COUVERTURE NE SE PERD PAS, ELLE DESCEND. Elle
            est documentaire, créditée et située ; la retirer de l'écran parce
            que la carte prend sa place reviendrait à jeter le travail de
            vérification qui la rend publiable. Elle ouvre le corps. */}
        {couverture && (
          <figure className="fiche-illustration">
            <Photo
              id={couverture.id}
              usage="documente"
              alt={`${couverture.lieu} — photographie`}
              sizes="(min-width: 720px) 680px, 100vw"
              priorite
              className="m-r-editorial m-photo-vivante"
            />
            {couverture.pourquoi && (
              <figcaption className="m-meta fiche-legende">{couverture.pourquoi}</figcaption>
            )}
          </figure>
        )}

        {/* ── LES CHIFFRES ────────────────────────────────────────────────
            ⚠️ Trois valeurs, et la durée porte son hypothèse DANS la ligne.
            « 2 h » sans « à 3,5 km/h » est un engagement ; avec, c'est une
            estimation — et c'est ce qu'elle est. */}
        <dl className="fiche-chiffres">
          <div>
            <dt className="m-etiquette">Distance</dt>
            <dd className="m-chiffre">{distance(walk.distanceKm)}</dd>
          </div>
          <div>
            <dt className="m-etiquette">Marche</dt>
            <dd className="m-chiffre">{effortLisible(walk.distanceKm).replace("≈ ", "")}</dd>
            <dd className="m-meta">estimée à 3,5 km/h</dd>
          </div>
          <div>
            <dt className="m-etiquette">Forme</dt>
            <dd className="m-chiffre">{walk.boucle ? "Boucle" : "Aller simple"}</dd>
            {!walk.boucle && <dd className="m-meta">prévoir le retour</dd>}
          </div>
        </dl>

        {/* ── CE QUE DIT L'AUTORITÉ ───────────────────────────────────────
            🔴 EN HAUT, AVANT LE RÉCIT, et jamais après. Une fermeture lue
               après avoir eu envie d'y aller arrive trop tard.
            ⛔ MANA ne ferme rien : chaque ligne nomme QUI a décidé et DONNE
               l'adresse où la décision se lit. Une interdiction sans auteur
               est une invention. */}
        {interdites.length > 0 && (
          <section className="fiche-fermeture fiche-fermeture-interdit">
            <h2 className="m-etiquette">Section fermée sur ce parcours</h2>
            {interdites.map((f) => (
              <p key={f.id} className="m-texte">
                <strong>{f.libelle}</strong> — {f.motif}.{" "}
                <span className="m-meta">
                  {f.autorite}, {f.publie_le}.{" "}
                  <a className="m-lien" href={f.source} target="_blank" rel="noreferrer noopener">la décision</a>
                  {f.portee_approximative && " · périmètre approximatif"}
                </span>
              </p>
            ))}
          </section>
        )}
        {avertissements.length > 0 && (
          <section className="fiche-fermeture">
            <h2 className="m-etiquette">À savoir avant de partir</h2>
            {avertissements.map((f) => (
              <p key={f.id} className="m-texte">
                <strong>{f.libelle}</strong> — {f.motif}.{" "}
                <span className="m-meta">
                  {f.autorite}, {f.publie_le}.{" "}
                  <a className="m-lien" href={f.source} target="_blank" rel="noreferrer noopener">la source</a>
                </span>
              </p>
            ))}
          </section>
        )}

        {/* ── CE QU'ON RENCONTRE ──────────────────────────────────────────
            ⭐ LE POURCENTAGE EST LA PREUVE QUE LE LIEU EST SUR LE CHEMIN.
               `pos` vaut 0 au départ et 1 à l'arrivée : « à 24 % du parcours »
               dit qu'on le croise sans se détourner. ⛔ On ne présente JAMAIS
               comme « sur le chemin » un lieu qui demande un détour — et comme
               nos étapes viennent du tracé lui-même, la question ne se pose
               pas : elle se poserait si on les cherchait par rayon. */}
        {walk.etapes.length > 0 && (
          <section className="fiche-rencontres">
            <h2 className="m-sous">Sur le chemin</h2>
            <ol className="fiche-etapes">
              {walk.etapes
                .slice()
                .sort((a, b) => a.pos - b.pos)
                /* ⭐ LA PASTILLE PORTE LE RANG, PAS LE POURCENTAGE — 31/10/2026.
                   Elle répétait mot pour mot ce que la ligne du dessous dit
                   déjà (« à 11 % du parcours ») : deux fois la même donnée,
                   dont l'une sans unité et en gros. Le rang, lui, n'est écrit
                   nulle part ailleurs — c'est l'information que la liste
                   ordonnée porte visuellement mais ne nomme pas. */
                .map((e, i) => (
                  <li key={`${e.nom}-${e.pos}`} className="fiche-etape">
                    <span className="fiche-etape-pos m-chiffre" aria-hidden="true">
                      <span className="fiche-diese">#</span>{i + 1}
                    </span>
                    <span className="fiche-etape-corps">
                      <span className="fiche-etape-nom">{e.nom}</span>
                      <span className="m-meta">
                        {libelleCategorie(e.categorie)} · à {Math.round(e.pos * 100)} % du parcours
                      </span>
                    </span>
                  </li>
                ))}
            </ol>
          </section>
        )}

        {/* ── LE CORPS PHOTOGRAPHIQUE ─────────────────────────────────────  */}
        {illus?.corps?.map((id) => {
          const im = image(id);
          if (!im) return null;
          return (
            <figure key={id} className="fiche-illustration">
              <Photo
                id={id}
                usage={im.documentaire ? "documente" : "evoque"}
                alt={im.lieu ?? "Paysage breton"}
                sizes="(min-width: 720px) 680px, 100vw"
                className="m-r-editorial m-photo-vivante"
              />
              {im.pourquoi && <figcaption className="m-meta fiche-legende">{im.pourquoi}</figcaption>}
            </figure>
          );
        })}

        {/* ── PARTIR ──────────────────────────────────────────────────────  */}
        <div className="fiche-actions">
          <a className="m-action fiche-partir" href={`${base}/promenade/${walk.slug}/en-chemin`}>
            Partir sur ce chemin
          </a>
          <a className="m-action-fine" href={`${base}/promenade/${walk.slug}/rencontres`}>
            Ce qu'on croise autour de moi
          </a>
          <a className="m-lien fiche-osm" href={walk.osmUrl} target="_blank" rel="noreferrer noopener">
            Le tracé sur OpenStreetMap
          </a>
        </div>

        <footer className="fiche-pied">
          <p className="m-meta">
            Tracé et lieux&nbsp;: © les contributeurs d'OpenStreetMap, ODbL.
            Référence&nbsp;: {walk.osmRef}.
          </p>
          <p className="m-meta">
            {touchees.length === 0 && fermetures === null
              ? "Restrictions indisponibles — vérifiez auprès de la commune avant de partir."
              : "Fermetures connues au dernier relevé. Une décision récente peut manquer."}
          </p>
        </footer>
      </div>
    </article>
  );
}

export const promenadeExiste = (slug: string): Walk | undefined =>
  WALKS.find((w) => w.slug === slug);

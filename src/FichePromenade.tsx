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
import { BoutonEmporter } from "./BoutonEmporter";
import { WALKS, effortLisible, MENTION } from "./walks";
import { chargerPromenade } from "./promenade-source";
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
  /* 🔴 CETTE FICHE NE CONNAISSAIT QUE LES QUATRE PROMENADES EMBARQUÉES —
     trouvé le 12/11/2026, en ouvrant un lien de `/promenades`.
     `WALKS.find(...)` et rien d'autre. Or `/promenades` liste le CATALOGUE
     DISTANT (~26 600 tracés) et lie chacun vers `/promenade/<slug>` : les sept
     liens de la page menaient donc à SEPT « Cette promenade n'existe pas ».
     ⭐ ET LA CAPACITÉ EXISTAIT À DIX LIGNES DE LÀ. `Promenade.tsx` — l'écran
     de marche, servi par `/promenade/<slug>/en-chemin` — porte les DEUX
     sources depuis longtemps, avec son commentaire expliquant pourquoi. Elle
     a été ajoutée à l'écran de marche et jamais à la FICHE, qui est pourtant
     la première page qu'on ouvre. Deux composants pour le même slug, un seul
     qui a appris à lire le catalogue.
     ⚠️ Mesuré avant de conclure : le point d'accès répond 200, le CORS passe
     depuis la page, la géométrie est bonne (8 tronçons, 112 points) — et
     `performance.getEntriesByType` montrait **zéro requête** vers mana.bzh.
     Ce n'était ni la donnée ni le réseau : la fiche ne demandait rien. */
  /* 🔴 TROISIÈME SOURCE — 12/11/2026 : LES CIRCUITS DES OFFICES. Demande du
     fondateur : « on pourrait les avoir aussi chez nous avec le même
     dispositif d'accompagnement que nos promenades composées ». Ils vivent
     dans `ot.json`, déjà embarqué, et un préfixe `ot-` dans l'adresse les
     distingue sans ambiguïté des 26 600 tracés du catalogue distant.
     ⭐ Et ils arrivent AVEC leurs étapes : « ce que vous croiserez » est
        calculé sur nos 5 676 lieux, ce que leur propre fiche ne sait pas
        dire. C'est l'échange — leur tracé, notre inventaire.
     ⚠️ L'inventaire est chargé à part et peut tarder : la promenade est
        marchable sans lui, elle n'annonce simplement pas ses rencontres. */
  const embarquee = WALKS.find((w) => w.slug === slug);
  const [distante, setDistante] = useState<Walk | null>(null);
  const [cherche, setCherche] = useState(!embarquee);

  useEffect(() => {
    if (embarquee) { setCherche(false); return; }
    let vivant = true;
    setCherche(true);
    /* ⭐ UNE SEULE QUESTION, UN SEUL ENDROIT QUI RÉPOND. `chargerPromenade`
       sait où chercher — embarquée, circuit d'Office, catalogue distant — et
       c'est volontairement hors de cet écran : trois fois cette année, une
       source ajoutée à UN écran a laissé les voisins en arrière. */
    chargerPromenade(slug)
      .then((w) => { if (vivant) setDistante(w); })
      .catch(() => { if (vivant) setDistante(null); })
      .finally(() => { if (vivant) setCherche(false); });
    return () => { vivant = false; };
  }, [slug, embarquee]);

  const walk = embarquee ?? distante;

  /* ⭐ LE TITRE D'UNE PAGE DYNAMIQUE EST SON NOM — il ne peut pas tenir dans
     la table de App.tsx, et c'est la seule raison pour laquelle il vit ici.
     ⚠️ Posé le 1/11/2026 : cette page n'en avait JAMAIS eu. C'est pourtant
        celle qu'on partage — l'adresse d'une balade — et son résultat de
        recherche disait exactement ce que dit l'accueil. Le défaut était
        invisible depuis l'écran, où le titre d'onglet ne se regarde pas. */
  useEffect(() => {
    if (!walk) return;
    /* 🔴 AUCUNE RESTAURATION, ET C'EST LE CORRECTIF. Cet effet rendait le
       titre par défaut en se démontant — et cette restauration s'exécutait
       APRÈS l'effet de App.tsx qui venait de poser le titre de la page
       SUIVANTE. Mesuré en production le 1/11 : `/radio` affiche son titre à
       froid, et retombe au titre d'accueil quand on y revient depuis une
       fiche de balade.
       ⭐ DEUX ÉCRIVAINS POUR UNE VALEUR, ET L'ORDRE NE NOUS APPARTIENT PAS.
          C'est la leçon du Caddyfile du même jour, transposée à React : on
          ne corrige pas en espérant un ordre, on retire le second écrivain.
          La table de App.tsx repose le titre à CHAQUE changement d'adresse ;
          il n'y a rien à restaurer. */
    document.title = `${walk.titre} — Promenades MANA.bzh`;
  }, [walk]);
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

  /* ⛔ LE RETOUR ANTICIPÉ RESTE APRÈS TOUS LES HOOKS — vérifié avant d'écrire
     les trois ci-dessus. `Promenade.tsx` porte la cicatrice : une première
     version sortait avant eux, et React rendait « Minified React error #310 »
     sur une page ENTIÈREMENT BLANCHE, alors que la donnée arrivait en 200.
     Une page blanche accuse la donnée ; c'était l'ordre des hooks. */
  if (!walk) {
    /* ⚠️ ET « ON CHERCHE » N'EST PAS « ÇA N'EXISTE PAS ». Sans cet état, la
       fiche d'un tracé distant annoncerait son absence pendant le temps du
       téléchargement, puis se corrigerait — un démenti qui arrive après que
       la personne est repartie. */
    if (cherche) {
      return (
        <section className="fiche-vide">
          <h1 className="m-titre">Chargement…</h1>
          <p className="m-texte">Le tracé arrive.</p>
        </section>
      );
    }
    return (
      <section className="fiche-vide">
        <h1 className="m-titre">Cette promenade n'existe pas</h1>
        <p className="m-texte">
          Aucun parcours ne porte le nom « {slug} ». Il a peut-être été
          renommé. <a className="m-lien" href={`${base}/carte`}>Voir le territoire</a>.
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
          {/* ⚠️ « PRÉVOIR LE RETOUR » REMONTE ICI — 12/11/2026, en compactant.
              Il vivait sous « Forme : Aller simple », trois cents pixels plus
              bas, à côté du mot qu'il précise. Les deux sont désormais au
              même endroit, et le mot ne s'écrit plus deux fois. */}
          <p className="fiche-pastilles">
            <span className="fiche-pastille">{walk.boucle ? "Boucle" : "Aller simple"}</span>
            {!walk.boucle && (
              <span className="fiche-pastille-note">prévoir le retour</span>
            )}
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
        {/* ⛔ UN RÉSUMÉ VIDE N'EST PAS UN RÉSUMÉ COURT. Les circuits des
            Offices n'en ont pas — nous n'avons pas leur texte, et en écrire un
            « plausible » serait le mensonge documentaire que ce dépôt refuse
            pour les images. Rendu quand même, le paragraphe creusait un trou
            de `--sp-4` entre la provenance et les chiffres : vu à l'écran,
            et c'est exactement la « surface qui existe sans contenu » que cet
            écosystème traque ailleurs. */}
        {walk.resume && <p className="m-chapeau fiche-resume">{walk.resume}</p>}

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

        {/* ── LES CHIFFRES, EN UNE LIGNE ──────────────────────────────
            🔴 COMPACTÉS LE 12/11/2026, demande du fondateur. Ils occupaient
            trois colonnes étiquetées — Distance · Marche · Forme — soit six
            lignes de texte pour trois faits courts, et « Boucle » s'y écrivait
            une SECONDE fois : la pastille de la couverture le disait déjà,
            trois cents pixels plus haut.
            ⚠️ LA DURÉE GARDE SON HYPOTHÈSE DANS LA LIGNE, et c'est la seule
               chose qui ne se compacte pas : « 3,5 h » sans « à 3,5 km/h »
               est un engagement ; avec, c'est une estimation.
            🔴 ET ELLE DIT MAINTENANT D'OÙ ELLE VIENT. Un circuit d'Office
               DÉCLARE sa durée — leur parole, ils connaissent les escaliers
               et le sable. La fiche recalculait à 3,5 km/h par-dessus, donc
               elle effaçait leur mesure pour afficher la nôtre sous leur nom.
               ⭐ Trouvé en compactant, pas en cherchant : rassembler deux
                  valeurs côte à côte montre qu'elles ne parlent pas de la
                  même chose. */}
        <p className="fiche-faits">
          <strong className="fiche-fait-fort">{distance(walk.distanceKm)}</strong>
          <span className="fiche-fait-sep" aria-hidden="true"> · </span>
          {walk.dureeDeclaree ? (
            <>
              <strong className="fiche-fait-fort">
                {walk.dureeEstimeeH.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h
              </strong>{" "}
              <span className="m-meta">annoncées par l'Office</span>
            </>
          ) : (
            <>
              <strong className="fiche-fait-fort">
                {effortLisible(walk.distanceKm).replace("≈ ", "")}
              </strong>{" "}
              <span className="m-meta">estimée à 3,5 km/h</span>
            </>
          )}
        </p>

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
          {/* 🔴 LE CRÉDIT SUIT LA PROVENANCE, ET CE N'EST PAS UN DÉTAIL DE
              FORMULATION. Cette fiche disait « Le tracé sur OpenStreetMap »
              pour TOUT, parce que tout venait d'OSM quand elle a été écrite.
              Un circuit d'Office vient de LEUR relevé GPX : l'annoncer comme
              une relation OSM citerait qui n'a rien fourni et tairait qui a
              fourni — la faute exacte que `carte-fond.ts` refuse pour
              l'attribution des fonds de carte. */}
          <a className="m-lien fiche-osm" href={walk.osmUrl} target="_blank" rel="noreferrer noopener">
            {walk.provenance === "ot"
              ? "La fiche de l'Office de tourisme"
              : "Le tracé sur OpenStreetMap"}
          </a>
          {/* ⭐ EMPORTER EST ICI, SOUS « PARTIR », ET C'EST L'ORDRE DU GESTE :
              on décide d'y aller, puis on met la carte à bord. Le placer en
              haut de fiche demanderait de télécharger avant d'avoir choisi. */}
          <BoutonEmporter points={walk.points} />
        </div>

        <footer className="fiche-pied">
          {/* ⚠️ MÊME RÈGLE AU PIED : les LIEUX viennent d'OpenStreetMap dans
              les deux cas — c'est notre inventaire —, mais le TRACÉ vient de
              l'Office quand c'est un de leurs circuits. On sépare les deux
              plutôt que de créditer en bloc. */}
          <p className="m-meta">
            {walk.provenance === "ot" ? (
              <>
                Tracé&nbsp;: relevé et balisé par l'Office de tourisme.
                Lieux&nbsp;: © les contributeurs d'OpenStreetMap, ODbL.
                Référence&nbsp;: {walk.osmRef}.
              </>
            ) : (
              <>
                Tracé et lieux&nbsp;: © les contributeurs d'OpenStreetMap, ODbL.
                Référence&nbsp;: {walk.osmRef}.
              </>
            )}
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

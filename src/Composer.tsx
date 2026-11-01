import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { indexer, composer, composerVers, fondreRencontres, intitules, descriptif, ECART_MAX_M, noeudLePlusProche, traits, formeDeLaBoucle, SOURCE_MAREES, cheminDeRetour, composanteAtteint } from "./composition";
import { portrait } from "./portrait";
import { enGpx, telecharger } from "./Promenade";
import type { Graphe, Boucle, Retour, Visee } from "./composition";
import { DEFAUT, territoireDe, urlGraphe } from "./territoires";
import type { Walk } from "./walks";
import { WalkMap } from "./WalkMap";
import { CarteOuSchema } from "./CarteOuSchema";
import { chargerFermetures, aretesTouchees, type Fermetures } from "./fermetures";

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
// ⚠️ SURCHARGEABLE POUR POUVOIR VÉRIFIER. La liste blanche CORS de mana.bzh
//    n'autorise que GitHub Pages : depuis `localhost`, le graphe est refusé et
//    la page ne montre rien. Sans cette surcharge, aucune modification du
//    compositeur n'est vérifiable autrement qu'en production.
//    La valeur par défaut EST la production : une construction sans variable
//    se comporte exactement comme avant.
/** Au-delà de ce nombre de nœuds atteignables, on considère qu'on est sur le
 *  réseau et non sur un moignon. 50 : assez pour écarter un cul-de-sac de
 *  quelques points, assez peu pour que le parcours coûte moins d'une
 *  milliseconde. */
const SEUIL_RESEAU = 50;

const BASE = import.meta.env.VITE_GRAPHE_BASE ?? "https://mana.bzh/bretagne/g";

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

/** ⭐ Dessiné ici plutôt qu'importé : un seul picto, 7 lignes, et aucune
 *  bibliothèque d'icônes ne rentre dans le paquet pour ça. */
function SvgEtincelle() {
  return (
    <svg className="cp-etincelle" viewBox="0 0 24 24" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 4.9L18.7 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8z" />
      <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  );
}

/** ⚠️ LA MÊME RÈGLE QUE LA FICHE, PAS UN SECOND CALCUL. La durée se tire de
 *  la distance RESSENTIE, à l'allure unique du produit — deux formules
 *  écrites séparément divergeraient, et c'est l'heure du retour qui en
 *  dépend. Arrondie au quart d'heure : « 2 h 15 » se lit, « 2,23 h » non. */
function heuresDe(b: { ressentie: number }): string {
  const q = Math.max(1, Math.round((b.ressentie / 1000 / ALLURE_KMH) * 4));
  const h = Math.floor(q / 4), m = (q % 4) * 15;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

function SvgTelecharger() {
  return (
    <svg className="cp-picto" viewBox="0 0 24 24" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v10" /><path d="M8 11l4 4 4-4" /><path d="M5 19h14" />
    </svg>
  );
}

function SvgBotte() {
  return (
    <svg className="cp-botte" viewBox="0 0 24 24" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v9l-2 3v4h15v-3l-4-2-2-3V3z" />
      <path d="M5 17h15" />
    </svg>
  );
}

export function Composer() {
  const [graphe, setGraphe] = useState<Graphe | null>(null);
  const [erreur, setErreur] = useState("");
  const [heures, setHeures] = useState(2);
  /**
   * ⚠️ LA POSITION PEUT ARRIVER DE L'INVITATION. « Autour de moi » demande la
   *    permission LÀ OÙ LA QUESTION SE POSE, puis amène ici avec le point.
   *    Sans ce passage, l'écran d'accueil redemanderait la position que
   *    l'utilisateur vient tout juste d'accorder — on ferait payer deux fois
   *    le même consentement.
   * ⛔ Et rien n'est stocké : la position ne traverse que l'URL de cette
   *    navigation, elle ne part sur aucun serveur et n'est pas conservée.
   */
  const depuisURL = (): [number, number] | null => {
    const p = new URLSearchParams(window.location.search);
    const lon = Number(p.get("lon")), lat = Number(p.get("lat"));
    return Number.isFinite(lon) && Number.isFinite(lat) && (lon !== 0 || lat !== 0)
      ? [lon, lat] : null;
  };
  /**
   * ⭐ « VERS CE LIEU » ARRIVE PAR L'URL, comme la position — et pour la même
   *    raison : la carte du territoire est l'endroit où l'on VOIT le menhir,
   *    donc l'endroit où l'envie naît. Le geste doit partir de là, pas d'un
   *    formulaire où il faudrait retrouver le nom qu'on vient de lire.
   * ⚠️ `lon`/`lat` disent d'où l'on PART ; `vers` dit où l'on VA. Les deux ne
   *    se confondent jamais : le point de départ reste le promeneur.
   */
  const cibleURL = (): { g: [number, number]; nom: string } | null => {
    const p = new URLSearchParams(window.location.search);
    const v = p.get("vers");
    if (!v) return null;
    const [lo, la] = v.split(",").map(Number);
    if (!Number.isFinite(lo) || !Number.isFinite(la)) return null;
    return { g: [lo, la], nom: p.get("nom") || "ce lieu" };
  };
  const [cible] = useState(cibleURL);
  const [visee, setVisee] = useState<Visee | null>(null);

  const recue = depuisURL();
  const [position, setPosition] = useState<[number, number]>(recue ?? CROZON);
  const [situe, setSitue] = useState(recue !== null);
  const [motGps, setMotGps] = useState("");
  const [boucles, setBoucles] = useState<Boucle[] | null>(null);
  const [choisie, setChoisie] = useState(0);
  const [duree, setDuree] = useState(0);
  const [retour, setRetour] = useState<Retour | null>(null);
  const [motRetour, setMotRetour] = useState("");
  const graine = useRef(1);
  // ⚠️ `undefined` = pas encore chargé · `null` = fichier absent ou illisible.
  //    Les deux ne se confondent pas : une application qui calcule sans
  //    connaître les fermetures doit le DIRE, pas se taire.
  const [fermetures, setFermetures] = useState<Fermetures | null | undefined>(undefined);
  // 🔴 LE REPLI NE PEUT PAS DÉPENDRE DU CHARGEMENT DU CODE. Mesuré le 31/10 :
  //    une fois le morceau `CarteReelle` tiédi et mis en cache, il se charge
  //    très bien hors ligne — maplibre démarre, et rend un rectangle UNI,
  //    parce que ses tuiles, elles, ne sont pas en cache. Le garde d'erreur ne
  //    voyait rien à rattraper.
  //    ⭐ En faisant RÉUSSIR le chargement, j'avais supprimé le seul signal qui
  //       disait que la carte ne pouvait pas FONCTIONNER. Un repli doit se
  //       déclencher sur la capacité, jamais sur l'arrivée du code.
  //    ⚠️ `navigator.onLine` reste imparfait — il dit vrai sur un réseau
  //       captif. Il est le signal le moins mauvais disponible ici, et le
  //       garde d'erreur couvre l'autre moitié des cas.
  const [horsLigne, setHorsLigne] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setHorsLigne(false), off = () => setHorsLigne(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
  }, []);

  /* ⭐ LE GRAPHE SUIT LA POSITION, et c'est le sujet même de cet écran : on
     compose depuis OÙ L'ON EST. La communauté de communes est servie en deux
     fichiers — presqu'île et Aulne maritime — parce qu'un seul pèserait
     1,5 Mo gzip et ferait attendre quelqu'un qui est déjà dehors.
     ⚠️ `territoire` est dans les dépendances : se déplacer d'un bout à l'autre
        de la comcom recharge le bon graphe. Sans ça on composerait sur le
        réseau d'à côté, avec un départ accroché à des kilomètres. */
  const territoire = useMemo(
    () => territoireDe(position[0], position[1]) ?? DEFAUT,
    [position],
  );

  useEffect(() => {
    let vivant = true;
    setGraphe(null);
    fetch(urlGraphe(BASE, territoire))
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((g) => { if (vivant) setGraphe(g); })
      // ⚠️ UNE ERREUR SE DIT. Sans ce message, un refus CORS rendrait une page
      //    vide et silencieuse — le visiteur conclurait qu'il n'y a rien ici.
      .catch(() => { if (vivant) setErreur("Les chemins n'ont pas pu être chargés. Vérifiez votre connexion."); });
    return () => { vivant = false; };
  }, [territoire]);

  // ── LES FERMETURES OFFICIELLES ───────────────────────────────────────────
  // Fichier SÉPARÉ du graphe, servi avec l'application : une fermeture se
  // publie en une minute, un graphe se reconstruit par un pipeline. Et c'est
  // l'office de tourisme qui doit pouvoir la publier, pas nous.
  useEffect(() => { chargerFermetures(import.meta.env.BASE_URL.replace(/\/$/, "")).then(setFermetures); }, []);

  const touchees = useMemo(
    () => (graphe && fermetures !== undefined ? aretesTouchees(graphe, fermetures) : null),
    [graphe, fermetures],
  );

  // 🔴 L'INDEX EXCLUT LES ARÊTES INTERDITES — il ne les pénalise pas. Une
  //    arête absente de l'adjacence est hors d'atteinte du calcul ; une arête
  //    pénalisée se franchit dès que le reste coûte plus cher.
  //    ⚠️ Et on attend les fermetures avant d'indexer : composer d'abord et
  //       corriger ensuite proposerait, l'espace d'un instant, un tronçon
  //       fermé par arrêté.
  const ix = useMemo(
    () => (graphe && touchees ? indexer(graphe, touchees.interdites) : null),
    [graphe, touchees],
  );

  // ⚠️ L'INDEX NON FILTRÉ NE SERT PAS À CALCULER — il sert à EXPLIQUER. Sans
  //    lui, « aucune boucle » est indiscernable de « le chemin d'ici est fermé
  //    par arrêté », et le message générique conseille alors de « se rapprocher
  //    d'un chemin », c'est-à-dire d'aller vers la falaise interdite.
  //    ⭐ Un message qui invente une cause est pire qu'un silence.
  const ixTout = useMemo(() => (graphe ? indexer(graphe) : null), [graphe]);

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
    const depart = noeudLePlusProche(graphe, ix, position[0], position[1]);
    if (cible) {
      const v = composerVers(graphe, ix, depart, budget(heures), cible.g,
                             { graine: graine.current });
      setVisee(v);
      setBoucles(v.etat === "ok" ? v.boucles : []);
    } else {
      setBoucles(composer(graphe, ix, depart, budget(heures), { graine: graine.current }));
    }
    setDuree(Math.round(performance.now() - t0));
    setChoisie(0);
  };

  const autre = () => { graine.current = (graine.current * 7919 + 13) >>> 0; lancer(); };

  /** Le point de départ est-il privé de chemin PAR UNE FERMETURE ? On le sait
   *  en comparant les deux index : le nœud le plus proche du réseau complet
   *  n'a plus aucune arête une fois les arrêtés appliqués. Mesuré à
   *  Postolonnec : l'accès à la plage est un cul-de-sac greffé sur le GR34,
   *  et sa composante tombe à 2 nœuds sur 64 028. */
  const departCoupe = useMemo(() => {
    if (!graphe || !ix || !ixTout || !touchees?.interdites.size) return false;
    const n = noeudLePlusProche(graphe, ix, position[0], position[1]);
    if (n < 0) return true;
    // 🔴 LE DEGRÉ NE SUFFIT PAS. À Postolonnec la jonction garde une arête
    //    après fermeture — elle a l'air saine — et sa composante tombe de
    //    9 670 nœuds à 2. On compare donc la CONNEXITÉ des deux graphes :
    //    coupé par l'arrêté, et non pas isolé de nature.
    const vivantAvant = composanteAtteint(ixTout, n, SEUIL_RESEAU);
    const vivantApres = composanteAtteint(ix, n, SEUIL_RESEAU);
    return vivantAvant && !vivantApres;
  }, [graphe, ix, ixTout, touchees, position]);

  /**
   * ⭐ RENTRER. Le vent se lève, la pluie commence à tomber. Ce qu'on veut
   *    alors, ce n'est pas savoir combien il reste : c'est le chemin le plus
   *    court vers le point de départ. On ne retient personne.
   * ⚠️ Et on ne demande RIEN au réseau pour ça : le graphe est déjà dans le
   *    téléphone. C'est précisément dehors, sous la pluie, que le réseau
   *    manque — une fonction de secours qui a besoin d'internet n'en est pas une.
   */
  const rentrer = () => {
    if (!graphe || !ix) return;
    setMotRetour("Recherche de votre position…");
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        const ici = noeudLePlusProche(graphe, ix, p.coords.longitude, p.coords.latitude);
        const depart = noeudLePlusProche(graphe, ix, position[0], position[1]);
        const r = cheminDeRetour(graphe, ix, ici, depart);
        if (!r) { setMotRetour("Aucun chemin cartographié ne relie votre position au départ."); return; }
        setRetour(r);
        setMotRetour("");
      },
      () => setMotRetour("Position indisponible — impossible de calculer le retour."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const b = boucles?.[choisie] ?? null;

  /**
   * 🔴 CE QU'ON CROISERA — CALCULÉ UNE FOIS, LU PARTOUT. Trois surfaces le
   *    disent : le décompte « n lieux sur le chemin », la liste numérotée, et
   *    les étapes posées sur la carte. Le 1/11, j'ai inséré le lieu visé dans
   *    UNE des trois — les étapes — et vérifié en production : le titre disait
   *    « Aller vers le Menhir de Crozon », la liste citait l'église.
   *    ⭐ Trois porteuses d'une même règle divergent le jour où l'on en corrige
   *       une. La règle n'habite plus l'écran, elle habite ce tableau.
   * ⚠️ Le lieu visé entre par son ORDRE, comme les autres — pas en tête parce
   *    qu'il est le motif du départ — et porte l'écart MESURÉ au chemin plutôt
   *    que « sur le chemin » quand il ne l'est pas.
   */
  const rencontres = useMemo(
    () => (!b ? [] : fondreRencontres(
      b.lieux,
      (c) => LIBELLE[c] ?? c,
      cible && visee?.etat === "ok"
        ? { nom: cible.nom, g: cible.g, approche: visee.approches[choisie] }
        : undefined,
    )),
    [b, cible, visee, choisie],
  );

  // La carte attend un `Walk` : on lui en fabrique un, avec les TRAITS
  // séparés — jamais une ligne unique (voir Walk.traits).
  const walk: Walk | null = useMemo(() => {
    if (!graphe || !b) return null;
    const t = traits(graphe, b).map((l) => l.map(([lon, lat]) => ({ lon, lat })));
    return {
      provenance: "compose" as const,
      slug: "composee", titre: "Votre promenade", lieu: "Crozon", resume: "",
      distanceKm: Math.round(b.metres / 100) / 10,
      // ⚠️ La durée se calcule sur le RESSENTI, pas sur les kilomètres :
      //    annoncer 2 h pour une boucle qui monte de 200 m, c'est promettre
      //    ce qu'on ne tient pas.
      dureeEstimeeH: Math.round((b.ressentie / 1000 / ALLURE_KMH) * 2) / 2,
      boucle: true, osmUrl: "https://www.openstreetmap.org/copyright", osmRef: "",
      points: t.flat(), traits: t,
      etapes: rencontres.map((r, i) => ({
        nom: r.nom, categorie: r.libelle, pos: i, lat: r.lat, lon: r.lon,
      })),
    };
  }, [graphe, b, rencontres]);

  return (
    <main className="page page-composer">
      <div className="wrap">
        {/* ══ A · L'ENTRÉE ══════════════════════════════════════════════
            ⛔ L'IMAGE EST UNE ILLUSTRATION, PAS UNE PHOTOGRAPHIE, et c'est
            pourquoi elle passe par `paysages/` et non par `images/Photo.tsx`
            — dont tout le contrat consiste à AFFIRMER un lieu. Elle évoque
            la Bretagne ; elle ne documente aucun endroit, et rien ici ne
            prétend le contraire.
            ⚠️ Elle ne tourne pas : cet écran se lit, il ne s'habite pas. Une
               rotation toutes les trois secondes derrière un texte qu'on est
               en train de choisir est une distraction, pas une ambiance. */}
        <header className="cp-entree">
          <img className="cp-entree-fond" src={`${import.meta.env.BASE_URL}paysages/fond-13-1280.webp`}
               alt="" aria-hidden="true" decoding="async" />
          <div className="cp-entree-dire">
            <h1 className="cp-titre">
              {cible ? <>Vers {cible.nom}</> : <>Où vous mèneront vos&nbsp;pas&nbsp;?</>}
            </h1>
            <p className="cp-chapo">
              {cible
                ? <>Une promenade depuis où vous êtes qui passe <strong>devant</strong> ce lieu, et vous ramène.</>
                : <>Une promenade depuis où vous êtes, par les chemins, pour découvrir ce qui se trouve sur votre route.</>}
            </p>
            {/* ⭐ LES DEUX NOMBRES SONT COMPTÉS DANS L'ARTEFACT CHARGÉ, jamais
                écrits à la main : ils changent à chaque moisson, et une
                valeur recopiée dans une page devient un faux témoin. */}
            {graphe && (
              <p className="cp-compte">
                <SvgBotte />
                {graphe.a.length.toLocaleString("fr-FR")} tronçons de chemin
                {" · "}{graphe.l.length} lieux remarquables
              </p>
            )}
          </div>
        </header>

        {/* ══ B · COMBIEN DE TEMPS AVEZ-VOUS ? ═══════════════════════════
            ⭐ TROIS CARTES PLUTÔT QU'UN CURSEUR, parce que dehors, debout,
            on choisit — on ne règle pas. Mais le moteur accepte 1 à 5 h par
            demi-heures, et retirer cette étendue serait perdre une capacité
            pour un dessin. Le curseur reste donc, replié : trois gestes
            courants devant, la finesse derrière un mot.
            ⚠️ « Environ 3 km » n'est pas une illustration : c'est
               `budget(heures)`, la valeur que le moteur va réellement viser.
               Deux nombres écrits séparément divergeraient au premier
               changement d'allure. */}
        {graphe && (
          <section className="cp-feuille">
            <p className="cp-sus">Votre promenade</p>
            <h2 className="cp-question">Combien de temps avez-vous&nbsp;?</h2>

            <div className="cp-temps" role="group" aria-label="Durée de marche">
              {[1, 2, 3].map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`cp-temps-choix${heures === h ? " est-choisi" : ""}`}
                  aria-pressed={heures === h}
                  onClick={() => setHeures(h)}
                >
                  <span className="cp-temps-h">{h} heure{h > 1 ? "s" : ""}</span>
                  <span className="cp-temps-km">
                    Environ {Math.round(budget(h) / 1000)} km
                  </span>
                </button>
              ))}
            </div>

            <div className="cp-actions">
              <button className="cp-primaire" onClick={lancer} disabled={!ix}>
                {cible ? "M'y emmener" : "Composer ma promenade"}
              </button>
            </div>

            {/* ⚠️ LE POINT DE DÉPART EST UNE DONNÉE PERSONNELLE : on le demande
                LÀ OÙ LA QUESTION SE POSE, jamais d'avance, et on dit d'où l'on
                part quand on ne le sait pas. */}
            <p className="cp-second">
              <button className="cp-lien" onClick={localiser}>
                {situe ? "Je préfère choisir un autre point de départ"
                       : "Partir d'où je suis"}
              </button>
            </p>
            {motGps && <p className="page-note">{motGps}</p>}
            {!situe && !motGps && (
              <p className="page-note">Par défaut, on part du bourg de Crozon.</p>
            )}

            <details className="cp-plus">
              <summary>Plus longtemps, ou une demi-heure près</summary>
              <label className="filtre">
                {heures} h de marche
                <span className="page-note">
                  {" "}— à plat : nous n'avons pas de relevé d'altitude
                </span>
                <input type="range" min={1} max={5} step={0.5} value={heures}
                       onChange={(e) => setHeures(Number(e.target.value))} />
              </label>
            </details>
          </section>
        )}


        <section className="page-panel">
          {/* ⚠️ LES COMPTEURS SONT DANS L'ENTÊTE, PAS ICI — ils y étaient
              DEUX fois après la refonte, à trois centimètres d'écart. Il
              reste l'état du chargement et l'erreur, qui sont les seules
              choses que ce panneau doive encore dire. */}
          {(erreur || !graphe) && (
            <p className="page-note">
              {erreur ? <strong>{erreur}</strong> : "Chargement des chemins…"}
            </p>
          )}
          {/* ── LES FERMETURES OFFICIELLES ────────────────────────────────
              🔴 ÉVITER NE SUFFIT PAS, IL FAUT LE DIRE. Un calcul qui contourne
              en silence laisse le marcheur libre d'y aller quand même, et sans
              savoir. L'avertissement porte donc TOUJOURS trois choses : qui a
              décidé, quand, et où la décision se lit. MANA ne ferme rien —
              MANA transmet.
              ⚠️ Et l'absence du fichier se dit aussi : une application qui
              route sans connaître les fermetures ne doit pas en avoir l'air. */}
          {fermetures === null && (
            <p className="page-note" role="status">
              <strong>Fermetures officielles indisponibles.</strong>{" "}
              Les boucles ne tiennent pas compte des arrêtés en cours.
              Vérifiez auprès de l'
              <a href="https://www.crozon-tourisme.bzh/trouver-son-activite/randonnee-velo-trail-2/"
                 rel="noopener">office de tourisme</a> avant de partir.
            </p>
          )}

          {touchees && touchees.actives.length > 0 && (
            <div className="page-note" role="status">
              <p>
                <strong>
                  {touchees.actives.length} secteur{touchees.actives.length > 1 ? "s" : ""} du
                  sentier côtier {touchees.actives.length > 1 ? "sont fermés" : "est fermé"} par arrêté.
                </strong>{" "}
                Les boucles ne les empruntent pas.
              </p>
              {/* 🔴 LE FAIT RESTE À L'ÉCRAN, LE DÉTAIL SE REPLIE — et les deux
                  moitiés sont nécessaires. « Éviter ne suffit pas, il faut le
                  dire » : qui a décidé, pourquoi, et où lire la décision.
                  Mais déplié, ce bloc occupait tout le premier écran : quatre
                  arrêtés, quatre liens, quatre mentions de portée, avant
                  même la question « combien de temps avez-vous ? ».
                  ⭐ Une page entièrement faite d'avertissements n'avertit
                     plus : elle se saute. Le nombre et la conséquence
                     restent visibles sans un geste ; les quatre décisions
                     sont à un tap, pas à une recherche.
                  ⛔ Rien n'est retiré : ni l'autorité, ni la date, ni le lien,
                     ni la mention « portée approximative ». */}
              <details className="cp-arretes">
                <summary>
                  Voir {touchees.actives.length > 1 ? "les" : "le"} {touchees.actives.length}{" "}
                  arrêté{touchees.actives.length > 1 ? "s" : ""}
                </summary>
                <ul>
                  {touchees.actives.map((f) => (
                    <li key={f.id}>
                      {f.libelle} — {f.autorite}, {new Date(f.publie_le).toLocaleDateString("fr-FR")}.{" "}
                      <a href={f.source} rel="noopener">la décision</a>
                      {f.portee_approximative && " · portée approximative"}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {touchees && touchees.nonSituees.length > 0 && (
            <div className="page-note" role="status">
              {touchees.nonSituees.map((f) => (
                <p key={f.id}>
                  <strong>{f.libelle}.</strong> {f.motif}{" "}
                  <a href={f.source} rel="noopener">{f.autorite}</a>
                  {f.effet === "interdit" &&
                    " — ce secteur est signalé mais n'a pas pu être situé sur la carte : il n'est donc pas évité par le calcul."}
                </p>
              ))}
            </div>
          )}

          {/* ⭐ Dit une fois, la mesure est un argument ; répétée, c'est du décor. */}
          {graphe && (
            <p className="page-note">
              Tout est calculé dans votre téléphone. Votre position ne part
              nulle part.
            </p>
          )}
        </section>

        {graphe && (
          <section className="page-panel">
            <p className="apercu-label">Une proposition, pas un programme</p>
            {/* ⭐ CE PARAGRAPHE EST UNE FONCTION, PAS UN ORNEMENT. Tout ce qui
                précède calcule UN parcours ; sans ces quelques lignes, l'objet
                rendu se lit comme un itinéraire à exécuter — et alors couper,
                s'arrêter ou changer d'avis devient un échec. Ce n'en est pas
                un : c'est le propre de la flânerie. */}
            <p className="page-texte">
              Prenez-en la moitié. Coupez où vous voulez. Faites demi-tour
              pour la lumière. Rien ici ne compte vos pas.
            </p>
          </section>
        )}

        {/* ══ LE REFUS, QUAND ON VISAIT UN LIEU ═══════════════════════════
            🔴 C'EST LA PARTIE QUI COMPTE. Une boucle réussie se voit ; un
            refus mal fait ne se voit pas — il ressemble à une absence. Les
            cinq façons d'échouer appellent cinq gestes différents : s'en
            approcher autrement, choisir un autre jour, partir d'ailleurs,
            prévoir plus de temps, ou renoncer. « Je ne peux pas » ne dit
            lequel à personne.
            ⚠️ Et aucun de ces textes n'affirme quoi que ce soit sur le MONDE :
               ils disent ce que MANA sait. « Aucun chemin connu de nous » et
               « il n'y a pas de chemin » ne sont pas la même phrase — le
               graphe de la presqu'île porte 115 composantes, et son silence
               mesure sa moisson, pas la Bretagne. */}
        {cible && visee && visee.etat !== "ok" && (
          <section className="page-panel">
            {visee.etat === "ecarte" && (
              <>
                <p className="page-texte">
                  <strong>Aucun chemin ne passe devant {cible.nom}.</strong>{" "}
                  Le plus proche en reste à {visee.ecart} m — au-delà des{" "}
                  {ECART_MAX_M} m à partir desquels on peut dire « vous passez
                  devant ».
                </p>
                <p className="page-texte">
                  Ce n'est pas un manque de données : les baies, les caps, les
                  îles et les épaves se regardent plus qu'ils ne se longent.
                  MANA ne vous y mènera pas en prétendant le contraire.
                </p>
              </>
            )}
            {visee.etat === "ferme" && (
              <p className="page-texte">
                <strong>Le chemin qui mène à {cible.nom} est fermé par
                arrêté.</strong> Ce n'est pas la durée, et ce n'est pas la
                distance : ce passage-là est interdit. Les arrêtés en vigueur
                sont rappelés plus haut.
              </p>
            )}
            {visee.etat === "hors-reseau" && (
              <p className="page-texte">
                <strong>Aucun chemin connu de MANA ne relie votre point de
                départ à {cible.nom}.</strong> Il est peut-être de l'autre côté
                de l'eau, ou hors de la zone que nous avons cartographiée —
                nous ne savons pas dire lequel, et nous ne le devinerons pas à
                votre place.
              </p>
            )}
            {visee.etat === "trop-loin" && (
              <>
                <p className="page-texte">
                  <strong>{cible.nom} est trop loin pour {heures} h.</strong>{" "}
                  Le chemin le plus court y mène en{" "}
                  {(visee.metresAller / 1000).toFixed(1)} km — comptez{" "}
                  <strong>au moins{" "}
                  {Math.ceil((visee.metresMinimum / 1000 / ALLURE_KMH) * 2) / 2} h</strong>{" "}
                  pour l'aller-retour.
                </p>
                <p className="page-note">
                  « Au moins », pas « environ » : ce calcul est à plat, et le
                  terrain ne fait qu'ajouter. Donnez-vous plus de temps
                  ci-dessus, ou partez d'un point plus proche.
                </p>
              </>
            )}
            {visee.etat === "aucune-boucle" && (
              <p className="page-texte">
                <strong>{cible.nom} est à portée, mais aucune boucle n'en
                revient autrement.</strong> Y aller demanderait de repasser par
                le même chemin — ce que MANA ne propose pas sous le nom de
                balade. Essayez depuis un autre point de départ, ou avec plus
                de temps.
              </p>
            )}
            <p className="est-actions" style={{ marginTop: "var(--sp-3)" }}>
              <a className="btn btn-ghost" href={window.location.pathname}>
                Composer une boucle autour de moi
              </a>
            </p>
          </section>
        )}

        {!cible && boucles && boucles.length === 0 && (
          <section className="page-panel">
            {departCoupe ? (
              <>
                <p className="page-texte">
                  <strong>
                    Le sentier qui part d'ici est fermé par arrêté municipal.
                  </strong>{" "}
                  Aucune boucle depuis ce point&nbsp;: l'accès ne rejoint plus
                  le réseau.
                </p>
                <p className="page-texte">
                  Ce n'est pas la durée&nbsp;: c'est ce chemin-là qui est
                  interdit. Éloignez-vous du trait de côte, ou partez
                  d'un autre point.
                </p>
                {touchees?.actives.map((f) => (
                  <p className="page-note" key={f.id}>
                    {f.libelle} — {f.autorite}.{" "}
                    <a href={f.source} rel="noopener">la décision</a>
                  </p>
                ))}
              </>
            ) : (
              <p className="page-texte">
                Aucune boucle de cette longueur ne part d'ici. Changez la
                durée, ou rapprochez-vous d'un chemin.
              </p>
            )}
          </section>
        )}

        {/* ══ C · LES TROIS PROPOSITIONS ══════════════════════════════
              🔴 TROIS, ET NON « LA MEILLEURE » — c'est une MESURE qui
              l'impose. Sur une cible de 6 km, les deux meilleures boucles
              étaient séparées de 4 points sur 138 — un écart dans le bruit —
              et elles ne se ressemblaient pas du tout : l'une longeait la mer
              sur 28 % de son parcours, l'autre sur 4 %.
              ⭐ Les poids du score (14 par lieu, 220 pour la longueur) sont
                 des opinions que personne n'a validées en marchant. Quand un
                 classement ne sait pas trancher, il ne doit pas trancher : il
                 doit PROPOSER — et c'est aussi l'argument de dispersion des
                 flux, qui veut cinq promenades plutôt que la meilleure.

              ⛔ ET LEUR IMAGE EST LEUR TRACÉ, PAS UNE PHOTOGRAPHIE. La
                 maquette demande « une photographie du paysage réellement
                 traversé » : nous n'en avons aucune, et nous ne pouvons pas
                 en avoir — cette boucle n'existait pas il y a trois secondes.
                 Mettre une jolie côte bretonne sous un parcours qui ne la
                 longe pas est le mensonge documentaire que ce dépôt refuse
                 pour les fiches de balade ; il ne devient pas acceptable
                 parce qu'il est plus petit.
              ⭐ LE VISAGE, C'EST LA SILHOUETTE. Chaque boucle en a une
                 qu'aucune autre n'a, elle est VRAIE, elle se dessine depuis
                 nos propres données, et aucun catalogue de photographies ne
                 peut la copier. */}
        {boucles && boucles.length > 1 && (
          <section className="cp-propositions">
            <p className="cp-sus"><SvgEtincelle />Trois propositions</p>
            <h2 className="cp-question">Trois façons de marcher autant</h2>

            <ul className="cp-cartes">
              {(() => { const noms = intitules(boucles.slice(0, 3)); return boucles.slice(0, 3).map((x, i) => {
                const t = portrait(x.contour, 320, 190, 0.14);
                return (
                  <li key={i}>
                    <button
                      type="button"
                      className={`cp-carte${i === choisie ? " est-choisie" : ""}`}
                      aria-pressed={i === choisie}
                      onClick={() => setChoisie(i)}
                    >
                      <span className="cp-carte-trace" aria-hidden="true">
                        {t && (
                          <svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid meet">
                            <path d={t.d} fill="none" strokeWidth="2.4"
                                  strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx={t.depart[0]} cy={t.depart[1]} r="4.5" />
                          </svg>
                        )}
                      </span>
                      <span className="cp-carte-dire">
                        <span className="cp-carte-titre">{noms[i]}</span>
                        <span className="cp-carte-faits">
                          <span>{(x.metres / 1000).toFixed(1)} km · {heuresDe(x)}</span>
                          <span>{FORME[formeDeLaBoucle(x.etalement)]}</span>
                          {x.marees > 0 && <span className="cp-alerte">un passage dépend de la marée</span>}
                        </span>
                        <span className="cp-carte-texte">{descriptif(x)}</span>
                      </span>
                    </button>
                  </li>
                );
              }); })()}
            </ul>
          </section>

        )}

        {b && walk && (
          <>
            <section className="page-panel">
              <h2 className="section-title" style={{ marginBottom: "var(--sp-2)" }}>
                {walk.distanceKm} km · {heuresDe(b)}
              </h2>

              {/* ══ D · CE QU'ON EMPORTE ════════════════════════════════════
                  ⛔ PAS DE BOUTON « PARTIR » : il n'irait nulle part. L'écran
                  de marche (`/promenade/<slug>/en-chemin`) se monte depuis un
                  SLUG du catalogue, et une boucle composée il y a trois
                  secondes n'en a pas. La maquette le demande ; le câbler
                  voudrait dire inventer une fonctionnalité, ce que le brief
                  interdit par ailleurs — et un bouton qui ne mène nulle part
                  coûte plus cher qu'un bouton absent.
                  ⭐ Ce qu'on peut emporter POUR DE VRAI, c'est le fichier :
                     il entre dans n'importe quelle montre, il part hors
                     ligne, et il porte son attribution avec lui. */}
              <div className="cp-emporter">
                <button
                  className="cp-primaire"
                  onClick={() => telecharger("promenade-mana.gpx", enGpx(walk), "application/gpx+xml")}
                >
                  <SvgTelecharger />Emporter le tracé (GPX)
                </button>
                <button className="cp-secondaire" onClick={autre}>
                  Autre promenade
                </button>
              </div>
              {/* ⚠️ LA DURÉE EST CALCULÉE À PLAT, ET ON LE DIT ICI plutôt que
                  de laisser « environ » porter seul le doute. Sur la
                  presqu'île, l'Office déclare jusqu'à +310 m sur 14 km :
                  à 3 km/h, Naismith y ajouterait près de 40 minutes. Un
                  promeneur qui part sur une estimation basse, sur un sentier
                  de falaise, arrive à la nuit.
                  ⛔ On ne corrige pas en gonflant la durée « par prudence » :
                     ce serait inventer dans l'autre sens. On dit ce qu'on
                     sait, et ce qu'on ne sait pas. */}
              <p className="page-note">
                Durée calculée <strong>à plat</strong> — nous n'avons pas de
                relevé d'altitude sur ces chemins. Le terrain monte&nbsp;:
                comptez davantage. Les circuits balisés de l'Office, eux,
                portent le dénivelé qu'il a mesuré.
              </p>
              <p className="page-note">
                {FORME[formeDeLaBoucle(b.etalement)]}
                {formeDeLaBoucle(b.etalement) === "aller-retour" &&
                  " — on revient par un chemin voisin, pas par une autre boucle"}
                {" · "}
                {/* ⚠️ « CROISÉS », PAS « SUR LE CHEMIN ». Vu en production le
                    1/11 : « 2 lieux sur le chemin », et juste en dessous
                    « Menhir de Crozon · à 76 m du chemin ». Le résumé
                    contredisait sa propre liste. ⭐ Un décompte qui qualifie
                    ses éléments doit tenir pour TOUS — sinon il faut qu'il
                    les compte sans les qualifier. */}
                {rencontres.length > 0
                  ? `${rencontres.length} lieu${rencontres.length > 1 ? "x" : ""} croisé${rencontres.length > 1 ? "s" : ""}`
                  : "Aucun lieu remarquable sur ce parcours — c'est la marche qui compte"}
                {b.montee >= 40 && ` · ${Math.round(b.montee)} m de montée`}
                {b.bordDeMer > 300 &&
                  ` · ${(b.bordDeMer / 1000).toFixed(1)} km au bord de mer`}
                {b.partRepetee > 0.1 && " · une portion se parcourt deux fois"}
                {" · calculé en "}{duree} ms
              </p>
            </section>

            {/* 🔴 L'AVERTISSEMENT PASSE AVANT LA CARTE, PAS APRÈS. Une mise en
                garde qu'on découvre sous le tracé arrive après la décision.
                ⛔ Et on n'annonce pas l'heure de la mer : prédire une marée
                   demande un modèle harmonique ; quelqu'un s'y fierait. On
                   renvoie à la source officielle — c'est la doctrine du
                   produit pour les marées et la météo depuis le début. */}
            {b.marees > 0 && (
              <section className="page-panel">
                <p className="apercu-label">⚠️ Un passage dépend de la marée</p>
                <p className="page-texte">
                  Environ {Math.round(b.marees)} m de ce parcours franchissent
                  un estran : praticable à marée basse, pas à marée haute.
                  Vérifiez l'horaire avant de partir — nous ne le calculons
                  pas, et nous ne le devinons pas.
                </p>
                <div className="est-actions" style={{ marginBottom: 0 }}>
                  <a className="btn btn-ghost" href={SOURCE_MAREES}
                     target="_blank" rel="noopener noreferrer">
                    Horaires des marées (SHOM)
                  </a>
                </div>
              </section>
            )}

            <section className="page-panel">
              <p className="apercu-label">Si le temps tourne</p>
              <p className="page-texte">
                Le vent se lève, la pluie commence : d'où que vous soyez, on
                vous rend le plus court chemin vers le point de départ. Calculé
                dans votre téléphone — c'est justement dehors que le réseau
                manque.
              </p>
              <div className="est-actions" style={{ marginBottom: 0 }}>
                <button className="btn btn-ghost" onClick={rentrer}>Rentrer</button>
              </div>
              {motRetour && <p className="page-note">{motRetour}</p>}
              {retour && (
                <p className="page-note">
                  <strong>
                    {retour.metres < 100
                      ? "Vous y êtes."
                      : `${(retour.metres / 1000).toFixed(1)} km pour rentrer.`}
                  </strong>{" "}
                  {retour.metres >= 100 &&
                    "Par le plus court — pas par le plus joli, c'est voulu."}
                </p>
              )}
            </section>

            {/* ⚠️ DEUX CONTENEURS, ET CE N'EST PAS DU STYLE. Le panneau sans
                marge avec `overflow: hidden` existe pour que maplibre déborde
                jusqu'aux bords ; le schéma SVG, lui, est en `width: 100%` et
                ne résout rien dans ce conteneur-là — mesuré le 31/10 : rendu,
                mais à 0 × 0 pixel, donc invisible. Un repli qui s'affiche en
                taille nulle est un repli qui n'existe pas. */}
            {horsLigne ? (
              <section className="page-panel">
                <p className="apercu-label">Carte</p>
                <WalkMap walk={walk} />
                <p className="page-note">
                  Sans réseau, le fond de carte ne vient pas : voici le tracé
                  seul. Il ne dépend que de ce qui est déjà dans l'appareil.
                </p>
              </section>
            ) : (
              <section className="page-panel" style={{ padding: 0, overflow: "hidden" }}>
                <CarteOuSchema schema={<WalkMap walk={walk} />}>
                  <CarteReelle walk={walk} />
                </CarteOuSchema>
              </section>
            )}

            {rencontres.length > 0 && (
              <section className="page-panel">
                <p className="apercu-label">Ce que vous croiserez</p>
                {/* ⭐ DANS L'ORDRE DE MARCHE. Un classement qui porte un titre
                    de séquence et trie par autre chose est un mensonge qui ne
                    se signale jamais : il se vérifie en marchant. */}
                <ol className="page-texte" style={{ paddingLeft: "1.2em" }}>
                  {rencontres.map((l, i) => (
                    <li key={`${l.nom}-${i}`} style={{ marginBottom: ".4em" }}>
                      {l.nom}
                      {l.libelle && <span className="page-note"> · {l.libelle}</span>}
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

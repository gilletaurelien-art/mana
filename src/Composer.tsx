import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { indexer, composerVers, metres, fondreRencontres, ECART_MAX_M, noeudLePlusProche, traits, formeDeLaBoucle, SOURCE_MAREES, cheminDeRetour, composanteAtteint, accrocherTous, accrocherUn, accroche, propositionsAutour, promenadeVers, AUTOUR_MIN_M, AUTOUR_MAX_M, BOUCLE_PAR_ALLER } from "./composition";
import { portrait } from "./portrait";
import { enGpx, telecharger } from "./Promenade";
import type { Graphe, Boucle, Retour, Visee, Parcours, Accroche, Proposition } from "./composition";
import { chargerLieux, type Lieu, type Inventaire } from "./lieux";
import { rencontresLeLong } from "./proches";
import { DEFAUT, territoireDe, urlGraphe } from "./territoires";
import type { Walk } from "./walks";
import { WalkMap } from "./WalkMap";
import { CarteOuSchema } from "./CarteOuSchema";
import { chargerFermetures, aretesTouchees, type Fermetures } from "./fermetures";

const CarteReelle = lazy(() =>
  import("./CarteReelle").then((m) => ({ default: m.CarteReelle }))
);

/* ⭐ L'ÉCRAN DE MARCHE, CHARGÉ À LA DEMANDE. Il porte le GPS, la boussole et
   le SOS : du poids que personne n'a besoin de télécharger pour regarder
   trois propositions depuis son canapé. */
const EnChemin = lazy(() =>
  import("./EnChemin").then((m) => ({ default: m.EnChemin }))
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
/* 🔴 L'ALLURE N'EST PLUS UNE CIBLE — 2/11, arbitrage du fondateur :
   « certains sont lents, certains marchent vite. La pertinence est la
   distance. Ne pas surestimer ou sous-estimer la durée. »
   ⭐ Et c'est la suite logique de ce qu'on a mesuré la veille : les 36 989
      arêtes des deux graphes ne portent AUCUN dénivelé, donc la durée était
      calculée à plat, donc fausse dès que ça monte. On annonçait un chiffre
      qu'on ne savait pas faire. Un kilomètre, lui, est un kilomètre.
   ⚠️ IL NE RESTE QU'UN USAGE, ET IL N'EST PAS AFFICHÉ : le type `Walk` exige
      `dureeEstimeeH`, que cet écran ne montre nulle part. On le remplit
      plutôt que de mentir avec un zéro — un zéro se lirait « instantané »
      si un autre écran s'y fiait un jour.
   ⛔ Et j'ai failli laisser ici un commentaire disant qu'il servait au
      message « trop loin » : vrai dix minutes, faux dès la conversion de ce
      message en kilomètres. Une note qui décrit un usage meurt avec lui. */
const ALLURE_KMH = 3;

/**
 * ⭐ LE BUDGET PORTE SUR LA DISTANCE RESSENTIE, PAS SUR LES KILOMÈTRES.
 *    Un mètre de montée coûte cinq mètres de plat (règle de Naismith). Donc
 *    « deux heures » dans un terrain qui monte rend une boucle PLUS COURTE —
 *    mesuré sur Crozon : 5,2 km réels au lieu de 6, pour 97 m de montée.
 *    C'est le seul endroit où le dénivelé doit agir : il n'est pas un
 *    désagrément, c'est de l'effort. Le point de vue est en haut.
 */
/** ⚠️ Accents et casse retirés : « ile vierge » doit trouver « Île Vierge ». */
const plat = (x: string) =>
  x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();


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

function SvgTelecharger() {
  return (
    <svg className="cp-picto" viewBox="0 0 24 24" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v10" /><path d="M8 11l4 4 4-4" /><path d="M5 19h14" />
    </svg>
  );
}

/* ⭐ LES PICTOS SONT DESSINÉS ICI, pas importés. Six traits chacun, aucune
   bibliothèque d'icônes dans le paquet, et chacun dit exactement la mesure
   qu'il accompagne — l'horloge le temps, la vague la mer, l'étincelle les
   rencontres. ⚠️ Tous `aria-hidden` : ils doublent un texte, ils ne le
   remplacent jamais. Un picto seul n'est lisible par personne. */
function SvgBoussole() {
  return (
    <svg className="cp-picto" viewBox="0 0 24 24" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" /><path d="M15.2 8.8l-2 4.4-4.4 2 2-4.4z" />
    </svg>
  );
}

function SvgRepere() {
  return (
    <svg className="cp-picto" viewBox="0 0 24 24" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s6.5-6 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21z" />
      <circle cx="12" cy="10.2" r="2.4" />
    </svg>
  );
}

function SvgVague() {
  return (
    <svg className="cp-picto" viewBox="0 0 24 24" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 6.5 0" />
      <path d="M2 14c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 6.5 0" />
      <path d="M2 19c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 6.5 0" />
    </svg>
  );
}

function SvgFleche() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13" /><path d="M13 7l5 5-5 5" />
    </svg>
  );
}

function SvgBouclier() {
  return (
    <svg className="cp-picto-grand" viewBox="0 0 24 24" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 9.5-4.1-1.9-7-5.3-7-9.5V6z" />
    </svg>
  );
}

function SvgFeuille() {
  return (
    <svg className="cp-picto-grand" viewBox="0 0 24 24" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 4c0 8-5 12-11 12-2 0-4-1-4-1S6 4 20 4z" />
      <path d="M4 20c2-5 5-8 9-10" />
    </svg>
  );
}

function SvgPartir() {
  return (
    <svg className="cp-picto" viewBox="0 0 24 24" aria-hidden="true"
         fill="currentColor" stroke="none">
      <path d="M8 5.2v13.6a.6.6 0 0 0 .92.5l10.2-6.8a.6.6 0 0 0 0-1l-10.2-6.8A.6.6 0 0 0 8 5.2z" />
    </svg>
  );
}

function SvgLoupe() {
  return (
    <svg className="cp-picto" viewBox="0 0 24 24" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.4 15.4L20 20" />
    </svg>
  );
}

/** Le ruban du mètre : la distance, pas l'heure. */
function SvgRuban() {
  return (
    <svg className="cp-picto" viewBox="0 0 24 24" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="8" width="19" height="8" rx="2" />
      <path d="M7 8v3M12 8v4M17 8v3" />
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
  /**
   * 🔴 PLUS PERSONNE NE CHOISIT LA DISTANCE — 2/11, arbitrage du fondateur,
   *    et c'est le cœur de cette version.
   *
   *    Hier encore, le moteur réclamait une cible en mètres. Le curseur étant
   *    parti, c'était NOUS qui la fournissions : six kilomètres, parce que
   *    c'était la valeur du milieu. Un nombre inventé, écrit en commentaire
   *    pour ne pas mentir à son sujet.
   *
   * ⭐ LE NOUVEAU PARCOURS LE SUPPRIME AU LIEU DE LE CACHER. La personne
   *    choisit UN lieu ; on lui en propose TROIS autour ; elle en choisit un ;
   *    la promenade est le déplacement entre les deux. La distance n'est plus
   *    une question posée, c'est une CONSÉQUENCE de deux choix — et elle
   *    s'allonge en composant de nouveau depuis le second point, autant de
   *    fois qu'on en a envie.
   *
   * 🔴 ET LE MOTEUR S'EN TROUVE MIEUX, CE QUI N'ÉTAIT PAS PRÉVU. `composerVers`
   *    mesurée à 58 % de réussite le 1/11 avec un budget décidé d'avance,
   *    mesurée à plus de 90 % le 2/11 avec une cible DÉRIVÉE de l'aller. Même
   *    code, même graphe. L'échec que j'avais porté au débit de la donnée
   *    était causé par le paramètre que j'avais choisi moi-même.
   */
  /** Le lieu d'où l'on part — choisi, jamais supposé. */
  const [spot, setSpot] = useState<{ i: number; lieu: Lieu } | null>(null);
  /**
   * Les trois lieux qu'on propose autour, chacun avec son trajet VRAI — ET LE
   * TERRITOIRE QUI LES A PRODUITS.
   *
   * 🔴 UN INDICE D'ARÊTE N'A DE SENS QUE DANS SON GRAPHE, et rien ne le dit
   *    dans le type. Défaut trouvé le 2/11 : choisir un lieu de l'Aulne depuis
   *    la presqu'île (46 spots sont dans ce cas, les emprises se chevauchent
   *    de −4,32 à −4,2554) déplace `position`, donc `territoire`, donc
   *    recharge l'autre graphe — mais `props` restait celui d'avant.
   *    · presqu'île → Aulne : `traits()` lit `g.a[20498]` sur 16 210 arêtes,
   *      `TypeError` levée DANS le `useMemo` de `walk`, pendant le rendu :
   *      l'écran de composition meurt.
   *    · ⚠️ Aulne → presqu'île est PIRE : les 41 spots concernés portent des
   *      indices tous valides dans les 20 779 arêtes, donc rien ne lève —
   *      l'écran dessine un tracé d'arêtes sans aucun rapport, en silence.
   *
   * ⭐ ET LE COMMENTAIRE DE L'EFFET DE CHARGEMENT ANNONÇAIT DÉJÀ LA RÈGLE :
   *    « sans ça on composerait sur le réseau d'à côté ». Il décrivait le
   *    rechargement du graphe ; il ne tenait pas ce qui dépend du graphe. Un
   *    commentaire répond à la place du code.
   *
   * ⛔ LE SLUG VOYAGE AVEC, plutôt qu'un simple vidage à l'effet : vider
   *    protège du plantage, l'étiquette protège AUSSI du cas muet — un rendu
   *    qui arriverait avant le vidage trouverait quand même le désaccord.
   */
  const [props, setProps] = useState<{ de: string; liste: Proposition<Lieu>[] } | null>(null);
  /**
   * ⭐ LA BOUCLE EST UNE OPTION, PLUS LA FORME PAR DÉFAUT. Elle reste le
   *    « coup d'après » du produit : le moteur qui la compose n'est pas
   *    démonté, il est branché ici, en second.
   */
  const [enBoucle, setEnBoucle] = useState(false);
  const [boucleVisee, setBoucleVisee] = useState<Visee | null>(null);
  const [mot, setMot] = useState("");
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

  const recue = depuisURL();
  const [position, setPosition] = useState<[number, number]>(recue ?? CROZON);
  const [motGps, setMotGps] = useState("");
  const [choisie, setChoisie] = useState(0);
  const [duree, setDuree] = useState(0);
  const [retour, setRetour] = useState<Retour | null>(null);
  const [enMarche, setEnMarche] = useState(false);
  const [requete, setRequete] = useState("");

  const [motRetour, setMotRetour] = useState("");
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
    /* 🔴 CE QUI DÉPEND DU GRAPHE SE PÉRIME AVEC LUI. Le commentaire ci-dessus
       dit depuis le début « sans ça on composerait sur le réseau d'à côté » —
       il parlait du rechargement, pas de ce qui en dépend. Les indices
       d'arête des propositions sont périmés ; `dejaPropose` doit se rouvrir
       pour que la proposition se rejoue sur le bon graphe, sinon l'écran
       reste vide après un changement de territoire. */
    setProps(null); setChoisie(0); setEnBoucle(false); setBoucleVisee(null);
    setRetour(null); setMotRetour(""); setMot("");
    dejaPropose.current = false;
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

  /**
   * 🔴 LES SPOTS VIENNENT DE L'INVENTAIRE, PLUS DU GRAPHE — et c'est une
   *    mesure qui l'impose, pas un goût.
   *
   *    Le code d'hier cherchait dans `graphe.l`, les lieux que la MOISSON a
   *    accrochés à une arête, avec ce raisonnement écrit noir sur blanc :
   *    « chacun est accroché à une arête, on peut vraiment en partir ».
   *    Il était juste. Il ne l'est plus, parce que la prémisse a bougé :
   *    `accrocherTous` accroche à L'EXÉCUTION, à l'arête la plus proche.
   *
   * ⭐ Mesuré le 2/11 : la moisson accroche 162 lieux nommés sur la presqu'île ;
   *    l'accrochage à l'exécution en met **330** sur le réseau, soit le
   *    double. Garder l'ancienne source aurait rendu invisibles au moteur la
   *    moitié des lieux que la carte affiche — et le refus aurait eu l'air
   *    d'un trou dans la donnée.
   *
   * ⚠️ `ecartSiLoin: false` : l'écart VRAI des lieux hors réseau coûte un
   *    parcours de tous les nœuds par lieu — 1,1 s sur la presqu'île, 2,9 s
   *    sur l'Aulne, parce que les lieux de l'autre territoire y passent tous.
   *    On ne le paie qu'au moment d'expliquer un refus, sur un seul lieu.
   */
  const [inventaire, setInventaire] = useState<Inventaire | null>(null);
  useEffect(() => { chargerLieux().then(setInventaire).catch(() => {}); }, []);

  const spots = useMemo(() => {
    if (!inventaire) return [];
    /* ⛔ Les lieux SANS NOM ne se choisissent pas : une liste de douze
       « Plage » ne se choisit pas, et il y en a 734 dans l'inventaire.
       🔴 Et le drapeau `anonyme` NE COUVRE PAS TOUT — vu en production le
          2/11 : la recherche proposait « Calvaire », un nom qui EST sa
          catégorie. Quand une donnée ne porte pas la distinction qu'on
          cherche, on ne la suppose pas : on en dérive une qu'on peut
          contrôler. */
    const vus = new Set<string>();
    return inventaire.lieux.filter((l) => {
      if (!l.n) return false;
      if (plat(l.n) === plat(inventaire.libelles[l.c] ?? l.c)) return false;
      if (vus.has(l.n)) return false;
      vus.add(l.n); return true;
    });
  }, [inventaire]);

  const positions = useMemo(
    () => spots.map((l) => l.g as readonly [number, number]), [spots]);

  const accroches = useMemo(
    () => (graphe && ix && positions.length
      ? accrocherTous(graphe, ix, positions, { ecartSiLoin: false })
      : null),
    [graphe, ix, positions],
  );

  /** Ceux d'où l'on peut PARTIR : sur le réseau, et dans ce territoire-ci. */
  const praticables = useMemo(
    () => (accroches ? spots.map((_, i) => i).filter((i) => accroche(accroches[i])) : []),
    [accroches, spots],
  );

  /**
   * CHERCHER SON SPOT.
   *
   * ⚠️ `plat()` retire les accents ET la casse : « île vierge » doit trouver
   *    « Île Vierge ». Sans ça, la recherche ne marche que pour qui tape déjà
   *    l'orthographe exacte — c'est-à-dire pour qui n'a pas besoin de chercher.
   * ⭐ ON NE PROPOSE QUE DES LIEUX PRATICABLES, et le refus arrive donc AVANT
   *    le choix, jamais après. Un lieu qu'aucun chemin n'approche se cherche
   *    en vain plutôt que de se choisir puis d'être refusé — c'est le pire
   *    moment pour dire non.
   */
  const trouves = useMemo(() => {
    const q = plat(requete.trim());
    if (q.length < 2 || !inventaire) return [];
    const out: { i: number; lieu: Lieu }[] = [];
    for (const i of praticables) {
      if (!plat(spots[i].n!).includes(q)) continue;
      out.push({ i, lieu: spots[i] });
      if (out.length >= 6) break;
    }
    return out;
  }, [requete, inventaire, praticables, spots]);

  /**
   * LE DÉPART — un lieu choisi, ou « où je suis ».
   *
   * ⭐ DEUX CHEMINS POUR UNE SEULE DÉCISION, et c'est pour ça que le pin et le
   *    champ sont sur la même ligne. Le pin EST l'alternative au champ.
   * ⚠️ Un départ n'est pas forcément un lieu de l'inventaire : « où vous êtes »
   *    n'a pas de nom au catalogue, et ce n'est pas un défaut — c'est le cas
   *    le plus fréquent quand on est déjà dehors.
   */
  const [depart, setDepart] = useState<{ a: Accroche; nom: string; g: [number, number] } | null>(null);
  /** Le lieu choisi qu'aucun chemin n'approche — refusé AVANT tout calcul. */
  const [refusDepart, setRefusDepart] = useState<{ nom: string; a: Accroche } | null>(null);

  /** Remettre à zéro ce qui dépend du départ — jamais à moitié. */
  const oublier = () => {
    setProps(null); setChoisie(0); setEnBoucle(false);
    setBoucleVisee(null); setRetour(null); setMotRetour("");
  };

  /**
   * LES TROIS PROPOSITIONS AUTOUR D'UN DÉPART.
   *
   * ⛔ LE REFUS SE DIT, ET IL SE DIT EN CHIFFRES. Mesuré le 2/11 : 14 % des
   *    lieux praticables de la presqu'île et 4 % de l'Aulne n'ont aucun voisin
   *    dans la bande. Ce ne sont pas des trous de donnée — ce sont des pointes,
   *    des îles, des bouts de presqu'île. « Je ne peux pas » ne dirait pas
   *    lequel.
   */
  const proposer = (a: Accroche, nom: string, g: [number, number], sauf?: number) => {
    if (!graphe || !ix || !accroches) return;
    oublier();
    /* 🔴 LE PREMIER REFUS EST LE PLUS FRÉQUENT, ET IL ARRIVE AVANT LE CALCUL.
       Mesuré le 2/11 : 18 % des lieux nommés de la presqu'île sont à plus de
       150 m du chemin le plus proche. Les faire passer par le compositeur
       rendrait « aucune proposition » — un refus qui ressemble à un trou de
       donnée alors que c'est une baie, un cap ou une épave. */
    if (!accroche(a)) {
      /* ⚠️ ET L'ÉCART SE RECALCULE ICI, parce que la table partagée est bâtie
         avec `ecartSiLoin: false` : un lieu hors réseau y garde
         `ecart: Infinity`, et le refus écrivait « le plus proche en reste à
         Infinity m ». La docstring d'`accrocherTous` le dit en toutes
         lettres — « pour l'écrire, rappeler `accrocherUn` sur ce seul lieu ».
         ⭐ Un avertissement lu et non suivi coûte autant qu'un absent : c'est
            le prix d'un refus qui doit DIRE un nombre, et il se paie une fois,
            sur un point, au moment où quelqu'un attend la réponse. */
      const vrai = Number.isFinite(a.ecart) ? a : accrocherUn(graphe, ix, g);
      setRefusDepart({ nom, a: vrai });
      setDepart(null); setProps(null);
      return;
    }
    setRefusDepart(null);
    const t0 = performance.now();
    setDepart({ a, nom, g });
    const p = propositionsAutour(graphe, ix, a, spots, positions, accroches, { sauf });
    setProps({ de: territoire.slug, liste: p });
    setDuree(Math.round(performance.now() - t0));
    setMot(
      p.length === 0
        ? `Aucun autre lieu remarquable entre ${AUTOUR_MIN_M} m et ${
            (AUTOUR_MAX_M / 1000).toFixed(0)} km de là, par les chemins que MANA connaît.`
        : p.length < 3
          ? `${p.length} proposition${p.length > 1 ? "s" : ""} seulement : le réseau d'ici n'en porte pas trois dans cette bande.`
          : "",
    );
  };

  const choisirSpot = (i: number, sauf?: number) => {
    if (!accroches) return;
    setRequete("");
    setPosition(spots[i].g);
    proposer(accroches[i], spots[i].n!, spots[i].g, sauf);
  };

  const localiser = () => {
    if (!navigator.geolocation) { setMotGps("Votre navigateur ne sait pas vous situer."); return; }
    setMotGps("Recherche de votre position…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const g: [number, number] = [p.coords.longitude, p.coords.latitude];
        setPosition(g); setMotGps("");
        /* ⚠️ `accrocherUn` et pas la table : la table est accrochée SANS la
           seconde passe, donc elle ne saurait pas dire à quelle distance du
           chemin se trouve quelqu'un qui n'est pas dessus. Ici il faut le
           dire — c'est précisément la personne qui attend une réponse. */
        if (graphe && ix) proposer(accrocherUn(graphe, ix, g), "où vous êtes", g);
      },
      // ⭐ Un refus de localisation n'est pas une panne : la page reste
      //    utilisable en choisissant un lieu, et on le dit.
      () => setMotGps("Position indisponible — choisissez un lieu dans le champ à côté."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  /**
   * ⭐ ON PROPOSE DÈS QUE C'EST PRÊT, pour que la carte ait quelque chose de
   *    VRAI à montrer : elle ne sait dessiner qu'un parcours, et une carte
   *    vide à la place d'une promenade pose la même question qu'un panneau
   *    vide. Le départ par défaut est le lieu praticable le plus proche du
   *    bourg de Crozon — un lieu NOMMÉ, pas un nœud au hasard.
   * ⛔ ET SEULEMENT QUAND `ix` EXISTE, c'est-à-dire une fois les fermetures
   *    connues. Proposer avant, c'est proposer un parcours qui traverse un
   *    secteur sous arrêté : l'index EXCLUT les arêtes interdites, il ne les
   *    pénalise pas, et cette garantie ne vaut que si on l'attend.
   */
  const dejaPropose = useRef(false);
  useEffect(() => {
    if (dejaPropose.current || !graphe || !ix || !accroches || !praticables.length) return;
    dejaPropose.current = true;
    /**
     * ⭐ LE LIEU VU SUR LA CARTE DEVIENT LE DÉPART — et c'est un changement de
     *    SENS, pas de code. Le paramètre s'appelle `vers` parce qu'il disait
     *    « emmène-moi là » du temps où la boucle était la forme par défaut.
     *    Depuis le 2/11, « j'aime ce coin » est le premier geste : le lieu
     *    qu'on a repéré est celui d'où l'on part, et c'est MANA qui propose où
     *    aller ensuite. Les liens existants continuent de marcher.
     * ⚠️ On ne le cherche pas par son nom mais par sa POSITION : le nom qui
     *    voyage dans l'URL est celui qu'affichait la carte, et rien ne garantit
     *    qu'il soit écrit comme dans l'inventaire.
     */
    if (cible) {
      let proche = -1, dp = Infinity;
      spots.forEach((l, i) => {
        const m = metres(cible.g, l.g);
        if (m < dp) { dp = m; proche = i; }
      });
      if (proche >= 0 && dp < 60) { choisirSpot(proche); return; }
      /* Rien d'assez proche dans l'inventaire : on accroche le point lui-même,
         ce qui permet de refuser en DISANT l'écart au chemin. */
      proposer(accrocherUn(graphe, ix, cible.g), cible.nom, cible.g);
      return;
    }
    let meilleur = praticables[0], d = Infinity;
    for (const i of praticables) {
      const m = metres(position, spots[i].g);
      if (m < d) { d = m; meilleur = i; }
    }
    choisirSpot(meilleur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphe, ix, accroches, praticables]);

  /**
   * ⭐ LA BOUCLE, EN OPTION — « ou revenir par un autre chemin ».
   *
   * 🔴 SA CIBLE EST DÉRIVÉE DE L'ALLER, JAMAIS CHOISIE. C'est toute la leçon
   *    du 2/11 : `composerVers` réussissait 58 % du temps avec un budget décidé
   *    d'avance et plus de 90 % avec `BOUCLE_PAR_ALLER × l'aller`. Le même
   *    code, le même graphe — la différence était le nombre que j'avais
   *    inventé.
   * ⚠️ Et quand il n'y a pas de boucle, on le DIT et on reste sur l'aller :
   *    une option absente n'est pas un échec, c'est une option absente.
   */
  const basculerBoucle = () => {
    if (enBoucle) { setEnBoucle(false); return; }
    const p = lesProps?.[choisie];
    if (!graphe || !ix || !depart || !p) return;
    const v = composerVers(graphe, ix, depart.a.noeud,
      Math.round(p.parcours.metres * BOUCLE_PAR_ALLER), positions[p.i] as [number, number]);
    setBoucleVisee(v);
    setEnBoucle(v.etat === "ok");
  };

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
    if (!graphe || !ix || !depart) return;
    setMotRetour("Recherche de votre position…");
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        const ici = noeudLePlusProche(graphe, ix, p.coords.longitude, p.coords.latitude);
        const r = cheminDeRetour(graphe, ix, ici, depart.a.noeud);
        if (!r) { setMotRetour("Aucun chemin cartographié ne relie votre position au départ."); return; }
        setRetour(r);
        setMotRetour("");
      },
      () => setMotRetour("Position indisponible — impossible de calculer le retour."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  /**
   * LA PROPOSITION RETENUE, ET LE PARCOURS QU'ELLE DESSINE.
   *
   * ⭐ `Parcours` ET PAS `Boucle` : l'aller ne se referme pas, la boucle oui,
   *    et tout ce qui se mesure — mètres, montée dans le sens de marche, bord
   *    de mer, lieux croisés dans l'ordre — se mesure pareil. Ce qui ne se
   *    mesure pareil (l'étalement, qui compare une aire à un périmètre) reste
   *    sur `Boucle` et n'est lu que quand on tient une boucle.
   */
  /**
   * ⭐ LE SEUL ENDROIT QUI LIT LES PROPOSITIONS, et il vérifie leur provenance.
   *    Tant que le graphe chargé n'est pas celui qui a produit ces indices
   *    d'arête, il n'y a RIEN à montrer — ni tracé, ni carte, ni décompte.
   *    C'est le cas normal d'un quart de seconde pendant un changement de
   *    territoire, et c'est exactement le quart de seconde où l'écran mourait.
   */
  const lesProps: Proposition<Lieu>[] | null =
    props && props.de === territoire.slug ? props.liste : null;

  const prop = lesProps?.[choisie] ?? null;
  const laBoucle: Boucle | null =
    enBoucle && boucleVisee?.etat === "ok" ? boucleVisee.boucles[0] : null;
  const b: Parcours | null = laBoucle ?? prop?.parcours ?? null;
  /** Les mètres ANNONCÉS : réseau plus les deux bouts hors réseau. */
  const metresDits = laBoucle
    ? laBoucle.metres + (depart ? Math.round(depart.a.ecartNoeud) : 0)
    : prop?.metres ?? 0;

  /**
   * 🔴 CE QU'ON CROISERA — MESURÉ SUR LE TRACÉ, CALCULÉ UNE FOIS, LU PARTOUT.
   *
   *    Trois surfaces le disent : le décompte, la liste numérotée, les étapes
   *    posées sur la carte. Le 1/11, le lieu visé a été inséré dans UNE des
   *    trois — vérifié en production : le titre disait « Aller vers le Menhir
   *    de Crozon », la liste citait l'église. ⭐ Trois porteuses d'une même
   *    règle divergent le jour où l'on en corrige une.
   *
   * 🔴 ET LA SOURCE A CHANGÉ LE 2/11, PARCE QU'ELLE SOUS-COMPTAIT DE DEUX
   *    TIERS LA SEULE CHOSE QUE MANA APPORTE. On lisait `parcours.lieux` —
   *    les lieux que la MOISSON avait accrochés à une arête, soit 24 % des
   *    lieux nommés. Mesuré : **1,47** lieu annoncé par promenade contre
   *    **4,20** réellement à moins de 150 m du tracé, et **27 % des
   *    promenades annonçaient « 0 lieu »** alors qu'aucune n'en avait zéro.
   *    Face à un office de tourisme dont l'argument est précisément « nous
   *    savons ce que vous croisez », c'était le pire endroit où se tromper.
   *
   * ⭐ `rencontresLeLong` mesure sur le TRACÉ, contre l'inventaire ENTIER, au
   *    seuil que `proches.ts` porte déjà — un seul endroit pour les 150 m. Et
   *    `fondreRencontres` devient inutile ici : elle existait pour INSÉRER le
   *    lieu visé que la boucle ne savait pas citer. Mesuré sur le tracé, il se
   *    cite tout seul. ⚠️ La fonction reste exportée et testée : c'est sa
   *    nécessité qui a disparu, pas sa justesse.
   */
  const rencontres = useMemo(() => {
    if (!graphe || !b || !inventaire) return [];
    /* 🔴 `b.contour`, ET SURTOUT PAS `traits(graphe, b).flat()` — défaut du
       2/11, trouvé en relisant ce que l'écran donne à mesurer.
       `traits()` rend la géométrie STOCKÉE de chaque arête, toujours dans le
       sens a→b, et ne l'inverse JAMAIS. Or 52 % des arêtes d'une promenade
       sont marchées dans l'autre sens : mis bout à bout, ces morceaux font un
       zigzag — **89 % des tracés portaient un saut de plus de 120 m, le pire
       de 1 053 m** — et ces sauts sont des segments droits QUI N'EXISTENT PAS,
       qui frôlent des lieux qu'on annonçait ensuite « sur le chemin ».
       Conséquences mesurées : **20 % des listes dans le mauvais ordre**, 4 %
       des écarts sous-estimés.
     ⭐ ET LA LEÇON EST DURE : j'ai écrit la règle du sens de marche dans
        `mesurer()`, je l'ai validée par mutation le matin même — puis je l'ai
        jetée trois lignes plus loin en recomposant le tracé autrement. Le
        tracé juste était déjà sur l'objet, construit par `mesurer()` avec
        `[...ar[4]].reverse()`. ⛔ Une règle tenue à un endroit ne protège pas
        celui qui refabrique la même chose ailleurs. */
    return rencontresLeLong(b.contour, inventaire.lieux).map((r) => ({
      nom: r.l.n ?? inventaire.libelles[r.l.c] ?? r.l.c,
      libelle: inventaire.libelles[r.l.c] ?? r.l.c,
      lon: r.l.g[0], lat: r.l.g[1], ecart: r.m,
      /* ⭐ LA POSITION LE LONG DU PARCOURS VOYAGE AVEC — voir `etapes`. */
      ordre: r.ordre,
    }));
  }, [graphe, b, inventaire]);

  /**
   * LE DÉCOMPTE DE CHAQUE PROPOSITION — même mesure, même seuil.
   * ⚠️ Trois passes de plus à chaque choix de lieu. Elles sont bornées par le
   *    pré-filtre de boîte de `proches.ts` : mesuré sous la milliseconde par
   *    proposition, contre 86 ms pour le reste du calcul.
   */
  const comptes = useMemo(() => {
    if (!graphe || !lesProps || !inventaire) return [];
    /* ⚠️ `contour` ici AUSSI : c'est la même mesure, et la même faute si on
       la refait avec `traits()`. Le badge « N lieux sur le chemin » de chaque
       carte en dépend. */
    return lesProps.map((p) => rencontresLeLong(p.parcours.contour, inventaire.lieux).length);
  }, [graphe, lesProps, inventaire]);

  // La carte attend un `Walk` : on lui en fabrique un, avec les TRAITS
  // séparés — jamais une ligne unique (voir Walk.traits).
  const walk: Walk | null = useMemo(() => {
    if (!graphe || !b || !depart || !prop) return null;
    const t = traits(graphe, b).map((l) => l.map(([lon, lat]) => ({ lon, lat })));
    return {
      provenance: "compose" as const,
      slug: "composee",
      titre: laBoucle ? `Boucle par ${spots[prop.i].n}` : `Vers ${spots[prop.i].n}`,
      lieu: depart.nom, resume: "",
      distanceKm: Math.round(metresDits / 100) / 10,
      // ⚠️ La durée se calcule sur le RESSENTI, pas sur les kilomètres :
      //    annoncer 2 h pour un parcours qui monte de 200 m, c'est promettre
      //    ce qu'on ne tient pas.
      dureeEstimeeH: Math.round((b.ressentie / 1000 / ALLURE_KMH) * 2) / 2,
      /* ⭐ La montée VOYAGE avec le fichier depuis le 3/11/2026. Jusque-là le
         GPX affirmait « Aucune altitude : nous n'en disposons pas » — vrai la
         veille, faux ce jour-là. Un GPX s'ouvre dans une montre six mois plus
         tard, loin de la page qui pourrait le corriger : c'est le dernier
         endroit où une affirmation périmée doit survivre. */
      monteeM: Math.round(b.montee),
      boucle: !!laBoucle,
      osmUrl: "https://www.openstreetmap.org/copyright", osmRef: "",
      /* ⚠️ DEUX GÉOMÉTRIES, ET ELLES NE SONT PAS INTERCHANGEABLES.
         `traits` = un trait PAR ARÊTE, dessiné séparément : le sens n'y change
         rien, chaque morceau se trace pour lui-même.
         `points` = la suite MARCHÉE, d'où les repères « Départ »/« Arrivée »
         sont tirés (CarteReelle) et que le schéma hors ligne relie en UNE
         ligne (WalkMap). Lui donner `t.flat()` posait les repères aux mauvais
         bouts et faisait tracer des droites de plus d'un kilomètre. */
      points: b.contour.map(([lon, lat]) => ({ lon, lat })), traits: t,
      /* 🔴 `pos` EST UNE FRACTION DU PARCOURS, PAS UN RANG — et j'y mettais
         l'indice. Les promenades du catalogue portent 0,109 · 0,2439 · 0,5034…
         et `EnChemin` les lit comme telles : `e.pos <= part` pour griser ce
         qui est passé, `insetInlineStart: ${e.pos * 100}%` pour poser le jalon
         sur la barre, et `e.pos > part + 0.005` pour annoncer la prochaine
         étape. Avec un rang, le deuxième jalon partait à 100 % de la barre, le
         troisième à 200 %, et « prochaine étape » désignait toujours le même.
         ⭐ Le nombre juste était déjà calculé — `rencontresLeLong` le rend —
            et je l'avais jeté en recopiant la forme du catalogue sans relire
            ce que son champ voulait dire. */
      etapes: rencontres.map((r) => ({
        nom: r.nom, categorie: r.libelle, pos: r.ordre, lat: r.lat, lon: r.lon,
      })),
    };
  }, [graphe, b, depart, prop, laBoucle, metresDits, rencontres, spots]);

  /* ⭐ MARCHER NE CHANGE PAS D'ADRESSE. Une boucle composée n'en a pas : elle
     vit dans cet écran, avec son lieu de départ et son lieu d'arrivée. On remplace
     donc le rendu plutôt que de naviguer — et le retour ramène exactement la
     proposition qu'on avait sous les yeux, sans la recalculer. */
  if (enMarche && walk) {
    return (
      <Suspense fallback={<main className="page"><div className="wrap">
        <p className="page-note">Préparation de l'écran de marche…</p>
      </div></main>}>
        <EnChemin base={import.meta.env.BASE_URL.replace(/\/$/, "")} walk={walk} retour={() => setEnMarche(false)} />
      </Suspense>
    );
  }

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
        {/* ══ A · L'ENTRÉE — ELLE PORTE TOUT ═══════════════════════════
            2/11, ordre arrêté par le fondateur : le titre, le nombre de
            lieux, le point de départ, puis le bouton. La carte vient après.
            ⭐ L'ÉCRAN NE POSE PLUS QU'UNE QUESTION. Il en posait deux, dans
               une carte glissée sous une image qui, elle, ne demandait rien.
               Et le texte d'introduction disait en trois lignes ce que le
               champ de saisie dit en existant.
            ⛔ L'IMAGE EST UNE ILLUSTRATION, PAS UNE PHOTOGRAPHIE : elle
               passe par `paysages/` et non par `images/Photo.tsx`, dont tout
               le contrat consiste à AFFIRMER un lieu. */}
        <header className="cp-entree">
          <picture className="cp-entree-fond">
            <source srcSet={`${import.meta.env.BASE_URL}paysages/fond-07-1280.avif`} type="image/avif" />
            <img src={`${import.meta.env.BASE_URL}paysages/fond-07-1280.webp`}
                 alt="" aria-hidden="true" decoding="async" />
          </picture>
          <div className="cp-entree-dire">
            <h1 className="cp-titre">Promenade</h1>

            {/* ⭐ UN SEUL NOMBRE, ET C'EST CELUI QU'ON VIENT CHERCHER. Les
                tronçons de chemin disaient la taille de notre moisson ; les
                lieux remarquables disent ce qu'il y a à voir. Le premier nous
                flatte, le second renseigne.
                🔴 ET C'EST DÉSORMAIS CELUI DES LIEUX PRATICABLES, pas celui de
                   l'inventaire. On annonçait 495 — le compte du graphe — alors
                   qu'on peut en proposer 330 sur ce territoire-ci : annoncer
                   un nombre dont les deux tiers ne se choisissent pas, c'est
                   compter ce qu'on a au lieu de ce qu'on donne. */}
            {graphe && praticables.length > 0 && (
              <p className="cp-compte">
                <SvgEtincelle />
                <span>{praticables.length} lieux d'où partir</span>
              </p>
            )}

            {/* ══ LE SPOT, EN UNE LIGNE ═══════════════════════════════════
                ⭐ UN PIN ET UN CHAMP, CÔTE À CÔTE — 2/11, demande du
                fondateur. C'était un bouton pleine largeur, un séparateur
                « ou », puis un champ : trois objets empilés pour une seule
                décision. Le pin EST l'alternative au champ ; les mettre sur
                la même ligne le dit sans un mot.
                🔴 ET IL N'Y A PLUS DE BOUTON « COMPOSER ». Choisir son lieu
                   EST l'action : les trois propositions arrivent avec le
                   choix. Un bouton de confirmation après un choix unique
                   demande deux gestes pour une décision.
                ⛔ LA POSITION SE DEMANDE LÀ OÙ LA QUESTION SE POSE, jamais
                   d'avance, et elle ne part sur aucun serveur.
                ⚠️ Un bouton qui n'est qu'un picto a besoin d'un nom pour qui
                   ne voit pas l'image : `aria-label`, et le titre au survol. */}
            {graphe && (
              <>
                <div className="cp-ligne-depart">
                  <button
                    className="cp-pin"
                    onClick={localiser}
                    aria-label="Partir d'où je suis"
                    title="Partir d'où je suis"
                    disabled={!ix}
                  >
                    <SvgRepere />
                  </button>
                  <label className="cp-depart-champ">
                    <span className="sr-only">Chercher un lieu qui vous plaît</span>
                    <SvgLoupe />
                    <input
                      type="search"
                      value={requete}
                      placeholder="un lieu, une plage, une chapelle…"
                      onChange={(e) => setRequete(e.target.value)}
                    />
                  </label>
                </div>
                {trouves.length > 0 && (
                  <ul className="cp-depart-liste">
                    {trouves.map(({ i, lieu }) => (
                      <li key={`${lieu.c}|${lieu.n}`}>
                        <button onClick={() => choisirSpot(i)}>{lieu.n}</button>
                      </li>
                    ))}
                  </ul>
                )}
                {motGps && <p className="cp-depart-mot">{motGps}</p>}
                {depart && (
                  <p className="cp-depart-mot">
                    Depuis <strong>{depart.nom}</strong>
                    {/* ⚠️ LES MÈTRES QUI NE SONT PAS SUR LE TRACÉ SE DISENT.
                        Le parcours commence au premier nœud du réseau, qui
                        est à `ecartNoeud` du lieu choisi : médiane 30 m,
                        jusqu'à 381 m. Les taire ferait commencer la promenade
                        ailleurs qu'on ne l'a demandée. */}
                    {depart.a.ecartNoeud > 60 &&
                      ` · le chemin commence à ${Math.round(depart.a.ecartNoeud)} m`}
                  </p>
                )}
              </>
            )}
          </div>
        </header>




        {/* 🔴 CE PANNEAU NE S'AFFICHE QUE S'IL A QUELQUE CHOSE À DIRE.
            Il rendait une carte VIDE dans le cas normal — ni erreur, ni
            chargement, ni fermetures manquantes. ⭐ Une surface qui existe
            sans contenu n'est pas neutre : elle dit « il y a quelque chose
            ici » à quelqu'un qui cherche quoi lire. */}
        {(erreur || !graphe || fermetures === null) && (
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
              Les promenades ne tiennent pas compte des arrêtés en cours.
              Vérifiez auprès de l'
              <a href="https://www.crozon-tourisme.bzh/trouver-son-activite/randonnee-velo-trail-2/"
                 rel="noopener">office de tourisme</a> avant de partir.
            </p>
          )}

        </section>
        )}

        {/* ══ LES REFUS ═══════════════════════════════════════════════════
            🔴 C'EST LA PARTIE QUI COMPTE. Une promenade réussie se voit ; un
            refus mal fait ne se voit pas — il ressemble à une absence.
            ⭐ ET ILS ONT CHANGÉ DE PLACE, PAS DISPARU. Hier ils portaient sur
               le BUT d'une boucle ; aujourd'hui le but est un lieu que la
               personne a choisi sur la carte, et c'est le DÉPART qui peut ne
               pas tenir. Le refus le plus fréquent est donc devenu le premier :
               18 % des lieux nommés ne sont approchés par aucun chemin.
            ⚠️ Et aucun de ces textes n'affirme quoi que ce soit sur le MONDE :
               ils disent ce que MANA sait. « Aucun chemin connu de nous » et
               « il n'y a pas de chemin » ne sont pas la même phrase — le
               graphe de la presqu'île porte 115 composantes, et son silence
               mesure sa moisson, pas la Bretagne. */}
        {refusDepart && (
          <section className="page-panel">
            <p className="page-texte">
              <strong>Aucun chemin ne passe devant {refusDepart.nom}.</strong>{" "}
              Le plus proche en reste à {Math.round(refusDepart.a.ecart)} m — au-delà
              des {ECART_MAX_M} m à partir desquels on peut dire « vous passez
              devant ».
            </p>
            <p className="page-texte">
              Ce n'est pas un manque de données : les baies, les caps, les îles
              et les épaves se regardent plus qu'ils ne se longent. MANA ne
              vous y mènera pas en prétendant le contraire.
            </p>
            <p className="page-note">
              Choisissez un lieu dans le champ ci-dessus — il ne propose que
              des lieux d'où l'on peut partir.
            </p>
          </section>
        )}

        {depart && lesProps && lesProps.length === 0 && (
          <section className="page-panel">
            {departCoupe ? (
              <>
                <p className="page-texte">
                  <strong>
                    Le sentier qui part d'ici est fermé par arrêté municipal.
                  </strong>{" "}
                  Aucune promenade depuis ce point&nbsp;: l'accès ne rejoint
                  plus le réseau.
                </p>
                <p className="page-texte">
                  Ce n'est pas la distance&nbsp;: c'est ce chemin-là qui est
                  interdit. Éloignez-vous du trait de côte, ou partez d'un
                  autre lieu.
                </p>
                {touchees?.actives.map((f) => (
                  <p className="page-note" key={f.id}>
                    {f.libelle} — {f.autorite}.{" "}
                    <a href={f.source} rel="noopener">la décision</a>
                  </p>
                ))}
              </>
            ) : (
              <>
                <p className="page-texte"><strong>{mot}</strong></p>
                <p className="page-note">
                  {/* ⭐ LE PLANCHER EST UNE PROMESSE, PAS UNE LIMITE TECHNIQUE,
                      et il faut le dire plutôt que de laisser croire à un
                      trou. Mesuré le 2/11 : un tiers des voisins immédiats de
                      la presqu'île sont à moins de 500 m à pied. Les proposer
                      serait proposer de traverser un parking. */}
                  MANA ne propose pas de promenade de moins de {AUTOUR_MIN_M} m :
                  en deçà, ce n'est pas une promenade. Essayez un lieu voisin.
                </p>
              </>
            )}
          </section>
        )}

        {/* ⚠️ LA BOUCLE DEMANDÉE ET REFUSÉE SE DIT AUSSI — sinon le bouton
            aurait l'air cassé. Une option absente n'est pas un échec. */}
        {boucleVisee && boucleVisee.etat !== "ok" && prop && (
          <section className="page-panel">
            <p className="page-texte">
              <strong>Pas de boucle par {spots[prop.i].n}.</strong>{" "}
              {boucleVisee.etat === "aucune-boucle"
                ? "Y aller et revenir autrement demanderait de repasser par le même chemin — ce que MANA ne propose pas sous le nom de boucle."
                : boucleVisee.etat === "ferme"
                  ? "Le chemin du retour est fermé par arrêté."
                  : "Aucun second chemin connu de MANA n'en revient."}{" "}
              L'aller reste&nbsp;: on revient sur ses pas, et c'est très bien.
            </p>
          </section>
        )}

        {/* ⭐ LA CARTE AVANT LES TROIS PROPOSITIONS — 2/11, demande du
            fondateur, et c'est le bon ordre de lecture : on voit d'abord la
            boucle qu'on tient, puis les deux autres qu'on peut prendre à la
            place. L'inverse demandait de choisir avant d'avoir rien vu.
            ⚠️ Elle reste gardée par `b && walk` : tant que rien n'est
               composé, il n'y a pas de tracé à montrer, et une carte vide
               poserait la même question qu'un panneau vide. */}
        {/* ⚠️ DEUX CONTENEURS, ET CE N'EST PAS DU STYLE. Le panneau sans
              marge avec `overflow: hidden` existe pour que maplibre déborde
              jusqu'aux bords ; le schéma SVG, lui, est en `width: 100%` et
              ne résout rien dans ce conteneur-là — mesuré le 31/10 : rendu,
              mais à 0 × 0 pixel, donc invisible. Un repli qui s'affiche en
              taille nulle est un repli qui n'existe pas. */}
        {b && walk && (
          horsLigne ? (
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
          )
        )}

        {/* ══ C · LES TROIS PROPOSITIONS ══════════════════════════════
              🔴 TROIS LIEUX, PLUS TROIS BOUCLES — 2/11. Hier le compositeur
              rendait trois parcours vers un prétexte qu'il avait choisi ;
              aujourd'hui la personne a choisi son coin, et ce qu'on lui
              propose, c'est OÙ ALLER. Le choix porte donc sur une destination
              qui a un nom, pas sur une silhouette qu'il faut déchiffrer.
              ⭐ TROIS, ET NON « LA MEILLEURE » : mesuré le 2/11, les trois
                 propositions s'écartent de 102° à 106° en médiane — elles
                 partent vraiment dans des directions différentes. ⚠️ Mais pour
                 10 % des lieux elles s'écartent de moins de 17°, et là le
                 choix est largement illusoire ; c'est le prix du réseau, pas
                 une qualité du produit.
              ⛔ ET L'IMAGE EST LE TRACÉ, PAS UNE PHOTOGRAPHIE. Nous n'avons
                 aucune photographie de ces parcours et nous ne pouvons pas en
                 avoir — celui-ci n'existait pas il y a trois secondes. Mettre
                 une jolie côte bretonne sous un chemin qui ne la longe pas est
                 le mensonge documentaire que ce dépôt refuse pour les fiches
                 de balade ; il ne devient pas acceptable parce qu'il est
                 plus petit.
              ⭐ LE VISAGE, C'EST LA SILHOUETTE. Elle est VRAIE, elle se
                 dessine depuis nos propres données, et aucun catalogue de
                 photographies ne peut la copier. */}
        {lesProps && lesProps.length > 0 && (
          <section className="cp-propositions">
            <p className="cp-sus"><SvgEtincelle />
              {lesProps.length > 1 ? `${lesProps.length} lieux autour` : "Un lieu autour"}
            </p>
            {/* ⭐ LE NOM VIENT DU TERRITOIRE CHARGÉ, pas d'une chaîne écrite
                ici : c'est `territoires.ts` qui sait de quel graphe on
                compose, et il le sait parce qu'il a tranché la couture. */}
            <h2 className="cp-question">
              Où vont vos pas depuis {depart?.nom ?? (territoireDe(position[0], position[1]) ?? DEFAUT).avecArticle} ?
            </h2>

            <ul className="cp-cartes">
              {lesProps.map((x, i) => {
                /* 🔴 UNE BOÎTE DEBOUT, PAS COUCHÉE — et c'est une MESURE qui
                   l'impose. Dans un bandeau 320×132, ces tracés occupaient
                   76 % de la hauteur et 19 % de la largeur : un ruban perdu au
                   milieu du vide. Les chemins de la presqu'île courent
                   nord-sud, le long de la côte.
                   ⭐ `portrait()` n'était pas en cause : il applique UN SEUL
                      facteur aux deux axes, c'est tout son objet, et c'est ce
                      qui empêche les silhouettes de devenir des rectangles
                      identiques. Quand une forme ne remplit pas sa boîte, on
                      change la boîte — jamais la projection. */
                const t = portrait(x.parcours.contour, 104, 132, 0.1);
                const lieu = spots[x.i];
                return (
                  <li key={x.i}>
                    <button
                      type="button"
                      className={`cp-carte${i === choisie ? " est-choisie" : ""}`}
                      aria-pressed={i === choisie}
                      onClick={() => {
                        setChoisie(i);
                        /* ⚠️ CHANGER DE DESTINATION ANNULE LA BOUCLE, et ne la
                           recalcule pas en silence : la boucle d'avant menait
                           ailleurs. Garder le bouton enfoncé afficherait un
                           parcours qui ne correspond plus au lieu nommé
                           au-dessus. */
                        setEnBoucle(false); setBoucleVisee(null);
                      }}
                    >
                      <span className="cp-carte-trace" aria-hidden="true">
                        {t && (
                          <svg viewBox="0 0 104 132" preserveAspectRatio="xMidYMid meet">
                            <path d={t.d} fill="none" strokeWidth="2"
                                  strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx={t.depart[0]} cy={t.depart[1]} r="3.4" />
                          </svg>
                        )}
                      </span>
                      <span className="cp-carte-dire">
                        {/* ⭐ LE TITRE EST LE NOM DU LIEU. Il n'y a plus rien à
                            inventer : la personne va QUELQUE PART, et cet
                            endroit a un nom qu'OpenStreetMap porte. Les
                            intitulés calculés servaient à nommer une boucle
                            qui n'allait nulle part en particulier. */}
                        <span className="cp-carte-titre">{lieu.n}</span>
                        {/* ⚠️ CHAQUE LIGNE EST UNE MESURE, et son picto dit
                            laquelle. Une ligne qui n'a rien à dire ne
                            s'affiche pas : « 0 m au bord de l'eau » est du
                            remplissage.
                            🔴 LA DISTANCE EST CELLE DU CHEMIN, JAMAIS DU VOL
                               D'OISEAU, et elle compte les deux bouts hors
                               réseau. Mesuré le 2/11 : le détour médian est de
                               ×1,27 et monte à ×2,9 sur ces propositions —
                               annoncer la ligne droite enverrait quelqu'un
                               pour trois fois moins que la marche. */}
                        <span className="cp-carte-faits">
                          <span><SvgRuban />{(x.metres / 1000).toFixed(1)} km à pied</span>
                          <span><SvgEtincelle />{comptes[i] ?? 0} lieu{(comptes[i] ?? 0) > 1 ? "x" : ""} sur le chemin · {inventaire?.libelles[lieu.c] ?? LIBELLE[lieu.c] ?? lieu.c}</span>
                          {x.parcours.bordDeMer > 300 && (
                            <span><SvgVague />{Math.round(x.parcours.bordDeMer)} m au bord de l'eau</span>
                          )}
                          {x.parcours.marees > 0 && (
                            <span className="cp-alerte"><SvgVague />un passage dépend de la marée</span>
                          )}
                        </span>
                        {/* ⚠️ « À » ET PAS « SUR » QUAND CE N'EST PAS SUR. Le
                            tracé passe à `sortie` mètres du lieu : zéro quand
                            il passe dessus, jusqu'à 150 m quand il passe
                            devant. Les 150 m sont dits à l'écran parce que
                            c'est ce qui autorise la phrase « vous passez
                            devant ». */}
                        <span className="cp-carte-texte">
                          {x.sortie <= 20
                            ? "Le chemin y passe."
                            : `Le chemin passe à ${x.sortie} m — le lieu se voit depuis le sentier.`}
                          {x.minimum > 0 && x.parcours.metres > x.minimum * 1.05 &&
                            ` Un détour de ${Math.round(x.parcours.metres - x.minimum)} m pour un chemin plus agréable que le plus court.`}
                        </span>
                      </span>
                      <span className="cp-carte-fleche" aria-hidden="true">
                        <SvgFleche />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {b && walk && (
          <>
            <section className="page-panel">
              <h2 className="section-title" style={{ marginBottom: "var(--sp-2)" }}>
                {walk.distanceKm} km {laBoucle ? "en boucle" : `jusqu'à ${prop ? spots[prop.i].n : ""}`}
              </h2>
              {/* ⚠️ ET ON DIT CE QUE « ALLER » VEUT DIRE. Sans cette ligne, un
                  aller de 1,4 km se lit comme une promenade de 1,4 km ; le
                  retour sur ses pas la double. Taire le facteur deux serait la
                  sous-estimation que le fondateur a explicitement refusée le
                  2/11 : « ne pas sur-estimer ou sous-estimer ». */}
              {!laBoucle && (
                <p className="page-note">
                  C'est l'<strong>aller</strong>. Revenir sur ses pas en fait{" "}
                  {(walk.distanceKm * 2).toFixed(1)} km — ou composez une
                  nouvelle promenade en arrivant.
                </p>
              )}

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
              {/* ⭐ « PARTIR » EST L'ACTION PRINCIPALE — 2/11, après une
                  question du fondateur : « à quoi sert emporter le tracé
                  alors qu'on veut qu'ils utilisent MANA ? ». Elle était
                  juste. Le GPX n'était pas un bouton de trop : c'était le
                  SEUL, parce que l'écran de marche ne savait se monter que
                  depuis un slug de catalogue. On a desserré la dépendance
                  plutôt que de supprimer la sortie.
                  ⛔ ET LE GPX RESTE. Il descend au second rang, il ne part
                     pas : une application qui garde ce qu'on y a fait n'est
                     pas celle qu'on veut écrire. Ce qui est à vous est à
                     vous — y compris quand vous partez avec. */}
              <div className="cp-emporter">
                <button className="cp-primaire" onClick={() => setEnMarche(true)}>
                  <SvgPartir />Partir
                </button>
                {/* ⭐ LA BOUCLE EST UN INTERRUPTEUR, PAS UNE AUTRE PROMENADE.
                    « Autre promenade » tirait une nouvelle graine au hasard :
                    utile quand le compositeur choisissait le prétexte, vide de
                    sens maintenant que la personne a choisi où aller. Ici le
                    choix est clair — j'y vais et je reviens sur mes pas, ou je
                    reviens par un autre chemin.
                    🔴 ET LA CIBLE DE LA BOUCLE SE DÉRIVE DE L'ALLER : c'est ce
                       qui fait passer `composerVers` de 58 % à plus de 90 % de
                       réussite. Voir `basculerBoucle`. */}
                <button
                  className={`cp-secondaire${enBoucle ? " est-choisie" : ""}`}
                  aria-pressed={enBoucle}
                  onClick={basculerBoucle}
                >
                  {enBoucle ? "Revenir sur mes pas" : "Revenir par un autre chemin"}
                </button>
              </div>
              {/* ⭐ LE SECOND POINT EST UN NOUVEAU DÉPART — c'est ainsi que la
                  promenade s'allonge, et c'est la personne qui décide, à
                  l'arrivée, si elle en a encore envie. Aucune distance n'a
                  jamais été demandée ni devinée : elle s'additionne par
                  gestes. ⛔ Et rien ne s'empile en mémoire : la nouvelle
                  proposition REMPLACE, elle ne se cumule pas — nous ne gardons
                  pas la trace de ce que quelqu'un a marché. */}
              {prop && !laBoucle && (
                <p className="cp-second">
                  <button className="cp-lien" onClick={() => {
                    /* ⚠️ On passe le lieu QU'ON QUITTE pour qu'il ne revienne
                       pas en première proposition — `venuDe`, un seul pas. */
                    const j = prop.i;
                    const nomDepart = depart?.nom;
                    const dOu = spots.findIndex((l) => l.n === nomDepart);
                    choisirSpot(j, dOu >= 0 ? dOu : undefined);
                  }}>
                    <SvgBoussole />Repartir depuis {spots[prop.i].n}
                  </button>
                </p>
              )}
              <p className="cp-second">
                <button
                  className="cp-lien"
                  onClick={() => telecharger("promenade-mana.gpx", enGpx(walk), "application/gpx+xml")}
                >
                  <SvgTelecharger />Emporter le tracé (GPX)
                </button>
              </p>
              {/* ✅ L'ALTITUDE EST POSÉE DEPUIS LE 3/11/2026 — et cette note
                  disait encore le contraire ce matin-là. Elle annonçait
                  « nous n'avons pas de relevé d'altitude sur ces chemins » :
                  vrai le 2/11, faux dès que `scripts/graphe_altitude.py` a
                  rempli les deux graphes. ⭐ Une note qui survit à sa cause
                  devient un faux témoin — celle-ci n'aura vécu qu'un jour.

                  ⛔ ON NE REMET PAS LA DURÉE POUR AUTANT. L'arbitrage du
                     fondateur, 2/11 : « certains sont lents, certains
                     marchent vite. La pertinence est la distance. » Avoir le
                     dénivelé ne rend pas une allure moins fausse — ça rend
                     l'EFFORT mesurable, et l'effort se dit en mètres de
                     montée, pas en minutes inventées.

                  ⚠️ CE QU'ON SAIT ET CE QU'ON NE SAIT PAS, puisque c'est la
                     règle de cette page. La source est SRTM à 30 m :
                     elle voit les vallons, pas les marches d'un escalier
                     côtier. 83 arêtes de la presqu'île (0,5 %) restent sans
                     dénivelé — toutes très courtes, où deux échantillons
                     distants de 30 m donneraient une pente absurde ; on
                     préfère ne rien dire. Et les circuits de l'Office
                     gardent leur propre relevé, qui est mesuré au sol. */}
              <p className="page-note">
                Dénivelé d'après le modèle d'altitude SRTM (30&nbsp;m) —
                il voit les vallons, pas les marches. Les circuits balisés de
                l'Office portent leur propre relevé, mesuré au sol.
              </p>
              <p className="page-note">
                {/* ⛔ L'ÉTALEMENT NE SE LIT QUE SUR UNE BOUCLE. C'est un
                    quotient isopérimétrique : il compare une aire à un
                    périmètre, et appellerait « aller-retour » une ligne
                    droite — un mot juste pour une boucle aplatie, faux pour
                    un trajet d'un lieu à un autre. Le type le dit : `etalement`
                    vit sur `Boucle`, pas sur `Parcours`. */}
                {laBoucle && <>
                  {FORME[formeDeLaBoucle(laBoucle.etalement)]}
                  {formeDeLaBoucle(laBoucle.etalement) === "aller-retour" &&
                    " — on revient par un chemin voisin, pas par une autre boucle"}
                  {" · "}
                </>}
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
                      {/* ⚠️ « À 76 m DU CHEMIN », PAS « SUR LE CHEMIN ». Le
                          seuil de 150 m autorise la phrase « vous passez
                          devant » ; il n'autorise pas « c'est sur votre
                          route ». L'écart est mesuré, donc il se dit. */}
                      {l.ecart > 40 &&
                        <span className="page-note"> · à {l.ecart} m du chemin</span>}
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
        {/* ══ E · CONDITIONS ET SÉCURITÉ ═══════════════════════════════════
            🔴 CE BLOC FAISAIT 862 px, DONT 462 POUR LES SECTEURS NON SITUÉS,
            dépliés en permanence — avant même qu'on ait composé quoi que ce
            soit. ⭐ Une page entièrement faite d'avertissements n'avertit
            plus : elle se saute, et le jour où l'avertissement compte, il a
            la même tête que les cent fois où il ne comptait pas.
            ⛔ RIEN N'EST RETIRÉ. Le NOMBRE et la CONSÉQUENCE restent à
               l'écran sans un geste — y compris la conséquence la plus dure,
               celle des secteurs qu'on n'a pas pu situer et que le calcul
               n'évite donc PAS. Les arrêtés, les autorités, les dates, les
               liens et les mentions « portée approximative » sont à un tap.
            ⚠️ Et la carte est AVANT la signature, donc avant de partir : le
               brief l'exige, et c'est aussi le bon sens. */}
        {graphe && (
          <section className="cp-securite">
            <div className="cp-securite-bloc">
              <SvgBouclier />
              <div>
                <p className="cp-securite-titre">Conditions et sécurité</p>
                {touchees && touchees.actives.length > 0 ? (
                  <p className="cp-securite-dire">
                    {touchees.actives.length} secteur{touchees.actives.length > 1 ? "s" : ""} du
                    sentier côtier (GR34) {touchees.actives.length > 1 ? "sont fermés" : "est fermé"} par
                    arrêté. Les promenades ne les empruntent pas.
                  </p>
                ) : (
                  <p className="cp-securite-dire">
                    Aucune fermeture connue sur ce territoire aujourd'hui.
                  </p>
                )}
                {touchees && touchees.nonSituees.some((f) => f.effet === "interdit") && (
                  <p className="cp-securite-dire cp-securite-dur">
                    ⚠️ {touchees.nonSituees.filter((f) => f.effet === "interdit").length} secteur
                    {touchees.nonSituees.filter((f) => f.effet === "interdit").length > 1 ? "s" : ""} signalé
                    {touchees.nonSituees.filter((f) => f.effet === "interdit").length > 1 ? "s" : ""} n'
                    {touchees.nonSituees.filter((f) => f.effet === "interdit").length > 1 ? "ont" : "a"} pas
                    pu être situé sur la carte : le calcul ne l'évite pas.
                  </p>
                )}
                {touchees && (touchees.actives.length > 0 || touchees.nonSituees.length > 0) && (
                  <details className="cp-arretes">
                    <summary>En savoir plus</summary>
                    <ul>
                      {touchees.actives.map((f) => (
                        <li key={f.id}>
                          {f.libelle} — {f.autorite},{" "}
                          {new Date(f.publie_le).toLocaleDateString("fr-FR")}.{" "}
                          <a href={f.source} rel="noopener">la décision</a>
                          {f.portee_approximative && " · portée approximative"}
                        </li>
                      ))}
                      {touchees.nonSituees.map((f) => (
                        <li key={f.id}>
                          <strong>{f.libelle}.</strong> {f.motif}{" "}
                          <a href={f.source} rel="noopener">{f.autorite}</a>
                          {f.effet === "interdit" &&
                            " — signalé mais non situé sur la carte : le calcul ne l'évite pas."}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
            <div className="cp-securite-bloc">
              <SvgFeuille />
              <p className="cp-securite-dire">
                Tout est calculé dans votre téléphone. Votre position ne part
                nulle part.
              </p>
            </div>
          </section>
        )}

        {/* ⭐ LA SIGNATURE. Elle n'est pas un ornement : tout ce qui précède
            calcule UN parcours, et sans elle l'objet rendu se lit comme un
            itinéraire à exécuter — alors couper, s'arrêter ou changer d'avis
            devient un échec. Ce n'en est pas un : c'est le propre de la
            flânerie. */}
        {graphe && (
          <>
            <p className="cp-signature">Une proposition, pas un programme</p>
            <p className="cp-flanerie">
              Prenez-en la moitié. Coupez où vous voulez. Faites demi-tour
              pour la lumière. Rien ici ne compte vos pas.
            </p>
          </>
        )}
    </main>
  );
}

// LA CARTE DU MONDE — les sites remarquables, partout.
//
// 🔴 ARBITRAGE D'AURÉLIEN, 14/11/2026 : « la carte de MANAhome doit afficher
//    la carte du monde entier avec tous les sites remarquables », puis « tout
//    va se faire via la carte => pas de listing. La carte. Si la plage n'a pas
//    de nom ce n'est pas grave, si elle est à côté, c'est bon. »
//
// ⭐ POURQUOI UNE QUATRIÈME CARTE, ALORS QUE J'AI ÉCRIT QU'IL N'EN FAUDRAIT
//    PAS. J'ai étendu `CarteReelle` plutôt que d'en écrire une pour les
//    hébergements (57 épingles), et c'était juste : ses repères sont des
//    éléments du DOM, positionnés un par un en JavaScript à chaque
//    déplacement. Ici il y en a jusqu'à 1 500 PAR TUILE et plusieurs tuiles à
//    l'écran — le DOM n'est pas le bon outil, la carte doit les dessiner
//    elle-même (une couche WebGL). ⛔ La raison n'est donc pas « c'est un
//    autre écran », c'est « ce n'est pas la même technique de rendu ». Si un
//    jour les repères DOM savaient tenir 10 000 points, ces deux cartes
//    devraient fusionner.
//
// ⚠️ LES TUILES SE CHARGENT SELON CE QU'ON REGARDE. 11 721 fichiers, 138 Mo :
//    on ne les télécharge évidemment pas tous. Le cadre visible donne les
//    tuiles z8 à demander, et on garde celles déjà lues.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import maplibregl, { type Map as CarteML } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { STYLE_CARTE as STYLE, STYLE_ORTHO } from "./carte-fond";
/* ⭐ L'arithmétique vit dans `tuiles.ts`, qui s'éprouve sans navigateur —
   voir l'en-tête de ce fichier-là : un volet masqué fabrique un écran noir
   et interdit de conclure, il n'interdit pas de vérifier autrement. */
import { Z, SITES_POSES, tuilesDuCadre } from "./tuiles";
/* 🔴 L'ÉTENDUE DÉCIDE OÙ LA CARTE S'OUVRE — architecture du 15/11/2026 :
   un produit, trois étendues (monde / France / Bretagne). Voir `etendue.ts`. */
import { etendueDe } from "./etendue";
/* ⭐ LA MÊME TABLE QUE LA CARTE DU TERRITOIRE ET LES PASTILLES DE /balades-office :
   une couleur corrigée là se voit ici, et l'inverse. */
import { couleurCategorie } from "./categories";
import { direLeType } from "./hebergements-du-territoire";
import { lienYAller, plateformeDe } from "./y-aller";
import { usePropositions, type Destination } from "./propositions-du-point";
import { baseUrl } from "./router";
import { visage } from "./visage";
/* ⭐ La porte d'entrée du style vit à part, et s'éprouve sans navigateur —
   voir l'en-tête de ce fichier-là : elle a été fausse deux jours. */
import { poserLaSource } from "./style-pret";

/**
 * 🔴 DEUX BASES, ET LES CONFONDRE A COÛTÉ UN REFUS FAUX — mesuré le
 *    15/11/2026 : la fiche annonçait « Le réseau de chemins n'a pas pu être
 *    lu » sur un menhir de Crozon, alors que le graphe est servi en 200 avec
 *    le bon CORS. J'avais passé la base des TUILES (la racine du domaine) à
 *    `urlGraphe`, qui attend celle des GRAPHES (`…/bretagne/g`) : l'adresse
 *    demandée était `https://mana.bzh/presquile.json`.
 * ⭐ LE REFUS HONNÊTE A FAIT SON TRAVAIL : il distinguait « illisible » de
 *    « rien ici », donc il m'a envoyé chercher le réseau au lieu de croire
 *    le territoire vide. Un message qui dit la bonne cause fait gagner
 *    l'heure qu'un message vague fait perdre.
 * ⚠️ `GRAPHES` garde le suffixe, `BASE` le retire — elles ne sont PAS
 *    interchangeables, et leurs noms le disent maintenant.
 */
const GRAPHES = import.meta.env.VITE_GRAPHE_BASE ?? "https://mana.bzh/bretagne/g";
const BASE = GRAPHES
  .replace(/\/bretagne\/g$/, "")
  .replace(/\/monde\/g$/, "");
const TUILES = `${BASE}/monde/s`;
/* ⭐ MÊME DÉCOUPAGE, MÊME ZOOM que les sites — voir l'en-tête de
   `scripts/hebergements-monde.ts`. `tuilesDuCadre()` sert les deux, donc un
   seul cadrage, un seul « trop loin », un seul cache par calque. */
const TUILES_H = `${BASE}/monde/h`;
/* ⚠️ Le préfixe des ADRESSES de l'app (`/mana/` sur Pages, `/` ailleurs) —
   à ne pas confondre avec `BASE`, qui est celui des DONNÉES servies. */
const B = baseUrl();

interface Site { n: string; c: string; g: [number, number]; a?: 1 }
/** Ce que porte une tuile d'hébergements — voir `scripts/hebergements-monde.ts`. */
interface Heb { n: string; t?: string; c?: string; lits?: number; ch?: number; g: [number, number] }

/**
 * 🔴 CE QU'ON REGARDE — un site remarquable OU un hébergement, 15/11/2026.
 *
 * ⛔ LA PREMIÈRE VERSION FAISAIT PASSER LE TYPE D'HÉBERGEMENT POUR UNE
 *    CATÉGORIE DE SITE (`c: p.t || "hebergement"`). Ça marchait tant que la
 *    fiche ne disait qu'un nom et un mot ; dès qu'elle détaille — commune,
 *    chambres, couchages — il faut savoir DE QUOI on parle. Un champ qui
 *    porte deux sens finit toujours par être lu avec le mauvais.
 */
type Choisi =
  | { genre: "site"; n: string; c: string; g: [number, number]; a?: 1 }
  | { genre: "hebergement"; n: string; t?: string; commune?: string;
      lits?: number; ch?: number; g: [number, number] };

const LIBELLES: Record<string, string> = {
  parc: "Parc", sommet: "Sommet", memorial: "Mémorial", plage: "Plage",
  panorama: "Point de vue", sentier: "Sentier", baie: "Baie",
  site_archeologique: "Site archéologique", source_naturelle: "Source",
  cap: "Cap", ruine: "Ruines", chateau: "Château", chapelle: "Chapelle",
  grotte: "Grotte", col: "Col", cascade: "Cascade", calvaire: "Calvaire",
  moulin: "Moulin", megalithe: "Mégalithe", phare: "Phare", ile: "Île",
  rocher: "Rocher", fontaine: "Fontaine", epave: "Épave", musee: "Musée",
  oeuvre: "Œuvre", lande: "Lande", lieu_de_culte: "Édifice religieux",
  fortification: "Fortification", archeologie: "Site archéologique",
  nature: "Espace naturel", memoire: "Mémoire",
};

/** La position passée dans l'adresse, s'il y en a une — même contrat que le
 *  compositeur (`?lon=&lat=`), pour qu'un lien partagé ouvre le bon endroit. */
function depuisURL(): [number, number] | null {
  if (typeof location === "undefined") return null;
  const p = new URLSearchParams(location.search);
  const lon = Number(p.get("lon")), lat = Number(p.get("lat"));
  return Number.isFinite(lon) && Number.isFinite(lat) && (lon !== 0 || lat !== 0)
    ? [lon, lat] : null;
}

/**
 * 🔴 DEUX EMPLOIS, UNE SEULE CARTE — Aurélien, 14/11/2026 : « place la carte
 *    du monde en arrière-plan de la landing ».
 *
 * ⭐ ET C'EST LE PLUS SÛR DES DEUX. En plein écran, une carte qui refuse de
 *    s'initialiser rend la page BLANCHE — c'est ce qui est arrivé, et il a
 *    fallu décrocher l'accueil. En arrière-plan, le même échec ne coûte
 *    qu'un décor : la devise, la recherche et les portes restent lisibles
 *    par-dessus. ⛔ Une surface qui peut échouer n'a rien à faire sur le
 *    chemin critique tant qu'on n'a pas compris pourquoi elle échoue.
 *
 * ⚠️ EN FOND, ELLE NE PREND PAS LES GESTES. `interactive: false` : une carte
 *    vivante sous un champ de recherche et trois boutons avalerait le
 *    `pointerdown` qui leur est destiné — c'est la leçon déjà écrite dans
 *    `CarteFondOT`. On la regarde, on ne la manipule pas.
 */
/**
 * Le mot qu'on met sur ce qui est choisi.
 * ⭐ UN SEUL ENDROIT POUR LES DEUX CALQUES. `choisi.c` porte un genre de site
 *    (« megalithe ») ou un type d'hébergement (« guest_house ») ; deux
 *    traductions écrites à deux endroits auraient fini par n'en couvrir
 *    qu'une — et l'autre aurait montré sa clé technique à l'écran, ce que ce
 *    dépôt refuse depuis le 4/11 (« onze boutons sur vingt-trois affichaient
 *    la clé en minuscules »).
 */
export const direLeGenre = (c: string): string =>
  LIBELLES[c] ?? direLeType(c) ?? c;

/** Le titre de la fiche. ⚠️ Un site sans nom porte son GENRE — « une plage
 *  sans nom reste une plage ». Un hébergement en a toujours un : la moisson
 *  écarte les lignes au titre vide. */
export const titreDe = (x: Choisi): string =>
  x.genre === "site" && x.a ? direLeGenre(x.c) : x.n;

/**
 * La ligne de détail, sous le nom.
 *
 * 🔴 « TU PEUX AUSSI LES DÉTAILLER » — Aurélien, 15/11/2026. Un hébergement
 *    ne disait que son type ; la base porte aussi sa commune, ses chambres et
 *    ses couchages, et l'export par territoire les sortait déjà.
 * ⭐ ON N'ÉCRIT QUE CE QU'ON SAIT. Les champs manquent souvent — un point OSM
 *    porte rarement ses couchages. Une ligne « Hôtel · — chambres » serait un
 *    trou maquillé ; on joint ce qui existe, et rien d'autre.
 * ⚠️ Le SINGULIER se dit : « 1 chambres » trahit un gabarit, et on le lit
 *    comme un défaut du produit entier.
 */
export function direLeDetail(x: Choisi): string {
  if (x.genre === "site") return x.a ? "Sans nom connu" : direLeGenre(x.c);
  const bouts = [
    x.t ? direLeType(x.t) : null,
    x.commune || null,
    x.ch ? `${x.ch} chambre${x.ch > 1 ? "s" : ""}` : null,
    x.lits ? `${x.lits} couchage${x.lits > 1 ? "s" : ""}` : null,
  ].filter(Boolean);
  /* ⚠️ Jamais vide : « Hébergement » est la seule chose vraie qu'on sache
     dire quand la moisson n'a rien d'autre. */
  return bouts.length ? bouts.join(" · ") : "Hébergement";
}

export function CarteMonde(
  { enFond = false, vivante = false }: { enFond?: boolean; vivante?: boolean } = {},
) {
  const boite = useRef<HTMLDivElement | null>(null);
  const carte = useRef<CarteML | null>(null);
  const [choisi, setChoisi] = useState<Choisi | null>(null);
  const [mot, setMot] = useState("");
  /**
   * 🔴 LA SURFACE COMMUNE — 15/11/2026, architecture d'Aurélien : « un
   *    produit, trois étendues ». Cette carte portait un seul calque ; elle
   *    porte maintenant ce que le panneau de la carte du territoire portait,
   *    pour que manahome n'ait pas à emprunter un écran breton.
   * ⚠️ Les hébergements NAISSENT ÉTEINTS, comme sur la carte du territoire et
   *    pour la même raison : ce sont 7 365 tuiles de plus à aller chercher,
   *    et qui ouvre la carte pour regarder des sites n'a pas à les payer.
   */
  const [calques, setCalques] = useState({ sites: true, hebergements: false });
  /* ⚠️ Lue UNE FOIS : l'appareil ne change pas en cours de session, et
     `plateformeDe` lit le `userAgent` — même raison que sur la carte du
     territoire. */
  const plateforme = useMemo(
    () => plateformeDe(typeof navigator === "undefined" ? "" : navigator.userAgent,
                       typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints),
    []);
  const [calquesOuverts, setCalquesOuverts] = useState(false);
  const [genres, setGenres] = useState<string[]>([]);
  const [genresChoisis, setGenresChoisis] = useState<ReadonlySet<string>>(new Set());
  /** ⚠️ Posé par `installer()` : les effets de calque ne peuvent rien avant. */
  const [pret, setPret] = useState(false);
  /* ⭐ LES CLOSURES DE L'EFFET DE MONTAGE NE VOIENT PAS L'ÉTAT D'AUJOURD'HUI.
     `charger()` vit dans un effet monté une seule fois ; sans ce relais, elle
     lirait éternellement `{sites: true, hebergements: false}` — le calque
     s'allumerait à l'écran et ne chargerait jamais rien. */
  const calquesVivants = useRef(calques);
  calquesVivants.current = calques;
  const rechargerRef = useRef<(() => void) | null>(null);

  /**
   * 🔴 LES TROIS PROMENADES DEPUIS LE LIEU CHOISI — Aurélien, 15/11/2026 :
   *    « implémente la fonction de mana.bzh : on clique sur un site
   *    remarquable, Y aller ou Partir d'ici, 3 options ».
   *
   * ⭐ LES DESTINATIONS SONT CE QUE LA CARTE A DÉJÀ SOUS LES YEUX. Elles
   *    viennent des tuiles chargées, pas d'un second téléchargement : la
   *    composition cherche entre 600 et 4 000 m, et les tuiles du cadre
   *    couvrent cette portée. ⚠️ Donc les propositions dépendent de ce qui a
   *    été parcouru — c'est honnête (on ne propose que ce qu'on connaît ici)
   *    et c'est le même marché que la recherche de l'accueil.
   * ⛔ Les ANONYMES en sont exclus par `usePropositions` : « une liste de
   *    douze "Plage" ne se choisit pas ».
   */
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const etatProp = usePropositions(
    GRAPHES, choisi ? choisi.g : null, destinations);

  useEffect(() => {
    if (!boite.current) return;
    /* 🔴 LE CACHE APPARTIENT À LA CARTE, PAS AU COMPOSANT — et c'est une
       course qui l'a imposé. `React.StrictMode` monte l'effet DEUX fois.
       Quand le cache vivait dans un `useRef` partagé :
         1. la carte A démarre, son chargement part en `await` ;
         2. React la détruit et monte la carte B ;
         3. le chargement de A REPREND, remplit le cache commun et appelle
            `setData` sur une carte déjà retirée — sans effet ;
         4. la carte B trouve toutes ses tuiles « déjà lues », n'en charge
            aucune, et ne reçoit jamais de données.
       Mesuré : couche présente, source présente, **0 point**, deux tuiles en
       200 dans le réseau — un écran qui ressemble à « il n'y a rien ici ».
       ⭐ Et ce n'est PAS un défaut de banc : tout remontage (revenir sur
          l'écran, un rechargement à chaud) rejouerait la même course.
       ⚠️ Déclarés DANS l'effet : chaque carte a les siens, et ils meurent
          avec elle. Un `useRef` aurait survécu, c'est tout le défaut. */
    const lots = {
      sites: { lues: new Set<string>(), points: [] as GeoJSON.Feature[] },
      hebergements: { lues: new Set<string>(), points: [] as GeoJSON.Feature[] },
    };
    const m = new maplibregl.Map({
      container: boite.current, style: enFond ? STYLE_ORTHO : STYLE,
      /* 🔴 LE CENTRE ÉTAIT LE MULLERTHAL, EN DUR — c'est le point où je
         testais, et il est parti en production : tout visiteur du monde
         atterrissait au Luxembourg. ⛔ Un réglage de mise au point qui
         survit au déploiement est une décision que personne n'a prise.
         ⭐ On part de l'URL si elle le dit, sinon du monde entier — et la
            géolocalisation, quand elle répond, vient recadrer. Jamais un
            lieu choisi par moi. */
      /* 🔴 EN FOND : SATELLITE, ET PAS AU ZOOM MONDE — Aurélien, 14/11/2026 :
         « affiche sans frontière, mode satellite ».
         ⚠️ MESURÉ AVANT DE CHOISIR : le relais ortho répond à partir de z6,
            mondialement (Crozon, Mullerthal, Rome, Rio : 200 à z8), et rend
            404 en dessous — z2, z3, z4, z5 tous vides. Une vue du monde
            entier en satellite n'existe donc PAS ici : on ouvre à z6, le plus
            petit zoom qui porte de l'image.
         ⛔ Et on ne « corrige » pas ce 404 par un fond de plan derrière :
            deux mosaïques superposées pour cacher un trou, c'est un trou
            qu'on cesse de voir sans l'avoir comblé. */
      /* 🔴 LE CENTRE ÉTAIT [10, 46] — l'Europe, parce que c'est là que je
         regardais. Il vient maintenant de l'ÉTENDUE DE L'HÔTE : le monde pour
         manahome, la Bretagne pour mana.bzh. Une carte s'ouvre sur ce que le
         site revendique, jamais sur un point choisi par qui l'écrit.
         ⚠️ LE ZOOM RESTE À 6 AU MINIMUM, et ce n'est pas un goût : mesuré, le
            relais ortho répond à partir de z6 et rend 404 en dessous. Une vue
            du monde entier en satellite n'existe pas ici. Pour une étendue
            étroite (la Bretagne), on serre d'un cran de plus. */
      center: depuisURL() ?? etendueDe(visage()).ouverture,
      zoom: depuisURL() ? 10 : etendueDe(visage()).zoom,
      attributionControl: false,
      /* ⭐ EN FOND, ELLE PEUT ÊTRE VIVANTE — 15/11/2026, Aurélien :
         « j'ai demandé la carte en plein écran », et l'accueil de MANAhome
         DEVIENT la carte qu'on manipule, avec la devise, la recherche et la
         barre posées par-dessus.
         ⛔ `vivante` et `enFond` restent DEUX questions : « où est-elle
            posée ? » et « peut-on la manipuler ? ». Les fondre en une seule
            remettrait le fond figé et la carte vivante dans le même mot, et
            c'est exactement ce qui fait qu'un jour l'un prend la place de
            l'autre sans qu'on l'ait voulu. */
      interactive: !enFond || vivante,
    });
    carte.current = m;
    /* ⚠️ L'ATTRIBUTION RESTE, MÊME EN FOND : OpenStreetMap et OpenFreeMap se
       citent, décor ou pas — c'est une obligation de licence, pas une
       option d'affichage. Les commandes de zoom, elles, n'ont pas de sens
       sur une carte qu'on ne manipule pas. */
    m.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    if (!enFond) {
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    }

    /* 🔴 `load` PEUT ÊTRE DÉJÀ PASSÉ — mesuré le 14/11/2026, et c'est ce qui
       a tenu la carte vide une demi-heure. En développement, `StrictMode`
       crée la carte #1, la détruit, puis crée la #2 ; le style est alors en
       cache et son chargement se termine AVANT que mon écouteur ne soit
       attaché. Résultat : `isStyleLoaded()` vrai, et pourtant ni source
       `sites`, ni couche, ni chargement de tuiles — la trace s'arrêtait net
       sur « carte #2 créée ».
       ⭐ Un événement qu'on attend sans demander s'il est DÉJÀ survenu est
          une attente qui peut ne jamais finir. On fait les deux. */
    /* 🔴 « SANS FRONTIÈRE » — et le style n'en porte aucune, vérifié couche
       par couche. Ce qu'on prend pour des frontières, ce sont les ÉTIQUETTES :
       noms de pays, de villes, de routes, points d'intérêt — vingt-cinq
       couches de texte posées sur l'image.
       ⭐ En fond, elles n'ont rien à dire : personne ne lit « Deutschland »
          derrière un champ de recherche. On les éteint toutes, et on garde la
          seule couche d'image.
       ⚠️ On les MASQUE (`visibility: none`) au lieu de les retirer : le style
          est partagé avec l'écran ortho du compositeur, où elles servent. */
    const taireLesEtiquettes = () => {
      if (!enFond) return;
      for (const c of m.getStyle()?.layers ?? []) {
        if (c.id !== "ortho") m.setLayoutProperty(c.id, "visibility", "none");
      }
    };

    const installer = () => {
      /* ⭐ UNE COUCHE, PAS 1 500 ÉLÉMENTS. C'est toute la raison de cette
         carte : maplibre dessine les points sur le GPU. */
      m.addLayer({
        id: "sites", type: "circle", source: "sites",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 2.5, 12, 5, 16, 8],
          "circle-color": "#c9a227",
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,.85)",
        },
      });
      m.on("click", "sites", (e) => {
        const p = e.features?.[0]?.properties as { n: string; c: string; a?: number } | undefined;
        const g = (e.features?.[0]?.geometry as GeoJSON.Point | undefined)?.coordinates;
        if (p && g) {
          setChoisi({ genre: "site", n: p.n, c: p.c, g: [g[0], g[1]],
                      ...(p.a ? { a: 1 as const } : {}) });
        }
      });
      m.on("mouseenter", "sites", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "sites", () => { m.getCanvas().style.cursor = ""; });

      /* ⭐ LES HÉBERGEMENTS : UNE FORME, PAS UNE COULEUR DE PLUS — la même
         décision que sur la carte du territoire ce matin, et pour la même
         raison. Les genres de sites occupent la palette ; une teinte de plus
         se confondrait avec l'une d'elles. Le blanc cerné d'encre ne
         ressemble à aucune pastille, et se lit sans légende comme au
         daltonisme. */
      m.addSource("hebergements", { type: "geojson",
        data: { type: "FeatureCollection", features: [] } });
      m.addLayer({
        id: "hebergements", type: "circle", source: "hebergements",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 2.5, 12, 5, 16, 8],
          "circle-color": "#f6f3e6",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#1f2a1c",
        },
      });
      m.on("click", "hebergements", (e) => {
        const p = e.features?.[0]?.properties as
          { n: string; t?: string; c?: string; lits?: number; ch?: number } | undefined;
        const g = (e.features?.[0]?.geometry as GeoJSON.Point | undefined)?.coordinates;
        /* ⭐ MÊME FICHE QUE LES SITES, et c'est la demande d'Aurélien du
           15/11 : « tu peux aussi les détailler et offrir les options, comme
           les sites remarquables ? ». Un second encart aurait été deux
           encarts à tenir d'accord — et le second aurait vieilli. */
        if (p && g) {
          setChoisi({ genre: "hebergement", n: p.n, t: p.t || undefined,
                      commune: p.c || undefined,
                      ...(p.lits ? { lits: Number(p.lits) } : {}),
                      ...(p.ch ? { ch: Number(p.ch) } : {}),
                      g: [g[0], g[1]] });
        }
      });
      m.on("mouseenter", "hebergements", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "hebergements", () => { m.getCanvas().style.cursor = ""; });

      taireLesEtiquettes();
      setPret(true);
      charger();
    };
    /**
     * 🔴 `isStyleLoaded()` ÉTAIT LA MAUVAISE PORTE, ET ELLE A COÛTÉ DEUX
     *    JOURS. Ce garde disait `if (installe || !m.isStyleLoaded()) return;`
     *    — c'est-à-dire : « n'installe rien tant que le style n'est pas
     *    chargé ». Le nom le promet ; l'implémentation dit autre chose.
     *
     *    `Map.isStyleLoaded()` rend `style.loaded()`, qui exige — en plus du
     *    style analysé — que **TOUTES les sources aient fini leurs tuiles**.
     *    Mesuré dans la page, le 14/11/2026 :
     *
     *        style._loaded ............ true     ← le style EST prêt
     *        imageManager.isLoaded() .. true
     *        sourceCaches ............. ortho: false · openmaptiles: false
     *        isStyleLoaded() .......... false    ← et pourtant
     *
     * ⛔ OR LE RELAIS ORTHO REND DES 504 À FROID — relevé le même jour sur
     *    `carte/ortho/11/1052/865.jpg` et `11/1095/762.jpg`. Une tuile qui
     *    tarde, et la porte reste fermée à chacun des cinquante sondages ;
     *    au bout de dix secondes le guetteur s'arrête, pour toujours.
     *    Résultat selon la chance du réseau : ni source `sites`, ni points,
     *    et les vingt-cinq couches d'étiquettes JAMAIS éteintes — d'où ce
     *    second symptôme, plus parlant que l'écran blanc : **la carte de fond
     *    affiche les noms de pays et de villes**.
     *
     * ⭐ ET C'EST LA RÉPONSE À L'ÉNIGME LAISSÉE OUVERTE : « `CarteReelle`
     *    charge le MÊME style sur le MÊME hôte sans broncher ». Évidemment —
     *    elle ne pose AUCUNE source. Ses repères sont des éléments du DOM,
     *    donc elle n'a jamais eu besoin que le style soit prêt. Deux
     *    composants, un style, un seul qui attendait quelque chose.
     *
     * ⭐ LA BONNE PORTE EST `addSource` LUI-MÊME. En interne, il appelle
     *    `_checkLoaded()` qui LÈVE « Style is not done loading » tant que le
     *    style n'est pas analysé — et seulement pour cette raison-là, sans
     *    rien savoir des tuiles. On ne demande donc plus « es-tu prêt ? » à
     *    une fonction qui répond à une autre question : on pose la source, et
     *    l'échec nous dit de repasser.
     * ⚠️ C'est la source qui sert de sonde, pas un appel à blanc : une sonde
     *    séparée mesurerait un instant, puis l'installation vraie aurait lieu
     *    à un autre. Ici il n'y a pas d'intervalle entre les deux.
     * ⚠️ Et `installe` passe à `true` APRÈS la pose réussie : si l'on
     *    repasse, `addSource` lèverait cette fois « There is already a source
     *    with ID », et on prendrait une porte ouverte pour une porte fermée.
     */
    let installe = false;
    const tenter = () => {
      if (installe) return;
      const pose = poserLaSource(m, "sites",
        { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      if (!pose) return;        // le style n'est pas analysé : on repassera
      installe = true;
      installer();
    };
    /* ⭐ TROIS CHEMINS, ET AUCUN N'EST DE TROP. `load` peut être DÉJÀ passé
       quand on s'abonne (`StrictMode` monte l'effet deux fois, le style est
       alors en cache) ; `styledata`, lui, se répète. On tente donc tout de
       suite, et à chaque occasion. */
    m.on("load", tenter);
    m.on("styledata", tenter);
    tenter();
    /* ⚠️ LE GUETTEUR RESTE, MAIS IL N'EST PLUS LE FILET PRINCIPAL. Il avait
       été posé parce qu'« un rendez-vous qu'on peut manquer demande qu'on
       aille voir » — c'était vrai, et insuffisant : il allait voir avec la
       mauvaise question, et rendait non cinquante fois de suite. Il garde sa
       place pour le cas où les deux événements se croisent, et sa borne de
       dix secondes n'est plus une condamnation. */
    const guetteur = window.setInterval(() => {
      if (installe) { window.clearInterval(guetteur); return; }
      tenter();
    }, 200);
    const finDuGuet = window.setTimeout(() => window.clearInterval(guetteur), 10_000);
    m.on("moveend", () => charger());

    /* 🔴 LA CARTE NAÎT PLUS PETITE QUE SON CONTENEUR — mesuré le 14/11/2026 :
       scène 417 × 671, canevas 417 × **300**. maplibre lit la taille de sa
       boîte à la construction ; ici la boîte n'a pas encore sa hauteur
       (`100dvh − la barre`), et rien ne revient la lui dire.
       ⭐ `CarteReelle` porte déjà cette parade, et je ne l'avais pas emportée
          en écrivant une carte à côté — c'est le prix d'un second composant,
          et il se paie en défauts qu'on croyait réglés.
       ⚠️ Un observateur ET des rappels différés : l'observateur attrape les
          changements de boîte, les délais attrapent le premier cadre, où la
          boîte est déjà bonne mais où aucun changement ne se produira plus. */
    /* ⭐ ON DEMANDE OÙ L'ON EST, ET ON RECADRE SI ÇA RÉPOND. Une carte du
       monde ouverte sur le monde est juste mais inutile : ce qu'on cherche
       est autour de soi. ⚠️ Et c'est une DEMANDE : si elle est refusée ou
       trop lente, la carte reste sur le monde — pas d'écran bloqué en
       attente, pas de lieu inventé. */
    if (!depuisURL() && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (g) => { m.jumpTo({ center: [g.coords.longitude, g.coords.latitude], zoom: 10 }); },
        () => {}, { timeout: 8000 });
    }

    const redimensionner = () => { m.resize(); };
    const ro = new ResizeObserver(redimensionner);
    if (boite.current) ro.observe(boite.current);
    const minuteries = [120, 600, 1600].map((d) => window.setTimeout(redimensionner, d));

    /**
     * Moissonne UN calque sur les tuiles données.
     *
     * ⭐ ÉCRITE UNE FOIS POUR LES DEUX. Les sites et les hébergements ont le
     *    même découpage, le même cache et le même rattrapage d'échec ; deux
     *    copies auraient divergé au premier correctif — et ce dépôt sait ce
     *    que ça coûte (« deux moteurs pour un même travail »).
     */
    async function moissonner(
      nom: "sites" | "hebergements", racine: string,
      tuiles: readonly (readonly [number, number])[],
      proprietes: (e: any) => Record<string, unknown>,
    ) {
      const lot = lots[nom];
      let neuf = 0;
      for (const [x, y] of tuiles) {
        const clef = `${x}/${y}`;
        if (lot.lues.has(clef)) continue;
        lot.lues.add(clef);
        try {
          const r = await fetch(`${racine}/${Z}/${x}/${y}.json`);
          if (!r.ok) continue;            // tuile vide : il n'y a rien ici
          const t = (await r.json()) as { l: any[] };
          for (const e of t.l) {
            lot.points.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: e.g },
              properties: proprietes(e),
            });
          }
          neuf++;
        } catch { /* une tuile manquante n'est pas une panne */ }
      }
      if (!neuf) return;
      /* 🔴 CE `?.` AVALAIT L'ÉCHEC — et il a coûté une demi-heure le 14/11.
         Écrit `getSource(nom)?.setData(...)`, il ne fait RIEN quand la source
         n'existe pas encore, sans un mot : les tuiles sont pourtant notées
         comme lues, et le chargement suivant n'a plus rien à charger.
         ⭐ Un appel optionnel sur un objet qu'on sait devoir exister n'est pas
            de la prudence, c'est un silence. */
      const src = m.getSource(nom) as maplibregl.GeoJSONSource | undefined;
      if (!src) {
        for (const [x, y] of tuiles) lot.lues.delete(`${x}/${y}`);
        return;
      }
      src.setData({ type: "FeatureCollection", features: lot.points });
      if (nom === "sites") {
        /* ⚠️ LES GENRES SE DÉCOUVRENT EN MARCHANT, et c'est honnête : le
           panneau propose ce qui est SOUS LES YEUX, pas le vocabulaire
           complet des 32 catégories dont la plupart seraient vides ici. */
        const vus = new Set<string>();
        for (const f of lot.points) vus.add(String((f.properties as any).c));
        setGenres([...vus].sort());
        /* ⚠️ Les mêmes points servent de DESTINATIONS possibles — pas une
           seconde liste : une liste dessinée et une liste proposée, tenues
           séparément, divergent au premier filtre. C'est la leçon que la
           carte du territoire a payée le 4/11. */
        setDestinations(lot.points
          .filter((f) => !(f.properties as any).a)
          .map((f) => ({
            n: String((f.properties as any).n),
            c: String((f.properties as any).c),
            g: (f.geometry as GeoJSON.Point).coordinates as [number, number],
          })));
      }
    }

    /** Charge les tuiles du cadre visible, et seulement celles-là. */
    async function charger() {
      /* ⚠️ RIEN AVANT LA SOURCE. `moveend` arrive avant `load` quand on
         redimensionne tôt ; charger sans source remplirait le cache pour
         rien. La condition est l'existence de la source, pas un drapeau. */
      if (!m.getSource("sites")) return;
      const b = m.getBounds();
      const choix = tuilesDuCadre(
        { ouest: b.getWest(), est: b.getEast(), nord: b.getNorth(), sud: b.getSouth() },
        m.getZoom());
      if (choix.etat !== "ok") {
        /* ⭐ DIRE CE QU'IL Y A, PAS SEULEMENT CE QU'ON NE PEUT PAS. « Approchez »
           seul laisse croire à une carte vide ; le nombre dit qu'il y a de
           quoi chercher, et pourquoi on ne pose pas tout d'un coup. */
        setMot(choix.etat === "loin"
          ? `${SITES_POSES.toLocaleString("fr-FR")} sites remarquables dans le monde. `
            + `Approchez : la carte les pose quartier par quartier.`
          : "Approchez encore un peu — la zone est trop large pour être chargée d'un coup.");
        return;
      }
      setMot("");
      await moissonner("sites", TUILES, choix.tuiles,
        (e: Site) => ({ n: e.n, c: e.c, ...(e.a ? { a: 1 } : {}) }));
      /* ⛔ ON NE TÉLÉCHARGE PAS UN CALQUE ÉTEINT. Masquer coûte la bande
         passante de ce qu'on cache ; ne pas charger coûte zéro. Même règle
         que `ot.json` sur la carte du territoire. */
      if (calquesVivants.current.hebergements) {
        await moissonner("hebergements", TUILES_H, choix.tuiles,
          /* ⚠️ `?? ""` et non `?? null` : maplibre ne garde pas les propriétés
             nulles, et l'écran doit pouvoir lire la clé pour savoir qu'elle
             est vide. */
          (e: Heb) => ({ n: e.n, t: e.t ?? "", c: e.c ?? "",
                         lits: e.lits ?? 0, ch: e.ch ?? 0 }));
      }
    }
    /* ⭐ Le relais vers l'extérieur de l'effet : allumer un calque doit
       déclencher sa moisson, et le bouton vit dans le rendu. */
    rechargerRef.current = () => { void charger(); };

    return () => {
      ro.disconnect();
      window.clearInterval(guetteur);
      window.clearTimeout(finDuGuet);
      for (const id of minuteries) window.clearTimeout(id);
      m.remove(); carte.current = null;
    };
  }, []);

  /**
   * LA FICHE DU LIEU CHOISI — le nom, les deux portes, les trois promenades.
   *
   * ⭐ L'ORDRE DIT LE PRODUIT, et il est repris tel quel de la carte du
   *    territoire : « Y aller » vient d'abord parce qu'il vient d'abord dans
   *    la vie — on n'est pas encore là — mais c'est « Partir d'ici » qui
   *    porte l'or : la promenade est ce que MANA apporte, l'itinéraire
   *    routier est une commodité qu'on emprunte ailleurs.
   *
   * ⛔ ET CHAQUE REFUS A SON MOT. Sur une carte mondiale, la plupart des
   *    points n'ont pas de réseau piéton chez nous : trois territoires sur la
   *    Terre. Rendre une liste vide ferait croire qu'il n'y a rien à marcher
   *    là-bas — alors que c'est NOUS qui n'y sommes pas. Quatre états, quatre
   *    phrases, et « Y aller » marche dans les quatre.
   */
  const fiche = choisi && (
    <div className="monde-choisi">
      <p className="monde-choisi-nom">{titreDe(choisi)}</p>
      <p className="monde-choisi-dire">{direLeDetail(choisi)}</p>

      <div className="terr-actions">
        {/* ⛔ ON PASSE LA MAIN, ON N'ITINÈRE PAS — voir `y-aller.ts` : le
            graphe servi ne porte pas la classe de voirie, donc on ne sait
            pas où une voiture a le droit de passer. */}
        <a className="m-action-fine terr-bouton"
           href={lienYAller(choisi.g, titreDe(choisi), plateforme)}
           target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"
               fill="none" stroke="currentColor" strokeWidth="1.6"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.6" />
          </svg>
          Y aller
        </a>
        {/* ⚠️ `/promenades`, PAS `/composer` : les deux rendent le même écran,
            mais `/promenades` est l'adresse canonique.
            ⛔ Et le bouton ne paraît QUE là où l'on sait composer. Une porte
               qui mène à un refus est pire qu'une porte absente : elle a
               l'air d'une promesse. */}
        {etatProp && etatProp.etat !== "hors-reseau" && (
          <a className="m-action terr-bouton"
             href={`${B}/promenades?lon=${choisi.g[0]}&lat=${choisi.g[1]}`
                   + `&nom=${encodeURIComponent(titreDe(choisi))}`}>
            Partir d'ici →
          </a>
        )}
      </div>

      {etatProp?.etat === "hors-reseau" && (
        <p className="monde-choisi-mot">
          Nous n'avons pas encore le réseau de chemins ici. « Y aller » marche
          quand même.
        </p>
      )}
      {etatProp?.etat === "chargement" && (
        <p className="monde-choisi-mot">
          Lecture du réseau de chemins {etatProp.territoire.avecArticle}…
        </p>
      )}
      {etatProp?.etat === "echec" && (
        <p className="monde-choisi-mot">
          Le réseau de chemins n'a pas pu être lu — ce n'est pas qu'il n'y a
          rien ici.
        </p>
      )}
      {etatProp?.etat === "aucune" && (
        <p className="monde-choisi-mot">
          Aucun chemin ne passe assez près pour composer une promenade d'ici.
        </p>
      )}
      {etatProp?.etat === "ok" && (
        <ol className="monde-props">
          {etatProp.propositions.map((prop, i) => (
            <li key={`${prop.spot.n}-${i}`}>
              <a className="monde-prop"
                 href={`${B}/promenades?lon=${choisi.g[0]}&lat=${choisi.g[1]}`
                       + `&vers=${prop.spot.g[0]},${prop.spot.g[1]}`
                       + `&nom=${encodeURIComponent(prop.spot.n ?? "ce lieu")}`}>
                <span className="monde-prop-rang" aria-hidden="true">{i + 1}</span>
                <span className="monde-prop-nom">{prop.spot.n}</span>
                {/* 🔴 `prop.metres` ET NON `prop.parcours.metres` — le type le
                    dit en toutes lettres : « CE QU'ON AFFICHE : le réseau PLUS
                    les deux bouts hors réseau ». Le second compte le chemin
                    balisé seul et oublie l'approche et la sortie, donc il
                    ANNONCE MOINS QUE CE QU'ON MARCHE. Un chiffre juste pour
                    une autre question est un chiffre faux pour celle-ci.
                    ⚠️ ARRONDI AU MÈTRE : « 1 868,4 m » annonce une précision
                    que le décimètre ne peut pas tenir sur un chemin de
                    terre, et la décimale se lit comme une garantie. */}
                <span className="monde-prop-m">
                  {Math.round(prop.metres).toLocaleString("fr-FR")} m
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  /**
   * ⭐ ALLUMER UN CALQUE, C'EST DEUX GESTES : le montrer, et aller chercher
   *    ce qu'il montre. Le second ne vaut que pour les hébergements, qui ne
   *    sont pas chargés tant qu'ils sont éteints.
   */
  useEffect(() => {
    const m = carte.current;
    if (!m || !pret || !m.getLayer("sites")) return;
    m.setLayoutProperty("sites", "visibility", calques.sites ? "visible" : "none");
    m.setLayoutProperty("hebergements", "visibility",
      calques.hebergements ? "visible" : "none");
    if (calques.hebergements) rechargerRef.current?.();
  }, [calques, pret]);

  /**
   * 🔴 ICI LE FILTRE maplibre EST LE BON OUTIL, ET IL NE L'ÉTAIT PAS AILLEURS.
   *    `Territoire2030` a retiré ses `setFilter` le 4/11 parce qu'il tenait
   *    DEUX listes — une dessinée, une visée par `viser()`/`survol()` — qui
   *    divergeaient dès le premier filtre : on cliquait un point doré et la
   *    fiche d'une fontaine masquée s'ouvrait.
   * ⭐ Ici il n'y a qu'une liste. Le clic passe par `m.on("click", "sites")`,
   *    que maplibre ne déclenche QUE pour les objets effectivement rendus —
   *    donc filtrés. Ce qui est cliquable est ce qui est visible, par
   *    construction et non par discipline.
   */
  useEffect(() => {
    const m = carte.current;
    if (!m || !pret || !m.getLayer("sites")) return;
    m.setFilter("sites", genresChoisis.size
      ? ["in", ["get", "c"], ["literal", [...genresChoisis]]] as any
      : null);
  }, [genresChoisis, pret]);

  const basculerGenre = (g: string) =>
    setGenresChoisis((avant) => {
      const apres = new Set(avant);
      if (!apres.delete(g)) apres.add(g);
      return apres;
    });

  /**
   * LE PANNEAU DES CALQUES — le même métier que celui de la carte du
   * territoire, sur la surface commune.
   * ⚠️ Il est rendu DANS la carte (et non dans la colonne de l'application) :
   *    sur l'accueil vivant, la colonne ne reçoit plus les gestes, et un
   *    panneau posé là serait un panneau mort.
   */
  const panneau = (
    <>
      <button type="button" className="terr-rond monde-calques-bouton"
        aria-expanded={calquesOuverts} aria-controls="monde-calques"
        onClick={() => setCalquesOuverts((o) => !o)}>
        <span className="sr-only">Calques de la carte</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"
             fill="none" stroke="currentColor" strokeWidth="1.6"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 3 7.5 12 12l9-4.5L12 3z" />
          <path d="m3 12.5 9 4.5 9-4.5M3 17l9 4.5 9-4.5" />
        </svg>
      </button>
      {calquesOuverts && (
        <div className="monde-calques" id="monde-calques">
          {([["sites", "Les sites remarquables"],
             ["hebergements", "Les hébergements"]] as const).map(([clef, nom]) => (
            <label key={clef} className="terr-calque">
              <input type="checkbox" checked={calques[clef]}
                onChange={(e) => setCalques((c) => ({ ...c, [clef]: e.target.checked }))} />
              <span className="terr-calque-nom">{nom}</span>
            </label>
          ))}
          {/* ⭐ LE FILTRE NE PARAÎT QUE SI LE CALQUE EST ALLUMÉ — un contrôle
              qui ne change rien à l'écran se lit comme une panne. Et il
              attend d'avoir plus d'un genre : filtrer parmi un seul n'est pas
              un choix. */}
          {calques.sites && genres.length > 1 && (
            <div className="terr-genres" role="group" aria-label="Genres de sites">
              <button type="button"
                className={genresChoisis.size === 0 ? "ot-filtre ot-filtre-actif" : "ot-filtre"}
                aria-pressed={genresChoisis.size === 0}
                onClick={() => setGenresChoisis(new Set())}>
                Tous
              </button>
              {/* 🔴 `.terr-genre`, PAS UNE PASTILLE DE MA MAIN — corrigé le
                  15/11/2026 après l'avoir vue à l'écran. J'avais écrit
                  `<span className="ot-pastille">` avec la couleur en fond :
                  cette classe n'existe dans AUCUNE feuille, donc le `span`
                  restait en `display: inline`, sans boîte, et la couleur ne
                  peignait rien. Le composant existait à côté, mûri le 4/11
                  avec sa mesure de contraste sur les vingt-trois genres.
                  ⭐ Inventer une classe est plus silencieux qu'inventer une
                     balise : rien ne lève, le nom a l'air juste, et l'élément
                     est simplement invisible. */}
              {genres.map((g) => {
                const actif = genresChoisis.has(g);
                return (
                  <button key={g} type="button"
                    className={actif ? "terr-genre terr-genre-actif" : "terr-genre"}
                    style={{ "--pin": couleurCategorie(g) } as CSSProperties}
                    aria-pressed={actif}
                    onClick={() => basculerGenre(g)}>
                    <span className="terr-genre-pin" aria-hidden="true" />
                    {LIBELLES[g] ?? g}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );

  if (enFond) {
    return (
      /* ⚠️ `aria-hidden` SEULEMENT QUAND ELLE EST MORTE. Une carte figée est
         un décor, et un décor annoncé encombre un lecteur d'écran ; une carte
         qu'on manipule est un contenu, et la cacher la rendrait inatteignable
         à qui ne voit pas. Le même élément, deux rôles — donc deux
         déclarations. */
      <div className="monde-fond" data-vivante={vivante || undefined}
           aria-hidden={vivante ? undefined : true}>
        <div className="monde-plan" ref={boite} />
        {vivante && panneau}
        {vivante && fiche}
        {vivante && mot && <p className="monde-mot">{mot}</p>}
      </div>
    );
  }

  return (
    <main className="page page-monde">
      <div className="monde-scene">
        <div className="monde-plan" ref={boite} />
        {panneau}
        {mot && <p className="monde-mot">{mot}</p>}
        {fiche}
      </div>
    </main>
  );
}

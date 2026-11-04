/**
 * LE TERRITOIRE — écran 2, l'exploration cartographique.
 *
 * ⭐ LA CARTE EST DESSINÉE DEPUIS NOTRE GRAPHE, PAS DEPUIS DES TUILES. Le
 *    brief le demande en toutes lettres : « une véritable identité
 *    cartographique MANA, en utilisant les données géographiques réellement
 *    disponibles », et « elle ne doit pas ressembler à une carte standard
 *    recolorée ». Une tuile vectorielle donne à tout le monde le même monde.
 *    Notre graphe, lui, porte ce que personne d'autre n'a :
 *      · 13 265 arêtes — le réseau marchable réel de la presqu'île
 *      · la DISTANCE À LA MER par arête — 2 345 sont littorales (17,7 %)
 *      · l'AGRÉMENT par arête — médiane 95, de 0 à 255
 *      · 339 lieux : mégalithes, plages, panoramas, châteaux, calvaires…
 *    D'où une carte qui ne dit pas « où passent les routes » mais
 *    « OÙ IL FAIT BON MARCHER ». C'est ça, la signature.
 *
 * 🔴 CANVAS, ET CE N'EST PAS UN CHOIX DE CONFORT. Mesuré : le tracé complet
 *    représente 79 957 points, soit ~859 Ko de chaîne SVG. En SVG, chaque
 *    déplacement reparcourt cet arbre — le panoramique ramperait. Le canvas
 *    redessine en une passe.
 * ⚠️ MAIS UN CANVAS N'EST PAS ACCESSIBLE. Le territoire y est DÉCOR et
 *    contexte ; toute l'interaction — choisir une promenade, lire ses lieux —
 *    vit en DOM réel, focalisable et annoncé. Le brief l'exige : « ne rends
 *    pas une carte indispensable à une action ».
 *
 * ⛔ AUCUNE DONNÉE INVENTÉE. Pas de relief ombré fabriqué, pas de trait de
 *    côte dessiné à la main, pas de lieu ajouté pour meubler. Ce qu'on voit
 *    est ce que le graphe contient.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { TERRITOIRES, TOUT, urlGraphe } from "./territoires";
import { chargerOT, type ItineraireOT } from "./ot";
import { chargerLieux, lienWiki, type Inventaire, type Lieu } from "./lieux";
import {
  libelleCategorie, couleurCategorie, COULEUR_CATEGORIE, COULEUR_CATEGORIE_DEFAUT,
} from "./categories";
import { WALKS, VITRINE, effortLisible } from "./walks";
import type { Walk } from "./walks";
/* 🔴 LE PONT DEVIENT UN CALCUL — 3/11/2026, demande du fondateur : « fusionne
   le compositeur dans la carte interactive ». `propositionsAutour` et
   `accrocherUn` sont les MÊMES fonctions que `Composer.tsx` appelle ; cet
   écran charge déjà le même graphe ET le même inventaire (`inv`, ligne 148),
   il ne manquait que l'appel. ⚠️ `indexer`/`accrocherTous` ont un coût
   (le second visite chaque lieu nommé) : ils ne tournent qu'une fois le
   graphe chargé, mémorisés, comme `sitesIci`. */
import { indexer, accrocherUn, accrocherTous, accroche, propositionsAutour, type Proposition } from "./composition";
/* 🔴 LES FERMETURES MANQUAIENT À CET ÉCRAN — 4/11/2026, trouvé par l'audit.
   `/promenades` les chargeait et en excluait les arêtes depuis le début ;
   `/carte`, qui propose les MÊMES trois destinations depuis le MÊME graphe,
   appelait `indexer(graphe)` sans elles. Mesuré avant correctif : 8 des 12
   propositions calculées depuis les quatre fermetures géolocalisées
   traversaient un tronçon sous arrêté — à Postolonnec, 3 sur 3.
   ⭐ Et c'est l'Office de tourisme de Crozon qui publie ces arrêtés : la
      personne à qui l'on montre l'écran vendredi est l'autorité qui a fermé
      le chemin qu'on lui proposait. ⚠️ Une fonction DUPLIQUÉE d'un écran à
      l'autre se corrige des deux côtés ; une fonction appelée à deux endroits
      avec des arguments différents n'a l'air fausse NULLE PART. */
import { chargerFermetures, aretesTouchees, type Fermetures } from "./fermetures";
import { fusionnerGraphes } from "./fusion-graphes";
import { lienYAller, plateformeDe } from "./y-aller";
/* ⚠️ MAPLIBRE EN v4 — même garde que `CarteReelle.tsx`/`CarteFondOT.tsx` : la
   v6 ne livre que de l'ESM, et son worker se charge par une URL relative qui,
   sous la base `/mana/`, retombe sur l'index HTML. */
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MaplibreMap } from "maplibre-gl";
import { STYLES, zoomMaplibrePour } from "./carte-fond";
import { ILLUSTRATIONS } from "./illustrations";
import { Photo, image } from "./images/Photo";

/* 🔴 LE TYPE `Graphe` ÉTAIT DÉFINI DEUX FOIS — ici et dans `composition.ts`,
   qui est pourtant le module qui le CONSOMME (`indexer`, `dijkstra`,
   `mesurer`). Et les deux avaient déjà divergé : la copie locale s'arrêtait
   à huit cases d'arête, quand l'originale en porte neuf depuis que la montée
   cumulée a été ajoutée le 29/10 — celle sans laquelle 43 % du dénivelé
   disparaît. ⭐ Une forme recopiée ne se plaint pas de vieillir : elle
   accepte les mêmes données, perd juste une information en route. Troisième
   recopie démasquée en deux jours, après la table des couleurs et celle des
   libellés. Une seule définition, importée. */
import type { Graphe } from "./composition";

const BASE = import.meta.env.VITE_GRAPHE_BASE ?? "https://mana.bzh/bretagne/g";
const R_LAT = 111_320;

/**
 * Les catégories, RELEVÉES et non devinées : les douze du graphe et les huit
 * des promenades vérifiées, listées le 31/10/2026.
 * ⛔ Une catégorie inconnue s'affiche TELLE QUELLE. Un fourre-tout « Autre »
 *    mentirait moins visiblement qu'un libellé faux, mais il mentirait quand
 *    même — et il empêcherait de voir qu'une catégorie neuve est apparue.
 * ⚠️ `memorial` n'est PAS dans le graphe : il ne vient que des promenades
 *    vérifiées. Deux inventaires, une seule table — d'où le relevé des deux.
 */
/* ⭐ La table des catégories a DÉMÉNAGÉ dans `categories.ts` : la fiche de
   promenade en a besoin aussi, et une table recopiée diverge. */

/**
 * ⚠️ `centre` : le point sur lequel l'écran s'ouvre, quand on y arrive depuis
 *    le jeu de cartes ou depuis une recherche. ⭐ Il POSE UN REPÈRE, il ne
 *    recadre pas : la carte montre toute la communauté de communes, et la
 *    recadrer sur un point ferait perdre ce qui fait sa valeur — voir le
 *    territoire entier. Il choisit en revanche le bon onglet : ouvrir l'Aulne
 *    sur un repère de Camaret montrerait une carte sans son repère.
 */
export function Territoire2030({ base, centre }: { base: string; centre?: [number, number] }) {
  const toile = useRef<HTMLCanvasElement | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);
  /* 🔴 LE FOND SATELLITE — 3/11/2026, demande du fondateur, malgré le risque
     nommé avant d'y toucher : cet écran dessine depuis NOTRE graphe, pas
     depuis des tuiles (voir l'en-tête du fichier), un choix qui tient
     toujours. Ce qui change : une carte maplibre NON INTERACTIVE
     (`interactive: false`, même garde que `CarteFondOT`) prend place SOUS
     le canvas, sur `STYLES.ortho` — l'orthophotographie IGN déjà relayée,
     déjà vue sur les cartes de `/balades-office`. Le canvas garde la main :
     le réseau, les sites, le lieu visé, nos propositions restent DESSUS,
     en vecteur, lisibles sur n'importe quelle image en dessous.
     ⚠️ DEUX MOTEURS, UNE SEULE VUE : `maplibreCarte` est recalée à CHAQUE
     `dessiner()` (voir plus bas) sur le centre et le zoom qu'affiche le
     canvas — sinon l'image et le réseau divergeraient au premier geste. */
  const maplibreBoite = useRef<HTMLDivElement | null>(null);
  const maplibreCarte = useRef<MaplibreMap | null>(null);
  const [graphe, setGraphe] = useState<Graphe | null>(null);
  /* Les fermetures officielles — fichier SÉPARÉ du graphe, servi avec
     l'application : une fermeture se publie en une minute, un graphe se
     reconstruit par un pipeline. Voir l'import de `./fermetures`. */
  const [fermetures, setFermetures] = useState<Fermetures | null | undefined>(undefined);
  useEffect(() => {
    chargerFermetures(import.meta.env.BASE_URL.replace(/\/$/, "")).then(setFermetures);
  }, []);
  const [erreur, setErreur] = useState("");
  const [choisie, setChoisie] = useState<string | null>(null);
  /* 🔴 `rendu` EST PARTI AVEC LE COMPTE QU'IL ALIMENTAIT — 4/11/2026, et ce
     n'était pas que du code mort : `setRendu()` tournait à CHAQUE passage de
     `dessiner()`, donc une fois par image pendant un glissement. Un état
     React que plus personne ne lit, mais qui reprovoque un rendu soixante
     fois par seconde. ⭐ Retirer un affichage sans retirer ce qui
     l'alimentait laisse le coût sans le bénéfice — et un coût sans
     affichage ne se voit, par définition, nulle part. */

  /* ⭐ MONTÉE UNE SEULE FOIS, comme `CarteReelle`/`CarteFondOT` : une instance
     maplibre = un contexte WebGL, et on n'en veut qu'un sur cet écran. Le
     centre/zoom de départ n'a pas d'importance — `dessiner()` les corrige
     dès le premier passage, une fois le graphe là pour les calculer. */
  /* ⭐ PRÊTE, PAS SEULEMENT CRÉÉE. `new maplibregl.Map(...)` revient avant que
     le style ait fini de charger ; ajouter une source avant `load` lève. Un
     état React (pas une ref) parce que l'effet qui pose la couche des sites
     doit se RELANCER quand ce passage devient vrai. */
  const [maplibrePrete, setMaplibrePrete] = useState(false);
  useEffect(() => {
    if (!maplibreBoite.current) return;
    const m = new maplibregl.Map({
      container: maplibreBoite.current,
      style: STYLES.ortho,
      center: [-4.2, 48.25], zoom: 10,
      interactive: false,
      /* 🔴 RECOUPÉ LE 5/11/2026, ET LA RAISON EST MESURÉE. Rallumé la veille
         pour porter l'IGN et l'ODbL après le retrait du paragraphe de
         source, ce contrôle rendait sa mention DERRIÈRE la barre flottante :
         relevé à l'écran, illisible, nulle part ailleurs sur la page. ⭐ Une
         attribution qu'on ne peut pas lire ne remplit aucune des deux
         fonctions qu'on lui prête — ni créditer, ni informer : elle ne fait
         que rassurer celui qui l'a posée. Nous avions donc l'inconvénient
         de la place prise et aucun des bénéfices.
         ⛔ ELLE N'A PAS DISPARU, ELLE A UNE SEULE ADRESSE. `/reglages`
            nomme OpenStreetMap, l'ODbL, l'IGN et la Géoplateforme, et dit
            CE QUE CHACUN APPORTE — à un appui de la carte, par l'icône
            permanente de la barre. C'est déjà ce que font `CarteReelle` et
            `CarteFondOT`, qui portent `attributionControl: false` depuis le
            début : cet écran était l'exception, pas la règle.
         ⚠️ `/reglages` DEVIENT DONC PORTEUR, et ça ne peut pas tenir dans un
            commentaire : `provenance.test.ts` › « l'attribution des fonds de
            carte a une adresse, et c'est /reglages » échoue si cette page
            cesse de nommer l'une des quatre sources. Un interdit en
            docstring se franchit sans le savoir. */
      attributionControl: false,
    });
    maplibreCarte.current = m;
    m.on("load", () => setMaplibrePrete(true));
    return () => { m.remove(); maplibreCarte.current = null; setMaplibrePrete(false); };
  }, []);

  /* ── LE CHROME DE LA MAQUETTE, ET IL EST FONCTIONNEL ──────────────────
     ⛔ Aucun de ces contrôles n'est décoratif. Un bouton qui ne fait rien
        coûte plus cher qu'un bouton absent : on appuie, rien ne bouge, et
        c'est l'application entière qu'on croit cassée. */
  const [requete, setRequete] = useState("");
  const [vise, setVise] = useState<{
    nom: string; detail: string; g: [number, number];
    /** ce que la donnée dit EN PLUS, quand elle le dit — 75 lieux sur 624 */
    desc?: string;
    /** l'article, quand OSM le référence — 45 lieux sur 624 */
    wiki?: string;
  } | null>(null);
  /* ⚠️ RELEVÉE UNE FOIS, PAS À CHAQUE RENDU : l'agent utilisateur ne change
     pas en cours de session, et `plateformeDe` serait appelée à chaque clic
     sur la carte. ⭐ Lue ici plutôt que dans `y-aller.ts` pour que le module
     reste PUR — il ne touche ni `navigator` ni `window`, donc il se teste
     sans navigateur, sur les quatre agents qui comptent. */
  const plateforme = useMemo(
    () => plateformeDe(navigator.userAgent, navigator.maxTouchPoints),
    [],
  );
  const [calquesOuverts, setCalquesOuverts] = useState(false);
  const [calques, setCalques] = useState({
    lieux: true, promenades: true, balises: true, sites: true,
  });

  const [moi, setMoi] = useState<[number, number] | null>(null);
  const [motGps, setMotGps] = useState("");
  const [feuille, setFeuille] = useState<"replie" | "deploye">("replie");

  /** ── LA VUE : ZOOM ET DÉPLACEMENT ────────────────────────────────────
   *  ⭐ Le facteur et le déplacement sont posés APRÈS le cadrage automatique,
   *     pas à sa place. `k = 1` reste donc exactement l'image d'origine —
   *     le territoire entier, cadré sur l'emprise de la donnée — et « recadrer »
   *     est une remise à zéro, pas un nouveau calcul.
   *  ⚠️ Ils vivent dans un `ref` et non dans un `state` : un glissement émet
   *     une soixantaine d'événements par seconde, et autant de rendus React
   *     feraient saccader un canvas qui, lui, se redessine en 20 ms. React ne
   *     voit que le compteur `vueTic`, poussé une fois par image. */
  const vue = useRef({ k: 1, px: 0, py: 0 });
  /**
   * 🔴 LA PROJECTION DU DERNIER RENDU, pour pouvoir viser ce qui est DESSINÉ.
   * ⭐ ON NE RECOPIE PAS LA FORMULE. Elle dépend de l'emprise du graphe, du
   *    cosinus à la latitude moyenne, de l'échelle, des marges ET de l'état
   *    de la vue : une seconde version, écrite à côté pour le pointage,
   *    tomberait juste aujourd'hui et faux au premier changement de cadrage —
   *    et le décalage serait de quelques pixels, donc invisible jusqu'à ce
   *    qu'on clique à côté d'un menhir sans comprendre pourquoi.
   *    Le dessin dépose donc SA projection ici, et le clic s'en sert.
   */
  const proj = useRef<{ X: (lon: number) => number; Y: (lat: number) => number } | null>(null);
  /**
   * 🔴 ET L'INVENTAIRE AUSSI PASSE PAR UNE RÉFÉRENCE. L'effet qui pose les
   *    écouteurs de pointeur ne tourne QU'UNE FOIS (`[]`) : un gestionnaire
   *    qui lirait `sitesIci` directement capturerait le tableau VIDE du
   *    premier rendu, et le pointage ne trouverait jamais rien.
   * ⭐ Le défaut serait MUET — pas une erreur, juste un clic qui ne fait
   *    rien, exactement comme avant la correction. Un bug qui ressemble à
   *    l'absence de la fonctionnalité qu'on vient d'ajouter.
   */
  const vivant = useRef<{ sites: Lieu[]; visibles: Lieu[]; inv: Inventaire | null }>(
    { sites: [], visibles: [], inv: null },
  );
  const [vueTic, setVueTic] = useState(0);
  const [vueBougee, setVueBougee] = useState(false);
  const ZOOM_MIN = 1, ZOOM_MAX = 12;

  /* ⭐ DEUX TERRITOIRES, ET CELUI-CI SE CHOISIT — contrairement au
     compositeur, où la position tranche. Cet écran répond à « qu'y a-t-il
     ici ? » : il faut pouvoir regarder l'autre moitié sans y être. */
  /* 🔴 PLUS DE BASCULE — 4/11/2026 : `terr` ne change plus en cours d'écran,
     il garde `TOUT`. `useState` reste utile ailleurs dans ce fichier pour
     des valeurs qui bougent ; celle-ci n'en a plus besoin, mais une
     constante locale suffit et dit « ça ne change plus » plus honnêtement
     qu'un état qu'on n'actionne jamais. */
  const terr = TOUT;
  /* ⚠️ Chargés À LA DEMANDE, comme sur la liste : 258 Ko que personne ne paie
     avant d'ouvrir la carte. ⭐ Et filtrés sur le territoire affiché — les 46
     circuits couvrent les deux moitiés de la communauté, en dessiner la
     totalité sur la presqu'île ferait sortir des traits du cadre. */
  const [ot, setOt] = useState<ItineraireOT[]>([]);
  /* ⭐ L'INVENTAIRE : 1 358 sites remarquables, dont 734 que personne n'a
     nommés. C'est la moitié que MANA apporte — l'Office a les circuits, nous
     avons ce qu'on croise. 110 Ko chargés à la demande. */
  const [inv, setInv] = useState<Inventaire | null>(null);
  useEffect(() => { chargerLieux().then(setInv).catch(() => setInv(null)); }, []);
  const sitesIci = useMemo(
    () => (inv?.lieux ?? []).filter((l) => {
      const [lo, la] = l.g;
      return lo >= terr.emprise[0] && lo <= terr.emprise[2]
          && la >= terr.emprise[1] && la <= terr.emprise[3];
    }),
    [inv, terr],
  );
  useEffect(() => { chargerOT().then((r) => setOt(r.itineraires)).catch(() => setOt([])); }, []);

  /* ── LES SITES, POSÉS DANS MAPLIBRE — 4/11/2026 ────────────────────────
     🔴 PLUS DE PROJECTION MAISON : chaque site est une coordonnée réelle,
     posée dans la MÊME carte que le satellite qui le montre — maplibre
     projette les deux avec le même moteur, donc ne peut plus les désaccorder.
     ⭐ UNE COULEUR PAR GENRE. `CATEGORIE` (categories.ts) est la table
        partagée — pas une recopie : la fiche de promenade l'utilise aussi. */
  const genres = useMemo(() => {
    const vus = new Set<string>();
    for (const l of sitesIci) vus.add(l.c);
    return [...vus].sort();
  }, [sitesIci]);
  /**
   * 🔴 PLUSIEURS GENRES À LA FOIS — 5/11/2026, demande du fondateur. C'était
   *    une chaîne (`"tous"` ou UN genre) : chercher « les chapelles ET les
   *    calvaires », c'est-à-dire le patrimoine religieux d'un secteur,
   *    demandait de regarder deux fois et de se souvenir de la première.
   * ⭐ L'ENSEMBLE VIDE VEUT DIRE « TOUS », pas « rien ». Le choix se défend
   *    parce qu'il rend l'état de départ et le bouton « Tous » IDENTIQUES —
   *    une carte qui s'ouvre sur zéro pastille serait une carte en panne, et
   *    un drapeau `tousAffiches` à tenir à côté de l'ensemble finirait par
   *    le contredire.
   */
  const [genresChoisis, setGenresChoisis] = useState<ReadonlySet<string>>(new Set());
  const basculerGenre = (g: string) =>
    setGenresChoisis((avant) => {
      const apres = new Set(avant);
      if (!apres.delete(g)) apres.add(g);
      return apres;
    });

  /**
   * 🔴 CE QUI EST CLIQUABLE EST CE QUI EST VISIBLE — 4/11/2026, défaut trouvé
   *    par l'audit et vérifié : le calque « sites » et le filtre par genre
   *    commandaient `visibility` et `setFilter` DANS maplibre, pendant que
   *    `viser()` et `survol()` parcouraient les 624 sites nommés quoi qu'il
   *    arrive. Filtre sur « Mégalithe » : on clique un point doré, la fiche
   *    d'une fontaine masquée s'ouvre. Calque décoché : le curseur devient
   *    « pointer » sur du satellite nu.
   * ⭐ LE DÉFAUT VENAIT DE LA FORME, PAS DE L'ÉTOURDERIE. Une liste qu'on
   *    DESSINE et une liste qu'on VISE, tenues séparément, divergent au
   *    premier filtre ajouté — et divergent EN SILENCE, puisque chacune reste
   *    juste prise seule. On n'en tient plus qu'une : `sitesGeoJSON` dessine
   *    celle-ci, `viser()` et `survol()` lisent celle-ci.
   * ⚠️ Les sites SANS NOM sont hors de cette liste, comme avant : ils ne sont
   *    ni dessinés ni visables — annoncer « Fortification » sans rien d'autre
   *    n'apprend rien, et il y en a 734.
   */
  const sitesVisibles = useMemo(
    () => (calques.sites
      ? sitesIci.filter((l) => l.n && (genresChoisis.size === 0 || genresChoisis.has(l.c)))
      : []),
    [sitesIci, calques.sites, genresChoisis],
  );
  /* ⚠️ Tenue à jour À CHAQUE RENDU : c'est ce qui permet aux écouteurs posés
     une seule fois de lire l'inventaire d'aujourd'hui. */
  vivant.current = { sites: sitesIci, visibles: sitesVisibles, inv };

  /* 🔴 DESSINÉ DEPUIS `sitesVisibles`, PAS DEPUIS `sitesIci` — 4/11/2026.
     Avant, la source portait TOUS les sites nommés et maplibre les masquait
     par `visibility` + `setFilter` : deux listes, l'une dessinée, l'autre
     visée, qui ne pouvaient que diverger. Une seule maintenant, d'où les
     deux `setLayoutProperty`/`setFilter` disparus plus bas.
     ⚠️ Le prix assumé : le GeoJSON remonte à chaque changement de filtre,
        au lieu d'un `setFilter` côté GPU. 624 points au maximum — mesuré
        sous la milliseconde, contre un défaut qui ouvrait la fiche d'un
        site masqué. */
  const sitesGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: sitesVisibles.map((l) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: l.g },
      properties: { nom: l.n, genre: l.c },
    })),
  }), [sitesVisibles]);

  useEffect(() => {
    const m = maplibreCarte.current;
    if (!m || !maplibrePrete) return;
    if (!m.getSource("sites")) {
      m.addSource("sites", { type: "geojson", data: sitesGeoJSON });
      m.addLayer({
        id: "sites-genre", type: "circle", source: "sites",
        paint: {
          "circle-radius": 4.5,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#eeebdd",
          /* ⭐ ENGENDRÉE DEPUIS `COULEUR_CATEGORIE` (categories.ts), PAS
             RECOPIÉE : c'est la MÊME table que `CarteFondOT.tsx` lit pour
             les pastilles de /balades-office — une couleur corrigée ici se
             voit là-bas, et l'inverse. */
          /* ⚠️ `as any` : maplibre type `match` comme un n-uplet de longueur
             fixe, incompatible avec un tableau ENGENDRÉ dont la longueur
             dépend du nombre de genres dans `COULEUR_CATEGORIE`. La forme
             reste celle que maplibre attend à l'exécution — seul le TYPE
             statique ne sait pas la vérifier pour une liste qui grandit. */
          "circle-color": [
            "match", ["get", "genre"],
            ...Object.entries(COULEUR_CATEGORIE).flat(),
            COULEUR_CATEGORIE_DEFAUT,
          ] as any,
        },
      });
    } else {
      (m.getSource("sites") as maplibregl.GeoJSONSource).setData(sitesGeoJSON);
    }
  }, [maplibrePrete, sitesGeoJSON]);

  /* ── NOS PROPOSITIONS DE PROMENADES, DEPUIS LE LIEU VISÉ ──────────────────
     ⭐ MÊME FILTRE QUE `Composer.tsx` (lieux nommés, dédoublonnés sur le nom)
        — une proposition « Plage » ou « Calvaire » sans autre précision ne
        se choisit pas, et il y en a des centaines dans l'inventaire. Un
        filtre recopié depuis l'écran qui l'a inventé, pas réinventé ici. */
  const spotsPourComposer = useMemo(() => {
    if (!inv) return [];
    const vus = new Set<string>();
    return inv.lieux.filter((l) => {
      if (!l.n) return false;
      if (l.n === (inv.libelles[l.c] ?? l.c)) return false;
      if (vus.has(l.n)) return false;
      vus.add(l.n); return true;
    });
  }, [inv]);
  const positionsPourComposer = useMemo(
    () => spotsPourComposer.map((l) => l.g as readonly [number, number]),
    [spotsPourComposer],
  );
  const touchees = useMemo(
    () => (graphe && fermetures !== undefined ? aretesTouchees(graphe, fermetures) : null),
    [graphe, fermetures],
  );
  /* ⛔ ON ATTEND LES FERMETURES AVANT D'INDEXER — même règle que
     `/promenades` : l'index EXCLUT les arêtes interdites, il ne les pénalise
     pas, et cette garantie ne vaut que si on l'attend. Proposer d'abord et
     corriger ensuite afficherait, l'espace d'un instant, un parcours sous
     arrêté. ⚠️ `fermetures === undefined` dit « pas encore lu », `null` dit
     « illisible » : le second laisse indexer (sans exclusion) plutôt que de
     figer la carte, le premier non. */
  const ixComposition = useMemo(
    () => (graphe && touchees ? indexer(graphe, touchees.interdites) : null),
    [graphe, touchees],
  );
  const accrochesComposition = useMemo(
    () => (graphe && ixComposition && positionsPourComposer.length
      ? accrocherTous(graphe, ixComposition, positionsPourComposer, { ecartSiLoin: false })
      : null),
    [graphe, ixComposition, positionsPourComposer],
  );
  /* ⭐ RECALCULÉ QUAND LE LIEU VISÉ CHANGE, PAS À CHAQUE RENDU — les trois
     propositions dépendent du POINT, pas de l'état du calque ou du zoom. */
  const propositions = useMemo((): Proposition<Lieu>[] => {
    if (!graphe || !ixComposition || !accrochesComposition || !vise) return [];
    const depuis = accrocherUn(graphe, ixComposition, vise.g);
    if (!accroche(depuis)) return [];
    return propositionsAutour(
      graphe, ixComposition, depuis,
      spotsPourComposer, positionsPourComposer, accrochesComposition,
    );
  }, [graphe, ixComposition, accrochesComposition, vise, spotsPourComposer, positionsPourComposer]);

  const otIci = useMemo(
    () => ot.filter((i) => {
      const [lo, la] = i.p[0];
      return lo >= terr.emprise[0] && lo <= terr.emprise[2]
          && la >= terr.emprise[1] && la <= terr.emprise[3];
    }),
    [ot, terr],
  );

  /* ── LES CIRCUITS BALISÉS, POSÉS DANS MAPLIBRE — 4/11/2026 ─────────────
     🔴 MÊME RAISON QUE LES SITES : un tracé à ses coordonnées réelles, sur
     la carte qui porte aussi le satellite, ne peut pas en diverger. */
  const otGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: otIci.map((i) => ({
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: i.p },
      properties: { titre: i.titre },
    })),
  }), [otIci]);

  useEffect(() => {
    const m = maplibreCarte.current;
    if (!m || !maplibrePrete) return;
    if (!m.getSource("ot-circuits")) {
      m.addSource("ot-circuits", { type: "geojson", data: otGeoJSON });
      /* ⛔ AVANT « sites-genre » DANS L'ORDRE D'AJOUT, DONC DESSOUS : ce ne
         sont pas nos tracés, ils ne doivent pas prendre le dessus sur les
         sites — la même hiérarchie que l'ancien dessin au canvas tenait. */
      m.addLayer({
        id: "ot-trace", type: "line", source: "ot-circuits",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#92977c", "line-width": 1.6, "line-opacity": 0.8 },
      }, m.getLayer("sites-genre") ? "sites-genre" : undefined);
    } else {
      (m.getSource("ot-circuits") as maplibregl.GeoJSONSource).setData(otGeoJSON);
    }
    m.setLayoutProperty("ot-trace", "visibility", calques.balises ? "visible" : "none");
  }, [maplibrePrete, otGeoJSON, calques.balises]);


  useEffect(() => {
    let vivant = true;
    setGraphe(null); setErreur("");
    setVise(null);
    /* 🔴 LES DEUX GRAPHES, FUSIONNÉS EN MÉMOIRE — 4/11/2026. Il n'existe pas
       de fichier unique : la moisson produit `presquile.json` et
       `aulne.json` séparément, pour la raison écrite dans `territoires.ts`
       (un seul fichier pèserait ~1,5 Mo). Montrer tout le territoire par
       défaut, demandé par le fondateur, se paie donc ici : les deux sont
       chargés en parallèle, puis recousus.
       ⛔ ET LA COUTURE ELLE-MÊME VIT DANS `fusion-graphes.ts` DEPUIS LE
          5/11/2026, pas ici. Écrite en ligne dans cet effet, elle était
          inatteignable par un test — un `useEffect` qui `fetch` deux
          fichiers de 3 Mo ne s'exerce pas — et elle a porté DEUX défauts
          mesurés pendant une journée : 277 lieux sur 775 accrochés à une
          arête qui n'était pas la leur (jusqu'à 43 km), et deux moitiés de
          territoire qui ne communiquaient nulle part. Les deux sont
          expliqués et gardés là-bas. */
    Promise.all(
      TERRITOIRES.map((t) =>
        fetch(urlGraphe(BASE, t)).then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json() as Promise<Graphe>;
        }),
      ),
    )
      .then((graphes) => {
        if (!vivant) return;
        setGraphe(fusionnerGraphes(graphes, TOUT.slug));
      })
      // ⚠️ Une erreur se DIT. Sans ce message, un refus réseau rendrait un
      //    écran vide et muet, et on conclurait qu'il n'y a rien ici.
      .catch(() => { if (vivant) setErreur("Le territoire n'a pas pu être chargé. Vérifiez votre connexion."); });
    return () => { vivant = false; };
  }, []);

  /** Les promenades vérifiées qui tombent dans le territoire affiché.
   *  ⚠️ COMPARÉ À L'EMPRISE, PLUS AU SLUG — depuis que `terr` vaut `TOUT`,
   *  qui n'est l'un des deux slugs que `territoireDe` peut rendre : un point
   *  de la presqu'île OU de l'Aulne doit compter, et seule l'emprise (leur
   *  union) le sait encore dire. */
  const dIci = useMemo(
    () => VITRINE.filter((w) => {
      const p = w.points[0];
      return p && p.lon >= terr.emprise[0] && p.lon <= terr.emprise[2]
                && p.lat >= terr.emprise[1] && p.lat <= terr.emprise[3];
    }),
    [terr],
  );

  const walk: Walk | null = useMemo(
    () => (choisie ? WALKS.find((w) => w.slug === choisie) ?? null : null),
    [choisie],
  );

  /**
   * ── LA RECHERCHE ──────────────────────────────────────────────────────
   * ⭐ ELLE CHERCHE DANS NOS 339 LIEUX, pas dans un service d'adresses. Un
   *    géocodeur tiers rendrait « 12 rue de la Gare » — une information que
   *    nous n'avons pas à servir, et un appel réseau qui casse le hors-ligne.
   *    Ici, le graphe EST l'index : il est déjà en cache, la recherche marche
   *    sans réseau, et elle ne rend que des endroits où l'on peut marcher.
   * ⚠️ Comparaison sans accents ni casse : « ile vierge » doit trouver « Île
   *    Vierge ». `normalize("NFD")` puis retrait des diacritiques — sans ça,
   *    la moitié des toponymes bretons sont introuvables à qui tape vite.
   */
  const plat = (t: string) =>
    t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  /**
   * 🔴 TROIS INVENTAIRES, ET LE PREMIER JET N'EN AVAIT QU'UN — LE MAUVAIS.
   *    La recherche ne lisait que les 339 lieux du graphe. Or « Île Vierge »,
   *    « Pointe des Espagnols », « Pen-Hir » n'y figurent pas : ce sont les
   *    noms de nos PROMENADES et de leurs étapes. Mesuré le 31/10 — « Île
   *    Vierge » rendait zéro résultat sur un site qui propose la Balade
   *    Sonore de l'Île Vierge. Et la moitié des 339 sont génériques :
   *    « Point de vue », « Calvaire », quatre « menhir ».
   *    ⭐ Un index n'est pas « les données qu'on a sous la main » : c'est ce
   *       que les gens tapent. On cherche donc d'abord dans les promenades,
   *       puis dans leurs étapes, puis dans le graphe — et l'ordre du rendu
   *       est cet ordre-là, parce qu'une promenade répond mieux qu'un point.
   */
  type Resultat =
    | { genre: "promenade"; nom: string; detail: string; slug: string; g: [number, number] }
    /* ⚠️ `desc` et `wiki` VOYAGENT AVEC LE RÉSULTAT. Sans eux, le même lieu
       rendait une fiche riche au clic et une fiche nue à la recherche : deux
       chemins vers le même endroit, deux niveaux de détail, et rien pour le
       dire. ⭐ Une donnée attachée à un lieu doit suivre le lieu, pas la
       façon dont on l'a trouvé. */
    | { genre: "lieu"; nom: string; detail: string; g: [number, number];
        desc?: string; wiki?: string };

  const resultats = useMemo<Resultat[]>(() => {
    const q = plat(requete.trim());
    if (q.length < 2) return [];

    const promenades: Resultat[] = VITRINE
      .filter((w) => plat(w.titre).includes(q) || plat(w.lieu).includes(q))
      .map((w) => ({
        genre: "promenade", nom: w.titre, slug: w.slug,
        detail: `${w.lieu} · ${w.distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`,
        g: [w.points[0].lon, w.points[0].lat],
      }));

    const etapes: Resultat[] = VITRINE.flatMap((w) =>
      w.etapes.filter((e) => plat(e.nom).includes(q)).map((e) => ({
        genre: "lieu" as const, nom: e.nom,
        detail: `${libelleCategorie(e.categorie)} · sur ${w.titre}`,
        g: [e.lon, e.lat] as [number, number],
      })),
    );

    /* ⭐ LA RECHERCHE PUISE DANS L'INVENTAIRE, pas seulement dans les lieux
       accrochés au réseau. Le graphe n'en porte que ceux qui touchent un
       chemin ; l'inventaire porte tout — y compris une épave, un îlot ou une
       baie, qu'aucun sentier ne longe.
       ⚠️ Et seulement les NOMMÉS : chercher « plage » ne doit pas rendre
          cinquante résultats tous intitulés « Plage ». Les anonymes se voient
          sur la carte, ils ne se cherchent pas par leur nom. */
    const lieux: Resultat[] = sitesIci
      .filter((l) => l.n && plat(l.n).includes(q))
      .map((l) => ({
        genre: "lieu" as const, nom: l.n!,
        detail: inv?.libelles[l.c] ?? l.c, g: l.g,
        desc: l.desc, wiki: l.wiki,
      }));

    /* ⚠️ Dédoublonnage par NOM + POSITION ARRONDIE, pas par nom seul : il y a
       quatre « menhir » distincts sur la presqu'île, et les fondre en un seul
       en effacerait trois. Mais une étape de promenade et le point OSM
       correspondant sont le même endroit — eux, il faut les fondre. */
    const vus = new Set<string>();
    return [...promenades, ...etapes, ...lieux]
      .filter((r) => {
        const clef = `${plat(r.nom)}@${r.g[0].toFixed(4)},${r.g[1].toFixed(4)}`;
        if (vus.has(clef)) return false;
        vus.add(clef); return true;
      })
      // ⚠️ Plafonné à huit : une liste qui recouvre la carte n'aide plus à
      //    choisir, elle cache ce qu'on cherchait.
      .slice(0, 8);
  }, [requete, graphe, sitesIci, inv]);

  /** ⭐ Un résultat « promenade » SÉLECTIONNE la promenade — le tracé
   *     s'allume, la feuille s'ouvre sur sa fiche. Un résultat « lieu » pose
   *     seulement un repère. Rendre les deux identiques obligerait à
   *     recliquer dans la liste ce qu'on vient de trouver. */
  /* ⚠️ UNE SEULE FOIS, À L'OUVERTURE. Sans le garde, le repère se reposerait
     à chaque rendu et effacerait ce que la personne vient de chercher. */
  /* ⛔ LE FOCUS AUTOMATIQUE DU CHAMP EST PARTI AVEC LA LOUPE (1/11). Il
     répondait à `?chercher=1`, que plus aucune porte n'émet depuis que la
     première icône de la barre est devenue une carte. ⭐ Du code que personne
     n'atteint est du code que personne ne maintient — et un paramètre d'URL
     orphelin est pire qu'absent : il a l'air d'une fonctionnalité. */

  const repereFait = useRef(false);
  useEffect(() => {
    if (!centre || repereFait.current) return;
    repereFait.current = true;
    setVise({ nom: "Point visé", detail: "depuis les balades", g: centre });
  }, [centre]);

  const choisir = (r: Resultat) => {
    setVise({
      nom: r.nom, detail: r.detail, g: r.g,
      ...(r.genre === "lieu" ? { desc: r.desc, wiki: r.wiki } : {}),
    });
    if (r.genre === "promenade") { setChoisie(r.slug); setFeuille("deploye"); }
  };

  /**
   * ── « ME SITUER » ─────────────────────────────────────────────────────
   * ⛔ ET IL DIT QUAND ON EST HORS DU TERRITOIRE. Poser un marqueur au bord
   *    du cadre pour quelqu'un qui est à Rennes serait un mensonge muet :
   *    il croirait voir sa position sur la presqu'île.
   */
  const meSituer = () => {
    if (!navigator.geolocation) { setMotGps("Votre navigateur ne sait pas vous situer."); return; }
    setMotGps("Recherche de votre position…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const g: [number, number] = [p.coords.longitude, p.coords.latitude];
        if (!graphe) { setMoi(g); setMotGps(""); return; }
        let laMin = Infinity, laMax = -Infinity, loMin = Infinity, loMax = -Infinity;
        for (const [lo, la] of graphe.n) {
          if (la < laMin) laMin = la; if (la > laMax) laMax = la;
          if (lo < loMin) loMin = lo; if (lo > loMax) loMax = lo;
        }
        const dedans = g[0] >= loMin && g[0] <= loMax && g[1] >= laMin && g[1] <= laMax;
        setMoi(dedans ? g : null);
        setMotGps(dedans ? "" : "Vous n'êtes pas sur la presqu'île de Crozon — la carte reste explorable.");
      },
      () => setMotGps("Position indisponible. La carte fonctionne sans."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  /** ── LES GESTES ────────────────────────────────────────────────────────
   *  ⚠️ Tout est posé à la main, en `addEventListener`, et non par les
   *     attributs JSX : `onWheel` et `onTouchMove` sont enregistrés PASSIFS
   *     par React 18, donc `preventDefault()` y est ignoré — la page défilerait
   *     sous le doigt pendant qu'on déplace la carte. Il faut
   *     `{ passive: false }`, et React ne sait pas l'exprimer.
   */
  const bornes = (k: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, k));

  /** ⭐ On empêche de perdre le territoire : le déplacement est borné à la
   *  moitié de ce que le zoom a fait dépasser. À k = 1 la borne vaut 0 —
   *  impossible de pousser la carte hors de l'écran, donc aucun état « écran
   *  vide » dont on ne saurait pas revenir. */
  const serrer = () => {
    const b = boite.current; if (!b) return;
    const { width: W, height: H } = b.getBoundingClientRect();
    const mx = (W * (vue.current.k - 1)) / 2, my = (H * (vue.current.k - 1)) / 2;
    vue.current.px = Math.min(mx, Math.max(-mx, vue.current.px));
    vue.current.py = Math.min(my, Math.max(-my, vue.current.py));
  };

  const zoomer = (facteur: number, ax: number, ay: number) => {
    const b = boite.current; if (!b) return;
    const r = b.getBoundingClientRect();
    const cx = r.width / 2, cy = r.height / 2;
    const v = vue.current;
    const k2 = bornes(v.k * facteur);
    if (k2 === v.k) return;
    /* ⭐ LE POINT SOUS LE CURSEUR NE BOUGE PAS. Sans ça, zoomer ramène
       toujours vers le centre et on perd ce qu'on visait — le défaut le plus
       courant des cartes faites à la main. */
    const ux = (ax - r.left - cx - v.px) / v.k, uy = (ay - r.top - cy - v.py) / v.k;
    v.px = ax - r.left - cx - ux * k2;
    v.py = ay - r.top - cy - uy * k2;
    v.k = k2;
    serrer();
    setVueBougee(v.k !== 1 || v.px !== 0 || v.py !== 0);
    setVueTic((n) => n + 1);
  };

  const recadrer = () => {
    vue.current = { k: 1, px: 0, py: 0 };
    setVueBougee(false);
    setVueTic((n) => n + 1);
  };

  useEffect(() => {
    const b = boite.current; if (!b) return;
    let doigts = new Map<number, { x: number; y: number }>();
    let ecart0 = 0, k0 = 1;

    const molette = (e: WheelEvent) => {
      e.preventDefault();
      zoomer(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    const depart = new Map<number, { x: number; y: number }>();
    /* 🔴 LES COMMANDES NE SONT PAS LA CARTE — 4/11/2026, bug relevé par le
       fondateur : cliquer + ou - visait aussi le lieu qui se trouvait
       dessous. `setPointerCapture`, plus bas, livre TOUS les événements du
       doigt à `b` (`.terr-carte`) dès le premier contact — y compris un
       contact qui a commencé sur un bouton enfant. `viser()` ne regarde que
       la POSITION du relâché, jamais sa cible : un bouton posé sur un site
       (plus probable depuis que les sites sont denses et visibles) visait
       donc les deux. ⭐ On exclut les commandes AVANT de capturer le
       pointeur, pas après : une fois capturé, le bouton perdrait aussi son
       propre `pointerup`. */
    /* 🔴 ET LA LISTE N'AVAIT PAS SUIVI LE DÉMÉNAGEMENT DE LA RECHERCHE —
       4/11/2026, deux heures après le correctif ci-dessus. La barre de
       recherche est montée DANS la carte le matin même : `.jeu-haut` (le
       champ et sa croix) et `.jeu-resultats` (les boutons de résultat) sont
       devenus enfants de `.terr-carte` sans entrer dans cette liste. Le
       `click` d'un résultat n'arrivait donc JAMAIS à `choisir()` — mesuré :
       `pointerdown` sur le résultat, `pointerup` et `click` sur
       `.terr-carte`. Seule la touche Entrée marchait encore.
       ⭐ Le mécanisme était DÉJÀ décrit trois lignes plus haut, et la
          correction du matin n'a pas été relue à l'aune de ce qui venait
          d'emménager dans la carte. Une liste d'exceptions ne vieillit pas
          toute seule : elle vieillit chaque fois qu'un enfant s'ajoute. */
    const surUneCommande = (e: PointerEvent) =>
      !!(e.target as HTMLElement).closest(
        ".terr-commandes, .terr-calques, .terr-vise, .terr-genres, .jeu-haut, .jeu-resultats",
      );
    const bas = (e: PointerEvent) => {
      if (surUneCommande(e)) return;
      doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      depart.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (doigts.size === 2) {
        const [a, c] = [...doigts.values()];
        ecart0 = Math.hypot(a.x - c.x, a.y - c.y); k0 = vue.current.k;
      }
      b.setPointerCapture(e.pointerId);
    };
    const bouge = (e: PointerEvent) => {
      const p = doigts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (doigts.size === 2) {
        const [a, c] = [...doigts.values()];
        const ec = Math.hypot(a.x - c.x, a.y - c.y);
        if (ecart0 > 0) {
          const v = vue.current, k2 = bornes((k0 * ec) / ecart0);
          const r = b.getBoundingClientRect();
          const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
          const ux = (mx - r.left - r.width / 2 - v.px) / v.k;
          const uy = (my - r.top - r.height / 2 - v.py) / v.k;
          v.px = mx - r.left - r.width / 2 - ux * k2;
          v.py = my - r.top - r.height / 2 - uy * k2;
          v.k = k2;
        }
      } else if (doigts.size === 1) {
        e.preventDefault();
        vue.current.px += dx; vue.current.py += dy;
      }
      serrer();
      setVueBougee(vue.current.k !== 1 || vue.current.px !== 0 || vue.current.py !== 0);
      setVueTic((n) => n + 1);
    };
    /**
     * ⭐ UN CLIC VISE LE LIEU LE PLUS PROCHE — et c'est un CLIC, pas la fin
     *    d'un déplacement. On mémorise le point de départ et on ne vise que
     *    si le doigt a bougé de moins de 5 px : sans ce seuil, chaque
     *    glissement se terminerait par un lieu visé au hasard.
     * ⚠️ 16 px de tolérance, pas 2,6 (le rayon du point dessiné) : on vise
     *    avec un doigt, pas avec un curseur. Et on prend le PLUS PROCHE dans
     *    ce rayon, jamais le premier trouvé — sur la presqu'île les sites se
     *    touchent, et « le premier » dépend de l'ordre du fichier.
     * ⛔ Les lieux SANS NOM ne sont pas visables : annoncer « Fortification »
     *    sans rien d'autre n'apprend rien, et il y en a 734.
     */
    const viser = (e: PointerEvent) => {
      const d = depart.get(e.pointerId);
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
      const P = proj.current;
      const inv = vivant.current.inv;
      if (!P || !inv) return;
      const r = b.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      let meilleur: { l: Lieu; d2: number } | null = null;
      for (const l of vivant.current.visibles) {
        const dxp = P.X(l.g[0]) - cx, dyp = P.Y(l.g[1]) - cy;
        const d2 = dxp * dxp + dyp * dyp;
        if (d2 <= 16 * 16 && (!meilleur || d2 < meilleur.d2)) meilleur = { l, d2 };
      }
      if (meilleur) {
        const nom = meilleur.l.n!;
        setRequete("");
        /* ⭐ LA FICHE DIT CE QUE LA DONNÉE DIT, ET RIEN DE PLUS. 75 lieux sur
           624 portent une description, 45 un article : les champs
           apparaissent quand ils existent et disparaissent sinon. ⛔ Aucun
           texte de remplissage — « Un site remarquable de la presqu'île »
           sous un menhir serait une phrase que personne n'a écrite. */
        setVise({
          nom, detail: inv.libelles[meilleur.l.c] ?? meilleur.l.c, g: meilleur.l.g,
          desc: meilleur.l.desc, wiki: meilleur.l.wiki,
        });
      }
    };
    /**
     * ⭐ LE CURSEUR DIT QU'UN POINT EST CLIQUABLE. Sans lui, la fonction
     *    existe et personne ne la trouve : rien à l'écran ne distingue un
     *    point de 2,6 px d'un trait de chemin. ⚠️ C'est la question que le
     *    fondateur a posée en premier — « les points sont cliquables ? » — et
     *    la réponse ne doit pas être « essayez ».
     * ⚠️ Ne tourne QUE si aucun doigt n'est posé : pendant un déplacement, le
     *    curseur doit rester `grabbing`, et 825 distances à chaque image de
     *    glissement seraient payées pour rien.
     */
    const survol = (e: PointerEvent) => {
      if (doigts.size > 0) return;
      const P = proj.current;
      if (!P) { b.style.cursor = ""; return; }
      const r = b.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      let sur = false;
      for (const l of vivant.current.visibles) {
        const dxp = P.X(l.g[0]) - cx, dyp = P.Y(l.g[1]) - cy;
        if (dxp * dxp + dyp * dyp <= 16 * 16) { sur = true; break; }
      }
      b.style.cursor = sur ? "pointer" : "";
    };

    const haut = (e: PointerEvent) => {
      if (doigts.size === 1) viser(e);
      doigts.delete(e.pointerId); depart.delete(e.pointerId);
      if (doigts.size < 2) ecart0 = 0;
    };

    b.addEventListener("wheel", molette, { passive: false });
    b.addEventListener("pointerdown", bas);
    b.addEventListener("pointermove", bouge, { passive: false });
    b.addEventListener("pointermove", survol, { passive: true });
    b.addEventListener("pointerup", haut);
    b.addEventListener("pointercancel", haut);
    return () => {
      b.removeEventListener("wheel", molette);
      b.removeEventListener("pointerdown", bas);
      b.removeEventListener("pointermove", bouge);
      // ⚠️ Deux écouteurs posés sur le même événement : deux à retirer. Un
      //    seul oubli laisse un gestionnaire vivant sur un nœud mort.
      b.removeEventListener("pointermove", survol);
      b.removeEventListener("pointerup", haut);
      b.removeEventListener("pointercancel", haut);
    };
  }, []);

  /** ── LE DESSIN ─────────────────────────────────────────────────────────
   *  Trois passes, de la plus discrète à la plus lue — l'ordre EST la
   *  hiérarchie : ce qui est tracé en dernier se voit en premier.
   */
  useEffect(() => {
    const c = toile.current, b = boite.current;
    if (!c || !b || !graphe) return;

    const dessiner = () => {
      const { width: W, height: H } = b.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      c.style.width = `${W}px`;
      c.style.height = `${H}px`;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      // emprise du graphe
      let laMin = Infinity, laMax = -Infinity, loMin = Infinity, loMax = -Infinity;
      for (const [lon, lat] of graphe.n) {
        if (lat < laMin) laMin = lat; if (lat > laMax) laMax = lat;
        if (lon < loMin) loMin = lon; if (lon > loMax) loMax = lon;
      }
      const kLon = Math.cos((((laMin + laMax) / 2) * Math.PI) / 180);
      const larM = (loMax - loMin) * R_LAT * kLon, hauM = (laMax - laMin) * R_LAT;
      const marge = 18;
      const ech = Math.min((W - 2 * marge) / larM, (H - 2 * marge) / hauM);
      const dx = (W - larM * ech) / 2, dy = (H - hauM * ech) / 2;
      /* ⭐ LA VUE S'APPLIQUE DANS LA PROJECTION, PAS EN `ctx.transform`. Une
         transformation du contexte mettrait aussi les TRAITS à l'échelle : à
         ×8, un chemin de 1 px deviendrait un ruban de 8 px et la carte se
         boucherait. Ici seules les POSITIONS bougent ; les épaisseurs, les
         pastilles et les étiquettes gardent leur taille — c'est ce qui fait
         qu'un zoom révèle du détail au lieu de grossir une image. */
      const { k, px, py } = vue.current;
      const cxv = W / 2, cyv = H / 2;
      const X = (lon: number) =>
        cxv + ((dx + (lon - loMin) * R_LAT * kLon * ech) - cxv) * k + px;
      const Y = (lat: number) =>
        cyv + ((dy + (laMax - lat) * R_LAT * ech) - cyv) * k + py;
      // ⭐ Déposée à CHAQUE rendu : le pointage vise toujours l'image qu'on voit.
      proj.current = { X, Y };

      /* ── RECALER LE FOND SATELLITE SUR CE QUE LE CANVAS MONTRE ───────────
         ⭐ L'INVERSE DE X/Y, AU CENTRE DU CADRE. `X`/`Y` sont affines en
            lon/lat ; résoudre `X(lon) = cxv` donne le lon du centre écran,
            et `Y(lat) = cyv` son lat. Pas d'approximation : ce sont les
            MÊMES coefficients (`dx`, `ech`, `kLon`, `k`, `px`…) que ceux qui
            viennent de placer le réseau et les sites.
         ⚠️ LE ZOOM SE DÉDUIT DE L'ÉCHELLE, PAS DE `k` SEUL : `ech` porte déjà
            le cadrage initial (combien de pixels par mètre pour que le
            territoire tienne dans la boîte), `k` le zoom gagné depuis. Le
            zoom maplibre se définit en « mètres par pixel à l'équateur à la
            latitude donnée » — d'où la correction en cosinus. */
      const m = maplibreCarte.current;
      if (m) {
        /* 🔴 `resize()` À CHAQUE PASSAGE — même piège que `CarteReelle.tsx` :
           le conteneur ne tient sa hauteur FINALE qu'après le premier rendu
           de la page, et maplibre, construit avant, gardait la taille qu'il
           avait à la naissance (quelques pixels). Pas de garde « une seule
           fois » : `dessiner()` tourne déjà sur un `ResizeObserver`, et
           `resize()` ne coûte rien quand la taille n'a pas changé. */
        m.resize();
        const centreLon = loMin + (cxv - px / k - dx) / (R_LAT * kLon * ech);
        const centreLat = laMax - (cyv - py / k - dy) / (R_LAT * ech);
        const metresParPixel = 1 / (ech * k);
        /* 🔴 LE ZOOM VIT DANS `carte-fond.ts`, ET IL S'EST TROMPÉ D'UN
           FACTEUR DEUX — toute l'histoire y est écrite, avec les chiffres
           mesurés. Il est sorti d'ici pour qu'un test puisse le croiser avec
           la math de maplibre elle-même : le défaut avait traversé une
           vérification visuelle. */
        const zoom = zoomMaplibrePour(metresParPixel, centreLat);
        if (Number.isFinite(centreLon) && Number.isFinite(centreLat) && Number.isFinite(zoom)) {
          m.jumpTo({ center: [centreLon, centreLat], zoom, bearing: 0, pitch: 0 });
        }
      }

      /* ⭐ LA CARTE PUISE DANS LES RÔLES, PAS DANS LES MATIÈRES. Lire `--kaki`
         ici fige la carte en clair : le thème sombre redéfinit les rôles, pas
         les matières, et une carte qui nomme `--kaki` resterait kaki sur un
         fond kaki sombre. `--carte-eau` répond dans les deux thèmes.
         ⚠️ Et le repli littéral reste, parce que `getComputedStyle` rend la
         chaîne VIDE si la feuille n'est pas encore appliquée — un canvas peint
         avec `strokeStyle = ""` garde silencieusement la couleur précédente. */
      const styles = getComputedStyle(document.documentElement);
      const jeton = (nom: string, repli: string) =>
        styles.getPropertyValue(nom).trim() || repli;
      const fond = jeton("--carte-fond", "#343f32");
      const chemin = jeton("--carte-chemin", "#92977c");
      const cheminBeau = jeton("--carte-chemin-beau", "#92977c");
      const trace = jeton("--carte-trace", "#c69a48");
      const lieu = jeton("--carte-lieu", "#c69a48");
      const depart = jeton("--carte-depart", "#eeebdd");

      /* 🔴 PLUS DE REMPLISSAGE OPAQUE — 3/11/2026 : `fond` peignait le canvas
         en kaki plein ; le satellite est maintenant DESSOUS, et un aplat
         par-dessus l'effacerait entièrement. `ctx.clearRect`, pas rien du
         tout : sans lui, le canvas garderait l'image du rendu précédent
         derrière la nouvelle — relevé en testant, un territoire « fantôme »
         visible au changement d'onglet. */
      ctx.clearRect(0, 0, W, H);

      /* 🔴 LE FILIGRANE DU RÉSEAU EST PARTI — 4/11/2026, demande du
         fondateur. La « passe 1 » (tout le réseau marchable, à peine là) et
         le calque « littoral » dessinaient ce que le satellite montre
         maintenant VRAIMENT — la côte, les chemins — en traits fins et
         transparents par-dessus l'image : un filigrane plutôt qu'une
         information. `tracer()` reste définie : les balises, les promenades
         vérifiées et le parcours choisi s'en servent encore, juste plus
         pour le réseau brut. */
      const tracer = (garde: (a: Graphe["a"][number]) => boolean, couleur: string, ep: number, alpha: number) => {
        ctx.beginPath();
        for (const a of graphe.a) {
          if (!garde(a)) continue;
          const pts = a[4];
          for (let i = 0; i < pts.length; i++) {
            const nd = graphe.n[pts[i]];
            if (!nd) continue;
            const x = X(nd[0]), y = Y(nd[1]);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
        }
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = couleur;
        ctx.lineWidth = ep;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      // ── passe 2 : les promenades vérifiées
      /* ── les circuits balisés de l'Office ──────────────────────────────
         ⛔ DESSINÉS AVANT LES NÔTRES, ET PLUS DISCRETS. Ce ne sont pas nos
            tracés : ils ne doivent pas prendre la vedette sur la carte de
            MANA, et ils ne doivent pas non plus se confondre avec eux. Un
            trait plus fin, dans la sauge du végétal, et sous la couche des
            promenades vérifiées — l'ordre de dessin EST la hiérarchie. */
      /* 🔴 LES SITES NE SE DESSINENT PLUS ICI — 4/11/2026, demande du
         fondateur : « la méthode n'est pas bonne ». Les poser au canvas
         voulait dire les projeter avec NOTRE transform (`X`/`Y`), recalée à
         chaque image sur celle de maplibre — deux projections différentes
         (la nôtre, équirectangulaire locale ; Mercator, la vraie, sous le
         satellite) tenues en phase par un calcul, jamais garanties pixel
         pour pixel. ⭐ Les poser DANS maplibre (plus bas, `sites-genre`)
         retire le calcul : un site à sa coordonnée, sur LA MÊME carte que
         l'image qui le montre, ne peut plus diverger d'elle. */

      /* 🔴 LES CIRCUITS BALISÉS NE SE DESSINENT PLUS ICI NON PLUS — 4/11/2026,
         même défaut relevé par le fondateur que pour les sites : au canvas,
         46 tracés fins dans NOTRE projection, recalée par un calcul plutôt
         que vraie, redevenaient un filigrane dès que le satellite montrait
         le vrai terrain dessous. Posés dans maplibre (plus bas, `ot-trace`),
         ils suivent la même coordonnée que le sol qu'ils traversent. */

      for (const w of calques.promenades ? VITRINE : []) {
        const vedette = choisie === null || choisie === w.slug;
        ctx.beginPath();
        w.points.forEach((p, i) => {
          const x = X(p.lon), y = Y(p.lat);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = vedette ? trace : chemin;
        ctx.globalAlpha = vedette ? 0.95 : 0.3;
        ctx.lineWidth = vedette ? 2.4 : 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      /* ── passe 3 : les lieux de la promenade choisie, et eux seuls
         🔴 L'INTERRUPTEUR « LES LIEUX » A DISPARU DU PANNEAU — 5/11/2026,
            question du fondateur : « est-ce important ? tous nos points sont
            des sites remarquables ». Il avait raison, et pour une raison
            qu'il faut écrire : cette passe-ci ne dessine PAS les points de
            la carte, elle dessine les étapes d'une promenade CHOISIE. Or
            `VITRINE` est vide et la feuille qui permettait d'en choisir une
            est partie le matin même : `walk` ne peut plus être autre chose
            que `null`. La case commandait donc une passe qui ne s'exécutait
            jamais — à côté de deux cases qui, elles, agissent.
         ⭐ UNE CASE QUI NE FAIT RIEN NE SE LIT PAS COMME INUTILE, elle se lit
            comme CASSÉE : on la décoche, rien ne bouge, et c'est toute la
            rangée qui devient suspecte. ⛔ La passe reste, gardée par `walk`
            seul : elle reprendra le jour où une promenade se choisit. */
      if (walk) {
        for (const e of walk.etapes) {
          ctx.beginPath();
          ctx.arc(X(e.lon), Y(e.lat), 3.4, 0, Math.PI * 2);
          ctx.fillStyle = fond;
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = lieu;
          ctx.stroke();
        }

        /* ── passe 4 : LE DÉPART, ET L'ARRIVÉE QUAND ELLE DIFFÈRE ───────────
           🔴 Ce repère manquait, et c'est la question que se pose un marcheur
              AVANT toutes les autres : « par où je commence ? ». Un tracé sans
              origine se lit comme une forme, pas comme un chemin.
           ⚠️ ET LES DEUX NE SE DESSINENT PAS SI LA BOUCLE SE REFERME. Poser une
              arrivée sur un départ fabrique un symbole composite que personne
              n'a dessiné, et donne à croire à deux lieux là où il n'y en a
              qu'un. Le seuil est en mètres au sol, pas en pixels : en pixels il
              changerait de sens avec la taille de la fenêtre. */
        const pts = walk.points;
        const d = pts[0], f = pts[pts.length - 1];
        const ecartM = Math.hypot((f.lon - d.lon) * R_LAT * kLon, (f.lat - d.lat) * R_LAT);
        const boucle = ecartM < 80;

        const poser = (lon: number, lat: number, plein: boolean) => {
          const x = X(lon), y = Y(lat);
          // un halo de la couleur du FOND : le repère se détache du réseau
          // sans qu'on ait à épaissir son trait, donc sans le rendre lourd
          ctx.beginPath(); ctx.arc(x, y, 7.5, 0, Math.PI * 2);
          ctx.fillStyle = fond; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
          if (plein) { ctx.fillStyle = trace; ctx.fill(); }
          ctx.lineWidth = 2; ctx.strokeStyle = plein ? depart : trace; ctx.stroke();
        };
        poser(d.lon, d.lat, true);              // départ : plein
        if (!boucle) poser(f.lon, f.lat, false); // arrivée : creux
      }

      /* ── LE LIEU VISÉ PAR LA RECHERCHE ────────────────────────────────
         ⭐ Un anneau, pas une épingle pleine : une épingle masque ce qu'elle
            désigne, et ce qu'on veut voir ici, c'est justement le réseau de
            chemins autour du lieu trouvé. */
      if (vise) {
        const x = X(vise.g[0]), y = Y(vise.g[1]);
        ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.lineWidth = 2.5; ctx.strokeStyle = trace; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = trace; ctx.fill();
      }

      /* ── NOS PROPOSITIONS DE PROMENADES DEPUIS LE LIEU VISÉ ─────────────
         ⭐ `parcours.contour` EST DÉJÀ LA SUITE DE POINTS [lon,lat] que le
            chemin marche — la même donnée que `Composer.tsx` dessine via
            maplibre, ici posée au trait sur ce canvas. Pas de silhouette
            séparée à recalculer : une seule vérité du tracé, deux moteurs de
            dessin. ⚠️ En pointillé : la trouver par-dessus le réseau du fond,
            avant d'avoir choisi, demande un signal différent du trait plein
            qui marque une promenade déjà vérifiée. */
      for (const p of propositions) {
        ctx.beginPath();
        p.parcours.contour.forEach(([lon, lat], k) => {
          const x = X(lon), y = Y(lat);
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.setLineDash([2, 5]);
        ctx.strokeStyle = trace; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.85;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      /* ── MA POSITION ──────────────────────────────────────────────────
         ⚠️ Un halo ÉPAIS, et c'est volontaire : il ne figure pas un rayon de
            précision mesuré — nous n'affichons pas la précision du GPS — il
            sert seulement à retrouver le point sur un réseau dense. Lui
            donner la taille de l'incertitude serait prétendre la connaître. */
      if (moi) {
        const x = X(moi[0]), y = Y(moi[1]);
        ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.fillStyle = depart; ctx.globalAlpha = 0.22; ctx.fill(); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = depart; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = fond; ctx.stroke();
      }

    };

    dessiner();
    const ro = new ResizeObserver(dessiner);
    ro.observe(b);
    return () => ro.disconnect();
  }, [graphe, choisie, walk, calques, vise, moi, vueTic, otIci, sitesIci, propositions]);

  return (
    <main className="terr">
      <div className="terr-carte" ref={boite}>
        {/* ⚠️ `aria-hidden` SUR LES DEUX : ni le fond satellite ni le canvas ne
            portent d'information qui ne soit pas aussi dans la liste en
            dessous. */}
        <div className="terr-fond" ref={maplibreBoite} aria-hidden="true" />
        <canvas ref={toile} aria-hidden="true" />
        {!graphe && !erreur && (
          <p className="terr-attente" role="status">Lecture du territoire…</p>
        )}
        {erreur && <p className="terr-attente terr-erreur" role="status">{erreur}</p>}

        {/* ── LA RECHERCHE, EN TÊTE DE LA CARTE — 4/11/2026 ────────────────
            🔴 RETOURNE LA DÉCISION DU 31/10 : demande du fondateur, « comme
            dans la page balade de l'OT » — `jeu-haut`/`jeu-chercher`,
            repris tels quels (mêmes classes, même verre dépoli) plutôt que
            recopiés : SwipeBalades.tsx les tient déjà, et une seconde
            définition aurait divergé un jour. Ce que la note du 31/10
            craignait (le clavier qui recouvre les résultats) reste vrai
            pour un champ posé EN BAS ; posé EN HAUT, le clavier mobile
            s'ouvre SOUS la liste, pas par-dessus elle. */}
        <div className="jeu-haut terr-haut">
          <form
            className="jeu-chercher"
            role="search"
            onSubmit={(e) => { e.preventDefault(); if (resultats[0]) choisir(resultats[0]); }}
          >
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
            </svg>
            <label className="sr-only" htmlFor="terr-q">Rechercher un lieu du territoire</label>
            <input
              id="terr-q" type="search" autoComplete="off"
              placeholder="Rechercher un lieu…"
              value={requete}
              onChange={(e) => { setRequete(e.target.value); setVise(null); }}
            />
            {requete && (
              <button type="button" className="terr-effacer"
                onClick={() => { setRequete(""); setVise(null); }}>
                <span className="sr-only">Effacer la recherche</span>
                <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </form>
        </div>

        {/* ⚠️ Les résultats vivent SOUS le champ, par-dessus la carte : on
            doit pouvoir les lire sans quitter l'écran ni perdre la carte
            des yeux. */}
        {requete.trim().length >= 2 && !vise && (
          <ul className="jeu-resultats terr-haut-resultats" role="listbox" aria-label="Lieux trouvés">
            {resultats.length === 0 ? (
              <li className="terr-rien">
                {/* ⚠️ Deux choses fausses ici depuis ce soir : « la presqu'île »
                    alors qu'un onglet montre l'Aulne, et le compte des lieux du
                    GRAPHE alors qu'on cherche dans l'inventaire. ⭐ Une phrase
                    qui cite un chiffre vivant vieillit deux fois plus vite — on
                    nomme le territoire affiché et on compte ce qu'on fouille. */}
                Aucun lieu de {terr.nom.toLowerCase()} ne porte ce nom. Nous ne
                cherchons que dans nos{" "}
                {sitesIci.filter((l) => l.n).length.toLocaleString("fr-FR")} sites
                nommés&nbsp;: ni adresses, ni commerces.
              </li>
            ) : (
              resultats.map((r) => (
                <li key={`${r.nom}-${r.g[0]}`}>
                  <button type="button" className="jeu-resultat" onClick={() => choisir(r)}>
                    <span className="jeu-resultat-nom">{r.nom}</span>
                    <span className="m-meta">{r.detail}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {/* ── LES COMMANDES, À DROITE ─────────────────────────────────── */}
        <div className="terr-commandes">
          <button
            type="button" className="terr-rond"
            aria-expanded={calquesOuverts} aria-controls="terr-calques"
            onClick={() => setCalquesOuverts((v) => !v)}
          >
            <span className="sr-only">Calques de la carte</span>
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" />
            </svg>
          </button>
          <button type="button" className="terr-rond"
            onClick={() => { const r = boite.current!.getBoundingClientRect();
              zoomer(1.6, r.left + r.width / 2, r.top + r.height / 2); }}>
            <span className="sr-only">Agrandir la carte</span>
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 6v12M6 12h12" />
            </svg>
          </button>
          <button type="button" className="terr-rond"
            onClick={() => { const r = boite.current!.getBoundingClientRect();
              zoomer(1 / 1.6, r.left + r.width / 2, r.top + r.height / 2); }}>
            <span className="sr-only">Réduire la carte</span>
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 12h12" />
            </svg>
          </button>
          {/* ⚠️ Il n'apparaît QUE si la vue a bougé : un bouton « recadrer »
              toujours présent sur une carte déjà cadrée ne fait rien, et un
              bouton qui ne fait rien se lit comme une panne. */}
          {vueBougee && (
            <button type="button" className="terr-rond" onClick={recadrer}>
              <span className="sr-only">Recadrer sur tout le territoire</span>
              <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
              </svg>
            </button>
          )}
          <button type="button" className="terr-rond" onClick={meSituer}>
            <span className="sr-only">Me situer sur le territoire</span>
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="6" />
            </svg>
          </button>
        </div>

        {calquesOuverts && (
          <div className="terr-calques" id="terr-calques">
            {/* ⭐ Trois interrupteurs qui commandent VRAIMENT trois passes de
                dessin. Un calque qui ne change rien à l'image est un
                décor coûteux — on l'aurait su au premier essai. */}
            {/* 🔴 LES TROIS GLOSES SONT PARTIES — 5/11/2026, demande du
                fondateur. Elles expliquaient ce que le titre disait déjà
                (« ceux de l'Office de tourisme » sous « Les circuits
                balisés »), et elles coûtaient trois lignes chacune dans un
                panneau que le filtre par genre venait de faire déborder de
                l'écran. ⭐ Un sous-titre qui PARAPHRASE son titre n'ajoute
                pas de l'aide, il ajoute de la hauteur. */}
            {([
              ["balises", "Les circuits balisés"],
              ["sites", "Les sites remarquables"],
            ] as const).map(([clef, nom]) => (
              <label key={clef} className="terr-calque">
                <input
                  type="checkbox" checked={calques[clef]}
                  onChange={(e) => setCalques((c) => ({ ...c, [clef]: e.target.checked }))}
                />
                <span className="terr-calque-nom">{nom}</span>
              </label>
            ))}
            {/* ⭐ LE FILTRE PAR GENRE NE S'AFFICHE QUE SI LE CALQUE DES SITES
                EST ALLUMÉ — un filtre sur une couche éteinte ne change rien
                à l'écran, et un contrôle qui ne fait rien se lit comme une
                panne. */}
            {calques.sites && genres.length > 1 && (
              <div className="terr-genres" role="group" aria-label="Genres de sites">
                <button type="button"
                  className={genresChoisis.size === 0 ? "ot-filtre ot-filtre-actif" : "ot-filtre"}
                  aria-pressed={genresChoisis.size === 0}
                  onClick={() => setGenresChoisis(new Set())}>
                  Tous
                </button>
                {/* 🔴 LE LIBELLÉ VIENT DE L'INVENTAIRE, PAS DE `categories.ts`
                    — 5/11/2026. `lieux.json` EMPORTE sa propre table
                    (`libelles`, écrite par `scripts/lieux.py` en même temps
                    que les genres) ; `CATEGORIE` en était une recopie figée
                    au vocabulaire d'avant. Onze boutons sur vingt-trois
                    affichaient donc la clé technique en minuscules —
                    « archeologie », « epave », « oeuvre » — à côté de
                    « Mégalithe » et « Point de vue ».
                    ⭐ UNE TABLE QUI VOYAGE AVEC SA DONNÉE NE PEUT PAS
                       VIEILLIR SÉPARÉMENT D'ELLE. Le repli reste le code
                       brut : un trou doit se voir, c'est la règle du
                       fichier — mais il ne doit pas se voir ONZE fois parce
                       qu'on a lu la mauvaise table. */}
                {/* 🔴 LA COULEUR DE LA PASTILLE, EN PASTILLE — 5/11/2026.
                    Demandé : « la même couleur que leur pin » pour les
                    libellés. Mesuré avant d'écrire, sur les 23 genres : en
                    TEXTE, la couleur du pin tombe sous 3:1 pour DIX genres
                    sur fond ivoire (thème clair) et DOUZE sur fond kaki
                    (thème sombre) — « Phare » #ffd23f donne 1,32 sur
                    l'ivoire, « Fortification » #8b5a2b donne 1,89 sur le
                    kaki. Plus de la moitié illisible dans chaque thème, et
                    jamais les mêmes : aucune teinte unique ne peut servir
                    des deux côtés.
                    ⭐ UNE COULEUR N'A PAS BESOIN D'ÊTRE DU TEXTE POUR ÊTRE
                       LUE. Le rond porte la teinte EXACTE du pin — c'est la
                       correspondance demandée, et elle devient même plus
                       juste, puisque c'est la forme du pin — pendant que le
                       libellé garde l'encre qui se lit. Le liseré du bouton
                       reprend la teinte, le fond en garde un voile.
                    ⚠️ Le rond porte un cerne : sans lui, « Phare » et
                       « Plage », jaunes clairs, disparaissaient sur
                       l'ivoire. */}
                {genres.map((g) => {
                  const actif = genresChoisis.has(g);
                  return (
                    <button key={g} type="button"
                      className={actif ? "terr-genre terr-genre-actif" : "terr-genre"}
                      style={{ "--pin": couleurCategorie(g) } as CSSProperties}
                      aria-pressed={actif}
                      onClick={() => basculerGenre(g)}>
                      <span className="terr-genre-pin" aria-hidden="true" />
                      {inv?.libelles[g] ?? libelleCategorie(g)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {motGps && <p className="terr-gps" role="status">{motGps}</p>}
        {vise && (
          <div className="terr-vise" role="status">
            <p className="terr-vise-nom">
              <strong>{vise.nom}</strong> · {vise.detail}
            </p>
            {vise.desc && <p className="terr-vise-dire">{vise.desc}</p>}
            {/* ⛔ LE LIEN WIKIPÉDIA EST CONSTRUIT À PARTIR DE CE QU'OSM ÉCRIT
                — « fr:Ménez Hom » —, langue comprise. Supposer `fr` ferait
                tomber les articles d'une autre langue sur une page absente,
                et un lien mort est pire qu'un lien manquant. */}
            {vise.wiki && (
              <p className="terr-vise-dire">
                <a href={lienWiki(vise.wiki)} target="_blank" rel="noreferrer">
                  Lire l’article
                </a>
              </p>
            )}
            {/* ⭐ LE GESTE QUI MANQUAIT. Jusqu'ici, voir un lieu sur cette
                carte ne permettait RIEN d'en faire : il fallait quitter
                l'écran, ouvrir le compositeur, et espérer que la boucle passe
                à côté. La donnée existait, le graphe savait router, le pont
                n'existait pas.
                ⚠️ On n'envoie que la POSITION du lieu, pas une clé de
                   catalogue : trois lieux nommés sur quatre que cette carte
                   affiche ne sont accrochés à aucune arête par la moisson
                   (139 sur 583, mesuré le 1/11). Le compositeur accroche à
                   l'exécution, sur l'arête la plus proche — ce qui fait
                   passer la couverture à 80 %, et laisse le refus honnête
                   pour les 20 % restants. */}
            {/* 🔴 DORÉ, À DROITE, AVEC SA FLÈCHE — 5/11/2026, demande du
                fondateur. ⭐ Et ce n'est pas qu'une couleur : c'est le SEUL
                geste de cet écran — tout le reste informe, lui seul emmène
                ailleurs. En liseré fin, il avait exactement le poids d'un
                lien de plus ; en doré, il reprend le rang que la barre et les
                boutons principaux de l'app donnent à l'action qu'on attend.
                ⚠️ `<p>` devient `<div>` : un bouton de 44 px dans un
                   paragraphe de texte héritait de sa hauteur de ligne et de
                   son ton doux. */}
            {/* 🔴 DEUX GESTES, PAS UN — 5/11/2026, relevé par le fondateur :
                « on a omis la fonction principale : y aller ». L'application
                savait montrer un lieu et composer la promenade qui en part,
                jamais comment l'ATTEINDRE. Le parcours d'un visiteur est
                voir → s'y rendre → marcher ; il manquait le milieu.
                ⭐ L'ORDRE DIT LE PRODUIT. « Y aller » vient d'abord parce
                   qu'il vient d'abord dans la vie — on n'est pas encore
                   là —, mais c'est « Partir d'ici » qui porte l'or : la
                   promenade est ce que MANA apporte, l'itinéraire routier
                   est une commodité qu'on emprunte ailleurs. */}
            <div className="terr-actions">
              <a
                className="m-action-fine terr-bouton"
                /* ⛔ ON PASSE LA MAIN, ON N'ITINÈRE PAS — voir `y-aller.ts`
                   pour les deux raisons mesurées : le graphe servi ne porte
                   pas la classe de voirie (donc on ne sait pas où une
                   voiture passe), et ce n'est pas la moitié que MANA
                   apporte. */
                href={lienYAller(vise.g, vise.nom, plateforme)}
                /* ⚠️ DANS UN AUTRE ONGLET, et c'est pour la carte qu'on
                   quitte, pas pour la page qu'on ouvre : sans ça, revenir
                   coûte un retour arrière, un rechargement du graphe et la
                   perte du lieu sélectionné. Sur téléphone le système
                   détourne de toute façon vers Plans ou l'appli choisie, et
                   l'onglet reste là, intact, derrière. */
                target="_blank"
                rel="noopener noreferrer"
                /* ⚠️ LE TITRE DIT QU'ON SORT, parce que le libellé ne peut
                    pas tout porter. ⛔ Et il ne crie PAS au loup sur le
                    stationnement : nous ne savons pas s'il y a un parking à
                    50 m ou un chemin de terre sur un kilomètre (la classe de
                    voirie n'est pas dans le graphe servi) — alors que
                    l'application de cartes, elle, le montrera. Avertir
                    partout de ce qu'on ignore, c'est un avertissement qu'on
                    apprend à ignorer. */
                title={`Itinéraire vers ${vise.nom} dans votre application de cartes`}
              >
                <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true"
                     fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.6" />
                </svg>
                Y aller
              </a>
              <a
                className="m-action terr-bouton"
                /* ⚠️ `/promenades`, PAS `/composer`, DEPUIS LE 3/11/2026 —
                   les deux rendent le même écran, mais `/promenades` est
                   l'adresse CANONIQUE : c'est elle que la nav, le pied et les
                   trois autres CTA de l'accueil pointent déjà. `/composer`
                   reste une adresse valide (ancien bookmarks, ancien lien
                   partagé) ; ce lien-ci ne doit pas être le seul endroit de
                   l'app à préférer l'autre forme. */
                href={`${base}/promenades?vers=${vise.g[0].toFixed(5)},${vise.g[1].toFixed(5)}&nom=${encodeURIComponent(vise.nom)}`}
              >
                {/* 🔴 LE SENS A CHANGÉ LE 2/11, ET LE LIBELLÉ DEVAIT SUIVRE.
                    Ce bouton disait « vers ce lieu » du temps où la promenade
                    était une boucle et le lieu son prétexte. Depuis
                    l'arbitrage du fondateur, « j'aime ce coin » est le PREMIER
                    geste : le lieu qu'on a repéré sur la carte est celui d'où
                    l'on part, et MANA propose trois endroits où aller ensuite.
                    ⭐ Le paramètre `vers` reste tel quel — les liens déjà
                       partagés continuent de fonctionner — mais un libellé qui
                       survit à sa cause est pire qu'une note : il promet. */}
                Partir d'ici
                {/* ⚠️ `aria-hidden` : la flèche dit « ça vous emmène
                    ailleurs », ce que le libellé dit déjà. Lue à voix haute,
                    elle n'ajouterait qu'un bruit. */}
                <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true"
                     fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </a>
            </div>
            {/* 🔴 LES TROIS PROPOSITIONS SONT REVENUES DANS L'ENCADRÉ —
                5/11/2026, et c'est la réparation d'un défaut MUET. Posées
                « sous la carte » le 3/11 à la demande du fondateur, elles
                étaient restées sœurs de `.terr-carte` dans le flux. Le 4/11
                la carte est passée en PLEIN ÉCRAN (`position: absolute;
                inset: 0`) : la liste s'est retrouvée DESSOUS, mesurée au
                relevé entre 0 et 91 px — c'est-à-dire derrière la barre de
                recherche, en haut de l'écran, recouverte.
                ⭐ RIEN N'A CASSÉ : les trois propositions étaient calculées
                   justes, présentes dans le DOM, nommées pour le lecteur
                   d'écran. Seul l'œil ne les voyait plus. ⛔ Un changement de
                   POSITIONNEMENT déplace tout ce qui comptait sur le flux,
                   y compris ce qu'on ne regardait pas en le faisant — et la
                   disparition ne lève aucune erreur.
                ⚠️ Elles vivent donc avec le lieu dont elles dépendent :
                   `vise` disparaît, elles disparaissent, sans qu'une
                   deuxième règle de position ait à le savoir. */}
            {propositions.length > 0 && (
              <ul className="terr-propositions" aria-label={`Promenades depuis ${vise.nom}`}>
                {propositions.map((p) => (
                  <li key={p.i}>
                    <span className="terr-proposition-nom">{spotsPourComposer[p.i]?.n}</span>
                    {/* 🔴 EN MÈTRES, PAS EN KILOMÈTRES — 5/11/2026, arbitrage
                        du fondateur : « mètres pour les marcheurs ». Ces
                        trois distances sont des SAUTS d'un lieu à l'autre —
                        0,7 à 2 km le plus souvent — et le kilomètre y rend
                        une décimale par laquelle il faut repasser : « 0,9 km »
                        se traduit en tête avant de savoir si c'est loin.
                        « 900 m », non. ⭐ L'unité juste est celle dans
                        laquelle la personne PENSE, pas la plus compacte.
                        ⚠️ Arrondi à la DIZAINE de mètres : le graphe
                           OpenStreetMap ne justifie pas le mètre, et « 893 m »
                           annoncerait une précision que la donnée n'a pas —
                           même faute que le « 12.01 km » corrigé sur la liste
                           des promenades, à l'autre bout de l'échelle.
                        ⚠️ `toLocaleString("fr-FR")` pour l'espace des
                           milliers : « 1100 m » se lit mal, « 1 100 m » non. */}
                    <span className="m-meta">
                      {(Math.round(p.metres / 10) * 10).toLocaleString("fr-FR")} m
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ══ LA FEUILLE ════════════════════════════════════════════════════
          🔴 ELLE NE S'OUVRE PLUS SUR DU VIDE — 4/11/2026, demande du
             fondateur : « supprimer la poignée ». Son en-tête était parti le
             matin même et `VITRINE` ne contient aucune promenade vérifiée :
             il ne restait à l'écran qu'une barre grise de 104 px, à tirer
             pour découvrir le néant. ⭐ Une poignée PROMET quelque chose
             dessous ; tirée sur du vide, elle ne se lit pas comme « rien à
             voir » mais comme « ça n'a pas chargé ».
          ⛔ ON LA CONDITIONNE, ON NE LA SUPPRIME PAS. La liste et la fiche
             sont écrites, testées, et attendent la première promenade
             vérifiée ; les effacer les ferait réinventer. Une section
             conditionnée par ses données se tait toute seule — et reparle
             sans qu'on y touche le jour où `VITRINE` se remplit.
          ⚠️ CONSÉQUENCE MESURÉE, et c'est un gain : la feuille recouvrait
             l'attribution IGN/ODbL que maplibre pose en bas de carte. Elle
             n'était visible NULLE PART sur cet écran — un contrôle rallumé
             le matin même pour la porter, caché l'après-midi par un panneau
             vide.
          ⚠️ LA POIGNÉE EST UN BOUTON, pas un trait décoratif. La maquette
             dessine une barre que l'on « tire » ; un glissement ne se fait ni
             au clavier ni au lecteur d'écran, et il ne se devine pas. On garde
             la forme de la poignée — elle dit « ça bouge » — et on lui donne
             le comportement qui marche pour tout le monde : un appui. */}
      {(dIci.length > 0 || walk) && (
      <section
        className={`terr-panneau terr-feuille-${feuille}`}
        aria-label="Promenades du territoire"
      >
        <button
          type="button" className="terr-poignee"
          aria-expanded={feuille === "deploye"}
          onClick={() => setFeuille((f) => (f === "replie" ? "deploye" : "replie"))}
        >
          <span className="sr-only">
            {feuille === "replie" ? "Déplier la liste des promenades" : "Replier la liste"}
          </span>
        </button>
        {/* 🔴 L'EN-TÊTE DE LA FEUILLE EST PARTIE — 4/11/2026, demande du
            fondateur : « Le territoire », le compte de tronçons et de sites,
            le mot sur les promenades vérifiées. ⭐ Le compte disait la
            TAILLE DE NOTRE MOISSON ; la carte, elle, montre ce qu'il y a —
            et depuis qu'elle montre tout le territoire d'un coup, le chiffre
            renseignait sur nous plutôt que sur le terrain. */}

        {/* 🔴 LA RECHERCHE A DÉMÉNAGÉ EN TÊTE DE LA CARTE — 4/11/2026, voir
            `.jeu-haut`/`.jeu-chercher` juste après `.terr-fond`. */}

        {/* ⭐ L'ALTERNATIVE ACCESSIBLE N'EST PAS UNE CONCESSION : c'est la même
            information, en liste. Choisir une promenade au clavier doit marcher
            aussi bien qu'au doigt sur la carte. */}
        {/* 🔴 LA LISTE SUIT LE TERRITOIRE. Sans ce filtre, « Les forts du
            goulet » s'affichait sous l'onglet Aulne maritime : quatre
            promenades de Roscanvel et Crozon proposées à quelqu'un qui
            regarde Pont-de-Buis. ⭐ Ajouter un onglet n'ajoute pas seulement
            une donnée : il requalifie TOUT ce qui est affiché à côté. */}
        {/* 🔴 LE MOT « AUCUNE PROMENADE VÉRIFIÉE » EST PARTI LE 4/11/2026,
            demande du fondateur. ⚠️ CE QUI RESTE VRAI : `VITRINE` est vide,
            donc cette liste ne rend rien aujourd'hui. Une section
            conditionnée par ses données se tait toute seule — elle
            reviendra le jour où une promenade vérifiée existe, sans qu'on
            ait à la réinventer. */}
        {dIci.length > 0 && (
        <ul className="terr-liste">
          {dIci.map((w) => {
            const active = choisie === w.slug;
            return (
              <li key={w.slug}>
                <button
                  type="button"
                  className={active ? "terr-item terr-item-active" : "terr-item"}
                  aria-pressed={active}
                  onClick={() => setChoisie(active ? null : w.slug)}
                >
                  <span className="terr-item-titre">{w.titre}</span>
                  <span className="terr-item-meta">
                    {/* ⚠️ 12.01 km annonçait le CENTIMÈTRE sur un tracé
                        OpenStreetMap, et en notation anglaise. Une décimale,
                        une virgule : la précision affichée ne doit pas
                        dépasser celle de la source. */}
                    {w.lieu} ·{" "}
                    {w.distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km ·{" "}
                    {effortLisible(w.distanceKm)} ·{" "}
                    {w.boucle ? "boucle" : "aller simple"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        )}

        {walk && (
          <div className="terr-fiche">
            {/* ⚠️ « Boucle recommandée » de la maquette devient « Boucle » ou
                « Aller simple » : nous ne recommandons rien. Un classement
                suppose un critère, et nous n'en avons pas — quatre parcours
                vérifiés, aucun meilleur que l'autre. Le mot « recommandée »
                serait une opinion déguisée en fait. */}
            <p className="terr-pastilles">
              <span className="terr-pastille">
                <svg className="m-icone terr-pastille-icone" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="13.5" cy="4.2" r="1.7" />
                  <path d="M9 21l2.6-6.2L9 12V8.6l3.6-1.2 2.8 3.1 2.6.9" />
                  <path d="m11.6 14.8 3.1 2.4.9 3.8" />
                </svg>
                {walk.boucle ? "Boucle" : "Aller simple"}
              </span>
            </p>
            <h2 className="terr-fiche-titre">{walk.titre}</h2>

            {/* ── LES CHIFFRES À ICÔNES ─────────────────────────────────
                🔴 DEUX, PAS TROIS. La maquette en affiche un troisième —
                   « +120 m » de dénivelé. Nous n'avons AUCUNE donnée
                   d'altitude : ni dans le graphe, ni dans les promenades. Un
                   dénivelé inventé sur un sentier côtier breton n'est pas une
                   approximation, c'est une information de sécurité fausse. */}
            <dl className="terr-chiffres">
              <div>
                <dt><svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />
                </svg><span className="sr-only">Durée estimée</span></dt>
                <dd>{effortLisible(walk.distanceKm).replace("≈ ", "≈ ")}</dd>
              </div>
              <div>
                <dt><svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 17c3-6 5-2 7-6s3 2 9-4" /><circle cx="4" cy="17" r="1.6" />
                </svg><span className="sr-only">Distance</span></dt>
                <dd>{walk.distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km</dd>
              </div>
            </dl>

            {/* ⭐ L'accroche n'est pas une ligne d'ambiance écrite pour
                l'occasion : ce sont les CATÉGORIES réellement présentes sur le
                parcours, dans l'ordre où on les croise. Elle ne peut donc pas
                mentir, et elle change avec le parcours. */}
            <p className="terr-accroche">
              {[...new Set(walk.etapes.slice().sort((a, b) => a.pos - b.pos)
                .map((e) => libelleCategorie(e.categorie)))].slice(0, 3).join(", ")}
              {walk.etapes.length > 3 && "…"}
            </p>

            {(() => {
              const id = ILLUSTRATIONS[walk.slug]?.couverture;
              const im = id ? image(id) : undefined;
              if (!im) return null;
              return (
                <Photo
                  id={im.id} usage="documente" alt={im.lieu ?? ""}
                  sizes="(min-width: 620px) 560px, 92vw"
                  className="terr-vignette m-r-banniere"
                />
              );
            })()}

            <p className="terr-fiche-label">Sur le chemin — {walk.etapes.length} lieux</p>
            <ul className="terr-lieux">
              {walk.etapes.slice().sort((a, b) => a.pos - b.pos).map((e) => (
                <li key={`${e.nom}-${e.pos}`}>
                  <span className="terr-lieu-nom">{e.nom}</span>
                  <span className="terr-lieu-cat">
                    {libelleCategorie(e.categorie)}
                    {/* ⭐ `pos` est la position LE LONG du chemin, de 0 au
                        départ à 1 à l'arrivée : c'est ce qui prouve que le
                        lieu est SUR le parcours et non « à proximité ». */}
                    {" · à "}{Math.round(e.pos * 100)} % du parcours
                  </span>
                </li>
              ))}
            </ul>

            <div className="terr-actions">
              <a className="m-action-fine terr-bouton" href={`${base}/promenade/${walk.slug}`}>
                Voir le détail
              </a>
              <a className="m-action terr-bouton" href={`${base}/promenade/${walk.slug}/en-chemin`}>
                <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-8-8-4z" />
                </svg>
                Lancer la balade
              </a>
            </div>
          </div>
        )}

        {/* 🔴 LE PARAGRAPHE DE SOURCE EST PARTI DE LA FEUILLE — 4/11/2026,
            demande du fondateur ; le contrôle maplibre qui l'avait remplacé
            est parti le 5/11, parce qu'il rendait sa mention sous la barre
            flottante. L'attribution a désormais UNE adresse, `/reglages`,
            tenue par `provenance.test.ts` — voir le montage de la carte.
            ⚠️ CE QUI DISPARAÎT VRAIMENT, et c'est assumé : la phrase sur le
               relief et le trait de côte, qui disait ce que nous NE dessinons
               pas. Elle datait du graphe peint ; le satellite montre
               désormais le relief et la côte pour de vrai. */}
      </section>
      )}
    </main>
  );
}

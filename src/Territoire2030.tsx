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
import { TERRITOIRES, TOUT, territoireDe, urlGraphe } from "./territoires";
import { chargerOT, type ItineraireOT } from "./ot";
import { chargerLieux, lienWiki, type Inventaire, type Lieu } from "./lieux";
import { chercher, type Resultat } from "./recherche";
import { avecOffice } from "./visage";
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
/* ⭐ LE CADRAGE AUSSI VIT AILLEURS, DEPUIS LE 4/11/2026 — et `R_LAT` avec
   lui : la constante était déclarée ici ET dans `Atlas.tsx`, le même 111 320
   écrit deux fois. Une seule définition maintenant, dans le module qui en
   fait le plus d'usage ; les deux écrans l'importent. `cadrage.ts` dit
   pourquoi la projection a dû sortir d'ici. */
import { cadrer, vuePour, R_LAT, ZOOM_MIN, ZOOM_MAX, type Vue } from "./cadrage";
import { placerPastilles } from "./pastilles";

const BASE = import.meta.env.VITE_GRAPHE_BASE ?? "https://mana.bzh/bretagne/g";

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
     maplibre = un contexte WebGL, et on n'en veut qu'un sur cet écran.
     🔴 ET SON CENTRE DE DÉPART A CESSÉ D'ÊTRE ARBITRAIRE — 4/11/2026. Il
        valait `[-4.2, 48.25]`, sous un commentaire qui disait « n'a pas
        d'importance : `dessiner()` les corrige dès le premier passage, une
        fois le graphe là ». La seconde moitié de la phrase EST le défaut :
        tant que `dessiner()` attendait le graphe, cette valeur n'était pas
        un point de départ provisoire, c'était la carte qu'on regardait
        pendant trois secondes — décalée de 80 px et à la mauvaise échelle.
     ⭐ Maintenant que le dessin ne l'attend plus, la correction arrive à la
        première image. Le centre de l'emprise est quand même posé ici : une
        valeur de départ qui désigne le bon endroit ne coûte rien, et elle
        reste juste si quoi que ce soit retarde la première image. */
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
      center: [
        (TOUT.emprise[0] + TOUT.emprise[2]) / 2,
        (TOUT.emprise[1] + TOUT.emprise[3]) / 2,
      ],
      zoom: 10,
      interactive: false,
      /* 🔴 RECOUPÉ LE 4/11/2026, ET LA RAISON EST MESURÉE. Rallumé la veille
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
  /**
   * 🔴 LAQUELLE DES TROIS PROPOSITIONS ON DÉSIGNE — 4/11/2026. `null` = les
   *    trois, à égalité, comme avant qu'on puisse choisir.
   * ⚠️ REMIS À NULL QUAND LE LIEU VISÉ CHANGE, par l'effet ci-dessous et pas
   *    à chaque appel de `setVise` : il y en a quatre (le clic sur la carte,
   *    le clic sur un résultat, la touche Entrée, l'arrivée par URL), et une
   *    liste d'appelants à tenir à jour est une liste qu'on oublie — c'est
   *    exactement ce qui est arrivé ce matin à `surUneCommande`.
   */
  const [propChoisie, setPropChoisie] = useState<number | null>(null);
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
  const vivant = useRef<{ sites: Lieu[]; visibles: Lieu[]; inv: Inventaire | null | undefined }>(
    { sites: [], visibles: [], inv: undefined },
  );
  const [vueTic, setVueTic] = useState(0);
  const [vueBougee, setVueBougee] = useState(false);
  /* ⭐ LES DEUX BORNES DU ZOOM VIENNENT DE `cadrage.ts` depuis le 5/11/2026 :
     le pincement de la main et le recadrage automatique doivent viser le
     même plafond, sinon le second demande une vue que le premier ne peut pas
     tenir. L'histoire du passage de 12 à 64, et les mesures, sont là-bas. */

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
  /* 🔴 TROIS ÉTATS, PAS DEUX — 4/11/2026, et c'est la séquence de chargement
     qui l'exige. `undefined` = en route, `null` = refusé, un objet = là.
     Avant, l'échec posait `null`, exactement la valeur du chargement : un
     `lieux.json` injoignable rendait donc « Lecture des lieux… » POUR
     TOUJOURS. ⭐ Tant que ce message était gardé par `!graphe`, l'ambiguïté
     ne coûtait rien — rien ne la lisait. La déplacer sur `inv` la réveille :
     un état qui confond « j'attends » et « j'ai échoué » devient un
     mensonge le jour où quelqu'un l'affiche. Même forme que `fermetures`,
     dix lignes plus haut, pour la même raison. */
  const [inv, setInv] = useState<Inventaire | null | undefined>(undefined);
  useEffect(() => { chargerLieux().then(setInv).catch(() => setInv(null)); }, []);
  const sitesIci = useMemo(
    () => (inv?.lieux ?? []).filter((l) => {
      const [lo, la] = l.g;
      return lo >= terr.emprise[0] && lo <= terr.emprise[2]
          && la >= terr.emprise[1] && la <= terr.emprise[3];
    }),
    [inv, terr],
  );
  /* 🔴 PAS D'OFFICE SUR mana.love — 7/11/2026. On ne se contente pas de
     masquer le calque : on ne TÉLÉCHARGE PAS `ot.json` (264 Ko) sur un hôte
     qui n'a rien à en faire. ⭐ Masquer coûte la bande passante de ce qu'on
     cache ; ne pas charger coûte zéro, et rend le calque vide impossible à
     oublier quelque part. */
  useEffect(() => {
    if (!avecOffice()) { setOt([]); return; }
    chargerOT().then((r) => setOt(r.itineraires)).catch(() => setOt([]));
  }, []);

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
   * 🔴 PLUSIEURS GENRES À LA FOIS — 4/11/2026, demande du fondateur. C'était
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
  /**
   * 🔴 « ON PEUT RÉPONDRE » N'EST PAS « LE GRAPHE EST LÀ » — 4/11/2026.
   *
   * Trois choses doivent être prêtes pour qu'une liste vide veuille dire
   * « aucune promenade » plutôt que « pas encore » : le graphe, l'index (qui
   * attend les fermetures officielles), et les accroches des destinations.
   * ⛔ CE DRAPEAU EXISTE PARCE QUE L'ÉCRAN L'AFFICHE MAINTENANT. Garder
   *    `!graphe` dans le rendu aurait annoncé « Aucune promenade ne part
   *    d'ici » dans la fenêtre entre l'arrivée du réseau et la lecture de
   *    `fermetures.json` — une affirmation fausse, brève, et jamais vue par
   *    celui qui l'écrit (les deux fichiers arrivent ensemble en local).
   * ⚠️ Il RECOPIE la garde de `propositions` juste en dessous, et c'est le
   *    prix : deux listes de conditions qui doivent rester d'accord. On les
   *    garde collées l'une à l'autre plutôt qu'aux deux bouts du fichier.
   */
  const pretPourPropositions = !!(graphe && ixComposition && accrochesComposition);
  /* ⭐ RECALCULÉ QUAND LE LIEU VISÉ CHANGE, PAS À CHAQUE RENDU — les trois
     propositions dépendent du POINT, pas de l'état du calque ou du zoom. */
  useEffect(() => { setPropChoisie(null); }, [vise]);
  const propositions = useMemo((): Proposition<Lieu>[] => {
    if (!graphe || !ixComposition || !accrochesComposition || !vise) return [];
    const depuis = accrocherUn(graphe, ixComposition, vise.g);
    if (!accroche(depuis)) return [];
    return propositionsAutour(
      graphe, ixComposition, depuis,
      spotsPourComposer, positionsPourComposer, accrochesComposition,
    );
  }, [graphe, ixComposition, accrochesComposition, vise, spotsPourComposer, positionsPourComposer]);

  /**
   * ── RECADRER SUR CE QU'ON VIENT DE CHOISIR — 5/11/2026 ────────────────
   *
   * 🔴 LE DÉFAUT, MESURÉ : on tapait « Menhirs de Kerziou », l'écran nommait
   *    le lieu, listait trois promenades avec leurs distances au mètre près,
   *    et la carte ne bougeait pas d'un pixel. Sur 49,4 km de large, le lieu
   *    et ses trois destinations tenaient dans une tache de **12 × 13 px**.
   *    Tout était juste et rien ne se voyait — le défaut le plus coûteux,
   *    parce qu'il ressemble à une carte qui marche.
   *
   * ⭐ ON CADRE SUR LE LIEU **ET SES TRACÉS**, PAS SUR LE LIEU SEUL. Un
   *    point n'a pas de taille : le cadrer demande de choisir une échelle
   *    arbitraire. Les trois parcours, eux, DISENT l'échelle — c'est
   *    exactement la portée de ce qu'on propose de marcher.
   *
   * ⚠️ DEUX MOUVEMENTS AU MAXIMUM, ET CHACUN A UNE CAUSE VISIBLE. Quand le
   *    réseau est déjà là (le cas normal, et toujours le cas à la deuxième
   *    visite), les propositions sont calculées dans le même rendu que le
   *    lieu : un seul vol. Quand il arrive encore — ce soir, 66 s en
   *    production — on cadre d'abord sur le lieu, pour qu'il soit VU, puis
   *    on élargit à ses promenades quand elles existent. Attendre le réseau
   *    pour bouger laisserait l'écran parler d'un lieu qu'on ne voit pas.
   *
   * ⛔ ET UNE SEULE FOIS PAR ÉTAT, d'où la clef. `propositions` est un
   *    `useMemo` : il se recalcule si le graphe change, si les fermetures
   *    arrivent, si les spots bougent. Sans cette garde, chacun de ces
   *    recalculs ramènerait la caméra sur le lieu — y compris longtemps
   *    après que la personne a déplacé la carte à la main pour regarder
   *    ailleurs. Un recadrage qu'on n'a pas demandé est une carte qui
   *    résiste.
   */
  /**
   * ⭐ LA DESTINATION DÉSIGNÉE DU DOIGT, s'il y en a une — bornée à la liste
   *    du moment, exactement comme le tracé retenu au canvas. Un rang hors
   *    liste ne doit pas fabriquer un lien vers rien : `propChoisie` est un
   *    RANG, et une nouvelle sélection peut rendre moins de trois
   *    propositions.
   */
  const retenuPourLien = useMemo(
    () =>
      propChoisie !== null && propChoisie < propositions.length
        ? (propositions[propChoisie].spot.g as [number, number])
        : null,
    [propChoisie, propositions],
  );

  const cadrageFait = useRef<string | null>(null);
  useEffect(() => {
    const b = boite.current;
    if (!vise) { cadrageFait.current = null; return; }
    const clef = `${vise.g[0]},${vise.g[1]}|${propositions.length}`;
    if (cadrageFait.current === clef) return;
    cadrageFait.current = clef;
    if (!b) return;
    const cadre = b.getBoundingClientRect();
    const { width: W, height: H } = cadre;
    if (W < 2 || H < 2) return;
    const points: [number, number][] = [vise.g];
    for (const p of propositions) for (const pt of p.parcours.contour) points.push(pt);
    /* ⭐ ON MESURE CE QUI RECOUVRE, ON NE LE DEVINE PAS. La hauteur de
       l'encadré dépend du nombre de propositions, de la longueur des noms et
       du corps de texte du système ; une constante serait juste sur mon
       écran et fausse sur le premier téléphone réglé en gros caractères.
       ⚠️ Lu MAINTENANT, c'est-à-dire après que React a posé le DOM de ce
          rendu : l'encadré du lieu qu'on vient de choisir est déjà là, avec
          sa taille d'aujourd'hui.
       🔴 ET CE QU'ON MESURE EST LA PLACE PERDUE, PAS LA TAILLE DU PANNEAU.
          Première écriture : `r.height`. L'encadré fait 273 px mais flotte
          AU-DESSUS de la barre du bas — son bord haut est à 451 sur un
          écran de 812, donc il retire 361 px, pas 273. Les 88 px d'écart
          sont exactement la bande où la proposition n° 2 est allée se
          cacher. ⭐ Un panneau flottant ne mesure pas ce qu'il coûte : seul
          son BORD le dit. */
    const perdu = (sel: string, cote: "haut" | "bas" | "droite") => {
      const e = b.querySelector(sel);
      if (!e) return 0;
      const r = e.getBoundingClientRect();
      if (r.height <= 0) return 0;
      const air = 12;   // l'air entre le panneau et le tracé le plus proche
      const d = cote === "haut" ? r.bottom - cadre.top
              : cote === "bas" ? cadre.bottom - r.top
              : cadre.right - r.left;
      return Math.max(0, d + air);
    };
    volerVers(
      vuePour(terr.emprise, points, W, H, {
        haut: perdu(".jeu-haut", "haut"),
        bas: perdu(".terr-vise", "bas"),
        droite: perdu(".terr-commandes", "droite"),
      }),
      W, H,
    );
  }, [vise, propositions, terr]);

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
          4/11/2026, pas ici. Écrite en ligne dans cet effet, elle était
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
      /* ⚠️ Une erreur se DIT. Sans ce message, un refus réseau rendrait un
         écran vide et muet, et on conclurait qu'il n'y a rien ici.
         🔴 ET ELLE A CHANGÉ DE TEXTE AVEC SA PORTÉE — 4/11/2026. Elle
            annonçait « Le territoire n'a pas pu être chargé », en travers de
            la carte, du temps où l'écran entier dépendait du réseau. Il
            n'en dépend plus : la carte, les 624 lieux, la recherche, les
            filtres et « Y aller » marchent sans lui. Garder l'ancienne
            phrase ferait croire perdu ce qui est là — et détournerait vers
            la connexion quelqu'un dont tout le reste fonctionne. */
      .catch(() => { if (vivant) setErreur("Le réseau de chemins n'a pas pu être chargé : pas de promenade proposée."); });
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
  /* 🔴 LE MOTEUR A QUITTÉ CE FICHIER LE 6/11/2026 → `recherche.ts`.
     L'accueil en redemandait un : `Invitation.tsx` portait depuis le 1/11 la
     note « le site a perdu son entrée par le nom de lieu […] c'est écrit ici
     pour qu'on ne l'oublie pas en trouvant l'accueil plus beau ». Le réécrire
     là-bas aurait donné DEUX moteurs.
     ⭐ Ce dépôt sait ce que coûtent deux moteurs pour un même travail : les
        plages du monde sont restées à 5 % pendant seize jours parce que le
        pipeline français prenait `nwr` pendant que le pipeline monde prenait
        `node`. Le bon geste existait, à côté du mauvais, et rien ne les
        confrontait.
     ⚠️ DÉPLACEMENT, PAS RÉÉCRITURE : la logique est identique, et elle a reçu
        ses treize tests À L'EXTRACTION — elle n'en avait aucun ici. */
  const resultats = useMemo<Resultat[]>(
    () => chercher(requete, {
      promenades: VITRINE,
      lieux: sitesIci,
      libelle: (c) => inv?.libelles[c] ?? libelleCategorie(c),
    }),
    [requete, sitesIci, inv],
  );

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
   *
   * 🔴 LE MÊME DÉFAUT QUE LE CADRAGE, UN CRAN PLUS GRAVE — 4/11/2026. Ce
   *    bouton répondait « suis-je dedans ? » en parcourant les 186 506 nœuds
   *    du graphe, et surtout : `if (!graphe) { setMoi(g); return; }`. Sans
   *    réseau, il posait le marqueur SANS vérifier — c'est-à-dire qu'il
   *    faisait exactement le mensonge muet que son propre commentaire, trois
   *    lignes plus haut, donne comme raison d'être.
   * ⭐ ET LA RÉPONSE EXISTAIT DÉJÀ, SANS RIEN TÉLÉCHARGER : `territoireDe()`
   *    tranche sur les deux emprises déclarées — la même boîte que celle qui
   *    filtre les pastilles et cadre la carte. Un seul référentiel pour les
   *    trois.
   * ⚠️ AU PASSAGE, LE MESSAGE MENTAIT AUSSI. Il disait « vous n'êtes pas sur
   *    la presqu'île de Crozon » depuis que l'écran montre LES DEUX moitiés :
   *    quelqu'un à Châteaulin, dans l'Aulne maritime et donc parfaitement
   *    dedans, aurait lu qu'il était ailleurs. Un libellé qui nomme une
   *    moitié d'un territoire qui en compte deux.
   */
  const meSituer = () => {
    if (!navigator.geolocation) { setMotGps("Votre navigateur ne sait pas vous situer."); return; }
    setMotGps("Recherche de votre position…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const g: [number, number] = [p.coords.longitude, p.coords.latitude];
        const dedans = territoireDe(g[0], g[1]) !== null;
        setMoi(dedans ? g : null);
        setMotGps(dedans ? "" : `Vous n'êtes pas sur ${terr.avecArticle} — la carte reste explorable.`);
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
    arreterLeVol();
    vue.current = { k: 1, px: 0, py: 0 };
    setVueBougee(false);
    setVueTic((n) => n + 1);
  };

  /**
   * ── ALLER VERS UNE VUE, SANS SAUTER ───────────────────────────────────
   *
   * 🔴 LE SAUT ÉTAIT LE PREMIER DESSIN DE CETTE FONCTION, et il était faux
   *    pour une raison qui se voit tout de suite à l'écran : passer de 49 km
   *    de large à 2 km en une image ne montre pas qu'on s'est déplacé, ça
   *    montre une AUTRE carte. On perd le lien entre le territoire qu'on
   *    regardait et l'endroit où l'on vient d'arriver.
   *
   * ⭐ LE ZOOM S'INTERPOLE EN LOGARITHME, PAS EN LIGNE DROITE. De k = 1 à
   *    k = 24, la moitié linéaire du chemin est k = 12,5 — c'est-à-dire que
   *    la première moitié du temps avale 96 % de la distance visuelle et la
   *    seconde rampe. L'œil lit le zoom comme un rapport : doubler de 1 à 2
   *    et doubler de 12 à 24 sont le même geste.
   * ⚠️ ET CE QU'ON INTERPOLE N'EST PAS `px`, C'EST LE CENTRE. `px` est un
   *    décalage en pixels DÉJÀ multiplié par `k` : le promener en ligne
   *    droite pendant que `k` grimpe en exponentielle fait dériver le point
   *    visé en cours de route, puis revenir. On interpole le centre dans les
   *    pixels du repos, et on en redéduit `px` à chaque image.
   */
  const vol = useRef<number | null>(null);
  const arreterLeVol = () => {
    if (vol.current !== null) { cancelAnimationFrame(vol.current); vol.current = null; }
  };
  /* ⚠️ ET À LA SORTIE DE L'ÉCRAN. Une image en vol appelle `setVueTic` sur un
     composant démonté : React se tait là-dessus depuis la 18, donc le défaut
     ne se signale pas — il laisse juste une boucle qui tourne sur des refs
     mortes tant que l'onglet vit. */
  useEffect(() => arreterLeVol, []);
  const poserLaVue = (v: Vue) => {
    vue.current = v;
    serrer();
    setVueBougee(vue.current.k !== 1 || vue.current.px !== 0 || vue.current.py !== 0);
    setVueTic((n) => n + 1);
  };
  const volerVers = (cible: Vue, W: number, H: number) => {
    arreterLeVol();
    const d = { ...vue.current };
    /* ⚠️ `matchMedia` est interrogé À CHAQUE VOL et non une fois au montage :
       le réglage système se change en cours de session, et une préférence
       d'accessibilité relevée au démarrage est une préférence qu'on ignore
       pour le reste de la visite. */
    const sansMouvement = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (sansMouvement || (Math.abs(cible.k - d.k) < 0.01
        && Math.abs(cible.px - d.px) < 1 && Math.abs(cible.py - d.py) < 1)) {
      poserLaVue(cible);
      return;
    }
    const cxv = W / 2, cyv = H / 2;
    // le centre visé, exprimé dans les pixels du cadre au repos
    const cx0 = cxv - d.px / d.k, cy0 = cyv - d.py / d.k;
    const cx1 = cxv - cible.px / cible.k, cy1 = cyv - cible.py / cible.k;
    const lnk0 = Math.log(d.k), lnk1 = Math.log(cible.k);
    const DUREE = 460;
    const t0 = performance.now();
    const pas = () => {
      const t = Math.min(1, (performance.now() - t0) / DUREE);
      const e = 1 - (1 - t) ** 3;   // sortie douce : vif au départ, posé à l'arrivée
      if (t >= 1) { vol.current = null; poserLaVue(cible); return; }
      const k = Math.exp(lnk0 + (lnk1 - lnk0) * e);
      poserLaVue({
        k,
        px: (cxv - (cx0 + (cx1 - cx0) * e)) * k,
        py: (cyv - (cy0 + (cy1 - cy0) * e)) * k,
      });
      vol.current = requestAnimationFrame(pas);
    };
    vol.current = requestAnimationFrame(pas);
  };

  useEffect(() => {
    const b = boite.current; if (!b) return;
    let doigts = new Map<number, { x: number; y: number }>();
    let ecart0 = 0, k0 = 1;

    /* ⛔ LA MAIN L'EMPORTE SUR LE VOL, TOUJOURS. Sans ces deux arrêts, un
       recadrage en cours continue d'écrire `vue.current` pendant qu'un doigt
       la déplace : la carte repart toute seule sous le geste, une fois par
       image, et on ne peut rien faire jusqu'à la fin de l'animation. ⭐ Une
       animation qu'on ne peut pas interrompre n'est pas une animation, c'est
       un écran bloqué qui bouge. */
    const molette = (e: WheelEvent) => {
      e.preventDefault();
      arreterLeVol();
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
      arreterLeVol();
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
  /* 🔴 PLUS DE `!graphe` DANS CETTE GARDE — 4/11/2026, et c'était le cœur de
     la séquence de chargement. Le dessin renonçait tant que le réseau
     n'était pas là ; sans dessin, pas de recalage du fond satellite, donc
     une carte vide. Or ce qu'on VOIT sur cet écran — l'image du sol et les
     pastilles des lieux — ne vient pas du graphe : la première est servie en
     tuiles par l'IGN, les secondes par `lieux.json` (110 Ko). Elles
     attendaient 2,2 Mo de réseau compressé pour rien.
     ⭐ Ce que le graphe commande vraiment, c'est UNE fonction : les trois
        promenades proposées depuis le lieu choisi. Elles arrivent plus tard
        et le disent à leur place (voir `.terr-cherche` dans le rendu), au
        lieu de retenir tout l'écran. */
  useEffect(() => {
    const c = toile.current, b = boite.current;
    if (!c || !b) return;

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

      /* 🔴 CADRÉ SUR L'EMPRISE DÉCLARÉE, PLUS SUR LES NŒUDS DU GRAPHE —
         4/11/2026. Toute l'histoire, les chiffres et le prix assumé sont
         dans `cadrage.ts` ; en deux lignes : c'est la MÊME boîte que celle
         sur laquelle `sitesIci` filtre les pastilles, elle est connue avant
         tout téléchargement, et le relevé qu'elle remplace parcourait
         186 506 nœuds À CHAQUE IMAGE pour redécouvrir un rectangle qui ne
         bouge jamais. */
      const { X, Y, kLon, centreLon, centreLat, metresParPixel } =
        cadrer(terr.emprise, W, H, vue.current);
      // ⭐ Déposée à CHAQUE rendu : le pointage vise toujours l'image qu'on voit.
      proj.current = { X, Y };

      /* ── RECALER LE FOND SATELLITE SUR CE QUE LE CANVAS MONTRE ───────────
         ⭐ `centreLon`/`centreLat` SONT L'INVERSE DE `X`/`Y` au centre du
            cadre, calculés par `cadrer()` avec les mêmes coefficients — donc
            incapables de dériver de la projection qui place les sites. Et,
            depuis le 4/11, `cadrage.test.ts` croise les deux : ils étaient
            écrits à la main l'un sous l'autre, sans rien pour les comparer.
         ⚠️ LE ZOOM SE DÉDUIT DE L'ÉCHELLE, PAS DE `k` SEUL : `metresParPixel`
            porte déjà le cadrage initial (combien de mètres par pixel pour
            que le territoire tienne dans la boîte) ET le zoom gagné depuis.
            Le zoom maplibre se définit en « mètres par pixel à l'équateur à
            la latitude donnée » — d'où la correction en cosinus. */
      const m = maplibreCarte.current;
      if (m) {
        /* 🔴 `resize()` À CHAQUE PASSAGE — même piège que `CarteReelle.tsx` :
           le conteneur ne tient sa hauteur FINALE qu'après le premier rendu
           de la page, et maplibre, construit avant, gardait la taille qu'il
           avait à la naissance (quelques pixels). Pas de garde « une seule
           fois » : `dessiner()` tourne déjà sur un `ResizeObserver`, et
           `resize()` ne coûte rien quand la taille n'a pas changé. */
        m.resize();
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
      /* ⚠️ `--carte-chemin-beau` NE SE LIT PLUS NULLE PART : il n'alimentait
         que `tracer()`, partie avec le filigrane du réseau. Le jeton reste
         DÉFINI dans `tokens.css` (trois fois, un thème chacun) et plus
         personne ne le demande — c'est écrit ici parce qu'un jeton orphelin
         ne se voit pas depuis la feuille de style, et que le sien porte une
         promesse datée : « agrément ≥ 120 : il se voit ». Il ne se voit
         plus. À retirer avec la décision de redessiner le réseau, ou jamais. */
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
         information.
         ⛔ ET `tracer()` EST PARTIE AVEC, le soir même. Un commentaire posé
            ici affirmait qu'elle servait encore — « les balises, les
            promenades vérifiées et le parcours choisi s'en servent » : les
            trois dessinent leur propre tracé, et plus rien ne l'appelait.
         ⭐ Elle n'était pas seulement morte, elle TENAIT L'ÉCRAN EN OTAGE :
            c'était le dernier endroit du dessin à lire `graphe.a` et
            `graphe.n`, donc la dernière raison d'attendre 2,2 Mo avant de
            montrer une carte. Vingt-trois lignes jamais exécutées faisaient
            patienter tout le monde. */

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
         🔴 L'INTERRUPTEUR « LES LIEUX » A DISPARU DU PANNEAU — 4/11/2026,
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
      /* 🔴 TROIS TRACÉS IDENTIQUES, TROIS NOMS À CÔTÉ, ET RIEN ENTRE LES DEUX
         — relevé le 4/11/2026. Même teinte, même pointillé, même épaisseur :
         la liste disait « Fontaine Saint-Rivoal · 1 120 m » et la carte
         dessinait trois fils indiscernables. On pouvait lire, ou regarder,
         jamais les deux.
         ⭐ UN NUMÉRO SUFFIT, et il est posé AU BOUT du tracé — pas sur le
            lieu, qui porte déjà sa pastille de genre. Le chiffre appartient
            au FIL qu'il nomme ; collé à la destination, il aurait l'air
            d'une seconde étiquette du lieu.
         ⚠️ Et quand on en choisit un, les deux autres ne disparaissent pas :
            ils pâlissent. Les effacer ferait croire qu'il n'y avait qu'une
            proposition, et retirerait le moyen de changer d'avis. */
      /* ⚠️ BORNÉ À LA LISTE DU MOMENT. `propChoisie` est un RANG, et une
         nouvelle sélection peut rendre moins de trois propositions : un rang
         hors liste n'aurait correspondu à aucun tracé, et les trois seraient
         tombées dans le pâle sans qu'aucune ne soit mise en avant — une
         carte qui a l'air éteinte, sans cause visible. */
      const retenu = propChoisie !== null && propChoisie < propositions.length ? propChoisie : null;
      /* 🔴 LES NUMÉROS SE PLACENT ENSEMBLE, PAS CHACUN DE SON CÔTÉ —
         5/11/2026, défaut relevé par le fondateur. Posé au bout de son
         propre tracé sans rien savoir des autres, le n° 3 tombait à 2 px du
         n° 2 et le cachait : une promenade sur trois perdait son lien avec
         la carte. Un placement qui ignore ses voisins ne peut pas les
         éviter. `pastilles.ts` dit ce qu'il fait et pourquoi la cause
         principale, elle, a été réparée ailleurs. */
      const ancres = placerPastilles(
        propositions.map((p) => p.parcours.contour.map(([lon, lat]) => [X(lon), Y(lat)] as const)),
      );
      propositions.forEach((p, k) => {
        const retenue = retenu === k;
        const efface = retenu !== null && !retenue;
        ctx.beginPath();
        p.parcours.contour.forEach(([lon, lat], j) => {
          const x = X(lon), y = Y(lat);
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        /* ⭐ LE TRAIT PLEIN DIT « CELUI-CI ». Le pointillé marquait jusqu'ici
           « proposition, pas promenade vérifiée » ; retenue, elle reste une
           proposition — d'où le trait plein mais TOUJOURS la teinte des
           propositions, jamais celle des promenades vérifiées. */
        ctx.setLineDash(retenue ? [] : [2, 5]);
        ctx.strokeStyle = trace;
        ctx.lineWidth = retenue ? 3.4 : 2.2;
        /* 🔴 0,45 ET PLUS 0,25 — 5/11/2026, et c'est la note d'hier qui se
           corrige elle-même. Elle dit : « quand on en choisit un, les deux
           autres ne disparaissent pas : ils pâlissent. Les effacer ferait
           croire qu'il n'y avait qu'une proposition. » Posé à 0,25 sur le
           canvas kaki, c'était vrai. Le recadrage amène maintenant la vue au
           ras du sol, où le fond n'est plus un aplat mais une photographie :
           un or à 25 % sur des champs et de la lande ne se distingue plus de
           la texture. Relevé à l'écran — deux tracés que je ne retrouvais
           pas, et que j'ai cru manquants avant de comprendre qu'ils étaient
           simplement effacés.
           ⭐ L'INTENTION N'A PAS CHANGÉ, LE FOND OUI. Une valeur juste contre
              une matière devient fausse contre une autre, sans qu'une seule
              ligne de la règle ait bougé — même mécanisme que les quatre
              couleurs de texte reprises hier quand les panneaux ont pris la
              matière de la bulle. */
        ctx.globalAlpha = efface ? 0.45 : 0.85;
        ctx.stroke();
        ctx.setLineDash([]);

        const ancre = ancres[k];
        if (ancre && Number.isFinite(ancre.x)) {
          const { x, y } = ancre;
          ctx.globalAlpha = efface ? 0.35 : 1;
          ctx.beginPath(); ctx.arc(x, y, retenue ? 11 : 9, 0, Math.PI * 2);
          ctx.fillStyle = trace; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = fond; ctx.stroke();
          /* ⚠️ Le chiffre est peint dans la couleur du FOND de la carte, pas
             en blanc : sur le thème sombre, un blanc dur sur la pastille
             ocre jure là où le fond se fond. */
          ctx.fillStyle = fond;
          ctx.font = `700 ${retenue ? 13 : 11}px system-ui, sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(String(k + 1), x, y + 0.5);
        }
        ctx.globalAlpha = 1;
      });

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
  /* ⚠️ `propChoisie` DANS LES DÉPENDANCES, sinon le trait ne change pas.
     Le canvas ne se redessine que quand cette liste bouge ; une sélection
     qui n'y figure pas se verrait dans la liste et NULLE PART sur la carte —
     c'est-à-dire que le clic aurait l'air de ne rien faire, le défaut même
     qu'on vient de corriger. */
  /* ⛔ `graphe` A QUITTÉ CETTE LISTE — 4/11/2026, et ce n'est pas un oubli :
     plus une seule ligne du dessin ne le lit. Le cadre vient de l'emprise,
     les trois tracés viennent de `propositions` (qui, elle, en dépend et
     déclenche donc le redessin au bon moment). Le laisser aurait imposé un
     redessin complet à l'arrivée des 2,2 Mo, pour peindre exactement la
     même image. */
  }, [choisie, walk, calques, vise, moi, vueTic, otIci, sitesIci, propositions, propChoisie]);

  return (
    <main className="terr">
      <div className="terr-carte" ref={boite}>
        {/* ⚠️ `aria-hidden` SUR LES DEUX : ni le fond satellite ni le canvas ne
            portent d'information qui ne soit pas aussi dans la liste en
            dessous. */}
        <div className="terr-fond" ref={maplibreBoite} aria-hidden="true" />
        <canvas ref={toile} aria-hidden="true" />
        {/* 🔴 L'ATTENTE A CHANGÉ DE CIBLE — 4/11/2026. Elle était posée sur
            `!graphe` : un voile sur toute la carte, « Lecture du
            territoire… », jusqu'à ce que 2,2 Mo de réseau soient arrivés,
            parsés et soudés. Or le graphe ne commande AUCUN pixel de ce que
            cet écran montre — il commande les trois promenades proposées.
            ⭐ Ce qu'on attend vraiment pour VOIR quelque chose, c'est
               l'inventaire des lieux : 110 Ko, et sans lui la carte n'est
               qu'une photo du sol. C'est donc lui que ce message nomme, et
               il s'en va vingt fois plus tôt.
            ⚠️ Le réseau, lui, se signale là où il manque — dans l'encadré du
               lieu choisi, à la place des propositions. Un manque annoncé à
               l'endroit du manque se comprend sans qu'on explique ; annoncé
               en travers de l'écran, il se lit « rien ne marche ». */}
        {inv === undefined && (
          <p className="terr-attente" role="status">Lecture des lieux…</p>
        )}
        {inv === null && (
          <p className="terr-attente terr-erreur" role="status">
            Les lieux du territoire n'ont pas pu être chargés. Vérifiez votre connexion.
          </p>
        )}

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
            {/* 🔴 LES TROIS GLOSES SONT PARTIES — 4/11/2026, demande du
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
                    — 4/11/2026. `lieux.json` EMPORTE sa propre table
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
                {/* 🔴 LA COULEUR DE LA PASTILLE, EN PASTILLE — 4/11/2026.
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
            {/* 🔴 DORÉ, À DROITE, AVEC SA FLÈCHE — 4/11/2026, demande du
                fondateur. ⭐ Et ce n'est pas qu'une couleur : c'est le SEUL
                geste de cet écran — tout le reste informe, lui seul emmène
                ailleurs. En liseré fin, il avait exactement le poids d'un
                lien de plus ; en doré, il reprend le rang que la barre et les
                boutons principaux de l'app donnent à l'action qu'on attend.
                ⚠️ `<p>` devient `<div>` : un bouton de 44 px dans un
                   paragraphe de texte héritait de sa hauteur de ligne et de
                   son ton doux. */}
            {/* 🔴 DEUX GESTES, PAS UN — 4/11/2026, relevé par le fondateur :
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
                /* 🔴 LA DESTINATION CHOISIE VOYAGE — 5/11/2026, et ça répare
                   un geste perdu. Jusqu'ici « Partir d'ici » n'emportait que
                   le point de DÉPART : qui avait touché la proposition n° 2
                   arrivait sur `/promenades` devant la n° 1, sans rien pour
                   comprendre pourquoi. Le choix était fait, lu, affiché — et
                   jeté au passage d'un écran à l'autre.
                   ⛔ CE QUI M'EN AVAIT EMPÊCHÉ ÉTAIT UNE PEUR MAL MESURÉE.
                      J'avais écrit que les deux écrans « peuvent proposer des
                      listes différentes » — vrai : `/carte` soude les deux
                      graphes, `/promenades` n'en charge qu'un. Mesuré enfin,
                      sur TOUS les lieux de la bande de couture : 141 listes
                      identiques sur 143, et les deux divergentes partagent
                      déjà deux destinations sur trois. Zéro divergence sur un
                      échantillon uniforme de 51 lieux ailleurs.
                   ⭐ Un risque nommé et non mesuré est cru traité : il m'a
                      servi à justifier le retrait d'une fonction pour 1,4 %
                      des cas, et la justification tenait d'autant mieux
                      qu'elle était vraie.
                   ⚠️ `dest` est une SUGGESTION, pas un ordre : `/promenades`
                      la retrouve par POSITION dans sa propre liste, et garde
                      sa première proposition s'il ne la trouve pas. Les
                      1,4 % retombent donc exactement sur l'ancien
                      comportement, sans message d'erreur ni liste vide. */
                href={`${base}/promenades?vers=${vise.g[0].toFixed(5)},${vise.g[1].toFixed(5)}&nom=${encodeURIComponent(vise.nom)}${
                  retenuPourLien ? `&dest=${retenuPourLien[0].toFixed(5)},${retenuPourLien[1].toFixed(5)}` : ""}`}
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
                4/11/2026, et c'est la réparation d'un défaut MUET. Posées
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
            {/* 🔴 LE MANQUE SE DIT À L'ENDROIT DU MANQUE — 4/11/2026, et
                c'est l'autre moitié de la séquence de chargement. La liste
                était gardée par `propositions.length > 0`, c'est-à-dire par
                un tableau vide qui voulait dire QUATRE choses sans les
                distinguer : le réseau arrive, le réseau a échoué, ce lieu
                n'a aucune destination accessible, ou aucun lieu n'est visé.
                ⭐ Tant que l'écran attendait le graphe derrière un voile, la
                   confusion était inatteignable : on ne pouvait pas choisir
                   un lieu avant que le réseau soit là. La séquence de
                   chargement la rend atteignable — c'est le cas d'école du
                   défaut qu'on CRÉE en réparant ailleurs, et il se voit
                   d'autant moins qu'il ressemble à l'état d'avant.
                ⛔ Les trois cas se nomment donc séparément. « Rien » ne
                   reste la réponse que pour le quatrième, où la question ne
                   se pose pas. */}
            {!pretPourPropositions && !erreur && (
              <p className="terr-cherche" role="status">
                {/* ⚠️ Le présent progressif, pas « chargement » : ce qui se
                    passe intéresse le marcheur (on lui cherche des
                    promenades), pas la machine (elle télécharge un graphe). */}
                Je cherche des promenades depuis ici…
              </p>
            )}
            {erreur && <p className="terr-cherche terr-erreur">{erreur}</p>}
            {pretPourPropositions && !erreur && propositions.length === 0 && (
              /* ⚠️ Un lieu peut n'avoir aucune destination : hors réseau,
                 derrière une fermeture, ou seul sur son bout de sentier.
                 C'est une réponse, pas une panne — et c'est exactement ce
                 que le vide ne savait pas dire. */
              <p className="terr-cherche">Aucune promenade ne part d'ici.</p>
            )}
            {/* ⭐ La destination que le doigt a désignée, s'il en a désigné une.
                Bornée à la liste du moment, comme le tracé : un rang hors
                liste ne doit pas fabriquer un lien vers rien. */}
            {propositions.length > 0 && (
              <ul className="terr-propositions" aria-label={`Promenades depuis ${vise.nom}`}>
                {propositions.map((p, k) => (
                  <li key={p.i}>
                    {/* 🔴 UN BOUTON, PAS UNE LIGNE DE TEXTE — 4/11/2026. On
                        voyait trois noms et trois tracés, et on ne pouvait
                        en toucher AUCUN : le seul geste possible était
                        « Partir d'ici », qui rouvre tout ailleurs. Quelqu'un
                        qui avait choisi des yeux ne pouvait pas choisir du
                        doigt.
                        ⭐ CE QUE LE CLIC FAIT EST MODESTE ET ENTIER : il
                           désigne. Le tracé passe au trait plein, les deux
                           autres pâlissent, et on voit enfin OÙ va celui
                           qu'on lisait. Un second appui rend les trois.
                        ⛔ Il ne navigue pas, et c'est délibéré : les trois
                           propositions de `/promenades` sont recalculées
                           là-bas sur un graphe qui n'est pas le même (une
                           moitié de territoire, pas les deux soudées).
                           Emporter « la n° 2 » dans l'URL promettrait un
                           ordre que l'autre écran ne garantit pas. */}
                    <button
                      type="button"
                      className={propChoisie === k ? "terr-proposition terr-proposition-choisie" : "terr-proposition"}
                      aria-pressed={propChoisie === k}
                      onClick={() => setPropChoisie((avant) => (avant === k ? null : k))}
                    >
                    <span className="terr-proposition-rang" aria-hidden="true">{k + 1}</span>
                    <span className="terr-proposition-nom">{spotsPourComposer[p.i]?.n}</span>
                    {/* 🔴 EN MÈTRES, PAS EN KILOMÈTRES — 4/11/2026, arbitrage
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
                    </button>
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
            est parti le 4/11, parce qu'il rendait sa mention sous la barre
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

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
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAUT, TERRITOIRES, territoireDe, urlGraphe } from "./territoires";
import { chargerOT, type ItineraireOT } from "./ot";
import { chargerLieux, lienWiki, type Inventaire, type Lieu } from "./lieux";
import { libelleCategorie } from "./categories";
import { WALKS, VITRINE, effortLisible } from "./walks";
import type { Walk } from "./walks";
import { ILLUSTRATIONS } from "./illustrations";
import { Photo, image } from "./images/Photo";

type Graphe = {
  genere: string;
  territoire: string;
  attribution: string;
  n: [number, number][];
  a: [number, number, number, number, number[], (number | null)?, (number | null)?, (0 | 1)?][];
  l: { a: number; f: number; c: string; n: string; g: [number, number]; d: number }[];
};

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
  const [graphe, setGraphe] = useState<Graphe | null>(null);
  const [erreur, setErreur] = useState("");
  const [choisie, setChoisie] = useState<string | null>(null);
  const [rendu, setRendu] = useState(0);

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
  const [calquesOuverts, setCalquesOuverts] = useState(false);
  const [calques, setCalques] = useState({
    lieux: true, littoral: true, promenades: true, balises: true, sites: true,
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
  const vivant = useRef<{ sites: Lieu[]; inv: Inventaire | null }>({ sites: [], inv: null });
  const [vueTic, setVueTic] = useState(0);
  const [vueBougee, setVueBougee] = useState(false);
  const ZOOM_MIN = 1, ZOOM_MAX = 12;

  /* ⭐ DEUX TERRITOIRES, ET CELUI-CI SE CHOISIT — contrairement au
     compositeur, où la position tranche. Cet écran répond à « qu'y a-t-il
     ici ? » : il faut pouvoir regarder l'autre moitié sans y être. */
  const [terr, setTerr] = useState(() => (centre && territoireDe(centre[0], centre[1])) || DEFAUT);
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
  /* ⚠️ Tenue à jour À CHAQUE RENDU : c'est ce qui permet aux écouteurs posés
     une seule fois de lire l'inventaire d'aujourd'hui. */
  vivant.current = { sites: sitesIci, inv };

  const otIci = useMemo(
    () => ot.filter((i) => {
      const [lo, la] = i.p[0];
      return lo >= terr.emprise[0] && lo <= terr.emprise[2]
          && la >= terr.emprise[1] && la <= terr.emprise[3];
    }),
    [ot, terr],
  );

  useEffect(() => { document.title = "Le territoire — MANA"; }, []);

  useEffect(() => {
    let vivant = true;
    setGraphe(null); setErreur("");
    /* ⚠️ `setVise(null)` AVEC le changement de territoire : un lieu visé porte
       un index d'arête, et cet index ne désigne pas le même chemin dans
       l'autre graphe. Le garder ferait pointer la carte sur un tronçon au
       hasard — un défaut invisible, puisqu'il reste un repère à l'écran. */
    setVise(null);
    fetch(urlGraphe(BASE, terr))
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((g) => { if (vivant) setGraphe(g); })
      // ⚠️ Une erreur se DIT. Sans ce message, un refus réseau rendrait un
      //    écran vide et muet, et on conclurait qu'il n'y a rien ici.
      .catch(() => { if (vivant) setErreur("Le territoire n'a pas pu être chargé. Vérifiez votre connexion."); });
    return () => { vivant = false; };
  }, [terr]);

  /** Les promenades vérifiées qui tombent dans le territoire affiché. */
  const dIci = useMemo(
    () => VITRINE.filter((w) => {
      const p = w.points[0];
      return p && territoireDe(p.lon, p.lat)?.slug === terr.slug;
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
    const bas = (e: PointerEvent) => {
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
      for (const l of vivant.current.sites) {
        if (!l.n) continue;
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
      for (const l of vivant.current.sites) {
        if (!l.n) continue;
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
      const eau = jeton("--carte-eau", "#192b43");
      const trace = jeton("--carte-trace", "#c69a48");
      const lieu = jeton("--carte-lieu", "#c69a48");
      const depart = jeton("--carte-depart", "#eeebdd");
      const estran = jeton("--carte-estran", "#eeebdd");

      ctx.fillStyle = fond;
      ctx.fillRect(0, 0, W, H);

      const t0 = performance.now();

      // ── passe 1 : le réseau ordinaire, à peine là
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

      // le tout-venant : présent, jamais lu
      tracer((a) => (a[3] ?? 0) < 120, chemin, 0.6, 0.22);
      // ⭐ CE QUI REND LA CARTE DIFFÉRENTE : l'agrément décide de la présence.
      //    Un chemin plaisant se voit, une départementale s'efface. Aucune
      //    autre carte ne peut faire ça — l'agrément est notre donnée.
      tracer((a) => (a[3] ?? 0) >= 120, cheminBeau, 0.9, 0.55);
      /* ⚠️ LE CALQUE « LITTORAL » N'EST PAS UN FILTRE D'AFFICHAGE ORDINAIRE :
         c'est lui qui révèle la presqu'île. Sans lui, la carte reste juste
         mais la forme du territoire s'efface — on voit un réseau, plus une
         côte. L'éteindre est donc une vraie option de lecture, pas un
         caprice, et c'est pour ça qu'il mérite un interrupteur. */
      if (calques.littoral) {
        tracer((a) => a[5] != null && (a[5] as number) <= 120, eau, 1.5, 0.5);
        tracer((a) => a[5] != null && (a[5] as number) <= 60, estran, 0.8, 0.35);
      }

      // ── passe 2 : les promenades vérifiées
      /* ── les circuits balisés de l'Office ──────────────────────────────
         ⛔ DESSINÉS AVANT LES NÔTRES, ET PLUS DISCRETS. Ce ne sont pas nos
            tracés : ils ne doivent pas prendre la vedette sur la carte de
            MANA, et ils ne doivent pas non plus se confondre avec eux. Un
            trait plus fin, dans la sauge du végétal, et sous la couche des
            promenades vérifiées — l'ordre de dessin EST la hiérarchie. */
      /* ── les sites remarquables ────────────────────────────────────────
         ⚠️ DESSINÉS EN DERNIER, donc au-dessus de tout : ce sont eux qu'on
            vient chercher sur cet écran. Un point de 2,5 px, pas une
            pastille : mille trois cent cinquante-huit pastilles feraient une
            tache. ⭐ La densité EST l'information — on voit où le territoire
            est riche avant de lire un seul nom. */
      if (calques.sites && sitesIci.length) {
        ctx.fillStyle = trace;
        for (const l of sitesIci) {
          const x = X(l.g[0]), y = Y(l.g[1]);
          if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
          ctx.beginPath(); ctx.arc(x, y, l.n ? 2.6 : 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }

      if (calques.balises) {
        ctx.strokeStyle = cheminBeau;
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.75;
        for (const i of otIci) {
          ctx.beginPath();
          i.p.forEach(([lo, la], k) => {
            const x = X(lo), y = Y(la);
            if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

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

      // ── passe 3 : les lieux de la promenade choisie, et eux seuls
      if (walk && calques.lieux) {
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

      setRendu(Math.round(performance.now() - t0));
    };

    dessiner();
    const ro = new ResizeObserver(dessiner);
    ro.observe(b);
    return () => ro.disconnect();
  }, [graphe, choisie, walk, calques, vise, moi, vueTic, otIci, sitesIci]);

  return (
    <main className="terr">
      <div className="terr-carte" ref={boite}>
        {/* ⚠️ `aria-hidden` : le canvas ne porte aucune information qui ne soit
            pas aussi dans la liste en dessous. Le faire annoncer donnerait du
            bruit à qui n'y voit rien. */}
        <canvas ref={toile} aria-hidden="true" />
        {!graphe && !erreur && (
          <p className="terr-attente" role="status">Lecture du territoire…</p>
        )}
        {erreur && <p className="terr-attente terr-erreur" role="status">{erreur}</p>}

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
            {([
              ["littoral", "Le littoral", "la distance à la mer, par tronçon"],
              ["balises", "Les circuits balisés", "ceux de l'Office de tourisme"],
              ["sites", "Les sites remarquables", "mégalithes, plages, forts, fontaines…"],
              ["lieux", "Les lieux", "ce qu'on croise sur le parcours choisi"],
            ] as const).map(([clef, nom, quoi]) => (
              <label key={clef} className="terr-calque">
                <input
                  type="checkbox" checked={calques[clef]}
                  onChange={(e) => setCalques((c) => ({ ...c, [clef]: e.target.checked }))}
                />
                <span>
                  <span className="terr-calque-nom">{nom}</span>
                  <span className="m-meta">{quoi}</span>
                </span>
              </label>
            ))}
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
            <p className="terr-vise-dire">
              <a
                className="m-action-fine terr-bouton"
                href={`${base}/composer?vers=${vise.g[0].toFixed(5)},${vise.g[1].toFixed(5)}&nom=${encodeURIComponent(vise.nom)}`}
              >
                Composer une balade vers ce lieu
              </a>
            </p>
          </div>
        )}
      </div>

      {/* ══ LA FEUILLE ════════════════════════════════════════════════════
          ⚠️ LA POIGNÉE EST UN BOUTON, pas un trait décoratif. La maquette
             dessine une barre que l'on « tire » ; un glissement ne se fait ni
             au clavier ni au lecteur d'écran, et il ne se devine pas. On garde
             la forme de la poignée — elle dit « ça bouge » — et on lui donne
             le comportement qui marche pour tout le monde : un appui. */}
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
        <header className="terr-entete">
          <h1 className="terr-titre">Le territoire</h1>
          {/* ⛔ Deux onglets, pas une liste déroulante : il n'y a que deux
              territoires, et une liste cache la moitié de l'offre derrière un
              geste. Le jour où il y en a six, ceci change. */}
          <div className="terr-onglets" role="tablist" aria-label="Territoire">
            {TERRITOIRES.map((t) => (
              <button
                key={t.slug} type="button" role="tab"
                aria-selected={t.slug === terr.slug}
                className={t.slug === terr.slug ? "terr-onglet terr-onglet-actif" : "terr-onglet"}
                onClick={() => setTerr(t)}
              >
                {t.nom}
              </button>
            ))}
          </div>
          {graphe && (
            <p className="terr-mesure">
              {/* ⚠️ On annonce l'INVENTAIRE, pas les lieux accrochés au
                  réseau : le graphe n'en porte que ceux qui touchent un
                  chemin. Annoncer 495 quand on en dessine 1 358 ferait un
                  chiffre juste rapporté au mauvais objet. */}
              {graphe.a.length.toLocaleString("fr-FR")} tronçons
              {sitesIci.length > 0 && ` · ${sitesIci.length.toLocaleString("fr-FR")} sites remarquables`}
              {rendu > 0 && ` · dessiné en ${rendu} ms`}
            </p>
          )}
        </header>

        {/* ── LA RECHERCHE, SOUS LA CARTE ────────────────────────────────
            ⭐ Un <form> véritable : « Entrée » valide, le clavier mobile
               affiche « rechercher », et un lecteur d'écran annonce un
               formulaire. Une <div> avec un <input> ne fait rien de tout ça.
            ⭐ ELLE FLOTTAIT SUR LA CARTE — 31/10/2026. Un champ posé par-dessus
               masque le coin nord du territoire, et le clavier mobile qui monte
               recouvre ce qu'on vient de chercher. Sous la carte, elle ne cache
               rien, et la liste des résultats tombe dans le flux au lieu de
               flotter par-dessus le dessin. */}
        <form
          className="terr-recherche"
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

        {/* ⚠️ Les résultats vivent SOUS le champ, pas en modale : on doit
            pouvoir regarder la carte pendant qu'on lit la liste. */}
        {requete.trim().length >= 2 && !vise && (
          <ul className="terr-resultats" role="listbox" aria-label="Lieux trouvés">
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
                  <button type="button" className="terr-resultat" onClick={() => choisir(r)}>
                    <span className="terr-resultat-nom">{r.nom}</span>
                    <span className="m-meta">{r.detail}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}


        {/* ⭐ L'ALTERNATIVE ACCESSIBLE N'EST PAS UNE CONCESSION : c'est la même
            information, en liste. Choisir une promenade au clavier doit marcher
            aussi bien qu'au doigt sur la carte. */}
        {/* 🔴 LA LISTE SUIT LE TERRITOIRE. Sans ce filtre, « Les forts du
            goulet » s'affichait sous l'onglet Aulne maritime : quatre
            promenades de Roscanvel et Crozon proposées à quelqu'un qui
            regarde Pont-de-Buis. ⭐ Ajouter un onglet n'ajoute pas seulement
            une donnée : il requalifie TOUT ce qui est affiché à côté. */}
        {dIci.length === 0 ? (
          <p className="terr-mesure">
            Aucune promenade vérifiée sur ce territoire pour l'instant — la
            carte et la composition, elles, y fonctionnent.
          </p>
        ) : (
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

        <p className="terr-source">
          Chemins et lieux d'après OpenStreetMap, sous licence ODbL. Le relief
          et le trait de côte ne sont pas représentés : nous ne dessinons que ce
          que la donnée contient.
        </p>
      </section>
    </main>
  );
}

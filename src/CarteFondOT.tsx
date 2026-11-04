import { useEffect, useRef, useState } from "react";
// ⚠️ MAPLIBRE RESTE ÉPINGLÉE EN v4 — voir la note de `CarteReelle.tsx` : la v6
//    charge son worker par une URL relative qui, sous la base `/mana/`,
//    retombe sur l'index HTML. La carte s'affiche alors SANS AUCUNE TUILE et
//    sans erreur visible.
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { SOURCE_DE_BASE, STYLES, type Fond } from "./carte-fond";
import { picto } from "./pictos";
import { couleurCategorie } from "./categories";
import type { Lieu } from "./lieux";

/**
 * LE FOND OSM D'UNE CARTE DU JEU.
 *
 * ⭐ CE N'EST PAS `CarteReelle` AVEC MOINS D'OPTIONS, et c'est voulu. La carte
 *    de la fiche est un INSTRUMENT : on la déplace, on zoome, elle porte des
 *    repères et des commandes. Celle-ci est une IMAGE : on la regarde une
 *    seconde avant de trancher. Mélanger les deux donnerait soit une fiche
 *    amputée, soit un jeu dont chaque carte capte le geste.
 *
 * ⛔ `interactive: false` N'EST PAS UN RÉGLAGE DE CONFORT. Une carte vivante
 *    dans une carte qu'on fait glisser avale le `pointerdown` : le jeu cesse
 *    de répondre, et rien ne dit pourquoi. C'est la condition pour que le
 *    fond OSM et le glissement coexistent.
 *
 * ⚠️ UNE INSTANCE = UN CONTEXTE WebGL, et les navigateurs en plafonnent le
 *    nombre. Le jeu n'en allume donc que DEUX : la carte du dessus et la
 *    suivante — celle-ci pour qu'aucun fond ne « surgisse » au moment où elle
 *    arrive devant. Les cartes plus profondes gardent leur silhouette.
 */
export function CarteFondOT({
  p, lieux = [], serre = 18, basOcculte = 0, hautOcculte = 0, fond = "plan",
}: {
  p: [number, number][];
  /**
   * ⭐ LES SITES QUE LE TRACÉ LONGE, POSÉS LÀ OÙ ILS SONT. C'est ce que la
   *    fiche de l'Office ne montre pas, et ce qui fait de cette carte autre
   *    chose qu'une vignette : on voit le phare, la plage et le menhir à
   *    leur place sur le chemin.
   * ⛔ Chaque repère est à SA coordonnée, jamais déplacé pour être lisible :
   *    un picto poussé de cinquante mètres pour éviter un voisin envoie
   *    chercher autre chose que ce qui est là.
   */
  lieux?: Lieu[];
  /** le rembourrage du cadrage, en pixels — plus il est petit, plus le tracé
   *  remplit l'image */
  serre?: number;
  /**
   * 🔴 LA HAUTEUR QUE LA FEUILLE RECOUVRE, EN PIXELS.
   * ⭐ LA SURFACE VISIBLE DE LA CARTE N'EST PAS LA SURFACE DE LA CARTE. Depuis
   *    que la cartographie va à fond perdu, la feuille en couvre le bas ;
   *    cadrer sur la boîte entière centre le tracé derrière elle. Le
   *    rembourrage bas doit donc valoir ce qui est OCCULTÉ, pas zéro.
   * ⚠️ Et il se MESURE sur la feuille rendue : le recopier en dur ici le
   *    ferait mentir au premier titre sur deux lignes.
   */
  basOcculte?: number;
  /**
   * ⚠️ ET LE HAUT AUSSI. La barre de recherche flotte sur la carte : sans ce
   *    chiffre, le tracé passait DESSOUS et se trouvait coupé au bord haut —
   *    vu en production, après avoir corrigé le bas et cru l'affaire close.
   * ⭐ Une occultation corrigée d'un seul côté laisse exactement le même
   *    défaut, à l'autre bout de l'écran.
   */
  hautOcculte?: number;
  /** « plan » (tuiles vectorielles OSM) ou « ortho » (photographie IGN) */
  fond?: Fond;
}) {
  const plan = useRef<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const [prete, setPrete] = useState(false);

  /**
   * 🔴 ZÉRO TUILE DEMANDÉE, ET LA CARTE AVAIT L'AIR DE CHARGER. Mesuré en
   *    production : le style arrivait, le canvas existait, les sprites
   *    partaient — et pas une seule requête de tuile, jamais.
   *
   *    L'effet dépendait de `lieux`, `basOcculte` et `hautOcculte`. Le premier
   *    est un TABLEAU RECONSTRUIT À CHAQUE RENDU par le parent ; les deux
   *    autres bougent au gré du `ResizeObserver`. L'effet se démontait et se
   *    remontait sans fin : chaque carte neuve annulait les requêtes de la
   *    précédente (`AbortError` en console), et aucune n'avait le temps
   *    d'aboutir.
   *
   * ⭐ UNE DÉPENDANCE RECRÉÉE À CHAQUE RENDU TRANSFORME UN EFFET EN BOUCLE DE
   *    RECONSTRUCTION — et le symptôme n'est pas « ça boucle », c'est « rien
   *    ne s'affiche ». Le coût se lit en requêtes avortées, pas en lenteur.
   *
   * ⚠️ Ces trois valeurs ne décrivent PAS une carte différente : elles
   *    décrivent le même terrain, cadré autrement. Elles passent donc par des
   *    refs, et un second effet se contente de RECADRER. Seuls le tracé et le
   *    fond — ce qui change vraiment de carte — recréent l'instance.
   */
  const carte = useRef<maplibregl.Map | null>(null);
  const recadrer = useRef<() => void>(() => {});
  const vues = useRef({ lieux, basOcculte, hautOcculte, serre });
  vues.current = { lieux, basOcculte, hautOcculte, serre };

  useEffect(() => {
    if (!plan.current || p.length < 2) return;
    setPrete(false);

    const m = new maplibregl.Map({
      container: plan.current,
      style: STYLES[fond],
      center: p[0],
      zoom: 11,
      interactive: false,
      attributionControl: false,
      // ⚠️ `fadeDuration: 0` : sur une carte qu'on ne regarde qu'une seconde,
      //    le fondu par défaut des étiquettes (300 ms) se voit comme un défaut
      //    d'affichage plutôt que comme une transition.
      fadeDuration: 0,
    });

    const trait = () => svg.current?.querySelector<SVGPathElement>("#ot-trait");
    const sous = () => svg.current?.querySelector<SVGPathElement>("#ot-sous");
    const dep = () => svg.current?.querySelector<SVGGElement>("#ot-depart");

    const redessiner = () => {
      const t = trait(), s = sous(), d = dep();
      if (!t || !s) return;
      // ⚠️ UN SEUL SOUS-CHEMIN ICI, contrairement à la fiche : un GPX de
      //    l'Office est un tracé CONTINU relevé d'un bout à l'autre, pas un
      //    assemblage de portions de la base. Le piège de la droite à travers
      //    la Bretagne n'existe pas sur cette donnée — et le gate de
      //    `scripts/ot-gpx.mjs` refuserait un fichier qui sauterait.
      const dd = "M " + p.map((c) => {
        const q = m.project(c);
        return `${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      }).join(" L ");
      s.setAttribute("d", dd);
      t.setAttribute("d", dd);
      if (d) {
        const q = m.project(p[0]);
        d.setAttribute("transform", `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`);
      }
      /* ⚠️ Les repères sont REPROJETÉS à chaque rendu, comme le tracé — ils ne
         sont pas ajoutés au style maplibre. Toucher au style pendant son
         chargement le casse en silence (note de `CarteReelle`). */
      const g = svg.current?.querySelectorAll<SVGGElement>("[data-lieu]");
      g?.forEach((el) => {
        const lo = Number(el.dataset.lon), la = Number(el.dataset.lat);
        const q = m.project([lo, la]);
        el.setAttribute("transform", `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`);
      });
    };

    const cadrer = () => {
      const { lieux, basOcculte, hautOcculte, serre } = vues.current;
      m.resize();
      let loMin = Infinity, loMax = -Infinity, laMin = Infinity, laMax = -Infinity;
      for (const [lo, la] of p) {
        if (lo < loMin) loMin = lo; if (lo > loMax) loMax = lo;
        if (la < laMin) laMin = la; if (la > laMax) laMax = la;
      }
      /* ⚠️ LE CADRAGE DOIT AUSSI CONTENIR LES REPÈRES. Un site à 140 m du
         tracé peut tomber hors de la boîte du tracé : son picto se peindrait
         au bord, à moitié coupé, et à une position fausse à l'œil. */
      for (const l of lieux) {
        if (l.g[0] < loMin) loMin = l.g[0]; if (l.g[0] > loMax) loMax = l.g[0];
        if (l.g[1] < laMin) laMin = l.g[1]; if (l.g[1] > laMax) laMax = l.g[1];
      }
      m.fitBounds([[loMin, laMin], [loMax, laMax]], {
        padding: {
          top: serre + hautOcculte, left: serre, right: serre,
          bottom: serre + basOcculte,
        },
        duration: 0,
      });
      redessiner();
    };

    m.on("render", redessiner);

    /* 🔴 LE FOND NE SE DÉCLARE PRÊT QUE SI DES TUILES SONT VRAIMENT ARRIVÉES.
       ⭐ « Une carte muette ressemble à une carte qui charge » — et sans
          garde elle lui ressemble encore plus, puisqu'elle recouvre la
          silhouette d'un rectangle uni. En développement, `mana.bzh` répond
          200 mais sans `access-control-allow-origin` : la liste blanche ne
          connaît que la production. Rien n'est visible à l'écran.

       🔴 PREMIER GARDE : `areTilesLoaded()`. Il a dit OUI alors qu'aucune
          tuile n'était arrivée — il répond « plus aucune requête en
          attente », ce qui est vrai aussi quand elles ont TOUTES échoué.

       🔴 DEUXIÈME GARDE : `queryRenderedFeatures().length > 0`. Juste pour un
          fond VECTORIEL, et faux pour une PHOTOGRAPHIE : une image n'a aucune
          entité. Mesuré en production le 31/10 — 48 tuiles aériennes peintes,
          le garde refusait, et la carte restait cachée sous sa silhouette.
          ⭐ Un garde calibré sur une matière refuse l'autre. Celui-là avait
             raison de refuser le cas que je lui avais montré, et tort sur
             celui que je ne lui avais pas montré.

       ⭐ LA QUESTION QUI VAUT POUR LES DEUX : une tuile a-t-elle été ACCEPTÉE ?
          maplibre émet `data` avec `dataType === "source"` et un `tile` quand
          elle entre dans la carte — jamais quand elle a échoué. C'est le seul
          signal qui porte sur ce qui est peint, raster ou vecteur.
       ⚠️ Et l'échec se VERROUILLE : une minuterie qui repasse à « prêt » après
          une erreur remettrait le rectangle uni par-dessus la silhouette. */
    let echoue = false;
    let tuiles = 0;
    /* ⚠️ ON NE COMPTE QUE LES TUILES DE LA SOURCE QUI PEINT LE SOL. Compter
       toutes les sources laissait l'ombrage du relief — ou n'importe quoi
       d'autre — répondre à la place du fond : mesuré, « prêt » avec zéro
       tuile vectorielle, et la silhouette (vraie) recouverte par une carte
       vide (fausse). */
    const base = SOURCE_DE_BASE[fond];
    m.on("data", (e) => {
      const d = e as { dataType?: string; sourceId?: string; tile?: unknown };
      if (d.dataType === "source" && d.sourceId === base && d.tile) tuiles++;
    });
    const peutMontrer = () => {
      if (echoue) return;
      if (tuiles > 0 && m.areTilesLoaded()) setPrete(true);
    };
    m.on("error", () => { echoue = true; setPrete(false); });
    m.once("idle", peutMontrer);
    /* ⚠️ On expose le cadrage sur le nœud : c'est le seul moyen de savoir,
       DEPUIS LA PAGE EN LIGNE, à quel zoom la carte s'est posée. Sans lui,
       une carte sans tuiles et une carte au mauvais zoom se ressemblent. */
    const noter = () => {
      if (plan.current) {
        plan.current.dataset.zoom = m.getZoom().toFixed(2);
        plan.current.dataset.tuiles = String(tuiles);
      }
    };
    m.on("moveend", noter);
    m.on("idle", noter);

    const minuteries = [120, 600, 1600].map((t) =>
      window.setTimeout(() => { cadrer(); peutMontrer(); noter(); }, t));
    const ro = new ResizeObserver(cadrer);
    ro.observe(plan.current);

    /* 🔴 CES DEUX LIGNES ÉTAIENT ÉCRITES APRÈS LE `return` — donc jamais
       exécutées. `carte.current` restait nul et `recadrer.current` un
       no-op : le second effet ne recadrait jamais rien, en silence.
       ⭐ Du code mort après un `return` ne se signale pas : ni le
          compilateur, ni les tests, ni l'écran. Seule la relecture le voit. */
    carte.current = m;
    recadrer.current = cadrer;
    /* ⚠️ UNE POIGNÉE SUR LE NŒUD, et c'est un outil de diagnostic assumé.
       Depuis une page EN LIGNE, on ne peut interroger ni l'état d'une source
       ni le compte de tuiles : `performance` ne voit pas ce que le worker de
       maplibre demande, et une capture d'écran n'est pas toujours possible.
       Sans poignée, « carte vide », « mauvais zoom » et « tuiles refusées »
       se ressemblent exactement. Elle n'expose aucune donnée personnelle et
       ne change rien au rendu. */
    (plan.current as HTMLDivElement & { __carte?: unknown }).__carte = m;


    return () => {
      minuteries.forEach(window.clearTimeout);
      ro.disconnect();
      // ⚠️ `remove()` libère le contexte WebGL. Sans lui, quarante-six
      //    glissements saturent le plafond du navigateur et les dernières
      //    cartes restent blanches.
      m.remove();
      carte.current = null;
    };
  /* ⚠️ `p` et `fond` SEULEMENT. Tout le reste passe par `vues` — voir la note
     au-dessus : une dépendance qui change à chaque rendu reconstruit la carte
     au lieu de la régler. */
  }, [p, fond]);

  /* Le second effet : il RECADRE, il ne reconstruit pas. */
  useEffect(() => {
    if (carte.current) recadrer.current();
  }, [lieux, basOcculte, hautOcculte, serre]);

  return (
    <div className={`${prete ? "ot-fond ot-fond-prete" : "ot-fond"} ot-fond-${fond}`}>
      <div className="ot-plan" ref={plan} />
      <svg className="ot-calque" ref={svg} aria-hidden="true">
        <path id="ot-sous" />
        <path id="ot-trait" />
        {/* ⭐ Les repères AVANT le départ : celui-ci est le seul qui ne doit
            jamais passer dessous — c'est par lui qu'on commence à marcher. */}
        {lieux.map((l) => (
          <g key={l.osm} className="ot-lieu" data-lieu data-lon={l.g[0]} data-lat={l.g[1]}>
            {/* 🔴 UNE COULEUR PAR GENRE — 4/11/2026, demande du fondateur :
                le même changement que sur /carte (maplibre, `sites-genre`),
                déployé ici depuis la MÊME table (`couleurCategorie`,
                categories.ts) plutôt que recopié. */}
            <circle className="ot-lieu-fond" r="13" style={{ stroke: couleurCategorie(l.c) }} />
            {/* ⚠️ Le picto est dessiné sur une grille de 24 : on le recentre
                et on le réduit à 15 px, sinon il déborde de sa pastille. */}
            <path className="ot-lieu-picto" d={picto(l.c)}
                  transform="translate(-7.5 -7.5) scale(0.625)" />
          </g>
        ))}
        <g id="ot-depart" className="ot-depart">
          <circle className="ot-depart-halo" r="12" />
          <circle className="ot-depart-coeur" r="5" />
        </g>
      </svg>
    </div>
  );
}

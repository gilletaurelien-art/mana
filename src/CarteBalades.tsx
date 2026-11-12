import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { ATTRIBUTION, STYLES, type Fond } from "./carte-fond";
import type { ItineraireOT } from "./ot";

/**
 * LA CARTE DU FINISTÈRE AVEC TOUS LES CIRCUITS — 12/11/2026.
 *
 * 🔴 DEMANDE DU FONDATEUR : « la carte à afficher est celle du Finistère avec
 *    tous les tracés de balade. Chaque tracé est cliquable. » Jusque-là,
 *    `/balades-office` ouvrait sur un JEU DE CARTES qui montrait un circuit à
 *    la fois : pour savoir s'il y a une balade près de chez soi, il fallait
 *    feuilleter cent seize fiches.
 * ⭐ Le jeu de cartes n'est pas perdu — il reste l'écran « Balades » de
 *    `/carte`, où il a sa place : on y feuillette, ici on balaie.
 *
 * ⭐ LES TRACÉS VONT DANS MAPLIBRE, PAS DANS UN SVG PAR-DESSUS. C'est le
 *    choix déjà fait le 4/11 pour le calque `ot-trace` de la carte du
 *    territoire, et pour la même raison : un tracé posé à ses coordonnées
 *    RÉELLES dans la carte ne peut pas diverger du fond, quel que soit le
 *    zoom. Un calque dessiné à côté se recale à chaque image et finit par
 *    décaler d'un pixel au mauvais moment. ⚠️ Et à 116 tracés, reprojeter
 *    28 061 points à la main à chaque rendu serait payé en images perdues.
 *
 * ⛔ QUATRE COUCHES POUR UNE LIGNE, ET AUCUNE N'EST DÉCORATIVE :
 *    · `balades-cible` — large de 18 px, transparente : un trait de 2 px ne
 *      se touche pas au pouce. La règle des 44 px vaut aussi pour une ligne,
 *      et c'est déjà ce que `CarteReelle` fait avec son `trace-cible`.
 *    · `balades-gaine` — le HALO BLANC et continu sous le doré. 🔴 Il est né
 *      d'une mesure : l'ocre `#c69a48` sur le fond clair du plan donne
 *      **2,17 pour 1**. Un trait doré seul se perdrait sur la craie des
 *      champs et le sable des grèves — et d'autant plus qu'il est POINTILLÉ,
 *      donc interrompu la moitié du temps. Le halo porte le chemin, le doré
 *      y court. ⚠️ Il était OLIVE jusqu'au 12/11 : le fondateur l'a voulu
 *      blanc, et le blanc fait mieux le travail — il détoure au lieu
 *      d'assombrir, donc il sépare des verts comme des bleus.
 *    · `balades-trace` — le doré qui court (voir le pointillé animé).
 *    · `balades-choisi` — le circuit qu'on tient, plus clair et CONTINU :
 *      deux circuits se croisent forcément, celui qu'on tient doit passer
 *      au-dessus sinon on le perd au croisement. ⭐ Il ne court PAS : ce qui
 *      bouge attire l'œil, et l'œil doit aller à ce qu'on a choisi, pas au
 *      reste.
 *
 * 🔴 LE DORÉ QUI COURT — 12/11/2026, demande du fondateur : « plutôt que du
 *    vert kaki pour les tracés, affiche notre doré, et donne-lui un effet
 *    tournant, sur chaque balade ». maplibre ne sait pas décaler un
 *    pointillé ; la façon de le faire tourner est de CHANGER le motif, pas
 *    de le déplacer — quatorze états qui s'enchaînent, et le trait semble
 *    s'écouler. C'est la seule manière d'animer une ligne sans repeindre la
 *    géométrie à chaque image.
 * ⚠️ ET ELLE S'ARRÊTE POUR QUI DEMANDE MOINS DE MOUVEMENT. Cent seize
 *    chemins qui ondulent en permanence, c'est beaucoup d'écran qui bouge —
 *    le doré reste, en trait plein ; c'est le mouvement qui part. Respecter
 *    une préférence, c'est immobiliser, pas supprimer.
 *
 * ⚠️ LA SOURIS N'EST PAS LE SEUL DOIGT, et une couche maplibre ne se
 *    focalise pas au clavier. Ce n'est pas un oubli : le chemin clavier de
 *    cet écran est la LISTE, sous la carte — chaque ligne est un lien, et
 *    choisir dans la liste allume le tracé ici. Les deux surfaces commandent
 *    le même état.
 */
/**
 * LES QUATORZE ÉTATS DU POINTILLÉ — le doré qui court.
 *
 * ⭐ maplibre ne sait pas décaler un pointillé : il n'a pas d'équivalent au
 *    `stroke-dashoffset` du SVG. On fait donc tourner le MOTIF lui-même —
 *    le trait grandit, le vide recule, puis l'inverse — et l'œil lit un
 *    écoulement. Les valeurs sont en multiples de la largeur du trait.
 * ⚠️ La séquence doit BOUCLER : le dernier état doit enchaîner sur le
 *    premier sans saut, sinon le chemin « repart en arrière » une fois par
 *    tour, et on voit le défaut plutôt que le mouvement.
 */
const MOTIFS: number[][] = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5],
  [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5],
  [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
];

/** ⛔ « REDUCE » SE DEMANDE AU SYSTÈME, PAS À NOUS. Cent seize chemins qui
 *  ondulent en permanence, c'est beaucoup d'écran qui bouge — et pour qui a
 *  demandé moins de mouvement, c'est une gêne, parfois un malaise. Le doré
 *  reste, en trait plein ; c'est le mouvement qui part. */
const MOUVEMENT_VOULU = () => {
  try { return !window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  catch { return true; }
};

export function CarteBalades({
  circuits, fond, choisi, onChoisir, hauteur = 420,
}: {
  circuits: ItineraireOT[];
  fond: Fond;
  choisi: string | null;
  onChoisir: (slug: string | null) => void;
  hauteur?: number | string;
}) {
  const plan = useRef<HTMLDivElement | null>(null);
  const carte = useRef<maplibregl.Map | null>(null);
  const [prete, setPrete] = useState(false);

  /* ⚠️ `circuits` ET `onChoisir` PASSENT PAR DES REFS, et c'est le correctif
     que `CarteFondOT` a payé en production : une dépendance reconstruite à
     chaque rendu — un tableau filtré, une fonction fléchée — transforme
     l'effet en boucle de reconstruction. Le symptôme n'est pas « ça rame »,
     c'est « rien ne s'affiche » : chaque carte neuve annule les requêtes de
     tuiles de la précédente, et aucune n'a le temps d'aboutir. */
  const vus = useRef({ circuits, onChoisir, choisi });
  vus.current = { circuits, onChoisir, choisi };
  /**
   * 🔴 « LA PERSONNE A-T-ELLE TOUCHÉ LA CARTE ? » — et c'est ce qui décide
   *    si un redimensionnement a le droit de recadrer.
   *
   * ⚠️ MESURÉ À L'ÉCRAN : au premier rendu, la vue était plus large que les
   *    tracés. `fitBounds` s'exécute dans `load`, c'est-à-dire AVANT que la
   *    bannière ait fini de se poser — les deux rangées de pastilles
   *    peuvent passer sur deux lignes et changer la hauteur du conteneur
   *    après coup. Le cadrage était donc calculé contre une boîte périmée.
   * ⭐ Les cartes NON INTERACTIVES de ce dépôt recadrent à chaque
   *    redimensionnement (`CarteReelle`, `CarteFondOT`) et s'en portent
   *    bien. Celle-ci s'explore : recadrer après que quelqu'un a zoomé
   *    ramènerait son écran de force. On recadre donc tant que personne n'a
   *    touché, et plus jamais ensuite.
   */
  const touche = useRef(false);
  /** la minuterie du pointillé — une seule, arrêtée avec la carte */
  const battement = useRef<number | null>(null);

  useEffect(() => {
    if (!plan.current) return;
    setPrete(false);
    const anime = MOUVEMENT_VOULU();
    const m = new maplibregl.Map({
      container: plan.current,
      style: STYLES[fond],
      center: [-4.3, 48.4],
      zoom: 8,
      /* ⭐ INTERACTIVE, contrairement aux vignettes de cette application :
         c'est une carte qu'on explore, pas une image. */
      attributionControl: false,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    carte.current = m;

    m.on("load", () => {
      m.addSource("balades", { type: "geojson", data: geo(vus.current.circuits) });
      m.addLayer({
        id: "balades-cible", type: "line", source: "balades",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#000000", "line-width": 18, "line-opacity": 0 },
      });
      /* 🔴 LA GAINE EST BLANCHE DEPUIS LE 12/11/2026 — demande du fondateur :
         « supprime le vert kaki dans les liserés tournants des parcours,
         remplace par du blanc ». Elle était en `--bulle-unie`, l'olive des
         bulles.
         ⭐ ET SON MÉTIER CHANGE AVEC SA COULEUR. L'olive ASSOMBRISSAIT le
            chemin pour que le doré s'y détache ; le blanc le DÉTOURE — c'est
            un halo, le geste classique des cartes pour séparer une ligne de
            tout ce qu'elle traverse. Il sépare le doré des verts des champs,
            des bleus de la mer et des blancs des routes, ce que l'olive ne
            faisait que d'un seul côté du spectre.
         ⚠️ Plus opaque que l'olive (0,8 contre 0,55) : un halo à demi
            transparent laisse remonter la couleur qu'il doit écarter. */
      m.addLayer({
        id: "balades-gaine", type: "line", source: "balades",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ffffff", "line-width": 4.2, "line-opacity": 0.8 },
      });
      /* le doré : `--ocre`. ⚠️ Écrit en littéral parce qu'une propriété de
         peinture maplibre ne lit pas une variable CSS — c'est déjà le cas du
         calque `ot-trace` de la carte du territoire. Le jeton reste la
         source : si `--ocre` change, cette ligne se change avec lui. */
      m.addLayer({
        id: "balades-trace", type: "line", source: "balades",
        /* ⚠️ BOUT CARRÉ SUR LA COUCHE POINTILLÉE, et ce n'est pas un choix
           d'allure. Un `line-cap: round` arrondit CHAQUE tiret : à cette
           largeur les bouts se rejoignent et le pointillé redevient un trait
           plein — l'animation existerait et ne se verrait pas. La gaine, en
           dessous, garde ses bouts ronds : c'est elle qui donne au chemin sa
           continuité. */
        layout: { "line-join": "round", "line-cap": "butt" },
        paint: {
          "line-color": "#c69a48", "line-width": 2.4,
          ...(anime ? { "line-dasharray": MOTIFS[0] } : {}),
        },
      });
      /* le tenu : `--ocre-clair`, plus large et CONTINU */
      m.addLayer({
        id: "balades-choisi", type: "line", source: "balades",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#dcb86e", "line-width": 5 },
        filter: ["==", ["get", "slug"], vus.current.choisi ?? ""],
      });

      /* ⚠️ UNE SEULE MINUTERIE POUR LES CENT SEIZE CHEMINS — c'est une
         propriété de PEINTURE du calque, pas un état par entité. Et elle bat
         à 14 images par seconde, pas à 60 : le pas du motif se voit, pas la
         fréquence, et chaque pas coûte un rendu de carte. */
      if (anime) {
        let i = 0;
        battement.current = window.setInterval(() => {
          i = (i + 1) % MOTIFS.length;
          if (m.getLayer("balades-trace")) {
            m.setPaintProperty("balades-trace", "line-dasharray", MOTIFS[i]);
          }
        }, 70);
      }

      m.on("click", "balades-cible", (e) => {
        const f = e.features?.[0];
        const slug = f?.properties?.slug as string | undefined;
        if (slug) vus.current.onChoisir(slug);
      });
      /* ⚠️ UN CLIC À CÔTÉ DÉSÉLECTIONNE. Sans ça, la bulle d'un circuit reste
         ouverte pendant qu'on explore ailleurs, et on la prend pour ce qu'on
         regarde. */
      m.on("click", (e) => {
        const sous = m.queryRenderedFeatures(e.point, { layers: ["balades-cible"] });
        if (!sous.length) vus.current.onChoisir(null);
      });
      /* ⛔ DÈS QU'ON DÉPLACE OU QU'ON ZOOME, LA CARTE EST À LA PERSONNE.
         `dragstart`/`zoomstart`/`rotatestart` ne se déclenchent que sur un
         geste — `fitBounds` et `resize`, eux, ne les émettent pas. */
      for (const ev of ["dragstart", "zoomstart", "rotatestart"] as const) {
        m.on(ev, () => { touche.current = true; });
      }
      m.on("mouseenter", "balades-cible", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "balades-cible", () => { m.getCanvas().style.cursor = ""; });

      cadrer(m, vus.current.circuits);
      setPrete(true);
    });

    const ro = new ResizeObserver(() => {
      m.resize();
      if (!touche.current) cadrer(m, vus.current.circuits);
    });
    ro.observe(plan.current);
    return () => {
      if (battement.current !== null) window.clearInterval(battement.current);
      battement.current = null;
      ro.disconnect(); m.remove(); carte.current = null; setPrete(false);
    };
    /* ⚠️ SEUL LE FOND RECRÉE LA CARTE : c'est la seule prop qui change
       vraiment de carte. Les circuits changent de DONNÉE, pas d'instance. */
  }, [fond]);

  /* ── la donnée suit les filtres, sans reconstruire quoi que ce soit ──── */
  useEffect(() => {
    const m = carte.current;
    if (!m || !prete) return;
    (m.getSource("balades") as maplibregl.GeoJSONSource | undefined)?.setData(geo(circuits));
    /* ⚠️ ET LE CADRAGE SUIT LE FILTRE. Choisir « Abers » en gardant la vue du
       Finistère entier laisse dix-sept tracés dans un coin : le filtre aurait
       l'air de n'avoir rien fait. */
    /* ⚠️ Le filtre RECADRE même si la personne a déplacé la carte : changer
       de pays est une demande explicite de regarder ailleurs, pas un
       accident de mise en page. Les deux cas ne se valent pas. */
    cadrer(m, circuits);
  }, [circuits, prete]);

  /* ── le tracé choisi s'allume, sans toucher à la source ─────────────── */
  useEffect(() => {
    const m = carte.current;
    if (!m || !prete || !m.getLayer("balades-choisi")) return;
    m.setFilter("balades-choisi", ["==", ["get", "slug"], choisi ?? ""]);
  }, [choisi, prete]);

  return (
    <figure className="carte-balades">
      <div className="carte-balades-plan" style={{ height: hauteur }} ref={plan} />
      {/* ⛔ L'ATTRIBUTION EST VISIBLE ET SUIT LE FOND. `attributionControl:
          false` la retire de maplibre : c'est alors à l'écran de la porter.
          Créditer OpenStreetMap sous une photographie de l'IGN serait faux
          dans les deux sens — on citerait qui n'a rien fourni, et on tairait
          qui a fourni. */}
      <figcaption className="carte-balades-credit">
        {ATTRIBUTION[fond]} — tracés des Offices de tourisme
      </figcaption>
    </figure>
  );
}

/** Les circuits en GeoJSON. ⚠️ `slug` voyage dans les propriétés : c'est lui
 *  que le clic rend, et c'est la seule chose qui relie un trait à sa fiche. */
function geo(circuits: ItineraireOT[]) {
  return {
    type: "FeatureCollection" as const,
    features: circuits
      .filter((i) => i.p.length > 1)
      .map((i) => ({
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: i.p },
        properties: { slug: i.slug, titre: i.titre },
      })),
  };
}

/** ⚠️ LE CADRAGE SE CALCULE SUR LA DONNÉE AFFICHÉE, jamais sur une emprise
 *  écrite en dur. « Le Finistère » n'est pas une boîte qu'on recopie : c'est
 *  ce que couvrent les circuits qu'on montre, et ça change avec les filtres
 *  comme avec le prochain office qui s'ajoutera. */
function cadrer(m: maplibregl.Map, circuits: ItineraireOT[]) {
  let loMin = Infinity, loMax = -Infinity, laMin = Infinity, laMax = -Infinity;
  for (const i of circuits) {
    for (const [lo, la] of i.p) {
      if (lo < loMin) loMin = lo; if (lo > loMax) loMax = lo;
      if (la < laMin) laMin = la; if (la > laMax) laMax = la;
    }
  }
  if (!Number.isFinite(loMin)) return;
  m.fitBounds([[loMin, laMin], [loMax, laMax]], { padding: 28, duration: 0 });
}

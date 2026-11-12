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
 * ⛔ TROIS COUCHES POUR UNE LIGNE, ET AUCUNE N'EST DÉCORATIVE :
 *    · `balades-cible` — large de 18 px, transparente : un trait de 2 px ne
 *      se touche pas au pouce. La règle des 44 px vaut aussi pour une ligne,
 *      et c'est déjà ce que `CarteReelle` fait avec son `trace-cible`.
 *    · `balades-trace` — le trait qu'on voit.
 *    · `balades-choisi` — le même, par-dessus, en or : deux circuits se
 *      croisent forcément, celui qu'on tient doit passer au-dessus sinon on
 *      le perd au croisement.
 *
 * ⚠️ LA SOURIS N'EST PAS LE SEUL DOIGT, et une couche maplibre ne se
 *    focalise pas au clavier. Ce n'est pas un oubli : le chemin clavier de
 *    cet écran est la LISTE, sous la carte — chaque ligne est un lien, et
 *    choisir dans la liste allume le tracé ici. Les deux surfaces commandent
 *    le même état.
 */
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

  useEffect(() => {
    if (!plan.current) return;
    setPrete(false);
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
      m.addLayer({
        id: "balades-trace", type: "line", source: "balades",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#4c4528", "line-width": 2.2, "line-opacity": 0.85 },
      });
      m.addLayer({
        id: "balades-choisi", type: "line", source: "balades",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#c69a48", "line-width": 4.5 },
        filter: ["==", ["get", "slug"], vus.current.choisi ?? ""],
      });

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
    return () => { ro.disconnect(); m.remove(); carte.current = null; setPrete(false); };
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

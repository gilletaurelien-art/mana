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
import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as CarteML } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { STYLE_CARTE as STYLE } from "./carte-fond";
/* ⭐ L'arithmétique vit dans `tuiles.ts`, qui s'éprouve sans navigateur —
   voir l'en-tête de ce fichier-là : un volet masqué fabrique un écran noir
   et interdit de conclure, il n'interdit pas de vérifier autrement. */
import { Z, tuilesDuCadre } from "./tuiles";

const BASE = (import.meta.env.VITE_GRAPHE_BASE ?? "https://mana.bzh/bretagne/g")
  .replace(/\/bretagne\/g$/, "")
  .replace(/\/monde\/g$/, "");
const TUILES = `${BASE}/monde/s`;

interface Site { n: string; c: string; g: [number, number]; a?: 1 }

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

export function CarteMonde() {
  const boite = useRef<HTMLDivElement | null>(null);
  const carte = useRef<CarteML | null>(null);
  const [choisi, setChoisi] = useState<Site | null>(null);
  const [mot, setMot] = useState("");

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
    const lues = new Set<string>();
    const points: GeoJSON.Feature[] = [];
    const m = new maplibregl.Map({
      container: boite.current, style: STYLE,
      center: [6.27, 49.83], zoom: 8, attributionControl: false,
    });
    carte.current = m;
    /* ⚠️ UNE PRISE DE MESURE, EN DÉVELOPPEMENT SEULEMENT. Sans elle, « les
       points ne s'affichent pas » ne se distingue pas de « les points ne sont
       pas chargés » : on ne peut ni compter la source, ni interroger la
       couche depuis la console. Elle disparaît du build de production. */
    if (import.meta.env.DEV) {
      const w = window as unknown as { __carteMonde?: CarteML; __n?: number; __trace?: string[] };
      w.__n = (w.__n ?? 0) + 1;
      (m as unknown as { __id: number }).__id = w.__n;
      (w.__trace ??= []).push(`carte #${w.__n} créée`);
      w.__carteMonde = m;
    }
    m.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    /* 🔴 `load` PEUT ÊTRE DÉJÀ PASSÉ — mesuré le 14/11/2026, et c'est ce qui
       a tenu la carte vide une demi-heure. En développement, `StrictMode`
       crée la carte #1, la détruit, puis crée la #2 ; le style est alors en
       cache et son chargement se termine AVANT que mon écouteur ne soit
       attaché. Résultat : `isStyleLoaded()` vrai, et pourtant ni source
       `sites`, ni couche, ni chargement de tuiles — la trace s'arrêtait net
       sur « carte #2 créée ».
       ⭐ Un événement qu'on attend sans demander s'il est DÉJÀ survenu est
          une attente qui peut ne jamais finir. On fait les deux. */
    const installer = () => {
      m.addSource("sites", { type: "geojson",
        data: { type: "FeatureCollection", features: [] } });
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
        if (p && g) setChoisi({ n: p.n, c: p.c, g: [g[0], g[1]], ...(p.a ? { a: 1 } : {}) });
      });
      m.on("mouseenter", "sites", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "sites", () => { m.getCanvas().style.cursor = ""; });
      charger();
    };
    /* 🔴 TROIS CHEMINS VERS LE MÊME MONTAGE, ET AUCUN N'EST DE TROP —
       mesuré deux fois le 14/11/2026. Après que `StrictMode` a créé puis
       détruit une première carte, la seconde arrive dans un état où
       `isStyleLoaded()` est encore FAUX à la construction (donc on s'abonne
       à `load`) et où `load` n'arrive JAMAIS — alors que `isStyleLoaded()`
       devient vrai quelques instants plus tard. Symptôme : style peint ou
       non selon la chance, sources réduites à celles du fond, zéro point, et
       une trace qui s'arrête sur « carte #2 créée ».
       ⭐ `styledata` est l'événement qui, lui, se répète : il suffit d'y
          regarder si le style est prêt. Et `installe` garde la porte pour que
          les trois chemins ne montent qu'une fois. */
    let installe = false;
    const tenter = () => {
      if (installe || !m.isStyleLoaded()) return;
      installe = true;
      installer();
    };
    m.on("load", tenter);
    m.on("styledata", tenter);
    tenter();
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
    const redimensionner = () => { m.resize(); };
    const ro = new ResizeObserver(redimensionner);
    if (boite.current) ro.observe(boite.current);
    const minuteries = [120, 600, 1600].map((d) => window.setTimeout(redimensionner, d));

    /** Charge les tuiles du cadre visible, et seulement celles-là. */
    async function charger() {
      /* ⚠️ RIEN AVANT LA SOURCE. `moveend` arrive avant `load` quand on
         redimensionne tôt ; charger sans source remplirait le cache pour
         rien. La condition est l'existence de la source, pas un drapeau. */
      if (!m.getSource("sites")) return;
      if (import.meta.env.DEV) {
        const w = window as unknown as { __trace?: string[] };
        (w.__trace ??= []).push(`#${(m as unknown as { __id?: number }).__id} charger z=${m.getZoom().toFixed(1)}`);
      }
      const b = m.getBounds();
      const choix = tuilesDuCadre(
        { ouest: b.getWest(), est: b.getEast(), nord: b.getNorth(), sud: b.getSouth() },
        m.getZoom());
      if (choix.etat !== "ok") {
        setMot(choix.etat === "loin"
          ? "Approchez pour voir les sites — la carte les charge par quartiers."
          : "Approchez encore un peu — la zone est trop large pour être chargée d'un coup.");
        return;
      }
      setMot("");
      let neuf = 0;
      {
        for (const [x, y] of choix.tuiles) {
          const clef = `${x}/${y}`;
          if (lues.has(clef)) continue;
          lues.add(clef);
          try {
            const r = await fetch(`${TUILES}/${Z}/${x}/${y}.json`);
            if (!r.ok) continue;            // tuile vide : il n'y a rien ici
            const t = (await r.json()) as { l: Site[] };
            for (const s of t.l) {
              points.push({
                type: "Feature",
                geometry: { type: "Point", coordinates: s.g },
                properties: { n: s.n, c: s.c, ...(s.a ? { a: 1 } : {}) },
              });
            }
            neuf++;
          } catch { /* une tuile manquante n'est pas une panne */ }
        }
      }
      if (import.meta.env.DEV) {
        const w = window as unknown as { __trace?: string[] };
        (w.__trace ??= []).push(`#${(m as unknown as { __id?: number }).__id} neuf=${neuf} points=${points.length}`);
      }
      if (neuf) {
        /* 🔴 CE `?.` AVALAIT L'ÉCHEC — et il m'a coûté une demi-heure. Écrit
           `getSource("sites")?.setData(...)`, il ne fait RIEN quand la source
           n'existe pas encore, sans un mot. Or `moveend` peut survenir AVANT
           `load` (mes propres rappels de redimensionnement en déclenchent un
           à 120 ms) : la source n'est pas posée, les tuiles sont pourtant
           notées comme lues, et le `charger` qui suit `load` n'a plus rien à
           charger. Résultat mesuré : 3 000 points collectés, source à ZÉRO.
           ⭐ Un appel optionnel sur un objet qu'on sait devoir exister n'est
              pas de la prudence, c'est un silence. */
        const src = m.getSource("sites") as maplibregl.GeoJSONSource | undefined;
        if (!src) {
          /* On n'a rien pu poser : ces tuiles ne sont PAS lues. */
          for (const [x, y] of choix.tuiles) lues.delete(`${x}/${y}`);
          return;
        }
        src.setData({ type: "FeatureCollection", features: points });
      }
    }

    return () => {
      if (import.meta.env.DEV) {
        const w = window as unknown as { __trace?: string[] };
        (w.__trace ??= []).push(`carte #${(m as unknown as { __id?: number }).__id} détruite`);
      }
      ro.disconnect();
      for (const id of minuteries) window.clearTimeout(id);
      m.remove(); carte.current = null;
    };
  }, []);

  return (
    <main className="page page-monde">
      <div className="monde-scene">
        <div className="monde-plan" ref={boite} />
        {mot && <p className="monde-mot">{mot}</p>}
        {choisi && (
          <div className="monde-choisi">
            {/* ⚠️ UN LIEU SANS NOM GARDE SA PLACE — « si la plage n'a pas de
                nom ce n'est pas grave, si elle est à côté, c'est bon »
                (Aurélien, 14/11). On montre alors son TYPE, qui est la seule
                chose vraie qu'on sache en dire. */}
            <p className="monde-choisi-nom">
              {choisi.a ? (LIBELLES[choisi.c] ?? choisi.c) : choisi.n}
            </p>
            <p className="monde-choisi-dire">
              {choisi.a ? "Sans nom connu" : (LIBELLES[choisi.c] ?? choisi.c)}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

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
  const lues = useRef(new Set<string>());
  const points = useRef<GeoJSON.Feature[]>([]);
  const [choisi, setChoisi] = useState<Site | null>(null);
  const [mot, setMot] = useState("");

  useEffect(() => {
    if (!boite.current) return;
    const m = new maplibregl.Map({
      container: boite.current, style: STYLE,
      center: [6.27, 49.83], zoom: 8, attributionControl: false,
    });
    carte.current = m;
    m.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    m.on("load", () => {
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
    });
    m.on("moveend", () => charger());

    /** Charge les tuiles du cadre visible, et seulement celles-là. */
    async function charger() {
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
          if (lues.current.has(clef)) continue;
          lues.current.add(clef);
          try {
            const r = await fetch(`${TUILES}/${Z}/${x}/${y}.json`);
            if (!r.ok) continue;            // tuile vide : il n'y a rien ici
            const t = (await r.json()) as { l: Site[] };
            for (const s of t.l) {
              points.current.push({
                type: "Feature",
                geometry: { type: "Point", coordinates: s.g },
                properties: { n: s.n, c: s.c, ...(s.a ? { a: 1 } : {}) },
              });
            }
            neuf++;
          } catch { /* une tuile manquante n'est pas une panne */ }
        }
      }
      if (neuf) {
        (m.getSource("sites") as maplibregl.GeoJSONSource | undefined)?.setData({
          type: "FeatureCollection", features: points.current,
        });
      }
    }

    return () => { m.remove(); carte.current = null; };
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

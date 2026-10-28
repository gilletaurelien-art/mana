// Carte réelle : NOS tuiles (mana.bzh/carte/), relayées depuis OpenFreeMap.
//
// ⚠️ LE FOND EST RELAYÉ PAR NOUS, DÉLIBÉRÉMENT. Le navigateur ne va pas
//    chercher les tuiles chez l'hébergeur amont : l'IP du promeneur ne sort
//    pas. Ne jamais « simplifier » en pointant l'URL d'origine.
//
// ⚠️ L'ORIGINE DE CETTE PAGE EST DANS UNE LISTE BLANCHE CÔTÉ SERVEUR.
//    `gilletaurelien-art.github.io` a été ajouté aux trois blocs `/carte/*`
//    du Caddyfile le 28/10/2026. Servie depuis un autre domaine, la carte
//    reste blanche SANS ERREUR VISIBLE à l'écran — seule la console parle.
//
// 🔴 TROIS PIÈGES, TOUS MESURÉS SUR CE DISPOSITIF LE 27/10
//    1. Le conteneur tient sa hauteur d'un `aspect-ratio` : à la naissance de
//       la carte il ne fait que quelques pixels (relevé : 90×137 dans un cadre
//       de 378×581). D'où le `resize()` et les recadrages différés.
//    2. ⛔ NE PAS ATTENDRE `load` NI `loaded()` : sur ce style ils ne
//       deviennent jamais vrais. Un garde qui ne passe jamais ne se plaint pas.
//    3. ⛔ NE PAS AJOUTER DE SOURCE NI DE CALQUE au style pendant son
//       chargement. Le tracé est dessiné PAR-DESSUS, en SVG, reprojeté à
//       chaque rendu — la carte reste intacte.

import { useEffect, useRef } from "react";
// ⚠️ maplibre-gl v6 n'a PAS d'export par défaut — l'import nommé est obligatoire.
import { Map as CarteML, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { bbox } from "./walks";
import type { Walk, WalkPoint } from "./walks";

const STYLE = "https://mana.bzh/carte/style.json";

export function CarteReelle({
  walk,
  moi,
  hauteur = 420,
}: {
  walk: Walk;
  moi?: WalkPoint | null;
  hauteur?: number;
}) {
  const plan = useRef<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const carte = useRef<CarteML | null>(null);

  useEffect(() => {
    if (!plan.current) return;
    const m = new CarteML({
      container: plan.current,
      style: STYLE,
      center: [walk.points[0].lon, walk.points[0].lat],
      zoom: 12,
      attributionControl: false,
    });
    carte.current = m;
    m.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const sous = svg.current?.querySelector<SVGPathElement>("#trace-sous");
    const trait = svg.current?.querySelector<SVGPathElement>("#trace-trait");

    const redessiner = () => {
      if (!sous || !trait) return;
      const d =
        "M " +
        walk.points
          .map((p) => {
            const q = m.project([p.lon, p.lat]);
            return `${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
          })
          .join(" L ");
      sous.setAttribute("d", d);
      trait.setAttribute("d", d);
    };

    const cadrer = () => {
      m.resize();
      const b = bbox(walk.points);
      m.fitBounds(
        [
          [b.lonMin, b.latMin],
          [b.lonMax, b.latMax],
        ],
        { padding: 36, duration: 0 }
      );
      redessiner();
    };

    m.on("render", redessiner);
    m.on("move", redessiner);
    const ro = new ResizeObserver(cadrer);
    ro.observe(plan.current);
    const minuteries = [150, 700, 1800].map((t) => window.setTimeout(cadrer, t));

    return () => {
      minuteries.forEach(window.clearTimeout);
      ro.disconnect();
      m.remove();
      carte.current = null;
    };
  }, [walk]);

  const depart = walk.points[0];
  const arrivee = walk.points[walk.points.length - 1];

  return (
    <figure className="carte-reelle">
      <div className="carte-plan" style={{ height: hauteur }} ref={plan}>
        <svg className="carte-calque" ref={svg} aria-hidden="true">
          <path id="trace-sous" />
          <path id="trace-trait" />
        </svg>
        <ul className="carte-reperes">
          <Repere point={depart} libelle="Départ" carte={carte} variante="depart" />
          {walk.etapes.map((e) => (
            <Repere key={e.nom} point={e} libelle={e.nom} carte={carte} variante="etape" />
          ))}
          <Repere point={arrivee} libelle="Arrivée" carte={carte} variante="arrivee" />
          {moi && <Repere point={moi} libelle="Moi" carte={carte} variante="moi" />}
        </ul>
      </div>
      <figcaption className="carte-credit">
        Fond de carte © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>,
        sous licence ODbL — relayé par mana.bzh. Tracé :{" "}
        <a href={walk.osmUrl}>relation OSM</a>.
      </figcaption>
    </figure>
  );
}

/** Un repère positionné par la projection de la carte, pas par le DOM. */
function Repere({
  point,
  libelle,
  carte,
  variante,
}: {
  point: WalkPoint;
  libelle: string;
  carte: React.MutableRefObject<CarteML | null>;
  variante: string;
}) {
  const li = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const m = carte.current;
    if (!m || !li.current) return;
    const placer = () => {
      const q = m.project([point.lon, point.lat]);
      if (li.current) li.current.style.transform = `translate(${q.x}px, ${q.y}px)`;
    };
    placer();
    m.on("render", placer);
    m.on("move", placer);
    return () => {
      m.off("render", placer);
      m.off("move", placer);
    };
  }, [carte, point.lat, point.lon]);

  return (
    <li ref={li} className={`carte-repere carte-repere-${variante}`}>
      <span className="carte-pastille" />
      <span className="carte-etiquette">{libelle}</span>
    </li>
  );
}

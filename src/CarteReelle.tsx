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

import { useEffect, useRef, useState } from "react";
// ⚠️ MAPLIBRE EST ÉPINGLÉE EN v4, ET CE N'EST PAS UN RETARD.
//    La v6 ne livre que de l'ESM, avec son worker dans un FICHIER SÉPARÉ chargé
//    par `new URL('./maplibre-gl-worker.mjs', import.meta.url)`. Sous une base
//    `/mana/` et dans un module importé à la demande, cette URL retombe sur
//    l'index HTML : « Worker failed to load », et la carte n'affiche AUCUNE
//    tuile. ⚠️ Le défaut était identique au build et au serveur de dev — ce
//    n'était pas une bizarrerie de développement.
//    ⭐ Et rien ne le disait à l'écran : le style se chargeait, le fond peignait
//       sa couleur de base, le tracé SVG s'affichait. Une carte muette ressemble
//       à une carte qui charge.
//    La v4 embarque son worker dans le bundle UMD. Avant de remonter de version,
//    vérifier les tuiles À L'ÉCRAN, pas seulement l'absence d'erreur.
import maplibregl from "maplibre-gl";
const CarteML = maplibregl.Map;
const NavigationControl = maplibregl.NavigationControl;
type CarteML = maplibregl.Map;
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
  // ⚠️ ÉTAT, PAS REF. Avec une ref, les repères ne se plaçaient JAMAIS :
  //    en React, l'effet d'un ENFANT s'exécute AVANT celui du parent. Au
  //    premier passage la carte n'existait pas encore, l'effet sortait en
  //    silence — et rien ne le relançait. Mesuré en ligne : huit repères
  //    présents dans le DOM, `style.transform` vide sur les huit.
  const [carte, setCarte] = useState<CarteML | null>(null);

  useEffect(() => {
    if (!plan.current) return;
    const m = new CarteML({
      container: plan.current,
      style: STYLE,
      center: [walk.points[0].lon, walk.points[0].lat],
      zoom: 12,
      attributionControl: false,
    });
    setCarte(m);
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
      setCarte(null);
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
          {/* ⚠️ LES ÉTAPES SONT NUMÉROTÉES, PAS NOMMÉES, SUR LA CARTE.
              Les noms complets ont été essayés : sur un téléphone de 375 px,
              « Grotte de l'Anse des Sévignés n° 1 » déborde du cadre et
              « Arrivée » se superposait à « Phare du Cap Fréhel ».
              ⭐ Le nom n'est pas perdu : la liste sous la carte porte les mêmes
                 numéros, dans le même ordre. Une carte nomme ce qu'elle peut
                 montrer ; une liste nomme tout. */}
          {walk.etapes.map((e, i) => (
            <Repere key={e.nom} point={e} libelle={String(i + 1)} carte={carte} variante="etape" titre={e.nom} />
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
  titre,
}: {
  point: WalkPoint;
  libelle: string;
  carte: CarteML | null;
  variante: string;
  titre?: string;
}) {
  const li = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const m = carte;
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
    <li ref={li} className={`carte-repere carte-repere-${variante}`} title={titre ?? libelle}>
      {variante === "etape" ? (
        <span className="carte-pastille carte-numero">{libelle}</span>
      ) : (
        <>
          <span className="carte-pastille" />
          <span className="carte-etiquette">{libelle}</span>
        </>
      )}
    </li>
  );
}

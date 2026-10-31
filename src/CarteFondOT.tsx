import { useEffect, useRef, useState } from "react";
// ⚠️ MAPLIBRE RESTE ÉPINGLÉE EN v4 — voir la note de `CarteReelle.tsx` : la v6
//    charge son worker par une URL relative qui, sous la base `/mana/`,
//    retombe sur l'index HTML. La carte s'affiche alors SANS AUCUNE TUILE et
//    sans erreur visible.
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { STYLE_CARTE } from "./carte-fond";

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
export function CarteFondOT({ p }: { p: [number, number][] }) {
  const plan = useRef<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const [prete, setPrete] = useState(false);

  useEffect(() => {
    if (!plan.current || p.length < 2) return;
    setPrete(false);

    const m = new maplibregl.Map({
      container: plan.current,
      style: STYLE_CARTE,
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
    const dep = () => svg.current?.querySelector<SVGCircleElement>("#ot-depart");

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
        d.setAttribute("cx", q.x.toFixed(1));
        d.setAttribute("cy", q.y.toFixed(1));
      }
    };

    const cadrer = () => {
      m.resize();
      let loMin = Infinity, loMax = -Infinity, laMin = Infinity, laMax = -Infinity;
      for (const [lo, la] of p) {
        if (lo < loMin) loMin = lo; if (lo > loMax) loMax = lo;
        if (la < laMin) laMin = la; if (la > laMax) laMax = la;
      }
      m.fitBounds([[loMin, laMin], [loMax, laMax]], { padding: 26, duration: 0 });
      redessiner();
    };

    m.on("render", redessiner);

    /* 🔴 LE FOND NE SE DÉCLARE PRÊT QUE SI DES TUILES SONT ARRIVÉES.
       ⭐ « Une carte muette ressemble à une carte qui charge » — et sans ce
          garde elle lui ressemble ENCORE PLUS, puisqu'elle recouvre la
          silhouette d'un gris uni. Mesuré en développement : `mana.bzh`
          répond 200 mais sans `access-control-allow-origin`, la liste
          blanche ne connaissant que le domaine de production. maplibre ne
          lève rien de visible ; seule la console parle.
       🔴 ET `areTilesLoaded()` NE SUFFIT PAS — mesuré, le garde a dit OUI
          alors qu'aucune tuile n'était arrivée. Il répond « plus aucune
          requête en attente », ce qui est vrai aussi quand elles ont TOUTES
          échoué. ⭐ Un garde qu'on n'a jamais vu refuser n'a jamais été vu :
          celui-là, on l'a vu accepter le cas qu'il devait refuser.
       ⭐ La seule question qui porte sur ce qu'on VOIT est
          `queryRenderedFeatures()` : y a-t-il quelque chose de peint ? Sans
          tuiles elle rend 0, quelles que soient les promesses de l'état
          interne. `load` et `loaded()`, eux, ne deviennent jamais vrais sur ce
          style (mesuré le 27/10).
       ⚠️ Et l'échec se VERROUILLE : une erreur suivie d'une minuterie qui
          repasse à « prêt » remettrait le rectangle gris par-dessus la
          silhouette. En cas d'échec, la silhouette reste — un dessin vrai
          plutôt qu'un fond muet. */
    let echoue = false;
    const peutMontrer = () => {
      if (echoue) return;
      if (m.areTilesLoaded() && m.queryRenderedFeatures().length > 0) setPrete(true);
    };
    m.on("error", () => { echoue = true; setPrete(false); });
    m.once("idle", peutMontrer);
    const minuteries = [120, 600, 1600].map((t) =>
      window.setTimeout(() => { cadrer(); peutMontrer(); }, t));
    const ro = new ResizeObserver(cadrer);
    ro.observe(plan.current);

    return () => {
      minuteries.forEach(window.clearTimeout);
      ro.disconnect();
      // ⚠️ `remove()` libère le contexte WebGL. Sans lui, quarante-six
      //    glissements saturent le plafond du navigateur et les dernières
      //    cartes restent blanches.
      m.remove();
    };
  }, [p]);

  return (
    <div className={prete ? "ot-fond ot-fond-prete" : "ot-fond"}>
      <div className="ot-plan" ref={plan} />
      <svg className="ot-calque" ref={svg} aria-hidden="true">
        <path id="ot-sous" />
        <path id="ot-trait" />
        <circle id="ot-depart" r="6" />
      </svg>
    </div>
  );
}

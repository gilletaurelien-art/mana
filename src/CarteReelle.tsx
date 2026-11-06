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

/**
 * 🔴 LE STYLE EST EMBARQUÉ, PLUS RELAYÉ — 31/10/2026, après une panne.
 *
 * `mana.bzh/carte/style.json` répondait **404**, et `planet.json` avec lui :
 * les deux `handle` voisins du Caddyfile ne gagnaient pas, et la requête
 * tombait sur le nginx des tuiles, dont la liste blanche ne compte que quatre
 * familles de chemins (`planet`, `natural_earth`, `sprites`, `fonts`). Les
 * fichiers existaient sur le disque depuis le 28/10. ⭐ Un fichier présent,
 * correct et invisible : on soupçonne la donnée, c'est le routage.
 *
 * ⭐ ET C'EST LE PREMIER FICHIER QUE MAPLIBRE LIT. Sans lui rien ne s'affiche,
 *    pas même une erreur à l'écran — la carte reste blanche et seule la
 *    console parle. Le faire dépendre d'une route, c'est faire dépendre TOUTE
 *    la cartographie d'une ligne de configuration d'un serveur tiers.
 *
 * Il est donc servi avec l'app, et la TileJSON (`planet.json`) y est INLINÉE :
 * il ne reste que les chemins qui répondent — tuiles, relief, sprites,
 * polices. 42 Ko, dans le lot `CarteReelle` déjà différé.
 *
 * ⚠️ CE QUI NE CHANGE PAS : les tuiles restent RELAYÉES par nous, en URLs
 *    absolues vers mana.bzh. Ce n'est pas une maladresse à « simplifier » :
 *    c'est ce qui empêche l'IP du promeneur de sortir chez l'hébergeur amont.
 * ⚠️ Et le style EMBARQUE l'horodatage du jeu de tuiles
 *    (`planet/20260906_080001_pt/`). À la prochaine moisson du planet, ce
 *    fichier doit être régénéré depuis le serveur — sinon la carte pointe
 *    silencieusement sur un jeu retiré.
 */
/* ⚠️ L'adresse elle-même vit dans `carte-fond.ts` : le jeu de cartes la lit
   aussi, et deux copies divergeraient sans bruit. La note ci-dessus reste
   ici, où le dispositif est le plus long à comprendre. */
import { STYLE_CARTE as STYLE } from "./carte-fond";

/**
 * UN TRACÉ POSÉ SUR LA CARTE — 6/11/2026, demande du fondateur :
 * « affiche le tracé 1 en plein et le tracé 2 dans une autre couleur […]
 *  donne à l'arrivée la même couleur que la couleur du tracé. Tout doit se
 *  lire et se comprendre sur la carte. Pour choisir un tracé, cliquer sur le
 *  tracé, tout simplement. »
 *
 * ⭐ C'EST LA CARTE QUI DEVIENT L'INTERFACE. Les trois propositions vivaient
 *    en pastilles posées DEVANT le paysage : on lisait trois noms et trois
 *    distances, et on ne voyait qu'un seul chemin. Les dessiner toutes les
 *    trois répond à la question qu'on se pose vraiment — « lequel va où ? » —
 *    sans un mot.
 *
 * ⚠️ L'ARRIVÉE PORTE LA COULEUR DE SON TRACÉ, et ce n'est pas décoratif :
 *    c'est le SEUL lien entre un bout de chemin et son but. Trois arrivées de
 *    la même couleur rendraient les trois tracés anonymes.
 */
export interface TraceCarte {
  nom: string;
  points: WalkPoint[];
  /** ⚠️ Un trait par morceau — voir `redessiner` : les enchaîner en une
   *  ligne unique dessinerait des droites à travers la Bretagne. */
  traits?: WalkPoint[][];
  couleur: string;
  choisie: boolean;
  onChoisir?: () => void;
}

export function CarteReelle({
  walk,
  moi,
  hauteur = 420,
  marge = 0,
  traces,
}: {
  walk: Walk;
  moi?: WalkPoint | null;
  /** Trois chemins à la fois. Absent = un seul, celui de `walk`. */
  traces?: TraceCarte[];
  /** ⭐ UN NOMBRE (des pixels) OU UNE LONGUEUR CSS. Depuis le 6/11/2026,
   *  l'écran de l'offre promenade donne à la carte TOUTE la scène : sa
   *  hauteur ne se compte pas en pixels, elle se prend du conteneur.
   *  ⚠️ Élargi au lieu d'être contourné par un `style` posé à côté : une
   *     hauteur écrite à deux endroits finit par diverger, et c'est la carte
   *     à 0 × 0 pixel déjà vue le 31/10 — rendue, donc « présente », et
   *     invisible. */
  hauteur?: number | string;
  /**
   * ⭐ DE COMBIEN ON ÉLARGIT LE CADRE AUTOUR DU PARCOURS, en multiples de son
   *    étendue. 0 = serré sur le tracé, ce qu'il faut quand on marche. 1,1 =
   *    l'emprise plus 110 %, ce qu'il faut sur la fiche : la côte entre dans
   *    l'image, et on voit OÙ le chemin se trouve au lieu de voir seulement
   *    sa forme.
   * ⚠️ Et c'est une marge en DEGRÉS, pas un niveau de zoom fixe : une boucle
   *    de 3 km et un sentier de 95 km n'ont pas besoin du même recul, et un
   *    zoom choisi une fois serait juste pour l'un et faux pour l'autre.
   */
  marge?: number;
}) {
  const plan = useRef<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  // ⚠️ ÉTAT, PAS REF. Avec une ref, les repères ne se plaçaient JAMAIS :
  //    en React, l'effet d'un ENFANT s'exécute AVANT celui du parent. Au
  //    premier passage la carte n'existait pas encore, l'effet sortait en
  //    silence — et rien ne le relançait. Mesuré en ligne : huit repères
  //    présents dans le DOM, `style.transform` vide sur les huit.
  const [carte, setCarte] = useState<CarteML | null>(null);
  /* ⭐ Mise à jour À CHAQUE RENDU, hors effet : `redessiner` la lit depuis
     une fermeture créée une seule fois, à la naissance de la carte. */
  const tracesRef = useRef<TraceCarte[] | undefined>(traces);
  tracesRef.current = traces;
  /* 🔴 `walk` AUSSI PASSE PAR UNE RÉFÉRENCE — 6/11/2026, et c'est un VRAI
     défaut trouvé par le fondateur : « la carte s'efface ? ». Elle s'effaçait.
     `walk` est un `useMemo` du compositeur qui dépend de la proposition
     choisie : il change d'identité à CHAQUE clic sur un tracé. Tant qu'il
     était dans les dépendances de l'effet, chaque clic appelait `m.remove()`
     puis reconstruisait une carte WebGL entière — tuiles, style, sources. La
     plupart du temps ça repassait ; parfois la nouvelle carte restait vide,
     et il ne restait que le fond kaki et les traits SVG. Exactement sa
     capture.
     ⭐ Un défaut qui « repasse la plupart du temps » n'est pas un défaut
        rare : c'est un défaut permanent dont on ne voit que les ratés. */
  const walkRef = useRef(walk);
  walkRef.current = walk;
  const clefTraces = (traces ?? []).map((t) => t.nom).join("|");
  /* ⚠️ Pour les écrans à UNE promenade (fiche, en-chemin), l'identité tient
     au slug et au nombre de points : deux promenades différentes ne partagent
     pas les deux. */
  /* 🔴 ET CETTE CLÉ N'ÉTAIT PAS STABLE — corrigé après mesure. Je l'avais
     bâtie sur `walk.points.length`, en croyant identifier LA promenade. Or
     sur cet écran le slug vaut toujours « composee » et le NOMBRE DE POINTS
     change d'une proposition à l'autre : la clé bougeait à chaque clic, et la
     carte était reconstruite malgré le correctif. Mesuré en marquant le
     canvas : `memeCanvas: false` après quatre clics.
     ⭐ Une clé « stable » qu'on n'a pas vue tenir ne tient pas. Le témoin
        posé sur le canvas a dit en une mesure ce que trois relectures du code
        n'avaient pas vu.
     ➜ Quand l'écran montre PLUSIEURS tracés, c'est leur ensemble qui décide,
       et lui seul ; `walk` n'y a plus voix. */
  const clefWalk = traces?.length ? "" : `${walk.slug}:${walk.points.length}`;




  useEffect(() => {
    if (!plan.current) return;
    const m = new CarteML({
      container: plan.current,
      style: STYLE,
      center: [walkRef.current.points[0].lon, walkRef.current.points[0].lat],
      zoom: 12,
      attributionControl: false,
    });
    setCarte(m);
    /* ⚠️ EN BAS À DROITE, et par le paramètre de maplibre plutôt que par une
       surcharge CSS : en haut à droite les commandes tombaient sous le
       marque-page de la fiche — deux cibles de 44 px au même endroit, dont
       l'une ferme ce que l'autre vient d'ouvrir.
       ⭐ Repositionner un contrôle par `top: auto; bottom: …` marche jusqu'à
          la prochaine version de la bibliothèque ; lui dire où se mettre
          marche toujours. */
    m.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

    const sous = svg.current?.querySelector<SVGPathElement>("#trace-sous");
    const trait = svg.current?.querySelector<SVGPathElement>("#trace-trait");

    /* ⚠️ `redessiner` LIT UNE RÉFÉRENCE, PAS LA PROP. Choisir un tracé change
       `traces` ; si l'effet en dépendait, chaque clic DÉTRUIRAIT ET
       RECONSTRUIRAIT la carte — tuiles rechargées, cadrage perdu, et le
       chemin qu'on vient de choisir hors de l'écran. La sélection ne touche
       que des classes et des couleurs, que React rend ; la géométrie, elle,
       se recalcule à chaque image sans recréer quoi que ce soit. */
    const chemin = (pts: WalkPoint[], morceaux?: WalkPoint[][]) =>
      (morceaux?.length ? morceaux : [pts])
        .filter((m2) => m2.length > 0)
        .map((m2) => "M " + m2.map((pt) => {
          const q = m.project([pt.lon, pt.lat]);
          return `${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
        }).join(" L "))
        .join(" ");

    const redessiner = () => {
      const t = tracesRef.current;
      if (t?.length) {
        for (const el of svg.current?.querySelectorAll<SVGPathElement>("[data-trace]") ?? []) {
          const i = Number(el.dataset.trace);
          const d = t[i] ? chemin(t[i].points, t[i].traits) : "";
          el.setAttribute("d", d);
        }
        return;
      }
      if (!sous || !trait) return;
      const walk = walkRef.current;
      // ⛔ UN SOUS-CHEMIN PAR MORCEAU — « M … L … M … L … », jamais un seul
      //    « M » suivi de tous les points. Un itinéraire breton est stocké en
      //    portions, et 123 jointures sur 575 ont un écart de plus de 50 m
      //    (jusqu'à 83 km). Les enchaîner en un trait unique dessinerait une
      //    droite à travers la Bretagne, qui aurait l'air d'un sentier.
      //    ⭐ Le SVG sait déjà faire : plusieurs `M` dans un même `d` sont
      //       plusieurs traits, et rien ne les relie.
      const morceaux = walk.traits?.length ? walk.traits : [walk.points];
      const d = morceaux
        .filter((m2) => m2.length > 0)
        .map(
          (m2) =>
            "M " +
            m2
              .map((p) => {
                const q = m.project([p.lon, p.lat]);
                return `${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
              })
              .join(" L ")
        )
        .join(" ");
      sous.setAttribute("d", d);
      trait.setAttribute("d", d);
    };

    const cadrer = () => {
      m.resize();
      /* ⭐ LE CADRAGE ENGLOBE LES TROIS. Cadrer sur le seul tracé choisi
         laisserait les deux autres hors de l'écran : on ne choisit pas entre
         des chemins qu'on ne voit pas. */
      const t = tracesRef.current;
      const b = bbox(t?.length ? t.flatMap((x) => x.points) : walkRef.current.points);
      const dLon = (b.lonMax - b.lonMin) * marge;
      const dLat = (b.latMax - b.latMin) * marge;
      m.fitBounds(
        [
          [b.lonMin - dLon, b.latMin - dLat],
          [b.lonMax + dLon, b.latMax + dLat],
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
    /* ⚠️ NI `walk` NI `traces` DANS LES DÉPENDANCES, et c'est tout le
       correctif. On ne reconstruit la carte que lorsque l'ENSEMBLE change :
       un autre départ, donc d'autres propositions (`clefTraces`), ou une
       autre promenade sur les écrans qui n'en montrent qu'une (`clefWalk`).
       Un simple changement de CHOIX ne touche que des couleurs et des
       classes, que React rend — la carte, elle, ne bouge pas. */
  }, [marge, clefTraces, clefWalk]);

  const depart = walk.points[0];
  const arrivee = walk.points[walk.points.length - 1];

  return (
    <figure className="carte-reelle">
      <div className="carte-plan" style={{ height: hauteur }} ref={plan}>
        <svg
          className={`carte-calque${traces?.length ? " carte-calque-choisir" : ""}`}
          ref={svg}
          aria-hidden={traces?.length ? undefined : true}
        >
          {traces?.length ? (
            /* ⭐ LE CHOISI EN DERNIER, DONC AU-DESSUS. Trois chemins se
               croisent forcément : celui qu'on tient doit passer par-dessus
               les deux autres, sinon on le perd aux croisements. */
            [...traces.keys()]
              .sort((a2, b2) => Number(traces[a2].choisie) - Number(traces[b2].choisie))
              .map((i) => {
                const t = traces[i];
                return (
                  <g key={t.nom} className={t.choisie ? "trace est-choisie" : "trace"}>
                    <path data-trace={i} className="trace-halo" />
                    <path data-trace={i} className="trace-ligne" style={{ stroke: t.couleur }} />
                    {/* ⛔ UNE CIBLE DE CLIC LARGE ET INVISIBLE. Un trait de
                        3 px ne se touche pas au pouce : la règle des 44 px
                        vaut aussi pour une ligne. Ce chemin-ci ne se voit
                        pas, il s'attrape.
                        ⚠️ Et il est FOCALISABLE au clavier, avec un nom : le
                           fondateur demande « cliquer sur le tracé, tout
                           simplement » — ce qui ne doit pas vouloir dire
                           « à la souris seulement ». */}
                    <path
                      data-trace={i}
                      className="trace-cible"
                      role="button"
                      tabIndex={0}
                      aria-pressed={t.choisie}
                      aria-label={`Promenade vers ${t.nom}`}
                      onClick={t.onChoisir}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t.onChoisir?.(); }
                      }}
                    />
                  </g>
                );
              })
          ) : (
            <>
              <path id="trace-sous" />
              <path id="trace-trait" />
            </>
          )}
        </svg>
        <ul className="carte-reperes">
          {/* ⚠️ SUR UNE BOUCLE, DÉPART ET ARRIVÉE SONT LE MÊME POINT : deux
              repères superposés donnent deux étiquettes qui se recouvrent —
              « Départ » passait sous « Arrivée », illisible. Un seul repère,
              et il dit les deux. */}
          <Repere
            point={depart}
            libelle={walk.boucle ? "Départ et arrivée" : "Départ"}
            carte={carte}
            variante="depart"
          />
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
          {/* ⭐ UNE ARRIVÉE PAR TRACÉ, À LA COULEUR DE SON TRACÉ. C'est le
              seul lien entre un bout de chemin et son but : trois arrivées
              de la même couleur rendraient les trois chemins anonymes.
              ⚠️ Celle du tracé choisi porte son NOM ; les deux autres ne
                 portent qu'un point. Trois étiquettes de toponymes bretons
                 sur une carte de téléphone se recouvrent — et une étiquette
                 illisible ne nomme rien. */}
          {traces?.length
            ? traces.map((t) => (
                <Repere
                  key={t.nom}
                  point={t.points[t.points.length - 1]}
                  libelle={t.choisie ? t.nom : ""}
                  carte={carte}
                  variante="arrivee"
                  titre={t.nom}
                  couleur={t.couleur}
                />
              ))
            : !walk.boucle && (
                <Repere point={arrivee} libelle="Arrivée" carte={carte} variante="arrivee" />
              )}
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
  couleur,
}: {
  point: WalkPoint;
  libelle: string;
  carte: CarteML | null;
  variante: string;
  titre?: string;
  /** ⚠️ Passée en variable CSS, pas en `background` : la pastille a aussi un
   *  liseré et une ombre, que le thème décide. On ne lui donne que la teinte. */
  couleur?: string;
}) {
  const li = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const m = carte;
    if (!m || !li.current) return;
    const placer = () => {
      const q = m.project([point.lon, point.lat]);
      const el = li.current;
      if (!el) return;
      /* 🔴 L'ÉTIQUETTE SE RETOURNE AU BORD — 6/11/2026, signalé par le
         fondateur : « "Plage …" est tronqué ». Elle se posait TOUJOURS à
         droite du point ; une arrivée près du bord droit passait sous le
         `overflow: hidden` du conteneur, et il ne restait qu'un mot coupé.
         ⭐ Un toponyme tronqué ne nomme pas à moitié : il ne nomme pas. Et
            c'est justement l'arrivée qu'on a le plus besoin de lire.
         ⚠️ LA BASCULE SE MESURE, ELLE NE SE DEVINE PAS. Un seuil en dur
            (« au-delà de 160 px du bord ») serait juste pour « Plage du
            Porzic » et faux pour « Plaque commémorative "Tante Yvonne" ».
            On lit la largeur RÉELLE de l'étiquette, qui dépend du nom. */
      /* 🔴 BASCULER NE SUFFIT PAS — mesuré. Première version : on passait à
         gauche dès que ça dépassait à droite, et « Plaque commémorative
         "Tante Yvonne" » sortait alors par la GAUCHE. Un débordement
         déplacé n'est pas un débordement corrigé.
         ➜ On choisit le côté où il reste le PLUS de place, et on borne
           l'étiquette à cette place. La troncature ne subsiste que dans le
           cas réellement impossible — un nom plus large que la carte — au
           lieu d'être la règle. */
      const large = m.getContainer().clientWidth;
      const etq = el.querySelector<HTMLElement>(".carte-etiquette");
      /* ⚠️ `scrollWidth` et non `offsetWidth` : l'étiquette est bornée par
         `max-width`, donc sa largeur VISIBLE est déjà le résultat du calcul
         précédent. La mesurer reviendrait à se répondre à soi-même. */
      /* ⚠️ L'étiquette passe à la ligne : `scrollWidth` vaut alors la
         largeur BORNÉE, pas la largeur voulue. On mesure donc le texte sans
         contrainte, le temps d'une mesure. */
      const voulu = (() => {
        if (!etq) return 0;
        const avant = etq.style.maxWidth;
        etq.style.maxWidth = "none";
        const w = etq.scrollWidth;
        etq.style.maxWidth = avant;
        return w;
      })();
      const pastille = el.offsetWidth - (etq?.offsetWidth ?? 0);
      const resteD = large - q.x - pastille - 8;
      const resteG = q.x - pastille - 8;
      const aGauche = voulu > resteD && resteG > resteD;
      el.dataset.cote = aGauche ? "gauche" : "droite";
      el.style.setProperty("--etiquette-max", `${Math.max(40, aGauche ? resteG : resteD)}px`);
      el.style.transform = aGauche
        ? `translate(${q.x}px, ${q.y}px) translateX(-100%)`
        : `translate(${q.x}px, ${q.y}px)`;
    };
    placer();
    m.on("render", placer);
    m.on("move", placer);
    return () => {
      m.off("render", placer);
      m.off("move", placer);
    };
    /* 🔴 `libelle` DANS LES DÉPENDANCES — et c'est le reste du défaut
       « "Plage …" est tronqué ». La bascule gauche/droite se décide sur la
       LARGEUR MESURÉE de l'étiquette ; or le nom n'apparaît qu'au moment où
       le tracé devient le choisi. Sans cette dépendance, `placer` ne
       retournait jamais après coup : il avait mesuré une étiquette VIDE
       (14 px), conclu « il y a la place », et le nom débordait ensuite de
       64 px sans que rien ne le reprenne.
       ⭐ Une mesure prise avant que la chose mesurée existe est une mesure
          fausse qui a l'air juste — et elle ne se corrige pas toute seule. */
  }, [carte, point.lat, point.lon, libelle]);

  return (
    <li
      ref={li}
      className={`carte-repere carte-repere-${variante}`}
      title={titre ?? libelle}
      /* ⚠️ Une VARIABLE, pas un `background` : la pastille porte aussi un
         liseré et une ombre que le thème décide. On ne lui donne que la
         teinte, elle garde son dessin. */
      style={couleur ? ({ ["--repere-couleur" as string]: couleur }) : undefined}
    >
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

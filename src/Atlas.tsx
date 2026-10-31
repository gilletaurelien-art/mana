/**
 * L'ATLAS — le territoire, dessiné depuis nos propres données.
 *
 * ⭐ AUCUNE TUILE, ET C'EST LA DÉCISION QUI FAIT LA SIGNATURE. Une carte de
 *    fond — maplibre et ses tuiles vectorielles — pèse 224 Ko, exige le
 *    réseau, et donne à MANA l'allure de tout le monde : le même monde
 *    recoloré. Or nous possédons le territoire EN DONNÉES : 1 774 points de
 *    tracé réel dans le bundle, et un graphe de 13 265 arêtes en cache hors
 *    ligne. L'atlas se DESSINE, il ne se télécharge pas.
 *    Conséquences, toutes dans le bon sens : zéro octet de plus, hors ligne
 *    par construction, et une cartographie que personne d'autre ne peut
 *    produire — parce que personne d'autre n'a ce graphe.
 *
 * 🔴 LA PROJECTION EST CORRIGÉE, ET L'ANCIENNE NE L'ÉTAIT PAS. `WalkMap`
 *    étire indépendamment la latitude et la longitude pour remplir sa boîte :
 *    à 48,3° de latitude, un degré de longitude vaut 0,66 degré de latitude,
 *    donc ses tracés sont géométriquement faux — une anse ronde y devient
 *    ovale. Acceptable pour une vignette, pas pour un objet qui prétend être
 *    une carte. Ici la longitude est mise à l'échelle par le cosinus de la
 *    latitude : les formes sont justes.
 *
 * ⛔ RIEN N'EST INVENTÉ. Pas de côte dessinée à la main, pas de relief
 *    décoratif, pas de point d'intérêt ajouté pour meubler. Ce qui s'affiche
 *    est ce que les données contiennent : des chemins parcourus et des lieux
 *    qu'on croise, avec leur position le long du chemin.
 */
import { useId } from "react";
import type { Walk } from "./walks";

type Props = {
  walks: Walk[];
  /** la promenade mise en avant, s'il y en a une */
  focus?: string | null;
  className?: string;
};

const R_LAT = 111_320; // mètres par degré de latitude

export function Atlas({ walks, focus = null, className }: Props) {
  const id = useId();
  const pts = walks.flatMap((w) => w.points);
  if (pts.length === 0) return null;

  // ── emprise commune à TOUTES les promenades : elles partagent un territoire
  let laMin = Infinity, laMax = -Infinity, loMin = Infinity, loMax = -Infinity;
  for (const p of pts) {
    if (p.lat < laMin) laMin = p.lat;
    if (p.lat > laMax) laMax = p.lat;
    if (p.lon < loMin) loMin = p.lon;
    if (p.lon > loMax) loMax = p.lon;
  }
  const laMid = (laMin + laMax) / 2;
  const kLon = Math.cos((laMid * Math.PI) / 180); // la correction qui manquait

  // mètres au sol, pour une boîte aux proportions VRAIES
  const largeurM = (loMax - loMin) * R_LAT * kLon;
  const hauteurM = (laMax - laMin) * R_LAT;
  const marge = Math.max(largeurM, hauteurM) * 0.08;
  const W = largeurM + 2 * marge;
  const H = hauteurM + 2 * marge;

  const x = (lon: number) => marge + (lon - loMin) * R_LAT * kLon;
  const y = (lat: number) => H - marge - (lat - laMin) * R_LAT;

  const trace = (w: Walk) =>
    w.points.map((p, i) => `${i ? "L" : "M"}${x(p.lon).toFixed(0)},${y(p.lat).toFixed(0)}`).join(" ");

  // l'échelle du trait suit la taille du territoire, pas la taille de l'écran
  const trait = Math.max(largeurM, hauteurM) / 320;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Territoire de ${walks.length} promenades, tracé d'après OpenStreetMap`}
    >
      <defs>
        {/* ⚠️ Le halo n'est pas un effet : il donne au trait une épaisseur
            optique sur fond sombre sans l'épaissir vraiment, donc sans
            écraser les détails du tracé. */}
        <filter id={`${id}-halo`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={trait * 2.2} result="f" />
          <feMerge>
            <feMergeNode in="f" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 🔴 `focus === null` NE VEUT PAS DIRE « TOUT EST VEDETTE ». Première
          version : sans promenade mise en avant, les quatre passaient en
          lumière solaire avec halo — et l'accent rare devenait la couleur
          dominante, exactement ce que la direction refuse. Sans focus, le
          territoire se lit en verre marin ; la lumière n'éclaire que les
          lieux qu'on croise. */}
      {walks.map((w) => {
        const vedette = focus !== null && focus === w.slug;
        return (
          /* sans vedette, tous les chemins se valent : aucun n'est mis en
             retrait, sinon le territoire entier s'efface */
          <g
            key={w.slug}
            className={
              focus === null || vedette ? "atlas-chemin" : "atlas-chemin atlas-retrait"
            }
          >
            <path
              d={trace(w)}
              fill="none"
              stroke={vedette ? "var(--lumiere)" : "var(--verre)"}
              strokeWidth={vedette ? trait * 1.6 : trait}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={vedette ? `url(#${id}-halo)` : undefined}
            />
            {/* le départ : le seul repère qui ne soit pas une découverte */}
            <circle
              cx={x(w.points[0].lon)}
              cy={y(w.points[0].lat)}
              r={trait * 2.4}
              fill="var(--pierre)"
            />
            {/* ⭐ CE QU'ON CROISE — et chaque point est posé à sa position RÉELLE,
                pas à côté : `etapes` porte lat/lon, et `pos` garantit qu'il est
                SUR le chemin. */}
            {w.etapes.map((e) => (
              <circle
                key={`${w.slug}-${e.nom}`}
                cx={x(e.lon)}
                cy={y(e.lat)}
                r={trait * (vedette ? 1.8 : 1.4)}
                fill="var(--lumiere)"
                opacity={vedette ? 0.95 : 0.7}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

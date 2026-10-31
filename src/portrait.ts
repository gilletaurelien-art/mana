/**
 * LE PORTRAIT D'UNE BALADE — sa propre forme, et rien d'autre.
 *
 * ⛔ NOUS N'AVONS AUCUNE PHOTOGRAPHIE DE CES 46 CIRCUITS, et nous n'en
 *    fabriquons pas : une image générée présentée comme un lieu réel est un
 *    mensonge documentaire, quelle que soit sa beauté. Un jeu de cartes à la
 *    Tinder réclame pourtant un VISAGE par carte.
 *
 * ⭐ LE VISAGE, C'EST LE TRACÉ. Chaque itinéraire a une silhouette qu'aucun
 *    autre n'a — la boucle du cap, le crochet du Fret, le long fil de l'Aulne.
 *    C'est la seule image de ce circuit qui soit VRAIE, et c'est en plus la
 *    seule qu'un concurrent à catalogue de photos ne peut pas copier.
 *
 * ⚠️ LA PROJECTION N'EST PAS DÉCORATIVE. À 48° de latitude, un degré de
 *    longitude vaut 0,669 degré de latitude en distance. Normaliser les deux
 *    axes séparément — ce qui vient naturellement sous les doigts — étire
 *    chaque tracé jusqu'à remplir son cadre : les 46 silhouettes se
 *    ressemblent alors toutes, et le portrait ne distingue plus rien. On
 *    projette, puis on met à l'échelle d'UN SEUL facteur.
 */

/** Le facteur de la projection équirectangulaire, pris à la latitude du centre. */
const COS = (latDeg: number) => Math.cos((latDeg * Math.PI) / 180);

export interface Portrait {
  /** l'attribut `d` d'un `<path>`, dans le repère `0 0 w h` demandé */
  d: string;
  /** le départ, pour y poser le point : [x, y] dans le même repère */
  depart: [number, number];
  /** l'arrivée — confondue avec le départ sur une boucle */
  arrivee: [number, number];
  /** vrai quand le tracé se referme à moins de 80 m de son départ */
  boucle: boolean;
}

/**
 * Rend un tracé [lon, lat] dans une boîte `w × h`, centré, à proportions
 * tenues. `marge` est la respiration laissée autour, en fraction du plus
 * petit côté.
 */
export function portrait(
  p: [number, number][],
  w: number,
  h: number,
  marge = 0.1,
): Portrait | null {
  if (!p || p.length < 2) return null;

  // 1 · projection équirectangulaire, cosinus pris au MILIEU de la boîte
  //     englobante — pas au premier point, qui peut être à un bout.
  let latMin = Infinity, latMax = -Infinity;
  for (const [, lat] of p) { if (lat < latMin) latMin = lat; if (lat > latMax) latMax = lat; }
  const k = COS((latMin + latMax) / 2);
  const q = p.map(([lon, lat]) => [lon * k, lat] as [number, number]);

  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const [x, y] of q) {
    if (x < xMin) xMin = x; if (x > xMax) xMax = x;
    if (y < yMin) yMin = y; if (y > yMax) yMax = y;
  }
  const dx = xMax - xMin || 1e-9;
  const dy = yMax - yMin || 1e-9;

  // 2 · UN SEUL facteur pour les deux axes — c'est lui qui garde la forme.
  const m = Math.min(w, h) * marge;
  const ech = Math.min((w - 2 * m) / dx, (h - 2 * m) / dy);
  // puis on recentre ce que l'échelle commune a laissé de jeu
  const ox = (w - dx * ech) / 2;
  const oy = (h - dy * ech) / 2;

  // ⚠️ `y` est inversé : la latitude monte vers le nord, l'écran descend.
  const vers = ([x, y]: [number, number]): [number, number] => [
    ox + (x - xMin) * ech,
    h - oy - (y - yMin) * ech,
  ];

  const pts = q.map(vers);
  const d = pts
    .map((c, i) => `${i ? "L" : "M"}${c[0].toFixed(1)} ${c[1].toFixed(1)}`)
    .join("");

  return {
    d,
    depart: pts[0],
    arrivee: pts[pts.length - 1],
    boucle: metres(p[0], p[p.length - 1]) < 80,
  };
}

/** Distance approchée entre deux points, en mètres. Suffisant pour 80 m. */
function metres(a: [number, number], b: [number, number]): number {
  const k = COS((a[1] + b[1]) / 2);
  const dx = (a[0] - b[0]) * k * 111_320;
  const dy = (a[1] - b[1]) * 111_320;
  return Math.hypot(dx, dy);
}

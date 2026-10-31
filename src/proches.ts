import type { Lieu } from "./lieux";

/**
 * LES SITES QUE LE CHEMIN LONGE — ce que MANA sait et que la fiche ignore.
 *
 * ⛔ « À PROXIMITÉ » N'EST PAS « SUR LE CHEMIN ». Un lieu qui demande un
 *    détour annoncé comme étant sur le parcours envoie quelqu'un le chercher
 *    là où il n'est pas. Le seuil est donc SERRÉ et il est DIT à l'écran :
 *    150 m, soit deux minutes de marche, soit la largeur d'une plage.
 *
 * ⭐ C'EST LA SEULE LIGNE DE CES CARTES QUI NE VIENNE PAS DE L'OFFICE. Leur
 *    fiche donne la distance, la durée, le dénivelé ; elle ne dit pas que le
 *    circuit passe au pied d'un alignement de menhirs et de deux fontaines.
 *    L'inventaire, lui, le sait — c'est pour ça qu'il a été bâti.
 */
const R = 111_320;
const SEUIL_M = 150;

/** Distance d'un point à un segment, en mètres, à la latitude locale. */
function versSegment(p: [number, number], a: [number, number], b: [number, number]): number {
  const k = Math.cos((a[1] * Math.PI) / 180);
  const px = (p[0] - a[0]) * k * R, py = (p[1] - a[1]) * R;
  const dx = (b[0] - a[0]) * k * R, dy = (b[1] - a[1]) * R;
  const L2 = dx * dx + dy * dy;
  const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / L2));
  return Math.hypot(px - t * dx, py - t * dy);
}

/**
 * Rend les lieux NOMMÉS à moins de 150 m du tracé, les plus proches d'abord.
 *
 * ⚠️ UN PRÉ-FILTRE PAR BOÎTE, SINON C'EST 1 358 × 270 SEGMENTS À CHAQUE CARTE.
 *    La boîte est élargie du seuil : la rogner au tracé écarterait un lieu
 *    situé à 100 m à l'extérieur, qui est précisément un lieu qu'on cherche.
 */
export function lieuxProches(
  trace: [number, number][],
  lieux: Lieu[],
  max = 4,
): { l: Lieu; m: number }[] {
  if (trace.length < 2) return [];
  let loMin = Infinity, loMax = -Infinity, laMin = Infinity, laMax = -Infinity;
  for (const [lo, la] of trace) {
    if (lo < loMin) loMin = lo; if (lo > loMax) loMax = lo;
    if (la < laMin) laMin = la; if (la > laMax) laMax = la;
  }
  const dLa = SEUIL_M / R;
  const dLo = dLa / Math.cos(((laMin + laMax) / 2 * Math.PI) / 180);
  loMin -= dLo; loMax += dLo; laMin -= dLa; laMax += dLa;

  const trouves: { l: Lieu; m: number }[] = [];
  for (const l of lieux) {
    // ⛔ Les lieux SANS NOM ne sont pas cités : « Fortification » sous un
    //    circuit n'apprend rien, et il y en a 734 dans l'inventaire.
    if (!l.n) continue;
    const [lo, la] = l.g;
    if (lo < loMin || lo > loMax || la < laMin || la > laMax) continue;
    let d = Infinity;
    for (let i = 1; i < trace.length; i++) {
      const x = versSegment(l.g, trace[i - 1], trace[i]);
      if (x < d) d = x;
      if (d <= 1) break;
    }
    if (d <= SEUIL_M) trouves.push({ l, m: Math.round(d) });
  }
  trouves.sort((a, b) => a.m - b.m);
  /* ⚠️ UN NOM NE SE CITE QU'UNE FOIS. « Chemins de l'écrivain » est un même
     parcours d'œuvres relevé en plusieurs objets OSM : le tracé en longe deux,
     et la ligne annonçait deux fois la même chose. ⭐ On compte des SUJETS ici,
     pas des objets — l'inverse exact de la règle de l'inventaire, où deux
     étiquettes sur un même fort ne font qu'un lieu. */
  const vus = new Set<string>();
  return trouves.filter((t) => !vus.has(t.l.n!) && vus.add(t.l.n!)).slice(0, max);
}

export const SEUIL_PROCHES = SEUIL_M;

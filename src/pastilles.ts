/**
 * OÙ POSER LE NUMÉRO D'UN TRACÉ POUR QU'ON LE VOIE.
 *
 * 🔴 CE FICHIER EXISTE PARCE QUE DEUX PASTILLES SE RECOUVRAIENT — 5/11/2026,
 *    relevé par le fondateur sur « Menhirs de Kerziou » : les numéros 2 et 3
 *    étaient à **2,0 px** l'un de l'autre, pour un rayon de 9. L'un cachait
 *    l'autre, donc une promenade sur trois n'avait pas de numéro sur la
 *    carte — c'est-à-dire plus de lien entre la liste et le dessin.
 *
 * ⚠️ ET LA PREMIÈRE CAUSE N'ÉTAIT PAS ICI. Mesurées, les deux destinations
 *    étaient à 14 m l'une de l'autre : le même endroit, proposé deux fois.
 *    Ça se répare dans `composition.ts` (`PROPOSITIONS_ECART_MIN_M`), pas au
 *    dessin — écarter les pastilles aurait rendu le doublon LISIBLE au lieu
 *    de le retirer. ⭐ Un défaut d'affichage peut être le seul symptôme
 *    visible d'un défaut de contenu : on répare la cause, et on garde quand
 *    même le symptôme sous garde.
 * ⭐ PARCE QUE L'ÉCART DE 150 m NE SUFFIT PAS À TOUTE ÉCHELLE. La carte se
 *    recadre maintenant sur les trois tracés : selon leur longueur, l'échelle
 *    va de ~4 à ~20 m/px. À 10,7 m/px, 150 m font 14 px — deux pastilles de
 *    18 px de diamètre se touchent encore. Les deux gardes sont nécessaires,
 *    et aucun ne remplace l'autre.
 */

export type Point = readonly [number, number];

export interface Options {
  /** distance minimale entre deux centres, en pixels */ ecart?: number;
  /** de combien on s'autorise à remonter le long du tracé */ reculMax?: number;
}

/**
 * Pour chaque tracé (une polyligne EN PIXELS D'ÉCRAN, du départ vers la
 * destination), le point où poser son numéro.
 *
 * ⭐ ON RECULE LE LONG DU FIL, ON NE POUSSE PAS À CÔTÉ. Une pastille déplacée
 *    perpendiculairement flotte dans le vide : rien ne dit plus à quel tracé
 *    elle appartient, et c'est précisément le lien qu'elle existe pour
 *    porter. Reculée sur son propre tracé, elle reste posée dessus.
 * ⚠️ Le recul est BORNÉ. Au-delà, la pastille cesse de désigner la fin du
 *    chemin et se met à désigner son milieu. Quand la borne ne suffit pas —
 *    deux fils confondus sur toute leur longueur — on bascule sur un
 *    décalage perpendiculaire, qui est le moins mauvais des deux : une
 *    pastille à côté du fil se lit encore, une pastille invisible non.
 */
export function placerPastilles(
  traces: readonly (readonly Point[])[],
  { ecart = 24, reculMax = 90 }: Options = {},
): { x: number; y: number; reculee: boolean }[] {
  const posees: { x: number; y: number; reculee: boolean }[] = [];

  for (const t of traces) {
    if (t.length === 0) { posees.push({ x: NaN, y: NaN, reculee: false }); continue; }
    const bout = t[t.length - 1];
    const libre = (x: number, y: number) =>
      posees.every((p) => Number.isNaN(p.x) || Math.hypot(p.x - x, p.y - y) >= ecart);

    if (libre(bout[0], bout[1])) { posees.push({ x: bout[0], y: bout[1], reculee: false }); continue; }

    /* On remonte le fil, en échantillonnant l'ARC et non les sommets : une
       polyligne d'OpenStreetMap a des segments de 2 px comme de 80, et
       sauter de sommet en sommet donnerait un pas imprévisible.
       🔴 ET LE PAS DOIT POUVOIR TRAVERSER PLUSIEURS SEGMENTS. Première
          écriture : une boucle `for (d = PAS; d <= seg; d += PAS)` DANS
          chaque segment — donc aucun échantillon dès que le segment est
          plus court que le pas. Or c'est le cas normal : le tracé mesuré
          depuis Kerziou a des segments de 3 à 4 px pour un pas de 6. Le
          recul ne s'exécutait jamais et la pastille partait toujours sur le
          décalage perpendiculaire, c'est-à-dire sur le dernier recours.
       ⭐ Le défaut était MUET : une pastille écartée, à côté de son fil, a
          exactement l'air de ce qu'on voulait obtenir. Ce sont les deux
          tests qui l'ont dit — l'un exige qu'elle reste SUR le fil, l'autre
          qu'elle recule d'au moins l'écart demandé. */
    const PAS = 6;
    let trouve: { x: number; y: number } | null = null;
    let arc = 0, prochain = PAS;
    for (let i = t.length - 1; i > 0 && arc < reculMax && !trouve; i--) {
      const [ax, ay] = t[i], [bx, by] = t[i - 1];
      const seg = Math.hypot(bx - ax, by - ay);
      if (seg === 0) continue;
      while (prochain <= arc + seg && prochain <= reculMax) {
        const u = (prochain - arc) / seg;
        const cx = ax + (bx - ax) * u, cy = ay + (by - ay) * u;
        if (libre(cx, cy)) { trouve = { x: cx, y: cy }; break; }
        prochain += PAS;
      }
      arc += seg;
    }
    if (trouve) { posees.push({ ...trouve, reculee: true }); continue; }

    /* Dernier recours : à côté du bout, perpendiculairement au fil, du côté
       qui s'éloigne le plus de la pastille gênante. */
    const avant = t.length >= 2 ? t[t.length - 2] : [bout[0] - 1, bout[1]] as Point;
    const dx = bout[0] - avant[0], dy = bout[1] - avant[1];
    const n = Math.hypot(dx, dy) || 1;
    const nx = -dy / n, ny = dx / n;
    const note = (s: number) => Math.min(
      ...posees.filter((p) => !Number.isNaN(p.x))
        .map((p) => Math.hypot(p.x - (bout[0] + nx * ecart * s), p.y - (bout[1] + ny * ecart * s))),
    );
    const s = note(1) >= note(-1) ? 1 : -1;
    posees.push({ x: bout[0] + nx * ecart * s, y: bout[1] + ny * ecart * s, reculee: true });
  }

  return posees;
}

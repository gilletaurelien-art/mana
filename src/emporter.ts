/**
 * EMPORTER UNE BALADE — mettre ses tuiles à bord avant de partir.
 *
 * Le service worker garde déjà « ce qu'on a regardé » (`public/sw.js`, cache
 * `mana-tuiles`, plafonné). ⭐ Mais regarder n'est pas emporter : quelqu'un qui
 * ouvre une balade sans faire défiler la carte repart avec trois tuiles. Ce
 * module parcourt le tracé et demande les tuiles qui le couvrent — le service
 * worker les garde au passage, sans rien savoir de nous.
 *
 * ⛔ TROIS RÈGLES, ET ELLES SONT LA RAISON D'ÊTRE DU FICHIER :
 *
 * 1. **LE GABARIT D'ADRESSE EST LU DANS LA FEUILLE DE STYLE, JAMAIS RECOPIÉ.**
 *    Le chemin des tuiles porte la version du jeu
 *    (`…/planet/20260906_080001_pt/…`). Recopié ici, il désignerait un jeu
 *    retiré au premier renouvellement — et le bouton téléchargerait 50 fois du
 *    vide en annonçant « à bord ». C'est le défaut que ce dépôt a déjà payé sur
 *    les cibles de déploiement : une valeur qui désigne une ressource vivante
 *    se périme en silence.
 *
 * 2. **« À BORD » SE MESURE, IL NE SE STOCKE PAS.** Le cache des tuiles est
 *    plafonné et s'élague en FIFO : une balade emportée peut être évincée par
 *    les suivantes. Un drapeau « emportée » rangé dans `localStorage` serait
 *    donc vrai une semaine après être devenu faux — au moment précis où on part
 *    marcher. L'état se relit dans le cache, à chaque affichage.
 *
 * 3. **ON ANNONCE LE NOMBRE AVANT DE TÉLÉCHARGER.** Une app de balade sert sur
 *    un forfait mobile ; le poids se dit, il ne se découvre pas.
 */

import { STYLE_CARTE } from "./carte-fond";

/** Les zooms qu'on emporte.
 *
 * ⭐ MESURÉ LE 13/11/2026, PAS SUPPOSÉ : le jeu vectoriel s'arrête à **z14**
 *    (`maxzoom: 14` dans la feuille de style, et z15/z16 rendent 0 octet en
 *    ligne — maplibre sur-zoome au-delà). Emporter z15+ téléchargerait du vide.
 * ⚠️ Et les zooms bas coûtent presque rien tout en servant beaucoup : c'est eux
 *    qu'on voit en s'éloignant pour se situer. */
export const ZOOMS = [11, 12, 13, 14] as const;

/** Une tuile de marge autour du tracé : on fait défiler un peu, toujours. */
export const MARGE = 1;

export interface Tuile { z: number; x: number; y: number }

/** Le couple (x, y) de la tuile qui contient ce point, à ce zoom. */
export function tuileDe(lon: number, lat: number, z: number): Tuile {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const lt = Math.max(-85.0511, Math.min(85.0511, lat));
  const y = Math.floor(
    ((1 - Math.asinh(Math.tan((lt * Math.PI) / 180)) / Math.PI) / 2) * n,
  );
  return { z, x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/**
 * Les tuiles qui couvrent un tracé, marge comprise, sans doublon.
 *
 * ⚠️ On parcourt les POINTS, pas la boîte englobante. Une balade en L ou en
 *    boucle large a une boîte bien plus grande qu'elle : emporter la boîte
 *    multiplierait le téléchargement par deux ou trois pour des tuiles que le
 *    promeneur ne verra jamais. ⛔ Mais deux points consécutifs peuvent sauter
 *    plus d'une tuile : on interpole donc entre eux, sinon le tracé est
 *    pointillé et la carte trouée exactement entre deux relevés.
 */
export function tuilesDuTrace(
  points: readonly { lat: number; lon: number }[],
  zooms: readonly number[] = ZOOMS,
  marge = MARGE,
): Tuile[] {
  const vues = new Set<string>();
  const sortie: Tuile[] = [];
  const noter = (t: Tuile) => {
    const cle = `${t.z}/${t.x}/${t.y}`;
    if (vues.has(cle)) return;
    vues.add(cle);
    sortie.push(t);
  };
  for (const z of zooms) {
    const centres: Tuile[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = tuileDe(points[i].lon, points[i].lat, z);
      centres.push(a);
      const suivant = points[i + 1];
      if (!suivant) continue;
      /* ⭐ L'interpolation se fait en TUILES, pas en degrés : c'est le nombre
         de tuiles sautées qui dit combien de pas il faut, et il ne dépend
         ni de la latitude ni du zoom. */
      const b = tuileDe(suivant.lon, suivant.lat, z);
      const saut = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      for (let k = 1; k < saut; k++) {
        centres.push({
          z,
          x: a.x + Math.round(((b.x - a.x) * k) / saut),
          y: a.y + Math.round(((b.y - a.y) * k) / saut),
        });
      }
    }
    for (const c of centres) {
      for (let dx = -marge; dx <= marge; dx++) {
        for (let dy = -marge; dy <= marge; dy++) {
          noter({ z: c.z, x: c.x + dx, y: c.y + dy });
        }
      }
    }
  }
  return sortie;
}

/**
 * Le gabarit d'adresse des tuiles, LU DANS LA FEUILLE DE STYLE.
 *
 * ⛔ Voir la règle 1 de l'en-tête. La feuille est déjà gardée par le service
 *    worker, donc cette lecture ne coûte rien et marche hors ligne.
 * ⚠️ Rend `null` plutôt que de deviner : un gabarit inventé ferait télécharger
 *    du vide en annonçant un succès.
 */
export async function gabaritDesTuiles(
  recuperer: typeof fetch = fetch,
  adresseStyle: string = STYLE_CARTE,
): Promise<string | null> {
  try {
    const res = await recuperer(adresseStyle);
    if (!res.ok) return null;
    const style = await res.json();
    const source = style?.sources?.openmaptiles;
    const gabarit = Array.isArray(source?.tiles) ? source.tiles[0] : null;
    return typeof gabarit === "string" && gabarit.includes("{z}") ? gabarit : null;
  } catch {
    return null;
  }
}

/** L'adresse d'une tuile, depuis le gabarit de la feuille de style. */
export const adresseDe = (gabarit: string, t: Tuile): string =>
  gabarit.replace("{z}", String(t.z)).replace("{x}", String(t.x)).replace("{y}", String(t.y));

/** Le nom du cache des tuiles. ⚠️ Il doit coller à `public/sw.js` — un test le tient. */
export const CACHE_TUILES = "mana-tuiles";

/**
 * Combien de ces adresses sont DÉJÀ dans le cache. C'est la mesure qui décide
 * de l'état du bouton — voir la règle 2 de l'en-tête.
 *
 * ⚠️ Rend `null` quand on ne peut pas savoir (pas d'API `caches`, fenêtre
 *    privée, navigateur qui refuse le stockage). `null` n'est pas `0` : l'un
 *    veut dire « rien à bord », l'autre « je ne peux pas le dire », et le
 *    bouton ne doit pas annoncer le premier quand c'est le second.
 */
export async function dejaABord(adresses: readonly string[]): Promise<number | null> {
  try {
    if (typeof caches === "undefined") return null;
    const c = await caches.open(CACHE_TUILES);
    let n = 0;
    for (const a of adresses) if (await c.match(a)) n++;
    return n;
  } catch {
    return null;
  }
}

/**
 * Demande les tuiles, quelques-unes à la fois. Le service worker les garde.
 *
 * ⚠️ Le parallélisme est BORNÉ : une balade fait quelques dizaines de tuiles,
 *    et les lancer toutes d'un coup sur un réseau de bord de mer fait échouer
 *    la moitié des requêtes — un échec qui ressemble à une absence de données.
 * ⭐ Les échecs sont COMPTÉS et rendus, pas avalés : le bouton doit pouvoir
 *    dire « 43 sur 50 » au lieu d'annoncer un succès qu'il n'a pas.
 */
export async function emporter(
  adresses: readonly string[],
  surAvancee?: (faites: number, total: number) => void,
  recuperer: typeof fetch = fetch,
  front = 4,
): Promise<{ reussies: number; echouees: number }> {
  let i = 0, reussies = 0, echouees = 0;
  const total = adresses.length;
  const ouvrier = async () => {
    while (i < total) {
      const a = adresses[i++];
      try {
        const res = await recuperer(a);
        if (res.ok) reussies++; else echouees++;
      } catch {
        echouees++;
      }
      surAvancee?.(reussies + echouees, total);
    }
  };
  await Promise.all(Array.from({ length: Math.min(front, total) }, ouvrier));
  return { reussies, echouees };
}

/**
 * Le poids annoncé, en mégaoctets — règle 3 de l'en-tête.
 *
 * ⭐ 55 Ko par tuile est une MOYENNE MESURÉE le 13/11/2026 sur les tuiles de la
 *    presqu'île (z12 : 51 Ko · z13 : 32 Ko · z14 : 82 Ko). C'est une estimation
 *    assumée, et elle est annoncée comme telle à l'écran (« environ ») : la
 *    vraie taille n'est connue qu'après téléchargement, et attendre de la
 *    connaître pour la dire reviendrait à ne rien annoncer.
 */
export const KO_PAR_TUILE = 55;
export const poidsMo = (nb: number): number => Math.round((nb * KO_PAR_TUILE) / 1024 * 10) / 10;

/**
 * MES PROMENADES — enregistrées SUR CET APPAREIL, et nulle part ailleurs.
 *
 * 🔴 LA MAQUETTE PROMET « MES PROMENADES » ALORS QU'IL N'Y A PAS DE COMPTE.
 *    Deux façons de tenir la promesse : inventer des comptes, ou s'en passer.
 *    On s'en passe — et ce n'est pas un pis-aller, c'est la doctrine du
 *    projet : aucun compte, aucune donnée personnelle stockée. Les favoris
 *    vivent dans le navigateur, ils ne partent nulle part, et l'écran le DIT
 *    au lieu de le laisser croire.
 *    ⭐ Une promesse d'interface qu'on ne peut pas tenir se reformule ; elle
 *       ne se dessine pas en espérant que personne n'appuie dessus.
 *
 * ⚠️ `localStorage` LÈVE, il ne rend pas simplement vide. En navigation
 *    privée Safari, avec les cookies tiers bloqués, dans une iframe
 *    sandboxée : l'ACCÈS lui-même jette. Un `try` autour de la lecture et de
 *    l'écriture n'est pas de la prudence décorative — sans lui, l'écran
 *    entier disparaît chez une partie des visiteurs, et jamais chez nous.
 *
 * ⛔ On n'y met QUE des identifiants de promenade. Pas de position, pas de
 *    date de passage, pas d'historique : ce qu'on ne stocke pas ne fuit pas,
 *    et le droit à l'oubli est alors gratuit.
 */
const CLEF = "mana.carnet.v1";

export function lireCarnet(): string[] {
  try {
    const brut = localStorage.getItem(CLEF);
    if (!brut) return [];
    const j = JSON.parse(brut);
    // ⚠️ On valide ce qu'on relit : une clé corrompue à la main, ou écrite par
    //    une version future, ne doit pas faire planter la page d'accueil.
    return Array.isArray(j) ? j.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function basculerCarnet(slug: string): string[] {
  const actuel = lireCarnet();
  const suivant = actuel.includes(slug)
    ? actuel.filter((s) => s !== slug)
    : [...actuel, slug];
  try {
    localStorage.setItem(CLEF, JSON.stringify(suivant));
  } catch {
    // ⚠️ L'écriture a échoué (quota, mode privé). On rend quand même l'état
    //    voulu : l'interface reste cohérente le temps de la visite, et c'est
    //    mieux qu'un bouton qui ne répond pas. Ce qui serait faux, ce serait
    //    de promettre que ça survivra — l'écran ne le promet pas.
  }
  return suivant;
}

export const estAuCarnet = (slug: string) => lireCarnet().includes(slug);

/** Le carnet se vide d'un geste, sans détour par des réglages. */
export function viderCarnet(): void {
  try { localStorage.removeItem(CLEF); } catch { /* rien à faire, rien à dire */ }
}

/**
 * ── L'ÉTAT DU HORS-LIGNE ─────────────────────────────────────────────────
 * 🔴 LA MAQUETTE DESSINE UN INTERRUPTEUR « MODE HORS-LIGNE ». Il n'y a rien
 *    à allumer : le hors-ligne est automatique — le service worker met en
 *    cache ce qu'on visite. Un interrupteur suggérerait un choix qui n'existe
 *    pas, et pire, il suggérerait qu'on peut l'ÉTEINDRE, donc que l'oublier
 *    allumé expliquerait une panne.
 *    ⭐ À la place, on montre un ÉTAT, qui est vrai et bien plus utile :
 *       « prêt » ou « en préparation ». Un interrupteur demande une décision ;
 *       un état répond à la question qu'on se pose vraiment avant de partir —
 *       « est-ce que ça marchera sans réseau ? ».
 * ⚠️ Et la réponse se LIT dans le cache, elle ne se déduit pas d'un drapeau
 *    qu'on aurait posé soi-même : un drapeau dit ce qu'on a voulu, le cache
 *    dit ce qui est là.
 */
export type EtatHorsLigne = { pret: boolean; entrees: number; graphe: boolean };

export async function etatHorsLigne(): Promise<EtatHorsLigne> {
  try {
    if (!("caches" in window)) return { pret: false, entrees: 0, graphe: false };
    const noms = await caches.keys();
    const miens = noms.filter((n) => n.startsWith("mana-"));
    let entrees = 0, graphe = false;
    for (const n of miens) {
      const c = await caches.open(n);
      const clefs = await c.keys();
      entrees += clefs.length;
      // le graphe du territoire : sans lui, composer hors ligne est impossible
      if (clefs.some((r) => /\/bretagne\/g\/.*\.json$/.test(new URL(r.url).pathname))) graphe = true;
    }
    return { pret: entrees > 0, entrees, graphe };
  } catch {
    return { pret: false, entrees: 0, graphe: false };
  }
}

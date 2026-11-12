import { chargerItineraire } from "./catalogue";
import { chargerLieux, type Inventaire } from "./lieux";
import { chargerOT } from "./ot";
import { estSlugOT, promenadeOT, slugNu } from "./promenade-ot";
import { WALKS, type Walk } from "./walks";

/**
 * D'OÙ VIENT UNE PROMENADE, POUR TOUS LES ÉCRANS QUI EN OUVRENT UNE.
 *
 * 🔴 ÉCRIT LE 12/11/2026 PARCE QUE LE MÊME OUBLI S'EST RÉPÉTÉ TROIS FOIS.
 *    Chaque fois qu'une source est apparue, un écran l'a apprise et les
 *    autres non :
 *      · le catalogue distant a été ajouté à `Promenade` (l'écran de marche
 *        historique) et PAS à `FichePromenade` — sept liens morts, trouvés
 *        le 12/11 au matin ;
 *      · `Rencontres` et `Espace` ne lisent toujours que `WALKS`, ce que
 *        `vitrine.test.ts` a dû écrire comme une conséquence assumée ;
 *      · et ce soir, les circuits d'Office ont failli n'exister que sur la
 *        fiche : « Partir sur ce chemin » rendait l'accueil.
 * ⭐ Trois fois le même dessin : une capacité ajoutée à UN écran, et les
 *    voisins qui font le même métier restent en arrière. La réponse n'est
 *    pas de mieux se souvenir — c'est qu'il n'y ait plus qu'un endroit où
 *    la question « où trouve-t-on cette promenade ? » reçoive une réponse.
 *
 * ⚠️ L'ORDRE DES SOURCES N'EST PAS ARBITRAIRE. L'embarqué d'abord (il est
 *    déjà en mémoire), puis l'Office SI le préfixe le dit, puis le catalogue
 *    distant. ⛔ Et c'est un `if`, pas une course : demander le catalogue
 *    distant pour un identifiant d'Office rendrait un 404 à chaque ouverture,
 *    et ce 404 ressemblerait à une panne dans les journaux.
 */
export async function chargerPromenade(
  slug: string,
  inventaire?: Inventaire | null,
): Promise<Walk | null> {
  const embarquee = WALKS.find((w) => w.slug === slug);
  if (embarquee) return embarquee;

  if (estSlugOT(slug)) {
    const r = await chargerOT();
    const i = r.itineraires.find((x) => x.slug === slugNu(slug));
    if (!i) return null;
    /* ⚠️ L'inventaire sert aux ÉTAPES — « ce que vous croiserez ». L'écran
       qui n'en a pas besoin ne le télécharge pas ; celui qui en a besoin le
       passe. ⭐ Sans lui la promenade reste marchable : mieux vaut un écran
       qui marche sans ses étapes qu'un écran qui attend ses étapes pour
       marcher. */
    return promenadeOT(i, inventaire ?? (await chargerLieux().catch(() => null)));
  }

  return chargerItineraire(slug);
}

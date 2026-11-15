/**
 * QUI MONTRE LA CARTE DU MONDE, ET OÙ — la politique de fond d'écran de
 * MANAhome, en une fonction pure.
 *
 * 🔴 ARBITRAGE D'AURÉLIEN, 14/11/2026 : « on va modifier la politique de
 *    fonds d'écran = carte plein écran vue satellite sur chaque page ».
 *    Elle n'était qu'en arrière-plan de l'accueil depuis le matin ; elle
 *    devient le sol de TOUT MANAhome.
 *
 * ⭐ POURQUOI UN MODULE, ET PAS UNE CONDITION DE PLUS DANS LE JSX. La règle
 *    a maintenant deux versants qui doivent rester d'accord : « où le fond
 *    satellite s'affiche-t-il ? » et « quels écrans portent DÉJÀ une carte ? ».
 *    Écrite dans le JSX, elle se lisait mais ne s'interrogeait pas — et ce
 *    dépôt a déjà payé trois fois le prix d'un garde qui lit le TEXTE d'App.tsx
 *    au lieu de la DÉCISION (voir l'en-tête de `barre.ts`). Ici, la décision
 *    sort du JSX et devient une fonction qu'on interroge.
 *
 * ⛔ CE QUE « CHAQUE PAGE » NE PEUT PAS VOULOIR DIRE : une carte derrière une
 *    carte. Six écrans portent leur propre carte maplibre — le territoire, le
 *    compositeur, les hébergements, les deux fiches de promenade. Leur en
 *    poser une seconde par-dessous ne se verrait pas (elle est cachée) et
 *    coûterait un second contexte WebGL : sur un téléphone, c'est une
 *    ressource comptée, et le navigateur en sacrifie un sans prévenir.
 *    ⭐ Ce n'est donc pas une exception à la consigne, c'est sa seule lecture
 *       possible : là où la carte EST la page, il n'y a pas de fond à poser.
 *    ⚠️ Et la liste ne se recopie pas à la main sans filet : un garde de
 *       `fond-du-monde.test.ts` construit le graphe d'imports de `src/`,
 *       trouve tout ce qui atteint `maplibre-gl`, et exige que l'écran qui le
 *       rend soit exclu ici. Un septième écran-carte fera tomber le test.
 */
import { routeComplet, routePromenade } from "./router";
import type { Visage } from "./visage";

/**
 * 🔴 L'ACCUEIL-CARTE EST DÉCROCHÉ — 14/11/2026, en production. `CarteMonde`
 *    en PLEIN ÉCRAN s'initialise une fois sur deux : le style est téléchargé
 *    (200, comme ses sprites et ses polices), mais maplibre le REFUSE —
 *    « Expected value to be of type number, but found null », neuf fois — et
 *    `isStyleLoaded()` reste faux pour toujours : ni source, ni points, ni
 *    message. Une page d'accueil BLANCHE, et c'est la porte d'entrée du site.
 *
 * ⭐ LE FOND, LUI, EST L'EMPLOI SÛR DU MÊME COMPOSANT : quand il échoue, il ne
 *    coûte qu'un décor — la devise, la recherche et le contenu restent
 *    lisibles par-dessus. C'est pourquoi la carte revient par là pendant que
 *    ce drapeau reste baissé.
 * ⚠️ IL VIT ICI, AVEC LA RÈGLE DE FOND, PARCE QUE C'EST LA MÊME QUESTION :
 *    « qui montre la carte du monde sur cet écran ? ». Séparés, ils auraient
 *    pu répondre « les deux » le jour où l'on relève le drapeau — deux cartes
 *    du monde sur l'accueil, l'une derrière l'autre.
 * ⏳ À relever (`true`) dès que `CarteMonde` s'initialise de façon fiable.
 */
export const CARTE_EN_ACCUEIL = false;

/**
 * Les écrans qui portent DÉJÀ une carte maplibre à eux.
 * ⚠️ `/promenades` et `/composer` y sont nommés SÉPARÉMENT : ils rendent le
 *    même écran depuis la fusion du 3/11, et les fondre en un préfixe
 *    exclurait une adresse future qui commencerait pareil.
 */
const AVEC_LEUR_CARTE: ReadonlySet<string> = new Set([
  "/carte",        // EcranTerritoire → Territoire2030 · SwipeBalades → CarteFondOT
  "/composer",     // Composer → CarteReelle
  "/promenades",   // la même page que /composer
  "/hebergements", // Hebergements → CarteReelle
]);

/**
 * La carte satellite sert-elle de fond d'écran sur cet écran-là ?
 *
 * @param accueilEstLaCarte le drapeau `CARTE_EN_ACCUEIL`, passé pour que la
 *   règle s'éprouve dans les DEUX régimes — un défaut qui n'apparaît qu'après
 *   avoir relevé un drapeau est un défaut qu'aucun test ne verrait.
 */
/**
 * 🔴 LES HÔTES DONT LE SOL EST LA CARTE — et c'est la MÊME question que
 *    « lesquels portent la charte de MANAhome ? », parce que cette charte
 *    n'est rien d'autre que « laisser voir le satellite et protéger le texte
 *    posé dessus ».
 *
 * ⛔ CE N'ÉTAIT PAS UNE LISTE, C'ÉTAIT `v === "love"` — un test en NÉGATIF, et
 *    il a mordu le 15/11/2026. manafrance.org a été posé le soir même : la
 *    fonction a répondu « oui, carte en fond » pour lui — correctement, par
 *    accident — tandis que la feuille de style, elle, ÉNUMÉRAIT ses deux hôtes
 *    (`:is([data-visage="bzh"],[data-visage="home"])`). Résultat à l'écran :
 *    la carte était bien montée, et le sol sable de l'application se peignait
 *    par-dessus. Le défaut ne ressemblait pas à une carte mal cadrée, il
 *    ressemblait à une carte ABSENTE — avec, en prime, la charte du logo et
 *    des encadrés restée à son état d'avant.
 * ⭐ UN TEST EN NÉGATIF ET UNE ÉNUMÉRATION NE PEUVENT PAS RESTER D'ACCORD : le
 *    premier accueille tout visage nouveau, la seconde en exclut tout visage
 *    nouveau. Ils divergent à la première addition, et par construction dans
 *    le sens le plus silencieux — rien ne manque, tout est simplement caché.
 * ⚠️ D'où la forme : l'ensemble est ÉCRIT ICI, une fois, et
 *    `fond-du-monde.test.ts` exige que la feuille de style nomme exactement
 *    ces visages-là. Un cinquième visage fera tomber le test, des deux côtés.
 */
export const CHARTE_SUR_CARTE: ReadonlySet<Visage> = new Set(["bzh", "home", "france"]);

export function carteEnFond(
  v: Visage,
  chemin: string,
  accueilEstLaCarte: boolean = CARTE_EN_ACCUEIL,
): boolean {
  /* 🔄 NOS TROIS VISAGES, DEPUIS LE 15/11/2026 AU SOIR. Aurélien : « pour le
     site mana.bzh, tu vas lui offrir la même charte graphique que
     manahome.org, à l'identique » — et, interrogé sur le sol : le satellite,
     comme manahome. Les vingt-deux paysages tournants s'arrêtent là.
     manafrance.org a suivi le soir même : « la version française de
     manahome », donc le même sol, restreint à la France (voir `etendue.ts`).
     ⛔ mana.love RESTE DEHORS : elle n'emprunte que deux écrans à cette
        application et sa charte est celle de l'autre dépôt. */
  if (!CHARTE_SUR_CARTE.has(v)) return false;
  /* L'accueil en plein écran EST la carte : pas de seconde carte dessous. */
  if (chemin === "/" && accueilEstLaCarte) return false;
  if (AVEC_LEUR_CARTE.has(chemin)) return false;
  /* ⭐ Les deux fiches de promenade portent `CarteReelle` ; les deux autres
     routes `/promenade/<slug>/…` (en-chemin, rencontres) n'ont pas de carte
     et reçoivent donc le fond comme n'importe quel écran de texte. */
  if (routePromenade(chemin) || routeComplet(chemin)) return false;
  return true;
}

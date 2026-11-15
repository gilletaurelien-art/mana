/**
 * L'ÉTENDUE DE LA CARTE — ce que l'hôte couvre, et rien d'autre.
 *
 * 🔴 ARCHITECTURE ARRÊTÉE PAR AURÉLIEN, 15/11/2026, mot pour mot :
 *
 *        architecture commune de base = manahome.org
 *        manafrance = la france only
 *        mana.bzh   = la bretagne seulement + option les balades des OT
 *
 *    Ce n'est pas trois produits : c'est UN produit et trois ÉTENDUES.
 *    manahome est la base ; les deux autres en sont des restrictions, plus —
 *    pour mana.bzh — un calque de plus.
 *
 * ⭐ POURQUOI UN MODULE, ET POURQUOI SI TÔT. Avant lui, l'étendue était
 *    écrite en dur à quatre endroits qui ne se parlaient pas : le centre de
 *    `CarteMonde` ([10, 46], choisi parce que j'y testais), l'emprise bretonne
 *    de `Territoire2030`, le filtre de `lieux.json`, et la bande de longitude
 *    de la recherche. Le défaut qui en est sorti le 14/11 est exactement
 *    celui-là : sur manahome.org, le premier bouton de la barre ouvrait la
 *    presqu'île de Crozon, et la recherche ne connaissait que la Bretagne.
 *
 * ⛔ UNE ÉTENDUE N'EST PAS UN CENTRE. Elle dit une BOÎTE — ce que l'hôte
 *    revendique — et le cadrage s'en déduit. Un centre recopié est un réglage
 *    de mise au point qui survit au déploiement ; une boîte est une promesse
 *    qu'on peut tenir et vérifier.
 */
import type { Visage } from "./visage";
import { TERRITOIRES, deContree } from "./territoires";

export interface Etendue {
  /** l'identifiant, pour les tests et les traces */
  clef: "monde" | "france" | "bretagne";
  /** ce qu'on en dit à l'écran, article compris */
  nom: string;
  /** [ouest, sud, est, nord] */
  boite: [number, number, number, number];
  /**
   * 🔴 OÙ LA CARTE S'OUVRE, QUAND ON NE SAIT PAS OÙ EST LA PERSONNE.
   *
   * ⛔ CE N'EST PAS LE CENTRE DE LA BOÎTE, et la première rédaction l'a cru.
   *    Le centre du MONDE est [0, 0] : le golfe de Guinée, en plein océan.
   *    Une carte mondiale qui s'ouvre sur de l'eau vide n'annonce rien — et
   *    on ne peut pas « approcher » depuis nulle part.
   * ⛔ ET ON NE PEUT PAS DÉZOOMER POUR TOUT MONTRER : mesuré, le relais ortho
   *    répond à partir de z6 et rend 404 en dessous. « Le monde entier en
   *    satellite » n'existe pas ici — ce n'est pas un réglage, c'est la
   *    couverture de la source.
   * ⭐ C'est donc une DÉCISION, et elle s'écrit comme telle plutôt que de se
   *    déduire d'une formule qui aurait l'air objective. Pour le monde :
   *    l'Europe de l'Ouest, parce que c'est là que ce produit est employé
   *    aujourd'hui — et ce n'est qu'un point de départ, que la
   *    géolocalisation remplace dès qu'elle répond.
   * ⚠️ Pour une étendue bornée, elle vaut le centre de la boîte : là, le
   *    centre est le bon endroit, et le dire deux fois les ferait diverger.
   */
  ouverture: [number, number];
  /** Le zoom d'ouverture — jamais sous 6, voir la note ci-dessus. */
  zoom: number;
}

/**
 * ⭐ LA BRETAGNE SE DÉRIVE, elle ne se recopie pas : c'est l'union des
 *    emprises réellement moissonnées, la même que `TOUT` emploie pour cadrer
 *    la carte du territoire. Ajouter un territoire breton l'étend tout seul.
 * ⛔ Et la leçon d'hier tient : on dérive de la BONNE source. Ici la question
 *    est « que revendique mana.bzh ? », et la réponse est bien ce qui a été
 *    moissonné — pas l'inventaire des lieux, qui déborde ces emprises de 79 %
 *    (voir `ETENDUE` dans `lieux.ts`).
 */
function boiteBretonne(): [number, number, number, number] {
  const ts = deContree(TERRITOIRES[0].contree);
  return [
    Math.min(...ts.map((t) => t.emprise[0])),
    Math.min(...ts.map((t) => t.emprise[1])),
    Math.max(...ts.map((t) => t.emprise[2])),
    Math.max(...ts.map((t) => t.emprise[3])),
  ];
}

/**
 * ⚠️ LA FRANCE EST ÉCRITE, ET C'EST ASSUMÉ : c'est une frontière, pas une
 *    valeur vivante — elle ne bougera pas entre deux déploiements. La boîte
 *    couvre la métropole et la Corse ; l'outre-mer en est dehors, et il
 *    faudra le dire le jour où manafrance ouvrira (⏳ une étendue par
 *    territoire ultramarin, ou une boîte qui fait le tour du globe : les deux
 *    se défendent, aucune ne s'improvise).
 * ⛔ `manafrance` N'EST PAS ENCORE UN VISAGE SERVI. L'étendue est écrite
 *    AVANT l'hôte, à dessein : la règle existe, et le jour où le domaine
 *    arrive, il n'y a qu'à le nommer. L'inverse — un hôte servi sans étendue
 *    — rendrait la France au monde entier sans que rien ne le signale.
 */
const FRANCE: [number, number, number, number] = [-5.3, 41.3, 9.7, 51.2];

/** La Terre, moins les calottes que Mercator ne sait pas projeter. */
const MONDE: [number, number, number, number] = [-180, -85, 180, 85];

const centre = (b: [number, number, number, number]): [number, number] =>
  [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];

export const ETENDUES: Record<Etendue["clef"], Etendue> = {
  /* ⚠️ [6, 48] : l'Europe de l'Ouest. Un point de départ assumé, pas une
     mesure — voir `ouverture` ci-dessus. */
  monde: { clef: "monde", nom: "le monde", boite: MONDE, ouverture: [6, 48], zoom: 6 },
  france: { clef: "france", nom: "la France", boite: FRANCE,
            ouverture: centre(FRANCE), zoom: 6 },
  bretagne: { clef: "bretagne", nom: "la Bretagne", boite: boiteBretonne(),
              ouverture: centre(boiteBretonne()), zoom: 9 },
};

/**
 * L'étendue d'un visage.
 *
 * ⚠️ `love` REND LE MONDE, et ce n'est pas un oubli : mana.love n'a pas de
 *    territoire à elle — elle n'emprunte que deux écrans à cette application.
 *    Lui donner la Bretagne l'enfermerait dans un territoire qu'elle ne
 *    revendique pas ; lui donner la France inventerait une frontière que
 *    personne n'a posée. La base commune est la bonne réponse par défaut.
 */
export function etendueDe(v: Visage): Etendue {
  if (v === "bzh") return ETENDUES.bretagne;
  return ETENDUES.monde;
}

/** Le centre géométrique d'une étendue. ⚠️ Ce n'est PAS forcément là qu'on
 *  ouvre la carte — voir `ouverture`. */
export const centreDe = (e: Etendue): [number, number] => centre(e.boite);

/** Le point est-il dans l'étendue ? */
export const dansLEtendue = (e: Etendue, lon: number, lat: number): boolean =>
  lon >= e.boite[0] && lon <= e.boite[2] && lat >= e.boite[1] && lat <= e.boite[3];

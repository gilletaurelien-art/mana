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
  clef: "monde" | "france" | "bto";
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
  /**
   * 🔴 LA CARTE SE LIMITE-T-ELLE À CETTE BOÎTE ? — 15/11/2026.
   *
   * ⛔ JUSQU'ICI, UNE ÉTENDUE NE DÉCIDAIT QUE DE L'OUVERTURE. On pouvait
   *    glisser de Crozon jusqu'à Nantes : le champ `boite` existait et ne
   *    retenait rien. « La carte se limite au Finistère » (Aurélien) demande
   *    un vrai cadre, pas un point de départ — `maxBounds` côté maplibre.
   * ⭐ ET C'EST UN ARGUMENT DE VENTE AVANT D'ÊTRE UN RÉGLAGE : on va demander
   *    à des EPCI de financer la promotion de LEURS balades. Une carte qui
   *    s'arrête à leur territoire dit que l'outil est le leur.
   * ⚠️ `monde` ne se borne PAS, et ce n'est pas un oubli : manahome revendique
   *    la Terre. Un cadre y serait une frontière que personne n'a posée.
   */
  cadre: boolean;
}

/**
 * 🔴 LE CADRE DE mana.bzh EST CELUI DE BREST TERRES OCÉANES — 15/11/2026,
 *    décision d'Aurélien, et c'est une décision COMMERCIALE avant d'être
 *    technique : « je vais présenter mana.bzh à BTO, puis demander un
 *    financement aux EPCI du nord Finistère pour promouvoir leurs balades
 *    d'Office de Tourisme ». Une carte qui laisse glisser jusqu'à Nantes dit
 *    « vous êtes une région parmi d'autres » ; une carte qui s'arrête à leur
 *    territoire dit « cet outil est le vôtre ».
 *
 * ⛔ CE QU'IL REMPLACE PORTAIT UN NOM QUI MENTAIT. `ETENDUES.bretagne`
 *    s'appelait « la Bretagne » et valait l'union des DEUX territoires
 *    moissonnés — Crozon et l'Aulne : **45 km sur 21**. Le cadre BTO est donc
 *    un AGRANDISSEMENT, pas une restriction, et personne ne s'en serait douté
 *    en lisant le nom.
 *
 * ⚠️ LA BOÎTE EST ÉCRITE, ET C'EST ASSUMÉ — même raison que `FRANCE` plus
 *    bas : c'est un périmètre administratif, pas une valeur vivante. Mais
 *    elle n'est pas INVENTÉE : elle est l'union des boîtes des six EPCI, lues
 *    dans `epci_index` le 15/11/2026, les six trouvées sur six :
 *
 *      Brest Métropole                        [-4.6310, 48.2228, -4.3445, 48.4749]
 *      CC du Pays d'Iroise                    [-5.1398, 48.2620, -4.6187, 48.5753]
 *      CC du Pays des Abers                   [-4.6528, 48.4629, -4.4113, 48.6430]
 *      CC Lesneven Côte des Légendes          [-4.4346, 48.4476, -4.2193, 48.6779]
 *      CA du Pays de Landerneau-Daoulas       [-4.3419, 48.2820, -4.0941, 48.5445]
 *      CC Presqu'île de Crozon-Aulne maritime [-4.5273, 48.1614, -4.2164, 48.3887]
 *
 *    La recette, pour la refaire le jour où une EPCI entre ou sort :
 *      SELECT ST_Extent(boite) FROM public.epci_index
 *       WHERE departement_code='29' AND libelle IN (…les six…);
 *
 * ⭐ ET LE PÉRIMÈTRE SUIT LE FINANCEMENT, PAS L'INVERSE. Le jour où Morlaix
 *    ou Quimper entrent au tour de table, cette boîte grandit — c'est une
 *    ligne à changer, pas une architecture.
 */
const BTO_EPCI: [number, number, number, number] = [-5.1398, 48.1614, -4.0941, 48.6779];

/**
 * 🔴 ET LE CADRE DÉBORDE LES SIX EPCI DE 5 km À L'EST — arbitrage d'Aurélien,
 *    15/11/2026, sur une mesure que le garde a sortie.
 *
 * ⛔ NOTRE TERRITOIRE « AULNE MARITIME » NE TIENT PAS DANS BTO. Il va jusqu'à
 *    -4,0210 (Châteaulin, Port-Launay) quand l'union des six s'arrête à
 *    -4,0941 : **5 km dehors**. Plus étrange encore, il va **14 km plus à
 *    l'est que l'EPCI qui porte son nom** (« Presqu'île de Crozon-Aulne
 *    maritime » s'arrête à -4,2164) : nous avons moissonné jusque dans
 *    Pleyben-Châteaulin-Porzay, qui n'est pas sollicitée.
 * ⭐ Un cadre DUR qui ne contient pas ce qu'on a moissonné enferme la carte
 *    hors de ses propres données : le haut du halage de l'Aulne serait
 *    devenu inatteignable, sans un mot d'explication — un `maxBounds` ne
 *    s'explique pas, il résiste.
 *
 * ⚠️ ET ON NE RAJOUTE PAS 0,073° À LA MAIN. Le cadre est l'UNION de deux
 *    sources — le périmètre qu'on vend, et ce qu'on a moissonné — donc il
 *    suit tout seul le jour où un territoire s'étend ou qu'une EPCI entre.
 *    Une marge écrite en dur, elle, serait juste aujourd'hui et fausse au
 *    premier ajout, sans que personne ne la relise.
 */
function cadreDeManaBzh(): [number, number, number, number] {
  const notres = deContree(TERRITOIRES[0].contree).map((t) => t.emprise);
  return [
    Math.min(BTO_EPCI[0], ...notres.map((e) => e[0])),
    Math.min(BTO_EPCI[1], ...notres.map((e) => e[1])),
    Math.max(BTO_EPCI[2], ...notres.map((e) => e[2])),
    Math.max(BTO_EPCI[3], ...notres.map((e) => e[3])),
  ];
}
const BTO = cadreDeManaBzh();

/**
 * ⚠️ LA FRANCE EST ÉCRITE, ET C'EST ASSUMÉ : c'est une frontière, pas une
 *    valeur vivante — elle ne bougera pas entre deux déploiements. La boîte
 *    couvre la métropole et la Corse ; l'outre-mer en est dehors, et il
 *    faudra le dire le jour où manafrance ouvrira (⏳ une étendue par
 *    territoire ultramarin, ou une boîte qui fait le tour du globe : les deux
 *    se défendent, aucune ne s'improvise).
 * 🔴 ET « IL N'Y A QU'À LE NOMMER » NE S'EST PAS FAIT — corrigé le 15/11/2026
 *    au soir. Cette note disait : « `manafrance` n'est pas encore un visage
 *    servi. L'étendue est écrite AVANT l'hôte, à dessein […] l'inverse — un
 *    hôte servi sans étendue — rendrait la France au monde entier sans que
 *    rien ne le signale. » Le quatrième visage a été posé deux heures plus
 *    tard, `etendueDe()` n'a pas été touchée, et c'est le mot pour mot de
 *    cette phrase qui est arrivé : manafrance.org ouvrait sur [6, 48] —
 *    l'Europe de l'Ouest, à cheval sur la frontière suisse — et rien ne l'a
 *    signalé.
 * ⭐ UNE PRÉDICTION ÉCRITE N'EST PAS UN GARDE. Celle-ci décrivait le défaut
 *    exactement, dans le fichier où il allait se produire, et elle n'a servi
 *    à rien — personne ne relit un commentaire en posant un hôte. C'est
 *    `etendue.test.ts` qui l'énumère désormais : un visage sans étendue
 *    propre y est une ligne rouge, pas une phrase à relire.
 */
const FRANCE: [number, number, number, number] = [-5.3, 41.3, 9.7, 51.2];

/** La Terre, moins les calottes que Mercator ne sait pas projeter. */
const MONDE: [number, number, number, number] = [-180, -85, 180, 85];

const centre = (b: [number, number, number, number]): [number, number] =>
  [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];

export const ETENDUES: Record<Etendue["clef"], Etendue> = {
  /* ⚠️ [6, 48] : l'Europe de l'Ouest. Un point de départ assumé, pas une
     mesure — voir `ouverture` ci-dessus. */
  monde: { clef: "monde", nom: "le monde", boite: MONDE, ouverture: [6, 48], zoom: 6,
           cadre: false },
  france: { clef: "france", nom: "la France", boite: FRANCE,
            ouverture: centre(FRANCE), zoom: 6, cadre: true },
  bto: { clef: "bto", nom: "Brest terres océanes", boite: BTO,
         ouverture: centre(BTO), zoom: 9, cadre: true },
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
  if (v === "bzh") return ETENDUES.bto;
  /* 🔴 LA LIGNE QUI MANQUAIT PENDANT DEUX HEURES — voir la note de `FRANCE`
     ci-dessus. Sans elle, manafrance.org tombait dans le repli du monde :
     une carte satellite ouverte sur l'Europe de l'Ouest, pour un site qui ne
     revendique que la France. ⛔ Le repli ne criait pas, il CADRAIT MAL. */
  if (v === "france") return ETENDUES.france;
  return ETENDUES.monde;
}

/** Le centre géométrique d'une étendue. ⚠️ Ce n'est PAS forcément là qu'on
 *  ouvre la carte — voir `ouverture`. */
export const centreDe = (e: Etendue): [number, number] => centre(e.boite);

/** Le point est-il dans l'étendue ? */
export const dansLEtendue = (e: Etendue, lon: number, lat: number): boolean =>
  lon >= e.boite[0] && lon <= e.boite[2] && lat >= e.boite[1] && lat <= e.boite[3];

/**
 * LE CADRE À DONNER À MAPLIBRE — `[[ouest, sud], [est, nord]]`, ou rien.
 *
 * ⭐ IL SE DÉRIVE DE L'ÉTENDUE, IL NE SE RECOPIE PAS. Une seconde écriture
 *    des bornes dans `CarteMonde` divergerait de `boite` au premier
 *    ajustement de périmètre — et le symptôme serait muet : une carte qui
 *    s'arrête ailleurs que là où le produit le promet.
 * ⚠️ Rend `undefined` plutôt que la boîte du monde : passer
 *    `[[-180,-85],[180,85]]` à maplibre n'est PAS équivalent à ne rien
 *    passer — ça interdit de franchir l'antiméridien, sur une carte qui
 *    revendique la Terre.
 */
export const cadreDe = (e: Etendue):
  [[number, number], [number, number]] | undefined =>
  e.cadre ? [[e.boite[0], e.boite[1]], [e.boite[2], e.boite[3]]] : undefined;

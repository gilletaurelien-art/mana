// L'inventaire des sites remarquables de la communauté de communes.
//
// ⭐ C'EST LA MOITIÉ QUE MANA APPORTE. L'Office a les 46 circuits balisés,
//    dont il répond. Personne n'a la liste de ce qu'on CROISE : 1 358 lieux,
//    dont 624 nommés et 734 que personne n'a nommés.
//
// ⛔ UNE CATÉGORIE N'EST PAS UN SUJET. L'extrait OSM porte 1 880 étiquettes
//    candidates ; on en retient 1 358 objets. Sont écartés, après avoir été
//    comptés : les robinets (`drinking_water`, 30), les bornes
//    (`milestone`, 27, zéro nommée), les lignes de falaise (48), les cales et
//    les pontons. La règle vit dans `scripts/lieux.py` et se discute.
//
// ⚠️ 110 Ko, chargés À LA DEMANDE. Qui lit l'accueil ne paie pas l'inventaire.

export interface Lieu {
  /** catégorie — la clé de `LIBELLES` */ c: string;
  /** nom, ou `null` : 734 lieux n'en ont pas, et c'est une information */
  n: string | null;
  /** [lon, lat] */ g: [number, number];
  /** l'objet OpenStreetMap — `n123` ou `w456`, pour remonter à la source */
  osm: string;
  /** menhir · dolmen · alignment, quand OSM le précise */ type?: string;
  desc?: string;
  wiki?: string;
}

export interface Inventaire {
  genere: string;
  attribution: string;
  libelles: Record<string, string>;
  lieux: Lieu[];
}

let cache: Promise<Inventaire> | null = null;

/** ⭐ Une seule promesse mémorisée : deux écrans ne téléchargent pas 110 Ko
 *  en double. */
export function chargerLieux(): Promise<Inventaire> {
  if (!cache) cache = import("./lieux.json").then((m) => m.default as unknown as Inventaire);
  return cache;
}

/** Le libellé d'un lieu : son nom, ou celui de sa catégorie s'il n'en a pas.
 *  ⚠️ Jamais la clé technique : « megalithe » ne se montre pas à l'écran. */
export const nommer = (l: Lieu, libelles: Record<string, string>) =>
  l.n ?? libelles[l.c] ?? l.c;

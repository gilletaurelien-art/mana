/**
 * LE FOND TOURNANT — fixe, continu, sur toute l'application.
 *
 * ⛔ CE SONT DES ILLUSTRATIONS. Aucune n'est la photographie d'un lieu réel et
 *    aucune ne porte de toponyme : elles évoquent la Bretagne, elles n'en
 *    documentent aucun endroit. C'est pourquoi elles ne passent PAS par
 *    `images/Photo.tsx`, dont tout le contrat consiste à affirmer un lieu.
 *    Deux familles d'images, deux chemins, et aucun risque de confondre.
 *
 * ⭐ DEUX COUCHES, ET LA CACHÉE PRÉCHARGE LA SUIVANTE. C'est tout le dessin :
 *    pendant les trois secondes où une image est visible, l'autre couche
 *    télécharge et décode celle d'après. Au moment du fondu, elle est déjà
 *    prête — jamais de cadre vide, jamais de saut. Un simple changement de
 *    `src` toutes les trois secondes afficherait du blanc sur un réseau lent,
 *    c'est-à-dire exactement sur le terrain où nous prétendons tenir.
 *
 * ⚠️ UNE LISTE MÉLANGÉE, PAS UN TIRAGE AU HASARD. Un tirage répète : il peut
 *    rendre deux fois la même image d'affilée, et c'est ce qu'on remarque.
 *    On mélange les vingt-deux une fois, on les parcourt, on remélange — en
 *    s'assurant que la première du nouveau tour n'est pas la dernière de
 *    l'ancien. Personne ne voit jamais deux fois la même à la suite.
 *
 * 🔴 ET LA ROTATION S'ARRÊTE QUAND L'ONGLET EST CACHÉ. Sans ça, un téléphone
 *    dans une poche continue de télécharger une image toutes les trois
 *    secondes : 20 Ko × 1 200 par heure. Sur un forfait de terrain, c'est une
 *    facture ; dans un sac à dos, c'est la batterie. Ce n'est pas une
 *    optimisation, c'est une condition d'usage.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import donnees from "./fonds/fonds.json";
/* ⚠️ RENOMMÉ À L'IMPORT : la boucle de minuterie, juste en dessous, s'appelle
   DÉJÀ `battre`. Sous le même nom, c'est la locale qui gagne — et l'appel
   partait dans la boucle au lieu de l'horloge. TypeScript ne l'a vu que par
   le NOMBRE D'ARGUMENTS ; avec la même signature, ça compilait et faisait
   silencieusement autre chose. ⭐ Un import masqué par une locale homonyme ne
   se signale pas : il se résout, simplement ailleurs. */
import { battre as diffuserBattement } from "./horloge-fond";
import { couchesAu, coucheVisible, type Phase } from "./fond-rotation";

type Variante = { fichier: string; largeur: number; format: string; octets: number };
type Fond = { id: string; variantes: Variante[] };

/**
 * LA RÈGLE D'AFFICHAGE : chaque fond apparaît `VISIBLE_MS`, plus `FONDU_MS`
 * de fondu. ⚠️ LES DURÉES NE SONT PAS RECOPIÉES ICI, et c'est délibéré — ce
 * paragraphe annonçait « NEUF secondes » depuis le 31/10 et est devenu faux
 * à la minute où le fondateur a demandé trois. Une note qui recopie une
 * valeur vivante vieillit deux fois plus vite que la valeur : elle DÉSIGNE
 * les deux constantes, elle ne les cite pas.
 *
 * ⭐ ELLE EST ÉCRITE COMME UNE SOMME, PAS COMME DEUX NOMBRES. La règle porte
 *    sur le temps où l'image est PLEINEMENT VISIBLE ; la durée du cycle s'en
 *    déduit. Écrire `DUREE = 10000` et `FONDU = 1000` côte à côte laisserait
 *    deux valeurs indépendantes que la prochaine main changerait séparément —
 *    et le temps pleinement visible deviendrait autre chose sans que
 *    personne ne le voie.
 *    Ici, modifier l'une des deux garde la règle vraie par construction.
 */
/* 🔄 6/11/2026, demande du fondateur : « 1 fond d'écran = 3 secondes, et la
   transition entre chaque = 1 seconde en fondu enchaîné ». Neuf secondes
   venaient du 31/10.
   ⚠️ ET LE COÛT EST DIT : le préchargement de l'image suivante disposait de
      huit secondes, il n'en a plus que deux et demie (le palier moins le
      fondu et sa marge). Sur un réseau lent, l'image entrante peut n'être
      pas décodée à temps. C'est un arbitrage, pas un oubli — et c'est la
      raison pour laquelle le préchargement part dès la FIN du fondu, au plus
      tôt possible, et non au milieu du palier. */
const VISIBLE_MS = 3000;
const FONDU_MS = 1000;
/* ⚠️ La couche sortante disparaît d'un coup EXACTEMENT à `FONDU_MS` (son
   `transition-delay`). Lui changer son image à cet instant précis courrait
   contre le navigateur : la marge garantit qu'elle est bien recouverte et à
   zéro avant qu'on y touche. */
const MARGE_MS = 150;
/** le palier complet : ce qui sépare deux déclenchements */
const DUREE_MS = VISIBLE_MS + FONDU_MS;

const FONDS: Fond[] = (donnees as { fonds: Fond[] }).fonds;
/* 🔴 « fonds » ÉTAIT DÉJÀ PRIS SUR mana.bzh — 101 images de l'application
   historique, dans un dossier du même nom. Les fichiers ne portent pas les
   mêmes noms, mais un seul dossier peut répondre à « /fonds/* » : servir
   celui-ci priverait les 63 885 pages d'agrégat des leurs.
   ⭐ Renommer coûte une ligne ici ; arbitrer un dossier partagé coûte à
      chaque déploiement, des deux côtés, et le perdant est muet. */
const BASE = `${import.meta.env.BASE_URL}paysages/`;

/** Fisher-Yates — un vrai mélange, pas un tri sur une clé aléatoire. */
function melanger<T>(src: T[]): T[] {
  const a = src.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const jeu = (f: Fond, fmt: string) =>
  f.variantes.filter((v) => v.format === fmt)
    .sort((a, b) => a.largeur - b.largeur)
    .map((v) => `${BASE}${v.fichier} ${v.largeur}w`)
    .join(", ");

function Couche({ fond, visible, premier }: { fond: Fond; visible: boolean; premier: boolean }) {
  return (
    <picture className="fond-couche" data-visible={visible || undefined}>
      <source type="image/avif" srcSet={jeu(fond, "avif")} sizes="100vw" />
      <source type="image/webp" srcSet={jeu(fond, "webp")} sizes="100vw" />
      {/* ⚠️ `alt=""` et `aria-hidden` : un fond décoratif annoncé à chaque
          rotation transformerait un lecteur d'écran en métronome. */}
      <img
        src={`${BASE}${fond.variantes.find((v) => v.format === "webp" && v.largeur === 768)?.fichier}`}
        alt=""
        decoding="async"
        loading={premier ? "eager" : "lazy"}
        draggable={false}
      />
    </picture>
  );
}

export function Fond() {
  const [liste, setListe] = useState<Fond[]>(() => melanger(FONDS));
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>("repos");
  const tour = useRef(0);

  /* ⚠️ `matchMedia` est lu À CHAQUE RENDU et écouté : quelqu'un qui active la
     réduction des animations pendant sa marche doit voir la rotation
     s'arrêter, pas au prochain rechargement. */
  const [sobre, setSobre] = useState(
    () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const h = () => setSobre(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    if (sobre || FONDS.length < 2) return;
    let id: number | undefined;
    const battre = () => {
      id = window.setTimeout(() => {
        // ⚠️ Onglet caché : on ne tourne pas, et on ne télécharge pas.
        if (document.visibilityState === "visible") {
          setI((n) => n + 1);
          setPhase("fondu");
        }
        battre();
      }, DUREE_MS);
    };
    battre();
    return () => { if (id) clearTimeout(id); };
  }, [sobre]);

  /**
   * 🔴 LE BATTEMENT SE DIFFUSE DANS UN EFFET, PAS DANS L'UPDATER D'ÉTAT.
   *    Premier jet : `setI((n) => { diffuserBattement(n + 1); return n + 1 })`.
   *    Un updater doit être PUR — React l'exécute pendant le rendu, et
   *    prévenir les abonnés y revient à appeler leur `setState` au milieu
   *    d'un rendu. React l'a dit en toutes lettres : « Cannot update a
   *    component (Fond) while rendering a different component
   *    (InvitationBalade) ».
   * ⭐ Le symptôme n'était pas une erreur rouge à l'écran : c'était l'ACCUEIL
   *    AMPUTÉ — zéro section rendue, 72 mots sur toute la page. Un rendu
   *    interrompu ne se plaint pas, il livre moins.
   * ⚠️ L'effet suit immédiatement le rendu : la synchronisation avec l'image
   *    reste vraie à l'image près, ce qui est la seule précision qui compte.
   */
  useEffect(() => { if (i > 0) diffuserBattement(i); }, [i]);

  /* ⭐ LA PHASE REVIENT AU REPOS UNE FOIS LA SORTANTE RECOUVERTE, et c'est
     seulement là que la couche cachée change d'image pour précharger la
     suivante. Pendant le fondu elle garde la sienne : c'est tout le
     correctif de l'éclair du 6/11. */
  useEffect(() => {
    if (i === 0) return;
    const id = window.setTimeout(() => setPhase("repos"), FONDU_MS + MARGE_MS);
    return () => clearTimeout(id);
  }, [i]);

  /* ⭐ Le remélange se fait À LA FIN DU TOUR, et il garantit que la première
     du nouveau tour n'est pas la dernière de l'ancien — sinon la seule
     répétition qu'on voit jamais serait exactement celle qui se remarque. */
  useEffect(() => {
    const n = FONDS.length;
    if (n < 2 || i === 0 || i % n !== 0) return;
    if (tour.current === i) return;
    tour.current = i;
    const derniere = liste[n - 1];
    let suivant = melanger(FONDS);
    let garde = 0;
    while (suivant[0].id === derniere.id && garde++ < 8) suivant = melanger(FONDS);
    setListe(suivant);
  }, [i, liste]);

  const n = liste.length;
  /* 🔴 LA RÈGLE VIT DANS `fond-rotation.ts`, PURE ET TESTÉE. Elle tenait ici
     en une ligne — `visible === 0 ? [courant, apres] : [apres, courant]` —
     et cette ligne donnait l'image i+2 à la couche SORTANTE, qui reste
     opaque une seconde entière sous la nouvelle. D'où l'éclair.
     ⭐ Elle n'était pas observable depuis un banc : la rotation se suspend
        quand l'onglet est caché. Une règle qu'on ne peut pas regarder doit
        pouvoir se LIRE — d'où la fonction pure, et ses sept tests. */
  const [a, b] = couchesAu(i, phase, n);
  const visible = coucheVisible(i);
  const couches = useMemo(() => [liste[a], liste[b]], [liste, a, b]);

  return (
    <div
      className="fond"
      aria-hidden="true"
      style={{ ["--fond-fondu" as string]: `${FONDU_MS}ms` }}
    >
      <Couche fond={couches[0]} visible={visible === 0} premier={i === 0} />
      <Couche fond={couches[1]} visible={visible === 1} premier={false} />
      {/* ⭐ LE DÉGRADÉ EST GLOBAL, ET IL EST ICI PLUTÔT QUE SUR CHAQUE PAGE.
          Il tient le titre et le sous-titre de TOUTES les pages — sa place
          est donc avec le fond, pas dans un écran. Posé page par page, il
          aurait divergé au troisième écran, et le quatrième l'aurait oublié.
          ⚠️ Il vit DANS `.fond`, donc sous tout le contenu : aucune page
             n'a à le connaître, aucune ne peut le recouvrir par erreur. */}
      <div className="fond-degrade" />
    </div>
  );
}

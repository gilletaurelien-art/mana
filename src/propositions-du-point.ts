/**
 * TROIS PROMENADES DEPUIS UN POINT — la mécanique, hors de tout écran.
 *
 * 🔴 ARBITRAGE D'AURÉLIEN, 15/11/2026 : « implémente la fonction de mana.bzh
 *    — on clique sur un site remarquable, Y aller ou Partir d'ici, 3 options ».
 *    Elle existait, dans `Territoire2030` — l'écran breton. Elle devait
 *    rejoindre la surface commune, et la recopier aurait donné deux
 *    orchestrations à tenir d'accord.
 *
 * ⭐ LE MOTEUR N'EST PAS DUPLIQUÉ, ET C'EST LE POINT. `composition.ts`
 *    (`indexer`, `accrocherUn`, `accrocherTous`, `propositionsAutour`) reste
 *    l'unique calculateur ; ce module n'est que le CÂBLAGE — quel graphe
 *    charger, quelles fermetures attendre, quelles destinations offrir.
 * ⏳ `Territoire2030` porte encore son propre câblage, écrit avant celui-ci.
 *    Il devrait l'adopter : deux câblages pour un moteur, c'est la moitié du
 *    défaut que ce dépôt traque, pas zéro.
 *
 * ⛔ ET LE REFUS HONNÊTE EST LA MOITIÉ DU TRAVAIL. Sur une carte mondiale, la
 *    plupart des points n'ont PAS de réseau piéton chez nous : trois
 *    territoires sur la Terre. Rendre une liste vide ferait croire qu'il n'y
 *    a rien à marcher là-bas ; c'est nous qui n'y sommes pas encore. Les
 *    états sont donc nommés un par un, et l'écran doit les dire.
 */
import { useEffect, useMemo, useState } from "react";
import {
  indexer, accrocherUn, accrocherTous, accroche, propositionsAutour,
  type Proposition, type Graphe, type Index, type Accroche,
} from "./composition";
import { chargerFermetures, aretesTouchees, type Fermetures } from "./fermetures";
import { territoireDe, urlGraphe, type Territoire } from "./territoires";

/** Ce qu'il faut savoir d'une destination pour la proposer. */
export interface Destination {
  n: string | null;
  c: string;
  g: [number, number];
}

export type EtatPropositions =
  /** Hors des territoires dont nous avons le réseau. */
  | { etat: "hors-reseau"; territoire: null }
  /** Le réseau arrive. */
  | { etat: "chargement"; territoire: Territoire }
  /** Il n'a pas pu être lu — ce n'est PAS « il n'y a rien ici ». */
  | { etat: "echec"; territoire: Territoire }
  /** Le réseau est là, et aucune boucle ne part d'ici. */
  | { etat: "aucune"; territoire: Territoire }
  | { etat: "ok"; territoire: Territoire; propositions: Proposition<Destination>[] };

/* ⭐ UN CACHE PAR SLUG, HORS DU COMPOSANT. Un graphe pèse de 0,8 à 2,9 Mo :
   le retélécharger à chaque clic sur un site du même territoire serait une
   facture de terrain. ⚠️ Il vit au MODULE et non dans un `useRef` : deux
   écrans qui montrent le même territoire doivent le partager — c'est la
   leçon inverse de `CarteMonde`, où le cache DEVAIT appartenir à la carte
   parce qu'il suivait son cycle de vie. Ici l'objet est immuable et sa
   validité ne dépend d'aucun montage. */
const graphes = new Map<string, Promise<Graphe>>();
function chargerGraphe(base: string, t: Territoire): Promise<Graphe> {
  const dejaLa = graphes.get(t.slug);
  if (dejaLa) return dejaLa;
  const p = fetch(urlGraphe(base, t)).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<Graphe>;
  });
  /* ⚠️ On retire la promesse du cache SI elle échoue : garder une promesse
     rejetée ferait échouer tous les essais suivants, y compris celui qui
     arriverait après le retour du réseau. */
  p.catch(() => { graphes.delete(t.slug); });
  graphes.set(t.slug, p);
  return p;
}

/**
 * Les trois promenades qui partent de ce point.
 *
 * @param point d'où l'on part, ou `null` si rien n'est choisi
 * @param destinations ce vers quoi on peut proposer d'aller — l'appelant les
 *   fournit, parce qu'elles diffèrent d'un écran à l'autre (l'inventaire
 *   breton ici, les tuiles du monde là).
 */
export function usePropositions(
  base: string,
  point: readonly [number, number] | null,
  destinations: readonly Destination[],
): EtatPropositions | null {
  const territoire = useMemo(
    () => (point ? territoireDe(point[0], point[1]) : null), [point]);
  const [graphe, setGraphe] = useState<Graphe | null>(null);
  const [rate, setRate] = useState(false);
  /** ⚠️ `undefined` = pas encore lu · `null` = illisible. Le second laisse
   *  indexer (sans exclusion) plutôt que de figer l'écran ; le premier non. */
  const [fermetures, setFermetures] = useState<Fermetures | null | undefined>(undefined);

  useEffect(() => {
    if (!territoire) { setGraphe(null); setRate(false); return; }
    let vivant = true;
    setGraphe(null); setRate(false);
    chargerGraphe(base, territoire)
      .then((g) => { if (vivant) setGraphe(g); })
      .catch(() => { if (vivant) setRate(true); });
    return () => { vivant = false; };
  }, [base, territoire]);

  useEffect(() => {
    let vivant = true;
    /* ⚠️ La base des fichiers servis, pas celle des graphes : les fermetures
       sont un fichier de l'application (voir `Territoire2030` et `Composer`,
       qui l'appellent exactement ainsi). */
    chargerFermetures(import.meta.env.BASE_URL.replace(/\/$/, ""))
      .then((f) => { if (vivant) setFermetures(f); })
      .catch(() => { if (vivant) setFermetures(null); });
    return () => { vivant = false; };
  }, []);

  /* ⛔ ON ATTEND LES FERMETURES AVANT D'INDEXER — même règle que
     `/promenades` et que la carte du territoire : l'index EXCLUT les arêtes
     interdites, il ne les pénalise pas, et cette garantie ne vaut que si on
     l'attend. Proposer d'abord et corriger ensuite afficherait, l'espace
     d'un instant, un parcours sous arrêté. */
  const touchees = useMemo(
    () => (graphe && fermetures !== undefined ? aretesTouchees(graphe, fermetures) : null),
    [graphe, fermetures]);
  const ix = useMemo<Index | null>(
    () => (graphe && touchees ? indexer(graphe, touchees.interdites) : null),
    [graphe, touchees]);

  /* ⭐ MÊME FILTRE QUE `Composer.tsx` ET QUE LA CARTE DU TERRITOIRE : les
     lieux NOMMÉS, dédoublonnés sur le nom. Une proposition « Plage » ou
     « Calvaire » sans autre précision ne se choisit pas. */
  const spots = useMemo(() => {
    const vus = new Set<string>();
    return destinations.filter((d) => {
      if (!d.n || vus.has(d.n)) return false;
      vus.add(d.n); return true;
    });
  }, [destinations]);
  const positions = useMemo(
    () => spots.map((s) => s.g as readonly [number, number]), [spots]);
  const accroches = useMemo<readonly Accroche[] | null>(
    () => (graphe && ix && positions.length
      ? accrocherTous(graphe, ix, positions, { ecartSiLoin: false })
      : null),
    [graphe, ix, positions]);

  return useMemo((): EtatPropositions | null => {
    if (!point) return null;
    if (!territoire) return { etat: "hors-reseau", territoire: null };
    if (rate) return { etat: "echec", territoire };
    if (!graphe || !ix || !accroches) return { etat: "chargement", territoire };
    const depuis = accrocherUn(graphe, ix, point as [number, number]);
    /* ⚠️ Un point DANS le territoire peut n'être accroché à rien : une île,
       un bout de côte sans chemin. Ce n'est pas « hors réseau » — le réseau
       est là, il ne passe pas par ici. */
    if (!accroche(depuis)) return { etat: "aucune", territoire };
    const propositions = propositionsAutour(
      graphe, ix, depuis, spots, positions, accroches);
    return propositions.length
      ? { etat: "ok", territoire, propositions }
      : { etat: "aucune", territoire };
  }, [point, territoire, rate, graphe, ix, accroches, spots, positions]);
}

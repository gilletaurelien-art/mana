import { useCallback, useEffect, useState } from "react";
import {
  tuilesDuTrace, gabaritDesTuiles, adresseDe, dejaABord, emporter, poidsMo,
} from "./emporter";

/**
 * « Emporter la carte » — le bouton qui met une balade à bord.
 *
 * ⭐ POURQUOI IL EXISTE. Le service worker garde ce qu'on a REGARDÉ. Quelqu'un
 *    qui ouvre une fiche sans faire défiler la carte repart donc avec trois
 *    tuiles, et la carte se vide à la première crique sans réseau — c'est-à-dire
 *    exactement là où elle sert.
 *
 * ⛔ L'ÉTAT EST MESURÉ À CHAQUE AFFICHAGE, JAMAIS STOCKÉ. Le cache des tuiles
 *    est plafonné et s'élague en FIFO : une balade emportée en novembre peut
 *    avoir été évincée par les suivantes en décembre. Un drapeau « emportée »
 *    rangé dans `localStorage` serait donc vrai longtemps après être devenu
 *    faux — au moment précis où l'on part marcher. Ici on relit le cache.
 *
 * ⚠️ ET « JE NE SAIS PAS » N'EST PAS « RIEN À BORD ». Sans API `caches` (fenêtre
 *    privée, navigateur qui refuse le stockage), le bouton le DIT au lieu de
 *    proposer un téléchargement qui ne serait gardé nulle part.
 *
 * ⭐ DEUX FORMES, UN SEUL ÉTAT. Sur la fiche, un bouton de texte qui annonce le
 *    poids ; sur l'écran de marche, une petite icône dans le rail — parce que
 *    là-bas « tout doit vivre dans de petites icônes pour que la carte reste
 *    plein écran » (arbitrage d'Aurélien du 12/11). ⛔ Un second composant
 *    aurait dupliqué la mesure, et deux mesures d'une même chose divergent :
 *    c'est la même logique, rendue deux fois.
 * ⚠️ Et en forme d'icône, l'état vit dans le NOM ACCESSIBLE : une icône ne peut
 *    pas écrire « 43 sur 60 », mais son `aria-label` le dit — sinon l'écran de
 *    marche devient le seul endroit où l'information se perd.
 */
export function BoutonEmporter(
  { points, forme = "texte" }:
  { points: readonly { lat: number; lon: number }[]; forme?: "texte" | "icone" },
) {
  const [adresses, setAdresses] = useState<string[] | null>(null);
  const [aBord, setABord] = useState<number | null | undefined>(undefined);
  const [faites, setFaites] = useState<number | null>(null);
  const [echecs, setEchecs] = useState(0);

  /* Le gabarit vient de la feuille de style — jamais recopié ici. */
  useEffect(() => {
    let vivant = true;
    (async () => {
      const gabarit = await gabaritDesTuiles();
      if (!vivant) return;
      if (!gabarit || points.length === 0) { setAdresses([]); return; }
      setAdresses(tuilesDuTrace(points).map((t) => adresseDe(gabarit, t)));
    })();
    return () => { vivant = false; };
  }, [points]);

  const mesurer = useCallback(async (liste: string[]) => {
    setABord(await dejaABord(liste));
  }, []);

  useEffect(() => { if (adresses?.length) void mesurer(adresses); }, [adresses, mesurer]);

  const lancer = useCallback(async () => {
    if (!adresses?.length) return;
    setFaites(0);
    setEchecs(0);
    const r = await emporter(adresses, (f) => setFaites(f));
    setEchecs(r.echouees);
    setFaites(null);
    await mesurer(adresses);
  }, [adresses, mesurer]);

  /* On ne rend rien tant qu'on ne sait pas : un bouton qui change de texte une
     seconde après être apparu se lit comme une hésitation. */
  if (adresses === null) return null;
  if (adresses.length === 0) return null;

  const total = adresses.length;
  /* ⚠️ Le seuil est à 95 % et non à 100 % : quelques tuiles de bord de mer
     échouent toujours, et exiger la perfection afficherait « incomplet » pour
     une balade parfaitement utilisable. */
  const complet = aBord !== undefined && aBord !== null && aBord >= total * 0.95;

  if (forme === "icone") {
    /* ⛔ RIEN PLUTÔT QU'UNE ICÔNE MORTE. Sans API `caches`, l'écran de marche
       n'a pas de place pour expliquer pourquoi un bouton ne sert à rien — la
       fiche le dit en mots, c'est là que ça se lit. */
    if (aBord === null) return null;
    const nom = faites !== null
      ? `La carte embarque, ${faites} sur ${total}`
      : complet
        ? `Carte à bord — ${total} tuiles, cette balade s’affiche sans réseau`
        : aBord
          ? `Compléter la carte hors ligne — ${aBord} sur ${total}`
          : `Emporter la carte hors ligne — ${total} tuiles, environ ${poidsMo(total)} Mo`;
    return (
      <button
        type="button"
        className={`ech-rond${complet ? " ech-rond-actif" : ""}`}
        aria-pressed={complet}
        aria-live="polite"
        disabled={faites !== null}
        onClick={lancer}
      >
        <span className="sr-only">{nom}</span>
        {/* une flèche qui descend vers un socle : emporter, pas téléverser */}
        <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v11M8 10l4 4 4-4M5 19h14" />
        </svg>
      </button>
    );
  }

  if (aBord === null) {
    return (
      <p className="m-meta emporter-impossible">
        Cette fenêtre ne garde rien hors ligne&nbsp;: la carte aura besoin du réseau.
      </p>
    );
  }

  if (faites !== null) {
    return (
      <p className="m-meta emporter-encours" aria-live="polite">
        La carte embarque… {faites} sur {total}
      </p>
    );
  }

  if (complet) {
    return (
      <p className="m-meta emporter-abord">
        ✓ Carte à bord — {aBord} tuiles. Cette balade s’affichera sans réseau.
      </p>
    );
  }

  return (
    <>
      <button type="button" className="m-action-fine emporter" onClick={lancer}>
        {aBord ? `Compléter la carte hors ligne (${aBord} / ${total})`
               : `Emporter la carte (≈ ${poidsMo(total)} Mo)`}
      </button>
      {echecs > 0 && (
        <p className="m-meta emporter-partiel">
          {echecs} tuiles n’ont pas pu être chargées. Réessayer avec un meilleur réseau.
        </p>
      )}
    </>
  );
}

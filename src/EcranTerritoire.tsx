import { lazy, Suspense, useState } from "react";
import { SwipeBalades } from "./SwipeBalades";

/**
 * L'ÉCRAN DU TERRITOIRE — DEUX VUES, UNE SEULE PAR DÉFAUT.
 *
 * ⭐ LE JEU DE CARTES PASSE DEVANT, LA CARTE DEVIENT LE REPLI (31/10/2026,
 *    décision du fondateur). Ce n'est pas un classement de goût : la carte
 *    répond à « où est-ce ? », le jeu à « qu'est-ce que je marche ? ». La
 *    seconde question vient d'abord, et de très loin.
 *
 * ⚠️ LA CARTE EST CHARGÉE À LA DEMANDE. Elle emporte le graphe du territoire
 *    et l'inventaire des lieux — près d'un mégaoctet. Qui feuillette le jeu
 *    et s'en va ne doit pas l'avoir payé. C'est ce que « repli » veut dire
 *    techniquement, pas seulement en produit.
 */
const Territoire2030 = lazy(() =>
  import("./Territoire2030").then((m) => ({ default: m.Territoire2030 })),
);

export function EcranTerritoire({ base }: { base: string }) {
  /**
   * ⭐ LA CARTE DU TERRITOIRE A UNE ADRESSE — `?vue=carte` (1/11).
   *    Elle n'était qu'un ÉTAT à l'intérieur de cet écran : on ne pouvait
   *    donc pas y mener depuis ailleurs, et deux boutons posés côte à côte
   *    sur l'accueil auraient abouti au même endroit sans qu'on le voie.
   * ⚠️ C'est une lecture À L'OUVERTURE, pas une synchronisation : le bouton
   *    de repli continue de changer la vue sans toucher à l'URL. Tenir les
   *    deux en miroir demanderait une histoire de navigation que cet écran
   *    n'a pas, et un retour arrière qui mentirait à moitié vaut moins
   *    qu'une URL qui ne sert qu'à entrer.
   */
  const [vue, setVue] = useState<"jeu" | "carte">(() => {
    try {
      return new URLSearchParams(window.location.search).get("vue") === "carte"
        ? "carte" : "jeu";
    } catch { return "jeu"; }
  });
  /** le point sur lequel la carte s'ouvre, quand on y arrive d'une balade */
  const [centre, setCentre] = useState<[number, number] | undefined>();

  if (vue === "jeu") {
    return (
      <SwipeBalades
        surCarte={(c) => { setCentre(c); setVue("carte"); }}
      />
    );
  }

  return (
    <Suspense fallback={<p className="jeu-vide" role="status">Lecture du territoire…</p>}>
      {/* ⚠️ Le retour au jeu est posé PAR-DESSUS la carte : `Territoire2030`
          occupe tout l'écran et n'a aucune place pour un bouton de plus.
          Le faire entrer dans son rendu l'obligerait à connaître l'écran qui
          le contient — exactement ce qu'un repli ne doit pas savoir. */}
      <button type="button" className="terr-retour" onClick={() => setVue("jeu")}>
        <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Balades
      </button>
      <Territoire2030 base={base} centre={centre} />
    </Suspense>
  );
}

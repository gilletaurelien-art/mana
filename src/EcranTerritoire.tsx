import { lazy, Suspense, useState } from "react";
import { SwipeBalades } from "./SwipeBalades";

/**
 * L'ÉCRAN DU TERRITOIRE — DEUX VUES, UNE SEULE PAR DÉFAUT.
 *
 * 🔴 LA CARTE PASSE DEVANT, LE JEU DEVIENT LE REPLI — 3/11/2026, demande du
 *    fondateur : « carte = premier onglet, interactive, avec nos sites
 *    remarquables et nos propositions de promenades ». Ça RETOURNE la
 *    décision du 31/10 (le jeu devant), qui tenait sur une lecture — « où
 *    est-ce ? » vient après « qu'est-ce que je marche ? » — qui n'a pas
 *    changé en soi, mais que l'onglet « carte » de la barre du bas
 *    contredit depuis le début : son icône promet une carte, et ouvrait un
 *    jeu de cartes. ⭐ Deux dispositifs pour une même question — l'icône et
 *    l'ordre d'affichage — ne peuvent pas rester en désaccord.
 *
 * ⚠️ LA CARTE EST CHARGÉE À LA DEMANDE depuis le 31/10 : elle emporte le
 *    graphe du territoire et l'inventaire des lieux — près d'un mégaoctet.
 *    Elle l'était pour que le jeu, alors par défaut, ne la paie pas ; elle
 *    le reste, parce que le code fractionné ne coûte rien à garder et que
 *    le repli (désormais le jeu) ne doit toujours pas payer ce qu'il ne
 *    montre pas.
 */
const Territoire2030 = lazy(() =>
  import("./Territoire2030").then((m) => ({ default: m.Territoire2030 })),
);

export function EcranTerritoire({ base }: { base: string }) {
  /**
   * ⭐ LES DEUX VUES ONT UNE ADRESSE — `?vue=carte` (1/11), `?vue=jeu`
   *    depuis que la carte est devenue le défaut (3/11). La première reste
   *    lue par honnêteté (un lien qui la porte encore ne doit pas rompre) ;
   *    c'est la seconde qui sert désormais à mener vers le jeu depuis
   *    ailleurs — exactement le besoin que `?vue=carte` comblait à l'origine,
   *    côté opposé.
   * ⚠️ C'est une lecture À L'OUVERTURE, pas une synchronisation : le bouton
   *    de repli continue de changer la vue sans toucher à l'URL. Tenir les
   *    deux en miroir demanderait une histoire de navigation que cet écran
   *    n'a pas, et un retour arrière qui mentirait à moitié vaut moins
   *    qu'une URL qui ne sert qu'à entrer.
   */
  const [vue, setVue] = useState<"jeu" | "carte">(() => {
    try {
      return new URLSearchParams(window.location.search).get("vue") === "jeu"
        ? "jeu" : "carte";
    } catch { return "carte"; }
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

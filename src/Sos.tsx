import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * LE SOS — UN SEUL ENDROIT POUR LE NUMÉRO, LE MESSAGE ET LA CONFIRMATION.
 *
 * 🔴 IL VIVAIT EN DEUX EXEMPLAIRES. `EnChemin.tsx` et `Promenade.tsx`
 *    construisaient chacun leur `sms:` et leur phrase d'urgence, à cinq mots
 *    près. ⭐ Ce dépôt connaît le coût de ce genre de doublon : le caviardage
 *    des adresses vit en cinq exemplaires et il a fallu un test qui LIT les
 *    cinq fichiers pour qu'ils cessent de diverger. Ici, un seul composant —
 *    et le jour où le numéro change, il change une fois.
 *
 * 🔴 ET IL PART MAINTENANT PAR UNE CONFIRMATION — 12/11/2026, demande du
 *    fondateur : « si le bouton est cliqué, demande une validation avec un
 *    pop-up expliquant ce qui se passe si confirmation. Propose l'annulation
 *    à côté de confirmation ».
 *    ⭐ C'est la bonne forme pour CE bouton-ci précisément : il est, à dessein,
 *       de la taille d'un pouce mouillé et placé là où on l'atteint sans
 *       regarder. Ce qui le rend atteignable en urgence le rend atteignable
 *       par erreur — un sac, une manche, un gant. La confirmation ne protège
 *       pas des secours, elle protège du geste involontaire.
 *    ⚠️ ELLE N'AJOUTE PAS UN ÉCRAN AVANT L'URGENCE, ELLE NOMME CELUI QUI
 *       EXISTAIT DÉJÀ. Sans elle, le lien ouvrait l'application de messages
 *       avec un brouillon — c'est-à-dire qu'il y avait DÉJÀ une étape, mais
 *       une étape qui arrivait sans prévenir, dans une application tierce,
 *       au moment où l'on a le moins de patience. La pop-up dit ce qui va se
 *       passer AVANT d'y être.
 *
 * ⛔ CE QUE LE TEXTE NE DOIT JAMAIS DIRE : « envoyer ». Le lien `sms:`
 *    PRÉPARE un message ; c'est la personne qui appuie sur envoyer, dans son
 *    application. Promettre un envoi ferait croire les secours prévenus.
 */

/** ⏳ LE NUMÉRO EST EN ATTENTE D'ARBITRAGE — soulevé le 12/11/2026, non
 *  tranché. Ce lien écrit un SMS au 112 ; en France, le numéro qui REÇOIT les
 *  SMS d'urgence est le 114, le 112 étant le numéro vocal européen.
 *  ⚠️ Ce n'est pas une mesure : personne n'a vérifié le comportement réel des
 *     opérateurs. C'est écrit pour que la question ne se reperde pas, pas
 *     pour autoriser qui que ce soit à changer le numéro d'un bouton de
 *     secours sans l'avoir établi. */
export const NUMERO_SOS = "112";

export type PositionSos = { lat: number; lon: number } | null;

/** Le SMS tel qu'il sera déposé dans l'application de messages. ⭐ Exporté :
 *  la pop-up MONTRE exactement ce texte, elle ne le paraphrase pas. Une
 *  confirmation qui décrit autre chose que ce qu'elle déclenche est pire
 *  qu'une absence de confirmation. */
export function messageSos(position: PositionSos, parcours: string): string {
  const ou = position
    ? `ma position GPS : ${position.lat.toFixed(5)}, ${position.lon.toFixed(5)}`
    : "je n'ai pas de position GPS";
  return `Urgence — ${ou} — parcours ${parcours} (mana.bzh).`;
}

export function lienSos(position: PositionSos, parcours: string): string {
  return `sms:${NUMERO_SOS}?&body=${encodeURIComponent(messageSos(position, parcours))}`;
}

export function BoutonSos(
  { position, parcours, classe, children }:
  { position: PositionSos; parcours: string; classe: string; children: ReactNode },
) {
  const [ouvert, setOuvert] = useState(false);
  const annuler = useRef<HTMLButtonElement>(null);
  const appelant = useRef<HTMLElement | null>(null);

  /* ⚠️ LE FOCUS ENTRE SUR « ANNULER », PAS SUR LA CONFIRMATION. Une pop-up
     qui ouvre le focus sur son action destructrice transforme un « Entrée »
     réflexe en déclenchement. Et il RETOURNE d'où il venait à la fermeture :
     sans ça, on se retrouve en haut de page après avoir annulé. */
  useEffect(() => {
    if (!ouvert) return;
    appelant.current = document.activeElement as HTMLElement | null;
    annuler.current?.focus();
    const auClavier = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("keydown", auClavier);
      appelant.current?.focus?.();
    };
  }, [ouvert]);

  return (
    <>
      <button type="button" className={classe} onClick={() => setOuvert(true)}>
        {children}
      </button>

      {/* 🔴 RENDUE DANS `document.body`, ET C'EST UN CORRECTIF MESURÉ À
          L'ÉCRAN. `.ech` porte `isolation: isolate` : elle crée un contexte
          d'empilement, et un `position: fixed` qui vit dedans ne peut PAS
          passer au-dessus de ce qui vit dehors, quel que soit son `z-index`.
          Vu de mes yeux : la pop-up s'ouvrait correctement et le pied de page
          et la barre du bas lui passaient DEVANT — les deux boutons,
          « Annuler » comme « Écrire le SMS », étaient dessous.
          ⭐ Un `z-index` plus grand n'y pouvait rien : la valeur ne se compare
             qu'entre frères du même contexte. C'est le genre de défaut qu'on
             tente de résoudre en montant les chiffres, indéfiniment. */}
      {ouvert && createPortal(
        /* ⚠️ LE VOILE FERME, ET IL N'EST PAS LE SEUL MOYEN DE FERMER. Un clic
           à côté est un geste d'annulation universel ; « Annuler » est le
           geste nommé. Les deux existent parce qu'on ne sait pas lequel la
           personne cherchera, et aucun des deux n'est l'action risquée. */
        <div className="sos-voile" onClick={() => setOuvert(false)}>
          <div
            className="sos-feuille"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sos-titre"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="sos-titre" id="sos-titre">Prévenir les secours</p>
            <p className="sos-dire">
              {/* ⛔ « PRÉPARE », JAMAIS « ENVOIE ». Le lien ouvre votre
                  application de messages avec le texte déjà écrit : c'est
                  VOUS qui appuyez sur envoyer, et rien ne part tant que vous
                  ne l'avez pas fait. Le dire autrement ferait croire les
                  secours prévenus alors qu'un brouillon attend. */}
              Votre application de messages s'ouvre, avec un SMS déjà écrit
              pour le <strong>{NUMERO_SOS}</strong>. <strong>Rien ne part tout
              seul</strong> : c'est vous qui appuyez sur envoyer.
            </p>
            {/* ⭐ ON MONTRE LE TEXTE EXACT. Une confirmation qui résume ce
                qu'elle déclenche laisse la personne découvrir le vrai message
                après coup — et ici le vrai message contient sa position. */}
            <p className="sos-message">{messageSos(position, parcours)}</p>
            {!position && (
              /* ⚠️ L'ABSENCE DE POSITION SE DIT AVANT, PAS APRÈS. Partir en
                 croyant avoir transmis ses coordonnées alors que le message
                 n'en porte aucune est exactement le genre de silence que ce
                 produit refuse ailleurs sur les marées et la météo. */
              <p className="sos-sans">
                ⚠️ Votre position n'est pas connue : le message partira sans
                coordonnées. Décrivez où vous êtes avant de l'envoyer.
              </p>
            )}
            <div className="sos-gestes">
              <button
                type="button"
                className="sos-annuler"
                ref={annuler}
                onClick={() => setOuvert(false)}
              >
                Annuler
              </button>
              <a
                className="sos-confirmer"
                href={lienSos(position, parcours)}
                onClick={() => setOuvert(false)}
              >
                Écrire le SMS
              </a>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

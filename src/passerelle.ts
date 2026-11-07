/**
 * 🔴 LA PASSERELLE VERS L'AUTRE APPLICATION — 7/11/2026, écrite après avoir
 *    vu le défaut EN PRODUCTION, sur une capture d'écran.
 *
 *    Le jour où mana.love s'est mis à servir nos écrans, notre barre du bas
 *    est arrivée avec eux. Cinq de ses six boutons pointaient vers des
 *    chemins qui appartiennent à l'application citoyenne — et les cinq
 *    rendaient LA MÊME PAGE, au même octet : son accueil.
 *
 *      /chat /mon-compte /radio /contact /mentions-legales → 200, 26 008 o
 *
 *    Rien n'échouait. Rien n'avertissait. ⭐ C'est le défaut que tout ce
 *    dépôt traque depuis une semaine, et il était CHEZ NOUS cette fois : une
 *    page s'affiche, elle est jolie, et elle ne répond pas à la question
 *    posée.
 *
 * ⭐ UN BOUTON ABSENT SE RÉCLAME, UN BOUTON QUI MÈNE À LA MAUVAISE PAGE NE SE
 *    SIGNALE JAMAIS. C'est tout le raisonnement de ce fichier. Tant qu'une
 *    destination n'est pas en ligne, on ne la propose pas — on ne la propose
 *    pas « en attendant », on ne la grise pas, on ne l'annonce pas comme
 *    « bientôt » : on ne la met pas.
 *
 * ⚠️ ET `enLigne` NE SE DEVINE PAS, IL SE MESURE. Chaque valeur `false`
 *    ci-dessous a été relevée en HTTP sur mana.love, pas supposée depuis un
 *    commit. La session qui tient l'autre application m'avait annoncé
 *    « /chat existe » — c'était vrai du dépôt et faux de l'hôte : son `dist/`
 *    avait deux jours de retard sur ses commits. ⭐ Un commit dit qu'un
 *    travail est FAIT, pas qu'il est ARRIVÉ.
 */

/** Un chemin que nous ne servons pas, et vers lequel nous proposons d'aller. */
export type Pont = {
  readonly chemin: string;
  /** Mesuré sur l'hôte, jamais déduit d'un commit. */
  readonly enLigne: boolean;
  /** Ce qu'on a relevé, et quand — pour que le prochain sache quoi refaire. */
  readonly releve: string;
};

/**
 * 🔴 `/` EST DANS LA TABLE, ET J'AI D'ABORD ÉCRIT LE CONTRAIRE. Mon premier
 *    jet l'excluait, avec un bon argument : « il n'a jamais été en attente,
 *    il n'a rien à faire dans une table d'attente ».
 * ⭐ C'est un test qui m'a montré que l'argument était faux dans ses
 *    conséquences. En l'excluant, je créais un CAS PARTICULIER que chaque
 *    lecteur de cette table doit connaître — et mon propre garde est tombé
 *    dessus à sa première exécution : « MANA → /, que love ne sert pas ».
 *    Une table des chemins qu'on ne sert pas doit les contenir TOUS, même
 *    ceux dont la réponse est « oui, depuis toujours ». La complétude vaut
 *    mieux que l'économie : une exception, fût-elle justifiée, se paie chez
 *    tous ceux qui lisent.
 */
export const PONTS: Readonly<Record<string, Pont>> = {
  accueil: { chemin: "/", enLigne: true,
    releve: "7/11 — 200, 26 008 o : sa landing. En ligne depuis toujours, et c'est voulu — mana.love est le sur-ensemble, sa porte doit le montrer." },
  chat: { chemin: "/chat", enLigne: false,
    releve: "7/11 — 200 mais 26 008 o : l'accueil. Écrit et poussé chez elle, pas déployé." },
  compte: { chemin: "/mon-compte", enLigne: false,
    releve: "7/11 — 200 mais 26 008 o : l'accueil. Écrit et poussé chez elle, pas déployé." },
  radio: { chemin: "/radio", enLigne: false,
    releve: "7/11 — 200 mais 26 008 o. Chez elle la radio n'est pas un chemin mais un univers (?u=radio) : à écrire." },
  contact: { chemin: "/contact", enLigne: false,
    releve: "7/11 — 200 mais 26 008 o : l'accueil. À écrire pour ce domaine." },
  mentions: { chemin: "/mentions-legales", enLigne: false,
    releve: "7/11 — 200 mais 26 008 o. mana.love n'a de mentions légales dans AUCUN des deux dépôts." },
};

/** Ce pont est-il praticable ? */
export const praticable = (clef: keyof typeof PONTS): boolean => PONTS[clef].enLigne;

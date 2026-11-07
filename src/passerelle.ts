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
 * ⚠️ ET `enLigne` NE SE DEVINE PAS, IL SE MESURE. La session qui tient
 *    l'autre application m'avait annoncé « /chat existe » — c'était vrai du
 *    dépôt et faux de l'hôte : son `dist/` avait deux jours de retard.
 *    ⭐ Un commit dit qu'un travail est FAIT, pas qu'il est ARRIVÉ.
 *
 * 🔴 ET « MESURER » A CHANGÉ DE SENS LE SOIR MÊME, PARCE QUE LE HTTP NE
 *    SUFFIT PAS ICI. mana.love est une application à routage client : le
 *    serveur rend la MÊME ENVELOPPE à tout le monde — mesuré, sa racine,
 *    `/chat` et un chemin impossible rendent le même octet et le même MD5.
 *    Le code ne prouve rien (tout est 200), le poids non plus. **Seul le
 *    RENDU tranche.**
 * ⭐ Les valeurs ci-dessous ont donc été relevées dans un NAVIGATEUR RÉEL,
 *    chemin par chemin, après purge du service worker de l'autre application
 *    — qui servait une coquille en cache et m'a d'abord fait croire que tout
 *    était mort. Le `releve` de chaque pont cite ce qui s'affichait.
 * ⚠️ ET J'AI FAILLI CONCLURE LE CONTRAIRE SUR UNE LECTURE PARTIELLE : mon
 *    premier relevé lisait `<main>`, qui ne porte que la barre de navigation.
 *    Trois mots identiques partout, et j'allais annoncer à la session voisine
 *    que ses écrans n'existaient pas. Lire « la page » par un extracteur de
 *    contenu principal n'est pas lire la page.
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
  chat: { chemin: "/chat", enLigne: true,
    releve: "7/11 au soir — VÉRIFIÉ AU RENDU, chemin par chemin, dans un navigateur réel : « MANA ouvre le Sanctuaire des Déesses de l'Amour · 9 €/mois · Activer MANA »" },
  compte: { chemin: "/mon-compte", enLigne: true,
    releve: "7/11 au soir — VÉRIFIÉ AU RENDU, chemin par chemin, dans un navigateur réel : « BIENVENUE CHEZ MANA · votre e-mail et votre mot de passe · Connexion »" },
  radio: { chemin: "/radio", enLigne: true,
    releve: "7/11 au soir — VÉRIFIÉ AU RENDU, chemin par chemin, dans un navigateur réel : « MANARADIO — L'antenne de l'Alliance MANA » (et le <title> change)" },
  contact: { chemin: "/contact", enLigne: true,
    releve: "7/11 au soir — VÉRIFIÉ AU RENDU, chemin par chemin, dans un navigateur réel : « écrire à contact@manahome.org · Ouvrir mon courrier »" },
  mentions: { chemin: "/mentions-legales", enLigne: true,
    releve: "7/11 au soir — VÉRIFIÉ AU RENDU, chemin par chemin, dans un navigateur réel : « Mentions légales · ÉDITEUR DU SERVICE · Association Alliance MANA »" },
};

/** Ce pont est-il praticable ? */
export const praticable = (clef: keyof typeof PONTS): boolean => PONTS[clef].enLigne;

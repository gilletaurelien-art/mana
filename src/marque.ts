/**
 * LES DEUX MOTS DE LA MARQUE — une seule source, deux endroits qui les posent.
 *
 * 🔴 ÉCRIT LE 15/11/2026, quand la marque a dû paraître À DEUX ENDROITS :
 *    dans l'accueil (où vit son `h1`, le seul de la page) et dans la pilule
 *    d'en-tête de la carte vivante, qu'Aurélien demande à réunir avec l'icône
 *    de menu — « faire que l'icône et le titre apparaissent dans le même fond
 *    sombre ».
 *
 * ⭐ DEUX ENDROITS, UN SEUL TEXTE. Recopier « home.org » dans le second aurait
 *    tenu jusqu'à la première retouche de devise — et ce dépôt en a connu
 *    quatre en quinze jours (« Terre, mer & lumière », « Au cœur de la
 *    Bretagne », « Partout où l'on marche », « home.org »). Une devise est
 *    exactement le genre de valeur qui bouge, donc exactement celle qu'on ne
 *    recopie pas.
 *
 * ⚠️ ET LE `h1` NE SE DUPLIQUE PAS, LUI. L'accueil garde le sien — avec son
 *    ancre `inv-titre`, désignée par `aria-labelledby` — et la pilule n'en
 *    porte qu'un écho, marqué `aria-hidden`. Deux `h1` de même identifiant
 *    seraient un document invalide et une page à deux titres.
 */
import { avecOffice } from "./visage";

/** Le mot, toujours le même. */
export const MOT = "MANA";

/**
 * La devise, EN MORCEAUX — parce que deux surfaces la posent différemment.
 *
 * 🔴 15/11/2026, Aurélien : « est-ce que tu peux mettre home et .org sur
 *    2 lignes ? La taille de MANA peut laisser les 2 mots accolés ».
 *
 * ⭐ ON NE COUPE PAS UNE CHAÎNE À L'AFFICHAGE. Casser « home.org » sur le
 *    point au moment du rendu suppose qu'il y a un point, et qu'il n'y en a
 *    qu'un — une règle de typographie déduite d'une orthographe. Le jour où
 *    la devise change, la coupe tombe au mauvais endroit ou plus du tout, et
 *    personne ne saura pourquoi. Les morceaux sont donc DÉCLARÉS.
 * ⚠️ La devise bretonne n'en a qu'un : elle se dit d'un trait, et un garde
 *    de `navigation.test.ts` tient son texte exact.
 */
/* 🔄 REVENU D'UN SEUL TENANT LE 15/11, quelques minutes après la coupe :
   Aurélien a préféré « MANA » au-dessus de « home.org » plutôt que « home »
   et « .org » empilés à côté de MANA. La coupe déclarée était bonne — elle a
   simplement cessé d'être demandée. ⭐ On la retire au lieu de la laisser
   inutilisée : un morceau qu'aucune surface ne pose est un fantôme qui se
   remet à servir un jour, mal. */
/* 🔄 « AU CŒUR DE LA BRETAGNE » → « .bzh », le 15/11/2026 au soir. C'est la
   CINQUIÈME devise bretonne en seize jours (« Terre, mer & lumière » le
   31/10, « Au cœur de la Bretagne » le 12/11, « Partout où l'on marche » —
   ma proposition — puis « home.org » pour manahome le 14/11, et celle-ci).
   ⭐ ET ELLE DIT POURQUOI CE FICHIER EXISTE. Recopiée dans le `h1` et dans la
      pilule, elle aurait déjà divergé deux fois aujourd'hui. Les deux sites
      portent maintenant la même forme : un nom, puis une adresse —
      « MANA / .bzh » et « MANA / home.org ». */
export const devisePartie = (): readonly string[] =>
  (avecOffice() ? [".bzh"] : ["home.org"]);

/**
 * La devise d'un seul tenant — pour le `h1`, qui est une PHRASE et non une
 * composition. ⚠️ Jointe sans séparateur : « home » + « .org » s'écrit
 * « home.org », et c'est le même mot que la pilule montre sur deux lignes.
 */
export const devise = () => devisePartie().join("");

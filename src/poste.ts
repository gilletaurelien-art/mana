/**
 * LE POSTE — un seul élément audio pour toute l'application.
 *
 * 🔴 POURQUOI IL NE VIT PAS DANS UN COMPOSANT. `Radio.tsx` n'est monté que
 *    sur `/radio` : son `<audio>` mourait dès qu'on changeait d'écran. Même
 *    une fois la navigation devenue interne, un élément rendu par React est
 *    démonté avec son écran — et un flux coupé ne se reprend pas là où on
 *    l'a laissé, c'est un DIRECT.
 * ⭐ Le poste vit donc au niveau du document, créé une fois, jamais démonté.
 *    L'écran `/radio` n'est plus le lecteur : il en est la façade.
 *
 * ⚠️ UN SEUL ÉLÉMENT, PAS UN PAR ÉCRAN. Deux `<audio>` sur la même source,
 *    c'est deux connexions au flux et deux factures de données mobiles — et
 *    sur un direct, deux instants différents de la même antenne.
 */
/* 🔴 RELEVÉE DANS `Radio.tsx`, PAS ÉCRITE DE MÉMOIRE. Premier jet :
   « /listen/manaradio/radio.mp3 » — plausible, et faux : la station
   s'appelle `mana`. ⭐ Une adresse écrite de mémoire est le même faux témoin
   qu'un contraste écrit de mémoire : elle a l'air juste, et elle ne se
   vérifie qu'en l'essayant. */
export const FLUX = "https://radio.mana.bzh/listen/mana/radio.mp3";

type Etat = { joue: boolean; charge: boolean; erreur: boolean };

let element: HTMLAudioElement | null = null;
let etat: Etat = { joue: false, charge: false, erreur: false };
const oreilles = new Set<(e: Etat) => void>();

function dire(p: Partial<Etat>) {
  etat = { ...etat, ...p };
  for (const o of [...oreilles]) o(etat);
}

function poste(): HTMLAudioElement {
  if (element) return element;
  const a = document.createElement("audio");
  a.preload = "none";
  /* ⚠️ Il n'est jamais affiché : la façade est dans `Radio.tsx`. Mais il est
     DANS le document — un élément détaché ne joue pas sur tous les
     navigateurs mobiles. */
  a.style.display = "none";
  a.addEventListener("ended", () => dire({ joue: false }));
  a.addEventListener("error", () => dire({ joue: false, charge: false, erreur: true }));
  /* ⭐ `pause` écouté AUSSI : le casque débranché, l'appel entrant ou le
     contrôle du système mettent en pause sans passer par nous. Sans cet
     écouteur, la façade afficherait « en lecture » sur un poste muet. */
  a.addEventListener("pause", () => { if (!a.ended) dire({ joue: false }); });
  a.addEventListener("playing", () => dire({ joue: true, charge: false, erreur: false }));
  document.body.appendChild(a);
  element = a;
  return a;
}

export function lire(): void {
  const a = poste();
  dire({ charge: true, erreur: false });
  a.src = FLUX;
  a.play().catch(() => dire({ joue: false, charge: false, erreur: true }));
}

export function couper(): void {
  const a = poste();
  a.pause();
  /* ⚠️ `pause()` NE FERME PAS LA CONNEXION : le flux continue d'être
     téléchargé en arrière-plan. On coupe la source pour de bon — c'est ce
     qui évite de consommer de la donnée mobile en silence, et un direct ne
     se reprend de toute façon pas là où on l'a laissé. */
  a.removeAttribute("src");
  a.load();
  dire({ joue: false, charge: false });
}

export const etatPoste = (): Etat => etat;

export function ecouterPoste(o: (e: Etat) => void): () => void {
  oreilles.add(o);
  return () => { oreilles.delete(o); };
}

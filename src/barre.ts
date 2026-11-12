/**
 * 🔴 CE QUE PORTE LA BARRE DU BAS — pure, donc vérifiable sans navigateur.
 *
 * ⭐ EXTRAITE LE 7/11/2026 APRÈS QU'UN DÉFAUT EST PARTI EN PRODUCTION. Le jour
 *    où mana.love s'est mis à servir nos écrans, notre barre est arrivée avec
 *    eux : cinq de ses six boutons menaient à l'accueil de l'autre
 *    application, au même octet, quel que soit celui qu'on pressait.
 *
 * 🔴 ET TROIS GARDES L'ONT LAISSÉ PASSER — tous les trois lisaient le TEXTE
 *    d'`App.tsx` : « la colonne 2 vit-elle dans la branche `avecOffice()` ? »,
 *    « compte-t-on cinq destinations distinctes ? ». Les trois étaient verts
 *    pendant que la barre, en ligne, proposait cinq fois la même page. Ils
 *    gardaient la FORME du code, et le défaut était dans ce qu'il DÉCIDE.
 *
 * ⭐ C'est la même leçon que `public/sw.js` ce matin, à six heures
 *    d'intervalle : une mutation qui remplaçait le corps d'une fonction
 *    laissait seize tests verts. Un garde qui lit une ligne ne dit rien de sa
 *    valeur. Donc la décision sort du JSX et devient une fonction qu'on
 *    interroge.
 */
import type { Visage } from "./visage";
import { PONTS, praticable } from "./passerelle";

export type Entree = {
  readonly clef: string;
  readonly chemin: string;
  readonly glyphe: "carte" | "etincelles" | "marque" | "radio" | "reglages";
  readonly libelle: string;
  /** Le mot est-il écrit à l'écran, ou réservé aux lecteurs d'écran ? */
  readonly motVisible?: true;
};

/**
 * Les entrées de la barre, pour un visage donné.
 *
 * ⚠️ UNE ENTRÉE DONT LA DESTINATION N'EST PAS EN LIGNE N'EST PAS RENDUE —
 *    ni grisée, ni annoncée « bientôt ». Un bouton absent se réclame ; un
 *    bouton qui mène à la mauvaise page ne se signale jamais, parce qu'il a
 *    l'air de marcher.
 */
export function entreesBarre(v: Visage): Entree[] {
  const office = v === "bzh";
  const e: (Entree | null)[] = [
    { clef: "carte", chemin: "/carte?vue=carte", glyphe: "carte",
      libelle: "La carte du territoire" },

    /* La deuxième colonne change de métier selon l'hôte : les balades de
       l'Office sur mana.bzh, les déesses sur mana.love. ⭐ Elle se libère
       parce que l'Office n'existe pas là-bas — ce n'est pas une case qu'on
       prend, c'est une case qui reste. */
    office
      ? { clef: "office", chemin: "/balades-office", glyphe: "etincelles",
          libelle: "Les balades des Offices de Tourisme" }
      : praticable("chat")
      ? { clef: "chat", chemin: PONTS.chat.chemin, glyphe: "etincelles",
          libelle: "Déesses", motVisible: true }
      : null,

    { clef: "marque", chemin: "/", glyphe: "marque", libelle: "MANA", motVisible: true },

    /* ⚠️ La radio est à NOUS sur mana.bzh et à ELLE sur mana.love — et chez
       elle ce n'est pas encore un chemin : la radio y est un univers,
       adressable par `?u=radio`, et une chaîne de requête ne traverse pas un
       matcher Caddy. */
    office
      ? { clef: "radio", chemin: "/radio", glyphe: "radio", libelle: "MANAradio" }
      : praticable("radio")
      ? { clef: "radio", chemin: PONTS.radio.chemin, glyphe: "radio", libelle: "MANAradio" }
      : null,

    /* 🔴 « Réglages » ne devient pas « Mon compte » en changeant de MOT. Sur
       mana.love le compte citoyen est un autre écran, dans l'autre
       application ; notre écran de réglages n'y est même pas servi. Un onglet
       « Mon compte » qui ouvrait nos réglages était la promesse non tenue que
       ce dépôt traque — et en ligne, il ouvrait son accueil. */
    office
      ? { clef: "reglages", chemin: "/reglages", glyphe: "reglages", libelle: "Réglages" }
      : praticable("compte")
      ? { clef: "compte", chemin: PONTS.compte.chemin, glyphe: "reglages",
          libelle: "Mon compte" }
      : null,
  ];
  return e.filter((x): x is Entree => x !== null);
}

/** Les liens du pied, pour un visage donné. */
export function liensPied(v: Visage): { chemin: string; libelle: string }[] {
  const office = v === "bzh";
  const peut = (clef: Parameters<typeof praticable>[0]) => office || praticable(clef);
  return [
    { chemin: "/l-application", libelle: "Ce que fait l’application" },
    { chemin: "/promenades", libelle: "Promenades" },
    { chemin: "/carte", libelle: "La carte" },
    ...(peut("radio") ? [{ chemin: "/radio", libelle: "MANAradio" }] : []),
    { chemin: "/territoire", libelle: "Le territoire" },
    /* ⚠️ Le pied suit la même règle que la barre, et il le doit d'autant plus
       qu'il est sur TOUTES les pages : un lien mort y est multiplié par le
       nombre d'écrans. */
    ...(peut("contact") ? [{ chemin: "/contact", libelle: "Contact" }] : []),
    ...(peut("mentions") ? [{ chemin: "/mentions-legales", libelle: "Mentions légales" }] : []),
  ];
}

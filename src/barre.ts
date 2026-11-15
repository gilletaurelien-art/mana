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
  /** ⚠️ UN AUTRE DOMAINE, donc pas de préfixe de base à lui coller devant.
   *  Les passerelles existantes sont des CHEMINS de mana.love ; manatimebank
   *  est un site à part, et `${B}${chemin}` en ferait une adresse morte. */
  readonly externe?: boolean;
  /* ⚠️ « sablier » EST PARTI AVEC LA COLONNE QU'IL SERVAIT (15/11/2026).
     Le laisser dans ce type aurait gardé vivant, dans l'aiguillage d'`App.tsx`,
     un cas que plus rien n'atteint — et `GlyphSablier` avec lui. Un type qui
     promet une valeur que personne n'émet est un fantôme qui compile.
     ⭐ Le dessin, lui, RESTE dans `Glyphs.tsx` : il est juste, il a coûté une
        mesure, et le temps reviendra. C'est le CÂBLAGE qu'on retire. */
  readonly glyphe: "carte" | "contribution" | "etincelles" | "marque" | "radio" | "reglages";
  readonly libelle: string;
  /** Le mot est-il écrit à l'écran, ou réservé aux lecteurs d'écran ? */
  readonly motVisible?: true;
  /**
   * 🔴 UNE ENTRÉE QUI COMMUTE AU LIEU D'EMMENER — 12/11/2026, demande du
   *    fondateur : « le bouton MANAradio devient un commutateur ON/OFF ».
   *
   * ⭐ ELLE GARDE SON `chemin`, ET CE N'EST PAS UN RESTE. Trois choses en
   *    dépendent : les gardes de ce fichier vérifient que tout ce que la
   *    barre revendique, l'hôte le sert ; `/radio` reste une adresse indexée
   *    avec son titre ; et le pied de page continue d'y mener. On remplace
   *    le GESTE du bouton, pas l'existence de la page.
   * ⛔ ET SEULEMENT CHEZ NOUS. Sur mana.love, la radio est un PONT vers
   *    l'autre application : le poste de ce dépôt n'y a rien à commander, et
   *    un commutateur qui ne commute rien serait pire qu'un lien. C'est la
   *    même règle que pour « Réglages »/« Mon compte » — le même dessin ne
   *    fait pas le même métier selon l'hôte.
   */
  readonly commute?: "radio";
};

/**
 * Les entrées de la barre, pour un visage donné.
 *
 * ⚠️ UNE ENTRÉE DONT LA DESTINATION N'EST PAS EN LIGNE N'EST PAS RENDUE —
 *    ni grisée, ni annoncée « bientôt ». Un bouton absent se réclame ; un
 *    bouton qui mène à la mauvaise page ne se signale jamais, parce qu'il a
 *    l'air de marcher.
 */
/**
 * 🔴 TROIS VISAGES DEPUIS LE 14/11/2026, ET `office` NE PEUT PLUS TENIR LIEU
 *    DE « NOUS ». Ce booléen voulait dire deux choses à la fois : « il y a un
 *    Office ici » et « cet hôte est le nôtre ». Tant qu'il n'y avait que deux
 *    sites, les deux coïncidaient. Avec manahome, `office` devient faux et
 *    chaque colonne serait tombée dans la branche de mana.love — la barre
 *    aurait servi au monde les PASSERELLES de mana.love : ses déesses, sa
 *    radio, son compte citoyen.
 * ⭐ C'est la même faute que `visage()` rendant `"bzh"` par défaut, une
 *    couche plus haut : un test à deux issues ne signale pas l'arrivée d'un
 *    troisième cas, il l'absorbe. On nomme donc les trois.
 */
export function entreesBarre(v: Visage): Entree[] {
  /* 🔴 QUATRIÈME VISAGE, TROISIÈME FOIS QUE CE DÉFAUT MORD — 15/11/2026 au
     soir. L'en-tête juste au-dessus dit : « un test à deux issues ne signale
     pas l'arrivée d'un troisième cas, il l'absorbe. On nomme donc les trois. »
     Il y en a QUATRE depuis une heure, et manafrance.org tombait dans la
     branche de mana.love : relevé EN LIGNE, sa barre proposait « Déesses » et
     « Mon compte » à des visiteurs français.
     ⭐ NOMMER LES CAS NE SUFFIT PAS SI ON LES NOMME PAR LEUR SITE. `home`
        voulait dire « manahome » ; il fallait qu'il veuille dire « l'accueil
        EST la carte ». Une capacité se nomme par la capacité — c'est déjà
        écrit dans `visage.ts` à propos d'`avecOffice()`, et c'est la règle
        qu'on vient d'enfreindre une couche plus bas.
     ⛔ `notre` remplace `office || home`, répété cinq fois : « cet hôte est le
        nôtre », par opposition à mana.love où nous sommes INVITÉS. Un invité
        ne propose ni sa radio ni ses réglages, il emprunte les passerelles. */
  const office = v === "bzh";
  const accueilEstLaCarte = v === "home" || v === "france";
  const notre = v !== "love";
  const e: (Entree | null)[] = [
    /* 🔴 CHEZ MANAHOME, CETTE COLONNE RAMÈNE À L'ACCUEIL — 15/11/2026, et
       c'est une conséquence directe de l'architecture arrêtée ce jour-là :
       l'accueil EST la carte. La laisser pointer sur `/carte` donnait deux
       cartes, dont une bretonne : sur un site qui revendique le monde, le
       premier bouton de la barre ouvrait la presqu'île de Crozon.
       ⭐ ELLE NE DISPARAÎT PAS, ELLE CHANGE DE MÉTIER. Manahome n'a pas de
          bouton « accueil » du tout — sa colonne centrale ne porte pas la
          marque — donc celle-ci est le SEUL chemin de retour. La supprimer
          aurait laissé une barre dont aucune icône ne ramène à la carte.
       ⛔ `/carte` reste servi et reste la carte DU TERRITOIRE : c'est
          l'écran de mana.bzh, avec ses graphes, ses circuits balisés et ses
          promenades. ⏳ L'unification des deux surfaces — une étendue par
          hôte sur UNE carte — est le chantier ouvert par la même décision. */
    accueilEstLaCarte
      ? { clef: "carte", chemin: "/", glyphe: "carte", libelle: "La carte" }
      : { clef: "carte", chemin: "/carte?vue=carte", glyphe: "carte",
          libelle: "La carte du territoire" },

    /* La deuxième colonne change de métier selon l'hôte : les balades de
       l'Office sur mana.bzh, les déesses sur mana.love. ⭐ Elle se libère
       parce que l'Office n'existe pas là-bas — ce n'est pas une case qu'on
       prend, c'est une case qui reste. */
    office
      ? { clef: "office", chemin: "/balades-office", glyphe: "etincelles",
          libelle: "Les balades des Offices de Tourisme" }
      /* 🔴 ARBITRAGE D'AURÉLIEN, 14/11 : chez MANAhome cette colonne devient
         les hébergements. ⭐ Et c'est le MÊME métier que l'Office qu'elle
         remplace — « ce qu'il y a autour de vous », pas un catalogue : les
         173 pages pays de manahome comptent déjà les hébergements par pays,
         et c'est une autre question. ⛔ D'où « autour de moi » et pas un
         index : le bouton remplacé montrait ce qui est PRÈS. */
      /* 🔴 CHEZ MANAHOME, CETTE COLONNE N'EST PLUS LES HÉBERGEMENTS —
         Aurélien, 15/11/2026 : « on va ajouter les hébergements dans la carte
         principale, et on va supprimer la fonction dans la bottom. À la place
         on va ajouter une fonction de contribution ».
         ⭐ ET C'EST LA MÊME LOGIQUE QUE LE 14/11, POUSSÉE D'UN CRAN : cette
            colonne avait remplacé les balades de l'Office parce que « ce
            qu'il y a autour de vous » appartient à la carte. Les hébergements
            y sont maintenant pour de bon — un calque, sous les sites
            remarquables — donc le bouton qui y menait doublait un calque au
            lieu d'ouvrir un ailleurs.
         ⚠️ `/hebergements` RESTE SERVI : l'écran n'est pas supprimé ici, il
            perd sa porte. ⏳ À trancher — une page que plus rien ne désigne
            est un fantôme, et ce dépôt les traque. */
      : accueilEstLaCarte
      ? { clef: "contribuer", chemin: "/contribuer", glyphe: "contribution",
          libelle: "Contribuer à la carte" }
      : praticable("chat")
      ? { clef: "chat", chemin: PONTS.chat.chemin, glyphe: "etincelles",
          libelle: "Déesses", motVisible: true }
      : null,

    /* 🔴 CHEZ MANAHOME, LA MARQUE DEVIENT UN SABLIER — Aurélien, 14/11/2026.
       ⚠️ CETTE NOTE DÉCRIT UN ÉTAT QUI A DURÉ VINGT-QUATRE HEURES. Le sablier
          est retiré le 15/11 (voir plus bas) ; elle est gardée parce qu'elle
          dit POURQUOI il était arrivé — « le solde n'y est pas : ni compte
          dans cette application, ni adresse qui le rende chez manatimebank,
          mesuré, 404 » — et c'est la raison qui l'a fait repartir. */
    /* 🔴 LE SABLIER EST RETIRÉ — Aurélien, 15/11/2026 : « supprime le sablier
       dans la bottom ». Il était arrivé le 14/11 comme porte vers
       manatimebank, et il n'a jamais porté de solde : ni compte dans cette
       application, ni adresse qui le rende là-bas (mesuré, 404). Une porte
       qui n'ouvre que sur un autre domaine, sans rien dire de ce qu'on y
       trouve, n'est pas une colonne de barre.
       ⭐ ET LA COLONNE NE SE REMPLIT PAS. Manahome passe à quatre onglets :
          la carte, contribuer, la radio, les réglages. Chercher quoi y mettre
          serait prendre la place avant d'avoir le besoin — c'est ce qui a mis
          le sablier là. ⏳ Le temps reviendra quand il aura un solde à dire.
       ⚠️ mana.bzh et mana.love gardent leur marque centrale : rien n'y
          change. */
    /* 🔴 LA COLONNE CENTRALE EST VIDE SUR NOS DEUX VISAGES — 15/11/2026.
       Le sablier est parti de manahome le matin, le mot MANA de mana.bzh le
       soir (« supprime MANA de la bottom barre »).
       ⭐ ET LA MARQUE N'EST PLUS PERDUE POUR AUTANT : elle est montée dans la
          pilule d'en-tête, en haut de l'écran, où elle est lisible au lieu
          d'être un sixième bouton. Un mot dans une barre d'onglets est une
          destination ; dans un en-tête, c'est une identité.
       ⚠️ ET LE RETOUR À L'ACCUEIL RESTE : c'est la première colonne, « La
          carte », qui ramène à « / » sur manahome — et sur mana.bzh « / » est
          désormais la carte aussi. ⏳ Reste à trancher si la colonne 1 de
          mana.bzh doit, elle aussi, pointer « / » plutôt que « /carte » :
          les deux écrans existent encore et ne montrent pas la même chose.
       ⛔ mana.love GARDE SA MARQUE : elle n'a pas la pilule, donc rien ne la
          nommerait ailleurs. */
    notre
      ? null
      : { clef: "marque", chemin: "/", glyphe: "marque", libelle: "MANA", motVisible: true },

    /* ⚠️ La radio est à NOUS sur mana.bzh et à ELLE sur mana.love — et chez
       elle ce n'est pas encore un chemin : la radio y est un univers,
       adressable par `?u=radio`, et une chaîne de requête ne traverse pas un
       matcher Caddy. */
    /* ⛔ ET CHEZ MANAHOME LA RADIO RESTE LA NÔTRE — arbitrage d'Aurélien,
       14/11 : « la radio manahome est mondiale ». Ce n'est donc pas une
       colonne bretonne à retirer : rien dans le code ne la qualifie de
       bretonne, seulement de « à nous » (mana.bzh, manahome) ou « à elle »
       (mana.love). */
    notre
      ? { clef: "radio", chemin: "/radio", glyphe: "radio", libelle: "MANAradio",
          commute: "radio" }
      : praticable("radio")
      ? { clef: "radio", chemin: PONTS.radio.chemin, glyphe: "radio", libelle: "MANAradio" }
      : null,

    /* 🔴 « Réglages » ne devient pas « Mon compte » en changeant de MOT. Sur
       mana.love le compte citoyen est un autre écran, dans l'autre
       application ; notre écran de réglages n'y est même pas servi. Un onglet
       « Mon compte » qui ouvrait nos réglages était la promesse non tenue que
       ce dépôt traque — et en ligne, il ouvrait son accueil. */
    /* ⏳ « RÉGLAGES DEVIENT-IL MON COMPTE ? » — question d'Aurélien, le 14/11,
       NON TRANCHÉE et délibérément laissée ouverte ici. Elle supposait qu'une
       colonne se libérait ; elle ne se libère pas, puisque la radio reste.
       ⛔ Et Réglages n'est pas décoratif : il porte le CHOIX DU FOND DE CARTE
          et la LANGUE. Le remplacer les perdrait. L'espace compte de manahome
          existe pourtant (/mes-annonces, /messagerie, /publier répondent tous
          200) — il lui manque une colonne, pas une destination. */
    notre
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
  /* ⭐ MÊME NOTION QUE DANS `entreesBarre`, ET MÊME CORRECTION (15/11/2026) :
     `office || home` nommait DEUX SITES là où la question est « cet hôte est-il
     le nôtre ? ». manafrance.org, quatrième visage, n'était dans aucun des deux
     — son pied renvoyait donc vers les passerelles de mana.love.
     ⚠️ Et c'est un test qui l'a dit, pas une relecture : en remplaçant
        `office || home` partout, j'ai laissé cette ligne-ci sans sa variable.
        `home is not defined` — deux tests rouges en trois secondes. */
  const notre = v !== "love";
  /* ⭐ `praticable()` interroge les PASSERELLES vers mana.love — il n'a rien à
     dire de manahome, qui sert ces chemins lui-même. Vérifié en ligne le
     14/11 : `/contact` et `/radio` y rendent l'application (ils sont dans la
     liste blanche `@appmanahome`), et `/mentions-legales` y rend les mentions
     de MANAhome — Alliance MANA, contact@manahome.org — écrites par l'autre
     dépôt, qui gagne le chemin. ⛔ C'est le bon résultat et il ne doit pas
     changer : servir NOS mentions sur son domaine déclarerait MANA.bzh
     éditeur de manahome.org. */
  const peut = (clef: Parameters<typeof praticable>[0]) => notre || praticable(clef);
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

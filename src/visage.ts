/**
 * LES DEUX VISAGES DE LA MÊME APPLICATION — 7/11/2026.
 *
 * 🔴 DÉCISION D'AURÉLIEN : mana.love prend cette app, et mana.bzh devient « une
 *    version ultra light de mana.love » — sans chat, sans astrologie, sans
 *    compte citoyen — avec une fonction EN PLUS : les balades de l'Office de
 *    tourisme Presqu'île de Crozon – Aulne Maritime.
 *
 * ⭐ UNE SEULE APP, DEUX HÔTES — et c'est l'alternative qui a décidé. Porter
 *    la carte dans un second dépôt aurait donné deux codes pour un même
 *    travail, et ce dépôt a déjà payé cette facture : le pipeline français
 *    prenait `nwr` pendant que le pipeline monde prenait `node`, et les plages
 *    du monde sont restées à 5 % pendant SEIZE JOURS — non par ignorance, mais
 *    parce que rien ne confrontait les deux.
 *
 * ⚠️ PAS DE PRÉRENDU DANS CE DÉPÔT (`build` = `vite build`, rien d'autre) :
 *    la branche peut donc être purement cliente, sans risque de servir le
 *    mauvais visage dans un HTML figé.
 */

/**
 * 🔴 TROIS VISAGES DEPUIS LE 14/11/2026, ET LE TROISIÈME CORRIGE UN DÉFAUT
 *    QUI TOURNAIT EN PRODUCTION. Le type n'en portait que deux, et `visage()`
 *    rendait `"bzh"` pour TOUT ce qui n'était pas mana.love. manahome.org,
 *    qui sert la même application depuis le 14/11, était donc traité comme la
 *    Bretagne — relevé en production sur `manahome.org/carte`, la barre du bas
 *    proposait **« Les balades des Offices de Tourisme »**, c'est-à-dire
 *    l'Office de Crozon, à un public mondial.
 * ⭐ C'EST LE DÉFAUT DU REPLI QUI RESSEMBLE À UN CHOIX. Un `?:` à deux
 *    branches ne se plaint pas quand un troisième cas arrive : il le range
 *    dans la branche par défaut, et la branche par défaut a toujours l'air
 *    délibérée. Un type à deux valeurs n'a rien signalé non plus — parce que
 *    le troisième hôte n'était nulle part écrit.
 */
export type Visage = "bzh" | "love" | "home";

/**
 * ⚠️ `?visage=love` EXISTE À DESSEIN, et ce n'est pas une porte dérobée : sans
 *    lui, le visage love serait INVÉRIFIABLE hors production — et une branche
 *    que personne ne peut regarder est une branche que personne ne corrige.
 *    Elle ne retire que l'Office ; elle n'ouvre aucun droit, ne révèle aucune
 *    donnée, et ne change rien à ce que le serveur accepte de servir.
 */
export function visage(): Visage {
  if (typeof location === "undefined") return "bzh";
  const force = new URLSearchParams(location.search).get("visage");
  if (force === "love" || force === "bzh" || force === "home") return force;
  const h = location.hostname;
  if (h === "mana.love") return "love";
  /* ⚠️ `endsWith` POUR LES SOUS-DOMAINES, comme `signature()` juste en dessous.
     Les deux répondent à des questions différentes — QUELLE VOIX parle, et
     SOUS QUEL NOM on signe — mais elles reconnaissent l'hôte de la même
     façon, et les laisser diverger ferait un site qui signe « MANAhome » en
     servant l'Office de Crozon. */
  if (h === "manahome.org" || h.endsWith(".manahome.org")) return "home";
  return "bzh";
}

/**
 * ⛔ LE SEUL PRÉDICAT DE CE FICHIER, ET IL EST NOMMÉ PAR CE QU'IL DÉCIDE.
 *    `estBzh()` aurait invité à y accrocher tout ce qui diffère entre les deux
 *    sites ; celui-ci ne répond qu'à « y a-t-il un Office de tourisme ici ? ».
 * ⭐ Une capacité se nomme par la capacité, pas par le site qui l'a : le jour
 *    où un second office rejoint le produit, c'est la liste des territoires
 *    qui change, pas ce prédicat.
 */
export const avecOffice = () => visage() === "bzh";

/**
 * 🔴 LE NOM SOUS LEQUEL ON SIGNE, ET IL DÉPEND DE L'HÔTE — 7/11/2026.
 *    Trouvé sur une capture : `mana.love/promenades` portait le `<title>`
 *    « … — MANA.bzh ». C'est l'onglet du navigateur, et c'est surtout ce que
 *    les moteurs indexent pour ce domaine.
 * ⭐ MÊME FAMILLE QUE L'ÉDITEUR DES MENTIONS LÉGALES, EN MOINS GRAVE : là
 *    c'était une déclaration due par la loi, ici c'est une marque qui annonce
 *    le mauvais domaine. Les deux viennent du même défaut de pensée — une
 *    valeur écrite quand il n'y avait qu'un seul site.
 * ⚠️ Elle est nommée par ce qu'elle EST (la signature), pas par l'endroit où
 *    on la pose : elle sert au titre, au pied, et au courriel de contact.
 */
/* 🔴 LA SIGNATURE NE SE DÉDUIT PLUS DU VISAGE — 14/11/2026, quand l'app a été
   promue à la racine de manahome.org. Elle valait
   `visage() === "love" ? "mana.love" : "MANA.bzh"` : sur manahome, `visage()`
   rend « bzh » (c'est le bon VISAGE — les balades d'office y ont leur place),
   et l'accueil s'est mis à annoncer « MANA.bzh » sur un site qui ne l'est pas.
   ⭐ DEUX QUESTIONS DIFFÉRENTES PARTAGEAIENT UN TEST D'HÔTE. `visage()` décide
   des FONCTIONS, `signature()` du NOM AFFICHÉ. Tant qu'il n'y avait que deux
   hôtes, la même réponse servait aux deux — et la confusion ne coûtait rien.
   Au troisième, elle a mis le nom d'un site sur un autre, en première ligne
   de l'accueil, là où une personne et une machine lisent d'abord. */
export const signature = () => {
  const h = typeof location === "undefined" ? "" : location.hostname;
  if (h === "mana.love") return "mana.love";
  if (h === "manahome.org" || h.endsWith(".manahome.org")) return "MANAhome";
  return "MANA.bzh";
};

/* ⚠️ ET LE LIEU AUSSI — un titre qui dit « en Bretagne » sur un site qui
   publie le Mullerthal décrit l'ancien produit. Sur mana.bzh il reste juste
   et il porte le référencement ; ailleurs il doit se taire. */
export const lieuDuSite = () =>
  signature() === "MANA.bzh" ? " en Bretagne" : "";

/**
 * 🔴 L'ADRESSE À LAQUELLE ON NOUS ÉCRIT, SUR CET HÔTE.
 *
 * ⛔ JE L'AVAIS ÉCRITE, PUIS RETIRÉE, POUR UNE RAISON FAUSSE — et c'est la
 *    capture d'écran EN LIGNE qui me l'a appris, pas le code. J'avais
 *    raisonné : « `/contact` n'est pas servi sur mana.love, donc cet écran
 *    n'y est jamais atteint ». Vrai de la ROUTE, faux du RENDU :
 *    `ContactForm` n'est pas une page, c'est un bloc DU PIED, présent sur
 *    toutes les pages. `mailto:contact@mana.bzh` s'affichait donc sur
 *    mana.love/promenades.
 * ⭐ VÉRIFIER QU'UNE ROUTE N'EXISTE PAS NE DIT RIEN DE CE QUI EST RENDU. Un
 *    composant n'a pas besoin d'une adresse pour être à l'écran — et
 *    j'écrivais, dans le commentaire même qui le retirait, que l'écran était
 *    « inatteignable ». Une description fidèle de la mauvaise chose.
 */
/* ⚠️ ET CE N'EST PAS `contact@` DES DEUX CÔTÉS — Aurélien, 7/11 :
   « pour le mail c'est welcome@mana.love ». J'avais écrit `contact@mana.love`
   par transposition, en changeant le domaine et en gardant la boîte.
   ⭐ Une adresse électronique n'est pas un gabarit : la partie gauche est un
      choix éditorial, pas une conséquence du domaine. Écrire
      `contact@${domaine}` aurait eu l'air juste et désigné une boîte qui
      n'existe pas — le courrier serait parti nulle part, sans rebond visible
      pour nous. */
/**
 * 🔴 TROIS ADRESSES, PARCE QU'IL Y A TROIS ÉDITEURS DE FAIT — et la troisième
 *    manquait. Ce ternaire à deux branches rangeait manahome avec la
 *    Bretagne : l'application y aurait annoncé `contact@mana.bzh` pendant que
 *    les mentions légales du MÊME domaine déclarent `contact@manahome.org`
 *    (vérifié en ligne le 14/11/2026).
 * ⛔ Deux adresses contradictoires sur un domaine ne sont pas une coquille :
 *    la mention de l'éditeur est une déclaration (LCEN), et ce dépôt a déjà
 *    refusé de servir ses propres mentions à mana.love pour cette raison
 *    exacte — « un faux 200 sur une coquille est un défaut ; un éditeur faux
 *    est une déclaration ».
 */
export const courriel = () =>
  visage() === "love" ? "welcome@mana.love"
  : visage() === "home" ? "contact@manahome.org"
  : "contact@mana.bzh";

/**
 * 🔴 LE TITRE, SIGNÉ PAR L'HÔTE — extrait d'`App.tsx` le 7/11 au soir, après
 *    qu'une relecture adversariale a montré que ce geste n'était gardé par
 *    RIEN. Il vivait en une ligne dans un effet :
 *      `document.title = titre.replace(/MANA\.bzh/g, signature())`
 *    Retirer le point d'échappement, ou la lettre « b », laissait tous les
 *    tests verts et rendait « — MANA.bzh » à mana.love.
 * ⭐ Un geste qui n'a qu'un seul point de pose doit être une FONCTION, sinon
 *    il n'a pas de nom et on ne peut pas l'interroger. Celle-ci est pure : on
 *    lui donne le titre de la table et elle rend celui de l'hôte.
 */
export const titrePourLHote = (titre: string) =>
  titre
    .replace(/ en Bretagne/g, lieuDuSite())
    .replace(/ — presqu'île de Crozon & Aulne maritime/g,
             signature() === "MANA.bzh" ? " — presqu'île de Crozon & Aulne maritime" : "")
    .replace(/MANA\.bzh/g, signature());

/**
 * 🔴 L'ADRESSE QUI FAIT FOI POUR UNE DE NOS PAGES — 7/11/2026 au soir,
 *    arbitrage d'Aurélien : « mana.bzh fait foi ».
 *
 * ⛔ LE DÉFAUT QUE ÇA RÉPARE EST LE MIEN, ET IL DATAIT DU MATIN MÊME. Depuis
 *    la pose du bloc `@applove`, cinq de nos chemins servent des octets
 *    IDENTIQUES sur deux domaines — mesuré : `/promenades`, `/carte`,
 *    `/territoire` rendent 4 482 o sur mana.bzh comme sur mana.love. Et
 *    cette application n'émettait AUCUNE canonique, nulle part : rien ne
 *    disait à un moteur laquelle des deux adresses est l'originale.
 *
 * ⭐ ET AUCUN DE MES GARDES NE POUVAIT LE VOIR. Ils vérifient QUI SERT QUOI —
 *    le bloc Caddy, les trois listes, les ponts — jamais CE QUE LA PAGE
 *    DÉCLARE ÊTRE. Nous avons passé la soirée à traquer ce défaut chez le
 *    voisin pendant qu'il vivait ici, sur cinq adresses, créé le matin même.
 *
 * ⭐ UNE SEULE RÈGLE SUFFIT, ET C'EST POURQUOI ELLE EST JUSTE : le contenu
 *    servi sur mana.love EST celui de mana.bzh — les promenades de la
 *    presqu'île. L'original est donc toujours l'adresse bretonne, quel que
 *    soit l'hôte qui la sert. Pas de branche par visage : une branche
 *    supposerait que les deux hôtes portent des contenus différents, ce qui
 *    sera vrai un jour et ne l'est pas aujourd'hui.
 * ⚠️ Elle couvre aussi GitHub Pages (`…github.io/mana/`), troisième adresse
 *    de cette application : une démo n'est pas un original.
 * ⚠️ Et sur mana.bzh elle rend une canonique qui pointe sur elle-même —
 *    c'est voulu, c'est la forme recommandée, et ça évite une branche qui
 *    n'aurait rien à décider.
 */
export const ORIGINE = "https://mana.bzh";
export const canonique = (chemin: string) =>
  ORIGINE + (chemin.startsWith("/") ? chemin : `/${chemin}`);

/**
 * 🔴 LA POSE EST UNE FONCTION, PAS TROIS LIGNES DANS UN EFFET — et c'est une
 *    mutation qui l'a exigé. Trois gardes écrits pour la version précédente
 *    ne mordaient pas :
 *      · glisser la pose sous `if (titre)` — les pages dynamiques perdaient
 *        leur canonique, et le garde lisait le texte autour sans rien voir ;
 *      · changer `rel="canonical"` en `rel="alternate"` — le garde cherchait
 *        la chaîne, et la trouvait encore dans le SÉLECTEUR voisin ;
 *      · faire dépendre `ORIGINE` de l'hôte — une `const` de module est
 *        évaluée à l'IMPORT, donc un faux `location` posé par un test
 *        n'avait aucun effet sur elle.
 * ⭐ Les trois disparaissent dès qu'on peut INTERROGER la pose au lieu de la
 *    relire : on lui donne un document, on regarde ce qu'elle y écrit.
 * ⚠️ Elle prend le document en argument — sans ça, elle ne serait testable
 *    que dans un navigateur, et un garde qui exige un navigateur ne tourne
 *    pas dans `npm test`.
 */
export function poserCanonique(doc: Document, chemin: string): string {
  let lien = doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!lien) {
    lien = doc.createElement("link");
    lien.rel = "canonical";
    doc.head.appendChild(lien);
  }
  lien.href = canonique(chemin);
  return lien.href;
}

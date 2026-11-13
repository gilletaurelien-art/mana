import { baseUrl } from "./router";

/**
 * Page /mentions-legales.
 *
 * 🔴 ELLE ÉTAIT FAUSSE SUR TROIS POINTS JUSQU'AU 13/11/2026, ET C'EST UNE PAGE
 *    JURIDIQUE.
 *    1. AUCUN ÉDITEUR NOMMÉ — « édité par l'écosystème MANA […] les
 *       coordonnées complètes seront publiées avec la structure juridique
 *       définitive ». Un écosystème n'est pas une personne juridique, et
 *       Alliance MANA existe depuis le 10/08/2026 (récépissé W292008256).
 *    2. « Site statique hébergé sur GitHub Pages (GitHub, Inc.) » — vrai de
 *       la copie publiée sur Pages, FAUX sur mana.bzh, servi depuis la France.
 *       Déclarer un hébergeur américain pour un service qui n'y a rien est
 *       l'inverse de ce que ce produit promet.
 *    3. « sans compte ni backend » — pas de compte, c'est vrai ; mais les
 *       tuiles de la carte et le flux de la radio passent par nos serveurs.
 *
 * ⭐ ET C'ÉTAIT MOT POUR MOT LE TEXTE QUE manahome PORTAIT. Il y a été réparé
 *    le 11/11 ; ici, personne n'y est retourné — deux dépôts séparés, un seul
 *    rédacteur. **Un défaut réparé sur un site ne se répare pas sur l'autre**,
 *    et rien ne le signale : les deux pages répondent 200.
 */

/**
 * L'HÉBERGEUR EST DÉRIVÉ DE L'HÔTE QUI SERT LA PAGE — il n'est pas recopié.
 *
 * ⭐ C'est la leçon de ce qu'on vient de corriger : une mention légale qui
 *    RECOPIE un fait d'infrastructure se périme au premier déménagement, et
 *    personne ne relit la page qui dit où vivent les données. Cette app est
 *    servie à DEUX adresses, chez deux hébergeurs de deux pays — une phrase
 *    figée est donc fausse à l'une des deux, toujours.
 *
 * ⛔ ET LE CAS INCONNU NE DEVINE PAS. Un hôte qu'on ne reconnaît pas rend une
 *    mention qui le DIT, parce qu'une mention vraisemblable expose plus
 *    qu'une mention absente. C'est la règle qui a présidé à `editeur.ts` du
 *    dépôt manafrance-app : tant qu'un champ n'est pas vérifié, il vaut
 *    `null` et la page l'annonce.
 */
export type Hebergement =
  | { genre: "connu"; nom: string; adresse: string; pays: string; mot: string }
  | { genre: "local" }
  | { genre: "inconnu"; hote: string };

export function hebergementDe(hote: string): Hebergement {
  const h = hote.toLowerCase().replace(/:\d+$/, "");
  if (
    h === "localhost" || h === "127.0.0.1" || h === "[::1]" ||
    h.endsWith(".localhost") || h.endsWith(".local")
  ) {
    return { genre: "local" };
  }
  if (h === "mana.bzh" || h.endsWith(".mana.bzh")) {
    return {
      genre: "connu",
      nom: "OVH SAS",
      adresse: "2 rue Kellermann, 59100 Roubaix",
      pays: "France",
      mot: "Serveur dédié situé en France. Les tuiles de la carte et le flux de la radio sont relayés par nos propres serveurs : votre adresse IP ne sort pas vers un tiers.",
    };
  }
  if (h.endsWith(".github.io")) {
    return {
      genre: "connu",
      nom: "GitHub, Inc.",
      adresse: "88 Colin P. Kelly Jr. Street, San Francisco, CA 94107",
      pays: "États-Unis",
      mot: "Cette copie-ci est publiée sur GitHub Pages. Les tuiles de la carte et le flux de la radio restent servis depuis la France, par mana.bzh.",
    };
  }
  return { genre: "inconnu", hote: h };
}

/** L'éditeur : l'ASSOCIATION, et elle seule.
 *
 * ⛔ NI SIRET, NI SIREN, JAMAIS. Une association déclarée s'identifie par son
 *    RNA ; une entreprise individuelle, à l'inverse, doit afficher SIREN,
 *    SIRET et code APE et n'a pas de RNA. Les deux jeux de mentions sont
 *    exactement inverses, et écrire l'un sur le site de l'autre est une fausse
 *    déclaration. ⭐ Le 13/11/2026, manahome.org est passé à l'entreprise
 *    individuelle (vitrine commerciale) ; mana.bzh reste à l'association
 *    (vitrine territoriale, bien commun). Même écosystème, deux éditeurs.
 *
 * ⚠️ Valeurs alignées sur `src/lib/editeur.ts` du dépôt manafrance-app, qui en
 *    est la source documentée — mais recopiées, les deux dépôts étant séparés.
 *    Un garde de ce fichier (`mentions.test.ts`) tient au moins l'invariant qui
 *    compte : le RNA présent, aucun SIRET, et un directeur de publication qui
 *    est une PERSONNE.
 */
const EDITEUR = {
  nom: "Alliance MANA",
  forme:
    "Association déclarée, régie par la loi du 1er juillet 1901 et le décret du 16 août 1901",
  rna: "W292008256",
  siege: "4 Lostmarc’h, 29160 Crozon",
  declaration: "Déclarée le 10 août 2026 auprès de la Sous-préfecture de Brest",
  email: "contact@manahome.org",
  /** ⭐ UNE PERSONNE PHYSIQUE NOMMÉE, et c'est la loi qui l'exige : l'article
   *  6 III 1° de la LCEN veut le directeur de la publication, qui pour une
   *  personne morale est son représentant légal. Un nom commercial ne désigne
   *  personne au sens du texte. */
  directeur: "Aurélien GILLET",
};

export function MentionsLegales() {
  const B = baseUrl();
  const heberge = hebergementDe(
    typeof location === "undefined" ? "" : location.hostname,
  );

  return (
    <main className="page">
      <div className="wrap">
        <p className="hero-label">Informations légales</p>
        <h1 className="page-titre"><span>Mentions légales</span></h1>

        <section className="page-panel">
          <p className="apercu-label">Éditeur</p>
          <ul className="page-intro">
            <li><strong>{EDITEUR.nom}</strong></li>
            <li>{EDITEUR.forme}</li>
            <li>Numéro RNA : {EDITEUR.rna}</li>
            <li>Siège social : {EDITEUR.siege}</li>
            <li>{EDITEUR.declaration}</li>
            <li>Courriel : <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a></li>
            <li>Directeur de la publication : {EDITEUR.directeur}</li>
          </ul>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Hébergement</p>
          {heberge.genre === "connu" && (
            <p className="page-intro">
              <strong>{heberge.nom}</strong> — {heberge.adresse}, {heberge.pays}.
              {" "}{heberge.mot}
            </p>
          )}
          {heberge.genre === "local" && (
            <p className="page-intro">
              Cette page est servie par un serveur de développement local : elle
              n’est pas publiée, et aucun hébergeur n’a à être nommé.
            </p>
          )}
          {heberge.genre === "inconnu" && (
            <p className="page-intro">
              Cette copie est servie par un hôte que nous ne reconnaissons pas
              ({heberge.hote}) : nous ne pouvons donc pas nommer son hébergeur
              ici. Écrivez-nous à{" "}
              <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a> et nous
              vous dirons qui sert cette page.
            </p>
          )}
        </section>

        <section className="page-panel">
          <p className="apercu-label">Nature du service</p>
          <p className="page-intro">
            MANA.bzh est une vitrine de promenades et de découvertes en
            Bretagne. Les parcours sont indicatifs (prototype) : consultez les
            sources officielles avant de partir. Les itinéraires portant la
            mention « balisé par l’Office de tourisme » sont ceux des Offices,
            pas les nôtres — leur fiche fait foi.
          </p>
        </section>

        <section className="page-panel">
          <p className="apercu-label">Données personnelles</p>
          <p className="page-intro">
            Aucun compte, aucun traceur publicitaire, aucune donnée ni contact
            revendu. Il n’y a rien à supprimer parce qu’il n’y a rien de
            conservé : vos réglages restent dans votre navigateur. Le bouton SOS
            n’envoie rien de lui-même — il prépare un message que vous
            choisissez d’envoyer, depuis votre téléphone.
          </p>
        </section>

        <div className="est-actions">
          <a className="btn btn-primary" href={`${B}/`}>
            Retour à l’accueil
          </a>
        </div>
      </div>
    </main>
  );
}

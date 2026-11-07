import {
  GlyphNavigation, GlyphSecurite, GlyphDecouverte, GlyphSentier, GlyphRadio,
} from "./Glyphs";
import { avecOffice } from "./visage";

/**
 * CE QUE FAIT L'APPLICATION — la page dédiée, et indexable.
 *
 * 🔴 CES CINQ SECTIONS VIVAIENT SUR L'ACCUEIL. Elles en sont parties le
 *    6/11/2026, demande du fondateur : l'accueil ne porte plus que la marque
 *    et le moteur de recherche.
 *
 * ⭐ MAIS ELLES NE SONT PAS PARTIES DANS UN ÉCRAN DE RÉGLAGES, et c'est le
 *    point. Elles ont été écrites le 1/11 POUR ÊTRE LUES PAR DES MACHINES —
 *    référencement, moteurs génératifs, moteurs de réponse : des déclaratives
 *    courtes, des entités nommées, et des NOMBRES RÉELS. Les enfouir sous un
 *    engrenage les aurait rendues invisibles à ce pour quoi elles existent.
 *    Elles ont donc une ADRESSE à elles, un titre à elle, et le pied de page
 *    y mène. Réglages y renvoie aussi — mais par un LIEN, jamais par une
 *    copie : le même texte à deux adresses abîme exactement ce qu'on cherche
 *    à protéger.
 *
 * ⚠️ CHAQUE CHIFFRE A ÉTÉ COMPTÉ, JAMAIS RAPPELÉ — et recompté le 6/11 contre
 *    `ot.json` et `lieux.json` : 46 circuits · 707,7 km arrondis à 708 ·
 *    11 communes · 1 358 lieux · 624 nommés · 734 anonymes · 196 fortifications
 *    · 183 fontaines (dont 33 nommées « lavoir ») · 138 calvaires · 118 plages
 *    · 85 mégalithes · 16 210 et 20 779 tronçons. Un nombre écrit de mémoire
 *    sur une page indexée est le faux témoin le plus coûteux qui soit : il est
 *    cité par des machines.
 */
/**
 * LES CINQ SECTIONS DE L'ACCUEIL — développées pour le référencement
 * (SEO), les moteurs génératifs (GEO) et les moteurs de réponse (AEO).
 * Demande du fondateur, 1/11/2026.
 *
 * ⭐ CE QU'UN MOTEUR DE RÉPONSE SAIT EXTRAIRE, C'EST UNE PHRASE QUI RÉPOND —
 *    pas une phrase qui vend. « Une expérience unique au cœur de la
 *    Bretagne » n'est citable par personne ; « 46 circuits balisés par
 *    l'Office de tourisme, 708 km, sur 11 communes » l'est. D'où des
 *    déclaratives courtes, des entités nommées et des NOMBRES RÉELS.
 *
 * ⛔ ET CHAQUE CHIFFRE A ÉTÉ COMPTÉ DANS L'ARTEFACT, PAS RAPPELÉ. 46 · 708 km
 *    · 11 communes · 1 358 lieux · 624 nommés · 196 fortifications · 118
 *    plages · 85 mégalithes : tous relevés le 1/11 dans `ot.json` et
 *    `lieux.json`. Un nombre écrit de mémoire sur une page d'accueil est le
 *    faux témoin le plus coûteux qui soit — il est cité par des machines.
 *
 * 🔴 ET CHAQUE PROMESSE A ÉTÉ VÉRIFIÉE DANS LE CODE AVANT D'ÊTRE ÉCRITE :
 *    le SOS 112 par SMS avec la position (`EnChemin.tsx`), la boussole
 *    (`deviceorientation`, `Promenade.tsx`), l'export GPX (`Promenade.tsx`),
 *    le renvoi au SHOM pour les marées. ⭐ Ce fichier porte déjà la cicatrice
 *    de l'inverse : il a annoncé pendant trois jours des filtres
 *    « poussette/PMR » retirés précisément pour que personne ne parte en
 *    poussette sur un sentier de falaise.
 *
 * ⚠️ LES `faits` NE SONT PAS DES ARGUMENTS, ce sont des FAITS — trois par
 *    section, vérifiables, qu'un moteur peut citer sans nous citer.
 */
const MODULES = [
  {
    glyphe: GlyphNavigation,
    titre: "Navigation & cartographie hors ligne",
    accroche: "Le parcours dans la poche.",
    texte:
      "Le tracé de la promenade reste disponible sans réseau : il est stocké dans le navigateur au premier chargement. La position et le cap viennent du GPS et de la boussole de l’appareil, et ne quittent jamais le téléphone. Hors ligne, le parcours s’affiche en schéma — le fond de carte, lui, demande du réseau, et nous le disons plutôt que de laisser un écran blanc l’apprendre au promeneur.",
    faits: [
      "16 210 tronçons de chemin relevés sur la presqu’île de Crozon, 20 779 sur l’Aulne maritime.",
      "Fonds de carte au choix : plan OpenStreetMap ou vue aérienne de l’IGN.",
      "Les tuiles passent par nos serveurs : ni OpenStreetMap ni l’IGN n’apprennent votre adresse IP.",
    ],
    cta: { label: "Voir les sentiers", href: "/promenades" },
  },
  {
    glyphe: GlyphSentier,
    titre: "Carnet, export GPX et circuits balisés",
    accroche: "Gardez la trace.",
    texte:
      "Chaque promenade s’exporte en GPX, lisible par toutes les montres et applications de randonnée. Le carnet garde vos balades dans ce navigateur, sans compte ni adresse : ce qui n’est pas stocké ne fuit pas. L’application présente aussi les 46 circuits balisés par l’Office de tourisme Presqu’île de Crozon – Aulne Maritime, crédités comme tels — MANA ne s’attribue rien et ne recommande rien.",
    faits: [
      "46 circuits balisés, 708 km, sur 11 communes : Crozon, Camaret-sur-Mer, Roscanvel, Landévennec, Argol, Telgruc-sur-Mer, Lanvéoc, Le Faou, Pont-de-Buis-lès-Quimerch, Plomodiern, Hanvec.",
      "25 à pied, 12 en VTT, 5 à vélo, 4 en trail. Durées et dénivelés déclarés par l’Office.",
      "Export GPX, fonctionne hors ligne. Aucun compte, aucune donnée personnelle enregistrée.",
    ],
    /* 🔴 LE LIEN SORTANT VERS L'OFFICE EST DESCENDU ICI LE 6/11/2026.
       Il vivait dans la fiche de balade de l'accueil, que le moteur de
       recherche remplace — et `InvitationBalade.tsx` le disait lui-même :
       « c'est aussi le seul chemin vers leur fiche depuis l'accueil ».
       ⭐ Il n'est pas allé sous le champ de recherche : créditer sous un
          bloc qui n'affiche AUCUNE de leurs données dilue la mention au lieu
          de l'honorer. Il est allé sous la seule section qui montre leur
          travail — 46 circuits, 708 km, leurs durées et leurs dénivelés.
       ⛔ Ce n'est pas une courtoisie : ces chiffres sont LEUR donnée, et une
          carte qui les montre sans les nommer devient une fiche MANA au
          premier coup d'œil. */
    source: { label: "Office de tourisme Presqu’île de Crozon – Aulne Maritime",
              href: "https://www.crozon-tourisme.bzh/" },
    cta: { label: "Ouvrir un parcours", href: "/promenades" },
  },
  {
    glyphe: GlyphDecouverte,
    titre: "Patrimoine de la presqu’île",
    accroche: "Ce qu’on croise en chemin.",
    /* 🔴 CE TEXTE PROMETTAIT LES FILTRES « POUSSETTE/PMR » ET « CHIENS »,
       retirés le 28/10/2026 parce qu'OpenStreetMap ne porte pas ces attributs
       — et retirés précisément pour que personne ne parte en poussette sur un
       sentier de falaise. La page d'accueil a continué de les annoncer.
       ⭐ Une suppression se fait dans le code ET dans ce qui la promet. Le
          premier endroit où une fonction existe encore après sa mort, c'est
          la phrase qui la vendait. */
    texte:
      "L’application recense 1 358 sites remarquables sur la presqu’île de Crozon et l’Aulne maritime, dont 624 portent un nom : fortifications du goulet, alignements mégalithiques, fontaines, calvaires, plages, pointes et épaves. Chaque fiche de balade indique les sites situés à moins de 150 mètres du tracé — à proximité, jamais « sur le chemin », parce qu’un détour annoncé comme une étape envoie chercher ce qui n’est pas là.",
    faits: [
      "196 fortifications, 183 fontaines et lavoirs, 138 calvaires, 118 plages, 85 mégalithes.",
      "Les 734 sites sans nom sont dessinés sur la carte, mais ne sont jamais cités seuls.",
      "Sources : OpenStreetMap sous licence ODbL. Chaque lieu renvoie à son objet d’origine.",
    ],
    cta: { label: "Explorer les lieux", href: "/carte?vue=carte" },
  },
  {
    glyphe: GlyphSecurite,
    titre: "Sécurité sur la côte",
    accroche: "Prudence honnête.",
    texte:
      "Un bouton d’appel au 112 prépare un SMS contenant votre position GPS, à envoyer aux secours ou à un proche — vous relisez avant d’envoyer, rien ne part tout seul. Les marées et la météo ne sont jamais calculées ici : l’application renvoie au SHOM et à Météo-France. Une prévision simulée sur un sentier de falaise n’est pas une approximation, c’est un danger.",
    faits: [
      "SOS 112 : la position est écrite dans le SMS, pas envoyée à un serveur.",
      "Marées : renvoi au SHOM. Météo : renvoi aux sources officielles. Aucune donnée simulée.",
      "Le relief et le trait de côte ne sont pas dessinés : nous n’affichons que ce que la donnée contient.",
    ],
    cta: { label: "Découvrir", href: "/promenades" },
  },
];

export function LApplication({ base }: { base: string }) {
  /* 🔴 LE CRÉDIT SUIT LA DONNÉE, PAS LA PAGE — 7/11/2026. Sur mana.love il n'y
     a pas d'Office, donc ni ses 46 circuits ni ses 708 km : créditer un
     partenaire dont on ne montre rien n'est pas de la rigueur, c'est du
     bruit — et ça affaiblit la mention là où elle compte. La section entière
     part avec sa matière. */
  const office = avecOffice();
  return (
    <main className="wrap">
      {/* ⚠️ La section des circuits balisés part ENTIÈREMENT sur mana.love —
          elle ne parle que de l'Office, de ses 46 circuits et de ses 708 km.
          En garder la coquille sans sa matière promettrait un partenariat qui
          n'existe pas sur cet hôte. */}
      {MODULES.filter((m) => office || !m.source).map((m) => {
        const G = m.glyphe;
        return (
        <section key={m.titre} className="landing-section bulle">
          <G size={36} />
          <h2 className="section-title">{m.titre}</h2>
          <p className="section-accroche-courte">{m.accroche}</p>
          <p className="section-texte">{m.texte}</p>
          {/* ⭐ TROIS FAITS, EN LISTE. Un moteur de réponse extrait une
              liste bien mieux qu'un paragraphe : chaque élément est une
              affirmation close, avec son sujet et son chiffre. Et la
              liste sert aussi l'œil humain qui balaie — ce n'est pas
              une concession faite aux machines. */}
          <ul className="section-faits">
            {m.faits.map((f) => <li key={f}>{f}</li>)}
          </ul>
          {m.source && (
            <p className="section-source">
              Source :{" "}
              <a href={m.source.href} target="_blank" rel="noreferrer">
                {m.source.label}
              </a>
            </p>
          )}
          <div className="est-actions">
            <a className="btn btn-primary" href={`${base}${m.cta.href}`}>
              {m.cta.label}
            </a>
          </div>
        </section>
        );
      })}

      {/* MANAradio : en ligne */}
      <section className="landing-section bulle">
        <GlyphRadio size={36} />
        <h2 className="section-title">MANAradio</h2>
        <div className="sous-bulle">
          {/* ⛔ CETTE LIGNE DISAIT « En ligne. » EN DUR. Une affirmation
              d'état écrite dans le code est vraie tant que l'état l'est —
              et la page d'accueil aurait annoncé l'antenne ouverte un
              soir où elle est coupée. L'état vivant se lit sur /radio,
              où il est mesuré ; ici on nomme la chose, pas son état. */}
          <p className="section-accroche-courte">La radio de l'Alliance.</p>
          <p className="section-texte">
            Une antenne continue, à écouter en marchant ou au coin du
            feu. La lecture se poursuit d'un écran à l'autre : on peut
            ouvrir la carte, lire une fiche de balade ou régler le fond
            sans couper le son. Le titre et l'artiste en cours
            s'affichent sur la page de la radio, lus à la source —
            jamais devinés entre deux morceaux.
          </p>
          {/* ⛔ CE QU'ON N'ÉCRIT PAS ICI : une programmation, des
              horaires, un nombre d'auditeurs. Rien de tout cela n'est
              mesuré depuis cette page, et un chiffre d'audience sur une
              page d'accueil est exactement le genre d'affirmation que
              personne ne revient corriger. ⭐ Les trois faits ci-dessous
              sont des propriétés du dispositif, pas des promesses
              d'antenne — ils restent vrais quelle que soit la grille. */}
          <ul className="section-faits">
            <li>Le flux continue quand on navigue dans l'application.</li>
            <li>Couper arrête vraiment le téléchargement : aucune donnée mobile consommée en silence.</li>
            <li>Aucun compte, aucun traceur, aucune mesure d'audience tierce.</li>
          </ul>
          <div className="est-actions">
            <a className="btn btn-clair" href={`${base}/radio`}>
              Écouter MANAradio
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

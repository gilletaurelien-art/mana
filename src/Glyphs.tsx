// Glyphes SVG inline — zéro dépendance, zéro requête réseau.
// Style « synapse » : trait 1.4, géométrie régulière sur grille 24,
// arrondis généreux, accent or (pastille) en point focal.

type GlyphProps = { size?: number };

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Accent({ cx, cy, r = 1.6 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
}

export function GlyphPorte({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M5 20h14" />
      <path d="M7 20V5.5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 17 5.5V20" />
      <path d="M12 12.4v2.8" />
      <Accent cx={12} cy={9.6} r={1.3} />
    </svg>
  );
}

export function GlyphRecherche({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
      <Accent cx={10.5} cy={10.5} r={1.1} />
    </svg>
  );
}

export function GlyphRadio({ size = 24 }: GlyphProps) {
  /* ⭐ UN POSTE, PAS UNE ONDE — 31/10/2026. L'ancien glyphe dessinait des
     ondes concentriques : le symbole de la DIFFUSION, pas de la radio. Il se
     confondait avec le wifi, le partage, la géolocalisation — tout ce qui
     émet. Un poste de radio ne se confond avec rien : caisson, haut-parleur,
     cadran, antenne. Et il porte l'objet que MANAradio est vraiment, posé au
     coin du feu plutôt qu'un signal dans l'air.
     Géométrie sur la grille 24, trait 1,4, antenne oblique pour casser la
     symétrie — un objet parfaitement symétrique se lit comme un pictogramme
     abstrait, pas comme une chose. */
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      {/* l'antenne, avant le caisson : elle part de derrière */}
      <path d="M16 9.5 20.5 4" />
      {/* le caisson */}
      <rect x="2.8" y="9.5" width="18.4" height="10.7" rx="2.2" />
      {/* le haut-parleur */}
      <circle cx="8.3" cy="14.85" r="2.9" />
      {/* le cadran et son bouton */}
      <path d="M14.4 12.6h3.9" />
      <Accent cx={16.35} cy={16.9} r={1.5} />
    </svg>
  );
}

export function GlyphNavigation({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M4.5 8.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 13.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 18c2.4-1 4-1 5.8 0" />
      <circle cx={17.6} cy={18.2} r={2.2} />
      <Accent cx={17.6} cy={18.2} r={1.1} />
    </svg>
  );
}

export function GlyphSecurite({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M4.5 8.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 13.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 18c2.4-1 4-1 5.8 0" />
      <path d="M16 16.5l3.5 1 3.5-1" />
      <path d="M16 20.5l3.5 1 3.5-1" />
    </svg>
  );
}

export function GlyphDecouverte({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M4.5 8.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 13.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 18c2.4-1 4-1 5.8 0" />
      <path d="M15.5 18.5l4-2 4 2v3l-4 2-4-2z" />
      <path d="M15.5 18.5l4 2 4-2M19.5 20.5v3" />
    </svg>
  );
}

/** Le chemin sinueux — il sert à la section « Carnet & export » de l'accueil.
 *  ⚠️ Il a failli être REMPLACÉ par la boussole le 31/10 : une recherche de
 *     `<GlyphSentier` ne trouvait qu'un usage, parce que le second n'est pas
 *     du JSX mais une donnée (`glyphe: GlyphSentier` dans la liste des
 *     sections). ⭐ Chercher la forme d'appel qu'on a en tête, c'est trouver
 *     l'inventaire qu'on imaginait. C'est `tsc` qui a rattrapé, pas moi. */
export function GlyphSentier({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M5 19c2.5-.5 4-2 5.5-4.5C12 12 13 9.5 15.5 8c1.7-1 3.4-1.4 5-1" />
      <path d="M5 13.5c2-.4 3.2-1.6 4.4-3.6" strokeDasharray="2 3" />
      <Accent cx={19.5} cy={7.2} r={1.7} />
    </svg>
  );
}

/** La boussole — l'entrée « Promenades » de la barre du bas. */
export function GlyphBoussole({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      {/* la rose, sur la grille de 24 : centre 12, rayon 8 — elle NE TOURNE PAS */}
      <circle cx={12} cy={12} r={8} />
      {/* ⭐ SEULE L'AIGUILLE TOURNE, ET C'EST TOUT LE SUJET. Faire tourner le
          cercle ne se verrait pas (un rond en rotation est un rond), et faire
          tourner le glyphe entier donnerait une roue, pas une boussole. On
          groupe donc l'aiguille et sa pastille, et on les fait pivoter autour
          du centre de la rose. */}
      <g className="g-aiguille">
        <path d="M15.4 8.6 13.3 13.3 8.6 15.4 10.7 10.7Z" />
        <Accent cx={15.4} cy={8.6} r={1.6} />
      </g>
    </svg>
  );
}

/* La carte pliée. ⭐ Elle vient de la landing, où elle était dessinée en
   ligne dans `Invitation.tsx` : deux endroits, un seul dessin — et c'est
   toujours l'un des deux qui vieillit. Elle vit ici maintenant. */
export function GlyphCarte({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3z" />
      <path d="M9 4v13M15 7v13" />
      <Accent cx={12} cy={12.2} r={1.3} />
    </svg>
  );
}

export function GlyphTerritoire({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M4.5 8.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 13.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 18c2.4-1 4-1 5.8 0" />
      <Accent cx={17.6} cy={18.2} r={1.6} />
    </svg>
  );
}


/**
 * RÉGLAGES — trois curseurs, pas une roue dentée.
 *
 * 🔴 LA ROUE A ÉTÉ DESSINÉE D'ABORD, ET ELLE SE LISAIT COMME UN SOLEIL. À
 *    28,8 px — la taille de la barre depuis la réduction du 31/10 — six
 *    dents fines rayonnant d'un disque donnent exactement l'astre, pas
 *    l'outil. Vu à l'écran, pas déduit.
 * ⭐ UN SYMBOLE DOIT SURVIVRE À SA TAILLE D'EMPLOI, pas à celle de la
 *    planche où on le dessine. Trois curseurs tiennent à toute taille : ce
 *    sont des traits horizontaux, la forme la plus robuste qui soit en
 *    petit, et ils disent « ce qui se règle » aussi bien qu'une roue.
 * ⚠️ Les trois poignées sont DÉCALÉES les unes des autres : alignées, le
 *    dessin redevient trois traits barrés — un menu, pas des réglages.
 */
export function GlyphReglages({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} className="m-icone" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2.1" />
      <circle cx="15.5" cy="12" r="2.1" />
      <circle cx="7.5" cy="17" r="2.1" />
    </svg>
  );
}

/**
 * SABLIER — le temps, et le solde de MANA.
 *
 * 🔴 ARBITRAGE D'AURÉLIEN, 14/11/2026 : « MANA dans la bottom bar va devenir
 *    une icône de sablier > représentant le solde de MANA de manatimebank >
 *    ce solde n'est accessible que pour un compte connecté ».
 * ⚠️ LE CHIFFRE N'EST PAS LÀ, ET LE GLYPHE NE FAIT PAS SEMBLANT. Mesuré le
 *    même jour : cette application n'a AUCUNE notion de compte — son écran
 *    d'espace personnel le dit en toutes lettres, « personnel sans être
 *    identifié, pas de compte, pas de courriel » — et manatimebank.org ne
 *    sert aucun solde (`/api` et `/api/solde` : 404). Le sablier est donc une
 *    PORTE vers le temps, pas un compteur. ⛔ Un compteur sans source
 *    afficherait un nombre faux ou un vide, et ce dépôt a un mot pour ça :
 *    un bouton qui ne tient pas sa promesse.
 * ⭐ Le sable du bas est plein, celui du haut vide : un temps qu'on a REÇU,
 *    pas un compte à rebours.
 */
export function GlyphSablier({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} className="m-icone" aria-hidden="true">
      <path d="M7 3h10M7 21h10" />
      <path d="M8 3v3.2c0 2 1.4 3.3 2.9 4.4.7.5.7 1.3 0 1.8C9.4 13.5 8 14.8 8 16.8V21" />
      <path d="M16 3v3.2c0 2-1.4 3.3-2.9 4.4-.7.5-.7 1.3 0 1.8 1.5 1.1 2.9 2.4 2.9 4.4V21" />
      {/* le sable déjà passé — plein en bas */}
      <path d="M9.6 19.4c.6-1.6 1.5-2.4 2.4-2.4s1.8.8 2.4 2.4z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * CONTRIBUTION — « ce lieu manque, ou il est faux ».
 *
 * 🔴 15/11/2026, Aurélien : la deuxième colonne de la barre cesse d'être les
 *    hébergements (ils sont devenus un calque de la carte) et devient une
 *    porte pour CONTRIBUER — ajouter ou corriger un lieu, et joindre une
 *    photo.
 *
 * ⭐ UNE ÉPINGLE AVEC UN PLUS, ET PAS UN CRAYON. Un crayon dit « écrire » —
 *    il irait aussi bien à un formulaire de contact ou à un carnet. Ce qu'on
 *    ouvre ici agit sur la CARTE : la forme doit donc être celle des
 *    épingles qu'on voit dessus, plus le geste qu'on vient y faire.
 * ⚠️ Le plus est posé DANS la tête de l'épingle, pas à côté : collé au
 *    flanc, il se lit comme deux icônes à 24 px, et la barre en porte cinq.
 */
export function GlyphContribution({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} className="m-icone" aria-hidden="true">
      <path d="M12 21.2c3.6-4.1 5.5-7.2 5.5-9.6a5.5 5.5 0 1 0-11 0c0 2.4 1.9 5.5 5.5 9.6z" />
      <path d="M12 8.6v5.4M9.3 11.3h5.4" />
    </svg>
  );
}

/**
 * ÉTINCELLES — « ce qu'il y a à découvrir ».
 *
 * ⭐ TROIS ÉCLATS, DE TAILLES DIFFÉRENTES. Trois identiques forment un motif
 *    régulier qu'on lit comme un symbole abstrait ; trois inégaux, posés hors
 *    axe, se lisent comme une scintillation. C'est la différence entre un
 *    pictogramme et une impression.
 * ⚠️ Chaque éclat est une étoile à quatre branches CONCAVES, pas une croix :
 *    à 28,8 px une croix droite redevient un « + », et « ajouter » n'est pas
 *    ce qu'on veut dire.
 */
export function GlyphEtincelles({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} className="m-icone" aria-hidden="true">
      <path d="M10 3.2c0 3.1 1.3 4.4 4.4 4.4-3.1 0-4.4 1.3-4.4 4.4 0-3.1-1.3-4.4-4.4-4.4 3.1 0 4.4-1.3 4.4-4.4z" />
      <path d="M17.4 11.6c0 2.2.9 3.1 3.1 3.1-2.2 0-3.1.9-3.1 3.1 0-2.2-.9-3.1-3.1-3.1 2.2 0 3.1-.9 3.1-3.1z" />
      <path d="M7.6 15.4c0 1.6.7 2.3 2.3 2.3-1.6 0-2.3.7-2.3 2.3 0-1.6-.7-2.3-2.3-2.3 1.6 0 2.3-.7 2.3-2.3z" />
    </svg>
  );
}

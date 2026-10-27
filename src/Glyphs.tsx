// Glyphes SVG inline — zéro dépendance, zéro requête réseau.
// Style « synapse » : trait 1.4, géométrie régulière sur grille 24,
// arrondis généreux, accent or (pastille) en point focal — l'icône
// signe, elle ne décore pas.

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

export function GlyphMaison({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M4 11.2 12 4.5l8 6.7" />
      <path d="M5.5 10.2V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-8.8" />
      <path d="M9.5 20v-5.2a.8.8 0 0 1 .8-.8h3.4a.8.8 0 0 1 .8.8V20" />
      <Accent cx={12} cy={8.2} r={1.3} />
    </svg>
  );
}

export function GlyphRencontre({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M12 20s-6.5-4.1-6.5-9A4.2 4.2 0 0 1 12 8.4 4.2 4.2 0 0 1 18.5 11c0 4.9-6.5 9-6.5 9z" />
      <Accent cx={12} cy={14.6} r={1.4} />
    </svg>
  );
}

export function GlyphFrance({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M6 5.5 12 4l6 2.5v8.5L12 20 6 15.5z" />
      <path d="M6 5.5 12 8.4l6-1.9M12 8.4V20" />
      <Accent cx={12} cy={12.4} r={1.3} />
    </svg>
  );
}

export function GlyphTerritoire({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M9.4 4.6 5.8 7l.4 4.4 2.2 2.6-.3 2.6 2.6 3.1 2.7-.6 1.1-2.9 3.5-1.9-.6-3.9-2.8-1.6-1.5-3.2-2.6.4-2.1z" />
      <Accent cx={11.6} cy={11.8} r={1.4} />
    </svg>
  );
}

export function GlyphEcosysteme({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="3.4" />
      <circle cx="5.2" cy="7.2" r="2.1" />
      <circle cx="18.8" cy="7.2" r="2.1" />
      <circle cx="12" cy="19.6" r="2.1" />
      <path d="M9.2 10.3 6.9 8.6M14.8 10.3l2.3-1.7M12 15.4v2.1" />
    </svg>
  );
}

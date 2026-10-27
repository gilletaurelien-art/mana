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

function Accent({ cx, cy, r = 1.5 }: { cx: number; cy: number; r?: number }) {
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
      <path d="M4.5 8.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 13.5c2.4-1.2 4-1.2 5.8 0 1.8 1.2 3.6 1.2 5.4 0 1.6-1 3.1-1.2 4.8-.5" />
      <path d="M4.5 18c2.4-1 4-1 5.8 0" />
      <Accent cx={17.6} cy={18.2} r={1.6} />
    </svg>
  );
}

export function GlyphSentier({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <path d="M5 19c2.5-.5 4-2 5.5-4.5C12 12 13 9.5 15.5 8c1.7-1 3.4-1.4 5-1" />
      <path d="M5 13.5c2-.4 3.2-1.6 4.4-3.6" strokeDasharray="2 3" />
      <Accent cx={19.5} cy={7.2} r={1.7} />
    </svg>
  );
}

export function GlyphEcosysteme({ size = 24 }: GlyphProps) {
  return (
    <svg {...base} width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <circle cx="5.2" cy="7.2" r="2" />
      <circle cx="18.8" cy="7.2" r="2" />
      <circle cx="12" cy="19.6" r="2" />
      <path d="M9.2 10.4 7 8.8M14.8 10.4l2.2-1.6M12 15.2v2.4" />
    </svg>
  );
}

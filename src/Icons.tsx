// MANA — Icônes du système « Atlas vivant »
// Trait fin (1.6), géométrie simple, une seule logique de dessin.

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

function Svg({ size = 20, className, style, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconPosition = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 21c-4.4-3.6-7.4-6.8-7.4-10.6a7.4 7.4 0 0 1 14.8 0c0 3.8-3 7-7.4 10.6z" /></Svg>
);
export const IconCarte = (p: IconProps) => (
  <Svg {...p}><path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z" /><path d="M9 4v13M15 6.5v13" /></Svg>
);
export const IconSentier = (p: IconProps) => (
  <Svg {...p}><path d="M5 20c2-1 3-3 3-5s-2-3-2-5 2-4 4-5" /><path d="M12 8.5 15.5 5 14 2.5" /><circle cx="16.5" cy="9" r="1" /><circle cx="12.5" cy="13" r="0.9" /></Svg>
);
export const IconDecouverte = (p: IconProps) => (
  <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /><path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16z" /></Svg>
);
export const IconHorloge = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.4" /><path d="M12 7.5V12l3 2" /></Svg>
);
export const IconDistance = (p: IconProps) => (
  <Svg {...p}><path d="M4 19h16" /><path d="M7 19c1-3 3-5 6-5" /><circle cx="16.5" cy="12" r="1" /><circle cx="19" cy="8.5" r="1" /></Svg>
);
export const IconRelief = (p: IconProps) => (
  <Svg {...p}><path d="M3 18l4.5-8L11 15l3-6 7 9" /><path d="M3 20h18" /></Svg>
);
export const IconChapelle = (p: IconProps) => (
  <Svg {...p}><path d="M12 3v18" /><path d="M8 8h8" /><path d="M12 3l-2 3h4l-2-3z" /><path d="M9 21h6l-1-8h-4l-1 8z" /></Svg>
);
export const IconPanorama = (p: IconProps) => (
  <Svg {...p}><path d="M3 16c3-4 6-6 9-6s6 2 9 6" /><circle cx="8" cy="9" r="2.4" /><path d="M3 19h18" /></Svg>
);
export const IconPlage = (p: IconProps) => (
  <Svg {...p}><path d="M4 16c3 0 3-2 6-2s3 2 6 2 3-2 4-2" /><path d="M4 12c3 0 3-2 6-2s3 2 6 2 3-2 4-2" /><path d="M4 20c3 0 3-2 6-2s3 2 6 2 3-2 4-2" /></Svg>
);
export const IconPhare = (p: IconProps) => (
  <Svg {...p}><path d="M9 21 8 9h8l-1 12" /><path d="M7 9h10" /><path d="M12 9V3" /><circle cx="12" cy="4" r="1.4" /><path d="M6 21h12" /></Svg>
);
export const IconCalvaire = (p: IconProps) => (
  <Svg {...p}><path d="M12 4v16" /><path d="M8 9h8" /><path d="M9 20h6" /></Svg>
);
export const IconRadio = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="1.6" /><path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2" /></Svg>
);
export const IconFleche = (p: IconProps) => (
  <Svg {...p}><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></Svg>
);
export const IconFlecheG = (p: IconProps) => (
  <Svg {...p}><path d="M20 12H5" /><path d="m11 6-6 6 6 6" /></Svg>
);
export const IconLoupe = (p: IconProps) => (
  <Svg {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4.5 4.5" /></Svg>
);
export const IconCoeur = (p: IconProps) => (
  <Svg {...p}><path d="M12 20s-6.5-4.1-6.5-9A4.2 4.2 0 0 1 12 8.4 4.2 4.2 0 0 1 18.5 11c0 4.9-6.5 9-6.5 9z" /></Svg>
);
export const IconCroix = (p: IconProps) => (
  <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);
export const IconAlerte = (p: IconProps) => (
  <Svg {...p}><path d="M12 3 2.5 20h19L12 3z" /><path d="M12 10v4.5" /><circle cx="12" cy="17.2" r="0.6" fill="currentColor" stroke="none" /></Svg>
);
export const IconTele = (p: IconProps) => (
  <Svg {...p}><path d="M12 4v11" /><path d="m7.5 11.5 4.5 4.5 4.5-4.5" /><path d="M4.5 20h15" /></Svg>
);
export const IconBoussole = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.6" /><path d="m15.6 8.4-2.2 5-5 2.2 2.2-5 5-2.2z" /></Svg>
);
export const IconPause = (p: IconProps) => (
  <Svg {...p}><path d="M9 6v12M15 6v12" /></Svg>
);
export const IconSecours = (p: IconProps) => (
  <Svg {...p}><path d="M12 4v16M4 12h16" /><rect x="9.6" y="9.6" width="4.8" height="4.8" rx="1" /></Svg>
);
export const IconProfil = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8.6" r="3.4" /><path d="M5 20c1.4-3.6 4-5.4 7-5.4s5.6 1.8 7 5.4" /></Svg>
);
export const IconFavoris = (p: IconProps) => (
  <Svg {...p}><path d="M6.5 4h11v7a5.5 5.5 0 0 1-11 0V4z" /><path d="M6.5 7h-3v3a3 3 0 0 0 3 3" /><path d="M17.5 7h3v3a3 3 0 0 1-3 3" /></Svg>
);
export const IconPlus = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);

// Catégorie → icône (pour les lieux rencontrés)
export function iconPourCategorie(cat: string, p: IconProps = { size: 18 }) {
  const c = cat.toLowerCase();
  if (c.includes("chapelle") || c.includes("abbaye") || c.includes("culte")) return <IconChapelle {...p} />;
  if (c.includes("panorama") || c.includes("point") || c.includes("belvedere")) return <IconPanorama {...p} />;
  if (c.includes("plage") || c.includes("grève") || c.includes("greve")) return <IconPlage {...p} />;
  if (c.includes("phare")) return <IconPhare {...p} />;
  if (c.includes("calvaire") || c.includes("croix") || c.includes("memorial")) return <IconCalvaire {...p} />;
  return <IconDecouverte {...p} />;
}

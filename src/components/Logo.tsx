interface LogoProps {
  variant?: "full" | "mark" | "wordmark";
  color?: string;
  size?: number;
  className?: string;
}

const BRONZE = "#a8865d";

/**
 * Aevum Seal — concentric rings evoking tree growth rings
 * (longevity) and classical Roman intaglio stamps.
 */
function Seal({
  size,
  color,
  className,
}: {
  size: number;
  color: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-label="Aevum"
    >
      <circle cx="24" cy="24" r="22" stroke={color} strokeWidth="0.8" />
      <circle cx="24" cy="24" r="16" stroke={color} strokeWidth="0.8" />
      <circle cx="24" cy="24" r="10" stroke={color} strokeWidth="0.8" />
      <circle cx="24" cy="24" r="4" stroke={color} strokeWidth="0.8" />
      <circle cx="24" cy="24" r="1" fill={color} />
    </svg>
  );
}

/**
 * byAEVUM wordmark: lowercase italic "by" prefix (Fraunces)
 * + "AEVUM" in Cinzel (classical Roman inscription style).
 */
function Wordmark({
  size,
  color,
  className,
}: {
  size: number;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-baseline leading-none ${className || ""}`}
      style={{ color }}
      aria-label="byAevum"
    >
      <span
        className="font-serif italic lowercase"
        style={{
          fontSize: `${size * 0.55}px`,
          fontWeight: 300,
          letterSpacing: "0em",
          marginRight: `${size * 0.08}px`,
        }}
      >
        by
      </span>
      <span
        className="font-wordmark uppercase"
        style={{
          fontSize: `${size}px`,
          letterSpacing: "0.12em",
          fontWeight: 500,
        }}
      >
        Aevum
      </span>
    </span>
  );
}

export function Logo({
  variant = "full",
  color = BRONZE,
  size = 32,
  className,
}: LogoProps) {
  if (variant === "mark") {
    return <Seal size={size} color={color} className={className} />;
  }

  if (variant === "wordmark") {
    return <Wordmark size={size} color={color} className={className} />;
  }

  // Full: wordmark with small seal suffix
  return (
    <div
      className={`inline-flex items-center gap-[0.5em] ${className || ""}`}
    >
      <Wordmark size={size} color={color} />
      <Seal size={size * 0.45} color={color} />
    </div>
  );
}

export const AEVUM_BRONZE = BRONZE;

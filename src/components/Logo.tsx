interface LogoProps {
  variant?: "full" | "mark" | "wordmark";
  color?: string;
  size?: number;
  className?: string;
}

export function Logo({
  variant = "full",
  color = "currentColor",
  size = 32,
  className,
}: LogoProps) {
  if (variant === "mark") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        className={className}
        aria-label="Aevum"
      >
        {/* Geometric Æ monogram in a thin circle */}
        <circle cx="24" cy="24" r="22.5" stroke={color} strokeWidth="1" />
        {/* Æ letterform — clean geometric */}
        <path
          d="M14 34L21.5 14H26.5L34 34M17 27H31M24 14V34"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    );
  }

  if (variant === "wordmark") {
    return (
      <svg
        width={size * 4.2}
        height={size}
        viewBox="0 0 168 40"
        fill="none"
        className={className}
        aria-label="Aevum"
      >
        {/* A */}
        <path d="M2 32L12 8H15L25 32M6.5 24H20.5" stroke={color} strokeWidth="1.3" strokeLinecap="square" />
        {/* E */}
        <path d="M30 8H44M30 20H42M30 32H44M30 8V32" stroke={color} strokeWidth="1.3" strokeLinecap="square" />
        {/* V */}
        <path d="M50 8L58 32L66 8" stroke={color} strokeWidth="1.3" strokeLinecap="square" />
        {/* U */}
        <path d="M72 8V26C72 29.3 74.7 32 78 32H82C85.3 32 88 29.3 88 26V8" stroke={color} strokeWidth="1.3" strokeLinecap="square" fill="none" />
        {/* M */}
        <path d="M94 32V8L104 24L114 8V32" stroke={color} strokeWidth="1.3" strokeLinecap="square" />
        {/* Thin horizontal accent line */}
        <line x1="0" y1="38" x2="168" y2="38" stroke={color} strokeWidth="0.5" opacity="0.3" />
      </svg>
    );
  }

  // Full: mark + wordmark
  return (
    <div className={`flex items-center gap-3 ${className || ""}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-label="Aevum mark"
      >
        <circle cx="24" cy="24" r="22.5" stroke={color} strokeWidth="1" />
        <path
          d="M14 34L21.5 14H26.5L34 34M17 27H31M24 14V34"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
      <svg
        width={size * 3.5}
        height={size * 0.6}
        viewBox="0 0 168 24"
        fill="none"
        aria-label="Aevum"
      >
        {/* A */}
        <path d="M2 22L10 2H13L21 22M5.5 16H17.5" stroke={color} strokeWidth="1.1" strokeLinecap="square" />
        {/* E */}
        <path d="M26 2H38M26 12H36M26 22H38M26 2V22" stroke={color} strokeWidth="1.1" strokeLinecap="square" />
        {/* V */}
        <path d="M43 2L50 22L57 2" stroke={color} strokeWidth="1.1" strokeLinecap="square" />
        {/* U */}
        <path d="M62 2V17C62 19.8 64.2 22 67 22H70C72.8 22 75 19.8 75 17V2" stroke={color} strokeWidth="1.1" strokeLinecap="square" fill="none" />
        {/* M */}
        <path d="M80 22V2L88 16L96 2V22" stroke={color} strokeWidth="1.1" strokeLinecap="square" />
      </svg>
    </div>
  );
}

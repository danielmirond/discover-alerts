interface EvidenceBadgeProps {
  level: 1 | 2 | 3;
  label?: string;
}

const config = {
  3: {
    stars: "★★★",
    label: "Evidencia fuerte",
    labelEn: "Strong evidence",
    sublabel: "RCT / Meta-análisis",
    color: "text-emerald",
    bg: "bg-emerald-tint",
    border: "border-emerald/20",
  },
  2: {
    stars: "★★☆",
    label: "Evidencia moderada",
    labelEn: "Moderate evidence",
    sublabel: "Estudios observacionales",
    color: "text-bronze",
    bg: "bg-bronze-tint",
    border: "border-bronze/20",
  },
  1: {
    stars: "★☆☆",
    label: "Evidencia limitada",
    labelEn: "Limited evidence",
    sublabel: "Anecdótica / Preliminar",
    color: "text-stone",
    bg: "bg-pearl",
    border: "border-line",
  },
};

export function EvidenceBadge({ level, label }: EvidenceBadgeProps) {
  const c = config[level];

  return (
    <div className={`inline-flex items-center gap-3 ${c.bg} border ${c.border} px-4 py-2.5 my-4`}>
      <span className={`${c.color} text-[16px] tracking-wider`}>
        {c.stars}
      </span>
      <div className="border-l border-current/20 pl-3">
        <div className={`${c.color} text-[11px] tracking-[0.15em] uppercase font-medium`}>
          {label || c.label}
        </div>
        <div className="text-stone text-[10px] mt-0.5">
          {c.sublabel}
        </div>
      </div>
    </div>
  );
}

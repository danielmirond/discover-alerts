import { painColor } from '@/lib/site-config';

// Hero visual procedural para articulos. Usa el color de la categoria
// de dolor + patron geometrico + titular como fondo. No requiere
// imagenes externas: todo es SVG in-line.

export function ArticleHero({
  pain,
  title,
  kicker,
}: {
  pain: string;
  title: string;
  kicker?: string;
}) {
  const color = painColor(pain);

  return (
    <div
      className="relative mb-6 flex min-h-[220px] flex-col justify-end overflow-hidden rounded-sm p-6 md:min-h-[320px] md:p-8"
      style={{ background: color.bg, color: color.fg }}
    >
      {/* Patron geometrico de fondo: circulos concentricos (radar) */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="absolute -right-20 -top-20 h-[380px] w-[380px] opacity-20"
      >
        <g stroke={color.fg} fill="none" strokeWidth="2">
          <circle cx="200" cy="200" r="180" />
          <circle cx="200" cy="200" r="130" />
          <circle cx="200" cy="200" r="80" />
          <circle cx="200" cy="200" r="30" />
        </g>
      </svg>

      <div className="relative">
        {kicker && (
          <div
            className="mb-2 text-xs font-semibold uppercase tracking-widest"
            style={{ color: color.fg, opacity: 0.8 }}
          >
            {kicker}
          </div>
        )}
        <div
          className="inline-block rounded-sm px-3 py-1 text-xs font-bold uppercase tracking-widest"
          style={{
            background: color.fg,
            color: color.bg,
          }}
        >
          {color.label}
        </div>
        <h2
          className="mt-3 font-serif text-xl font-bold leading-tight md:text-2xl"
          style={{ color: color.fg }}
        >
          {title}
        </h2>
      </div>
    </div>
  );
}

interface Source {
  title: string;
  url: string;
  org: string;
  year?: string;
}

interface SourcesProps {
  items: Source[];
}

export function Sources({ items }: SourcesProps) {
  return (
    <div className="mt-16 pt-10 border-t border-line">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] tracking-[0.22em] uppercase text-bronze font-medium">
          Fuentes científicas
        </span>
        <span className="flex-1 h-px bg-hairline" />
      </div>

      <ol className="space-y-3 list-none pl-0">
        {items.map((source, i) => (
          <li key={i} className="flex items-start gap-3 text-[13px]">
            <span className="font-serif text-emerald text-[12px] mt-0.5 shrink-0 w-5">
              {i + 1}.
            </span>
            <div>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-charcoal hover:text-emerald transition-colors underline decoration-line underline-offset-[3px] hover:decoration-emerald"
              >
                {source.title}
              </a>
              <span className="text-stone text-[12px] ml-2">
                — {source.org}
                {source.year && ` (${source.year})`}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-[11px] text-mist mt-6 italic font-serif">
        Las fuentes incluyen instituciones médicas, revistas peer-reviewed y
        organizaciones de investigación. BiohackLab no ofrece consejo médico.
      </p>
    </div>
  );
}

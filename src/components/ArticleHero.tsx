import Image from "next/image";

interface ArticleHeroProps {
  src: string;
  alt: string;
  credit?: string;
}

export function ArticleHero({ src, alt, credit }: ArticleHeroProps) {
  return (
    <figure className="relative w-full aspect-[21/9] mb-0 overflow-hidden bg-ivory">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover saturate-[0.88] contrast-[1.04]"
        sizes="100vw"
        priority
        unoptimized
      />
      <div className="absolute inset-0 bg-bronze/[0.05] mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg/40 via-transparent to-transparent" />
      {credit && (
        <figcaption className="absolute bottom-4 right-6 text-[9px] text-bg/60 tracking-[0.15em] uppercase">
          {credit}
        </figcaption>
      )}
    </figure>
  );
}

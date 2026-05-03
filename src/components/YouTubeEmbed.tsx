"use client";

import { useState } from "react";
import Image from "next/image";

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
}

export function YouTubeEmbed({ videoId, title }: YouTubeEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div className="my-10">
      {title && (
        <div className="text-[11px] tracking-[0.15em] uppercase text-stone mb-3">
          Video review
        </div>
      )}
      <div className="relative aspect-video bg-charcoal overflow-hidden">
        {loaded ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title || "YouTube video"}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            loading="lazy"
          />
        ) : (
          <button
            onClick={() => setLoaded(true)}
            className="absolute inset-0 w-full h-full cursor-pointer group"
            aria-label={`Play: ${title || "YouTube video"}`}
          >
            <Image
              src={thumbnailUrl}
              alt={title || "YouTube video thumbnail"}
              fill
              className="object-cover saturate-[0.88] contrast-[1.04]"
              sizes="(max-width: 768px) 100vw, 640px"
              unoptimized
              loading="lazy"
            />
            <div className="absolute inset-0 bg-charcoal/20 group-hover:bg-charcoal/10 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-bengara/90 group-hover:bg-bengara flex items-center justify-center transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            {title && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-charcoal/80 to-transparent">
                <span className="text-bg text-[13px] font-medium line-clamp-2">{title}</span>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

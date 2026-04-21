/**
 * YouTube Trending ES (HTML scraping de charts.youtube.com).
 * NO requiere API key. El HTML contiene un JSON embebido con todas las
 * entries. Parser frágil si Google cambia el shape — revisar trimestralmente.
 */

export interface YouTubeTrendingItem {
  rank: number;
  title: string;
  channel?: string;
  videoId?: string;
  url?: string;
  thumbnail?: string;
  views?: number;
}

const URL_ES = 'https://charts.youtube.com/charts/TopVideos/es';

export async function fetchYouTubeTrendingES(): Promise<YouTubeTrendingItem[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  const r = await fetch(URL_ES, {
    signal: ctrl.signal,
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; discover-alerts-yt)', 'accept-language': 'es-ES,es;q=0.9' },
  });
  clearTimeout(t);
  if (!r.ok) throw new Error(`YT Trending HTTP ${r.status}`);
  const html = await r.text();

  // El HTML incluye un JSON con data en un <script> tipo:
  //   var ytma_data = {...};  o  "videoId": "...", "title": {"runs":[{"text":"..."}]}
  // Strategy simple: regex sobre pares (videoId, title, channel) en orden.
  const out: YouTubeTrendingItem[] = [];
  const re = /"videoId":"([A-Za-z0-9_-]{11})"[^}]{0,600}?"title":\{"simpleText":"([^"]{2,200})"/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 30) {
    const videoId = m[1];
    if (seen.has(videoId)) continue;
    seen.add(videoId);
    const title = m[2].replace(/\\u[0-9a-fA-F]{4}/g, s => String.fromCharCode(parseInt(s.slice(2), 16)));
    out.push({
      rank: out.length + 1,
      title,
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  }

  // Fallback: otro formato (title como runs[])
  if (out.length === 0) {
    const re2 = /"videoId":"([A-Za-z0-9_-]{11})"[^}]{0,600}?"runs":\[\{"text":"([^"]{2,200})"/g;
    while ((m = re2.exec(html)) && out.length < 30) {
      const videoId = m[1];
      if (seen.has(videoId)) continue;
      seen.add(videoId);
      out.push({
        rank: out.length + 1,
        title: m[2].replace(/\\u[0-9a-fA-F]{4}/g, s => String.fromCharCode(parseInt(s.slice(2), 16))),
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }
  }

  return out.slice(0, 20);
}

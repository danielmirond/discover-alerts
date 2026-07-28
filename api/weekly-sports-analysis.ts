import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadState, getState } from '../src/state/store.js';

/**
 * GET /api/weekly-sports-analysis
 *
 * Análisis agregado de los últimos 7 días sobre state.contentAudits
 * (poll diario de las top 80 pages /Sports Discover ES). Devuelve:
 *   - Aggregates estructurales (wordCount, H2, links, imgs, videos, AMP)
 *     de la semana + comparativa vs semana previa (7-14d)
 *   - N-gramas top de titulares (3-5 palabras, stopwords ES)
 *   - Fórmulas estructurales detectadas (pregunta, listicle, dos puntos,
 *     cita, versus, cifra concreta, urgencia, comparativa...)
 *   - Breakdown por día para ver tendencias intraweekly
 *
 * Gated a INSTANCE_NAME=sport.
 */

// ── Stopwords ES para n-gramas de titulares ──────────────────────────────
const STOPWORDS_ES = new Set([
  'el','la','los','las','un','una','unos','unas','al','del',
  'de','en','y','o','que','es','por','con','para','como','se','su','sus','le','les','lo',
  'mas','ya','no','si','ha','han','fue','ser','este','esta','estos','estas','ese','esa','esos','esas',
  'pero','sin','sobre','entre','hasta','desde','muy','todo','toda','todos','todas','otro','otra','otros','otras',
  'cual','cuando','donde','quien','hay','tras','porque','segun','según','aunque','mientras','pese',
  'nos','me','te','mi','tu','ella','ellos','ellas','vos','nosotros','vosotros','usted','ustedes',
  'aqui','ahi','alli','asi','bien','mal','mejor','peor','mucho','poco','antes','despues','ahora','hoy','ayer','manana',
  'siempre','nunca','tambien','solo','menos','algo','alguno','alguna','ningun','nadie','nada','cada',
  'que','como','donde','cuando','cuanto','cuanta','año','años','meses','día','dia','días','dias','hora','horas',
  'the','and','for','that','with','this','from','are','was','has','have','not','but','its','his','her',
  'they','been','will','would','should','could','about','after','over',
]);

// ── Fórmulas estructurales (regex sobre titular normalizado) ─────────────
const FORMULAS: Array<{ id: string; label: string; re: RegExp }> = [
  { id: 'pregunta',    label: 'Pregunta directa',        re: /^\s*(¿|why|how|will|is|are|can|should|would|comment|perché|perche|pourquoi|warum|por qué|cómo|como|qué|que)\b/i },
  { id: 'listicle',    label: 'Listicle (N cosas)',      re: /^\s*\d{1,2}\s+\w/i },
  { id: 'dos-puntos',  label: 'Gancho con ":"',          re: /^[^:]{6,40}:\s+\w/i },
  { id: 'cita',        label: 'Cita entrecomillada',     re: /["“«][^"”»]{6,80}["”»]/ },
  { id: 'despues-de',  label: 'After / Tras / Dopo',     re: /\b(after|tras|dopo|nach|apres|après|depois)\b/i },
  { id: 'versus',      label: 'Comparativa (vs)',        re: /\b(vs\.?|versus|contra|gegen|contre)\b/i },
  { id: 'urgencia',    label: 'Urgencia / breaking',     re: /\b(breaking|confirmed|oficial|official|ufficiale|officiel|amtlich|confirmado)\b/i },
  { id: 'porque',      label: 'Explicativo (why)',       re: /^\s*(why|perché|perche|pourquoi|por qué|por que|warum)\b/i },
  { id: 'how-to',      label: 'How-to / Cómo',           re: /^\s*(how to|come|comment|cómo|como|wie man)\b/i },
  { id: 'from-to',     label: 'From X to Y',             re: /\bfrom\b[^.!?]{3,50}\bto\b|\bde\b[^.!?]{3,50}\ba\b/i },
  { id: 'top-best',    label: 'Top / Best',              re: /\b(top \d+|best \d+|los mejores|i migliori|les meilleurs|os melhores)\b/i },
  { id: 'declaracion', label: 'Declaración atribuida',   re: /\b(reveals?|says?|admits?|dice|dichiara|déclare|sagt|afirma|confiesa|asegura|advierte|desvela|explica)\b/i },
  { id: 'cifra',       label: 'Cifra concreta (M€/goles/pts)', re: /\b\d{1,4}[.,]?\d*\s*(millones|goles|puntos|asistencias|partidos|victorias|derrotas|m€|millon|goals?|points?|assists?)\b/i },
  { id: 'exclusiva',   label: 'Exclusiva / Adelantar',   re: /\b(exclusiva|adelantar|adelanta|primicia|primeur|scoop|exclusive)\b/i },
  { id: 'negacion',    label: 'Negación / Descarte',     re: /\b(rechaza|niega|descarta|no ficha|no llega|desmiente|refuses|rejects|denies)\b/i },
];

function normalizeText(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tokenize(s: string): string[] {
  return normalizeText(s)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS_ES.has(w));
}

function ngrams(words: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(' '));
  return out;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((s, x) => s + x, 0) / arr.length);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor(p * s.length));
  return s[idx];
}

function dayKey(iso: string): string {
  return (iso || '').slice(0, 10); // YYYY-MM-DD
}

interface AuditEntry {
  url: string;
  publisher?: string;
  title?: string;
  auditedAt: string;
  wordCount: number;
  titleWordCount?: number;
  h1: number;
  h2: number;
  h3: number;
  firstSubtitleWordCount?: number;
  images: number;
  videos: number;
  links?: number;
  paragraphs: number;
  amp: boolean;
  bodySource?: string;
  error?: string;
  scoreSnapshot?: number;
  category?: string | number;
}

const EMBED_DOMAINS = new Set(['youtube.com','youtu.be','twitter.com','x.com','tiktok.com','instagram.com']);
const isEmbed = (a: AuditEntry) => EMBED_DOMAINS.has((a.publisher || '').replace(/^www\./, '').toLowerCase());

function aggregate(items: AuditEntry[]) {
  const wc = items.map(a => a.wordCount);
  const twc = items.map(a => a.titleWordCount || 0).filter(n => n > 0);
  const h2 = items.map(a => a.h2);
  const sub1 = items.map(a => a.firstSubtitleWordCount || 0).filter(n => n > 0);
  const imgs = items.map(a => a.images);
  const vids = items.map(a => a.videos);
  const links = items.map(a => a.links || 0);
  const paras = items.map(a => a.paragraphs);
  return {
    sample: items.length,
    wordCount: { mean: mean(wc), median: median(wc), p75: percentile(wc, 0.75), p90: percentile(wc, 0.9) },
    titleWordCount: { mean: mean(twc), median: median(twc), p75: percentile(twc, 0.75), sample: twc.length },
    h2: { mean: mean(h2), median: median(h2), p75: percentile(h2, 0.75) },
    firstSubtitleWordCount: { mean: mean(sub1), median: median(sub1), sample: sub1.length },
    images: { mean: mean(imgs), median: median(imgs), p75: percentile(imgs, 0.75), p90: percentile(imgs, 0.9) },
    videos: { mean: mean(vids), withVideoPct: vids.length > 0 ? Math.round((vids.filter(v => v > 0).length / vids.length) * 100) : 0 },
    links: { mean: mean(links), median: median(links), p75: percentile(links, 0.75), p90: percentile(links, 0.9) },
    paragraphs: { mean: mean(paras), median: median(paras) },
    ampPct: items.length > 0 ? Math.round((items.filter(a => a.amp).length / items.length) * 100) : 0,
  };
}

/** Δ relativo entre dos valores como % con signo. */
function delta(current: number, prev: number): number | null {
  if (!prev) return current > 0 ? null : 0;
  return Math.round(((current - prev) / prev) * 100);
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if ((process.env.INSTANCE_NAME || 'main') !== 'sport') {
    res.status(404).json({ error: 'not found' });
    return;
  }
  try {
    await loadState();
    const s = getState() as any;
    const audits: Record<string, AuditEntry> = s.contentAudits || {};
    const lastPoll = s.lastPollContentAudit || null;

    const allValid = Object.values(audits).filter(a => !a.error && a.wordCount > 0 && !isEmbed(a));

    const nowMs = Date.now();
    const dayMs = 24 * 3600_000;
    const weekMs = 7 * dayMs;

    const thisWeek = allValid.filter(a => nowMs - new Date(a.auditedAt).getTime() <= weekMs);
    const prevWeek = allValid.filter(a => {
      const t = nowMs - new Date(a.auditedAt).getTime();
      return t > weekMs && t <= 2 * weekMs;
    });

    if (thisWeek.length === 0) {
      res.json({
        lastPoll, sample: 0,
        note: 'Sin auditorías en los últimos 7 días. Comprueba el cron [Sport] Content Audit Poll.',
        weekly: null, previous: null, deltas: null,
        byDay: [], ngrams: [], formulas: [], byPublisher: [],
      });
      return;
    }

    const weekly = aggregate(thisWeek);
    const previous = prevWeek.length > 0 ? aggregate(prevWeek) : null;

    // Δ vs semana anterior (métricas clave)
    const deltas = previous ? {
      wordCount: delta(weekly.wordCount.mean, previous.wordCount.mean),
      titleWordCount: delta(weekly.titleWordCount.mean, previous.titleWordCount.mean),
      h2: delta(weekly.h2.mean, previous.h2.mean),
      firstSubtitleWordCount: delta(weekly.firstSubtitleWordCount.mean, previous.firstSubtitleWordCount.mean),
      links: delta(weekly.links.mean, previous.links.mean),
      images: delta(weekly.images.mean, previous.images.mean),
      ampPct: delta(weekly.ampPct, previous.ampPct),
    } : null;

    // Breakdown por día
    const byDayMap = new Map<string, AuditEntry[]>();
    for (const a of thisWeek) {
      const d = dayKey(a.auditedAt);
      if (!byDayMap.has(d)) byDayMap.set(d, []);
      byDayMap.get(d)!.push(a);
    }
    const byDay = [...byDayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, items]) => ({
        day,
        sample: items.length,
        wordCount: mean(items.map(x => x.wordCount)),
        titleWordCount: mean(items.map(x => x.titleWordCount || 0).filter(n => n > 0)),
        h2: mean(items.map(x => x.h2)),
        firstSubtitleWordCount: mean(items.map(x => x.firstSubtitleWordCount || 0).filter(n => n > 0)),
        images: mean(items.map(x => x.images)),
        videos: mean(items.map(x => x.videos)),
        links: mean(items.map(x => x.links || 0)),
        avgDiscoverScore: mean(items.map(x => x.scoreSnapshot || 0)),
      }));

    // N-gramas de titulares (3-5 palabras)
    const ngramAgg = new Map<string, { count: number; examples: Set<string> }>();
    for (const a of thisWeek) {
      const title = a.title || '';
      if (!title) continue;
      const tokens = tokenize(title);
      for (const n of [3, 4, 5]) {
        for (const g of ngrams(tokens, n)) {
          let e = ngramAgg.get(g);
          if (!e) { e = { count: 0, examples: new Set() }; ngramAgg.set(g, e); }
          e.count++;
          if (e.examples.size < 3) e.examples.add(title);
        }
      }
    }
    let topNgrams = [...ngramAgg.entries()]
      .filter(([, v]) => v.count >= 2)
      .map(([ngram, v]) => ({ ngram, count: v.count, examples: [...v.examples] }))
      .sort((a, b) => b.count - a.count || b.ngram.split(' ').length - a.ngram.split(' ').length)
      .slice(0, 25);

    // Fallback a bigramas si pocos trigramas
    if (topNgrams.length < 10) {
      const biAgg = new Map<string, { count: number; examples: Set<string> }>();
      for (const a of thisWeek) {
        const title = a.title || '';
        if (!title) continue;
        const tokens = tokenize(title);
        for (const g of ngrams(tokens, 2)) {
          let e = biAgg.get(g);
          if (!e) { e = { count: 0, examples: new Set() }; biAgg.set(g, e); }
          e.count++;
          if (e.examples.size < 3) e.examples.add(title);
        }
      }
      const bigrams = [...biAgg.entries()]
        .filter(([, v]) => v.count >= 3)
        .map(([ngram, v]) => ({ ngram, count: v.count, examples: [...v.examples] }))
        .sort((a, b) => b.count - a.count);
      const seen = new Set(topNgrams.map(x => x.ngram));
      for (const b of bigrams) if (!seen.has(b.ngram) && topNgrams.length < 25) topNgrams.push(b);
    }

    // Fórmulas estructurales sobre titulares
    const formulas = FORMULAS.map(f => {
      const examples: string[] = [];
      let count = 0;
      for (const a of thisWeek) {
        const t = (a.title || '').trim();
        if (!t) continue;
        if (f.re.test(t)) {
          count++;
          if (examples.length < 3) examples.push(t);
        }
      }
      return { id: f.id, label: f.label, count, pct: Math.round((count / thisWeek.length) * 100), examples };
    }).filter(f => f.count >= 1).sort((a, b) => b.count - a.count);

    // Top publishers de la semana
    const pubMap = new Map<string, AuditEntry[]>();
    for (const a of thisWeek) {
      const pub = a.publisher || '—';
      if (!pubMap.has(pub)) pubMap.set(pub, []);
      pubMap.get(pub)!.push(a);
    }
    const byPublisher = [...pubMap.entries()]
      .map(([publisher, items]) => ({
        publisher,
        count: items.length,
        wordCount: mean(items.map(a => a.wordCount)),
        titleWordCount: mean(items.map(a => a.titleWordCount || 0).filter(n => n > 0)),
        h2: mean(items.map(a => a.h2)),
        firstSubtitleWordCount: mean(items.map(a => a.firstSubtitleWordCount || 0).filter(n => n > 0)),
        links: mean(items.map(a => a.links || 0)),
        images: mean(items.map(a => a.images)),
        avgDiscoverScore: mean(items.map(a => a.scoreSnapshot || 0)),
      }))
      .filter(p => p.count >= 2)
      .sort((a, b) => b.count - a.count);

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      lastPoll,
      sample: thisWeek.length,
      previousSample: prevWeek.length,
      weekly, previous, deltas,
      byDay, ngrams: topNgrams, formulas, byPublisher,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

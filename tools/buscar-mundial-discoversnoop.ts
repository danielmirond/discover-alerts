/**
 * Busca en la API histórica de DiscoverSnoop titulares y noticias
 * relacionadas con el Mundial / Copa del Mundo / FIFA World Cup.
 *
 * Uso (desde la raíz del repo discover-alerts):
 *
 *   npx tsx tools/buscar-mundial-discoversnoop.ts \
 *     --from 2022-11-20 --to 2022-12-31 \
 *     --lines 10000 --out csv
 *
 * Argumentos opcionales:
 *   --from YYYY-MM-DD  (default: hace 30 días)
 *   --to YYYY-MM-DD    (default: hoy)
 *   --lines 5000       (default: 5000)
 *   --out csv          (default: imprime stdout)
 *   --pais ES          (default: ES, también AR/BR/MX/UK/IT/DE/FR)
 *
 * Salida: filas con title, snippet, url, publisher, fecha y la keyword que matcheó.
 *
 * Periodos sugeridos:
 *   Qatar 2022:    --from 2022-11-20 --to 2022-12-19
 *   Rusia 2018:    --from 2018-06-14 --to 2018-07-15
 *   Brasil 2014:   --from 2014-06-12 --to 2014-07-13
 *   Sudáfrica 2010: --from 2010-06-11 --to 2010-07-11
 *   Mundial 2026:  --from 2026-06-08 --to 2026-07-19
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv('.env');

const API_BASE = 'https://api.discoversnoop.com';
const TOKEN = process.env.DISCOVERSNOOP_TOKEN;

if (!TOKEN) {
  console.error('ERROR: falta DISCOVERSNOOP_TOKEN en .env');
  process.exit(1);
}

interface DiscoverPage {
  url: string;
  title: string;
  title_original?: string;
  title_english?: string;
  snippet?: string;
  publisher?: string;
  domain?: string;
  image?: string;
}

interface DiscoverEntity {
  entity: string;
  country: string;
  score: number;
  score_decimal: number;
  position: number;
  publications: number;
}

async function fetchEndpoint<T>(path: string, params: Record<string, string | number>): Promise<T[]> {
  const url = new URL(path, API_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}: ${text.slice(0, 300)}`);
  const parsed = JSON.parse(text);
  const json = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!json?.status) throw new Error(`${path} status=false: ${JSON.stringify(json).slice(0, 300)}`);
  return json.data ?? [];
}

// Keywords amplias del Mundial (genéricas + específicas por edición)
const KEYWORDS = [
  // Generales
  /\bmundial\b/i,
  /copa del mundo/i,
  /world cup/i,
  /mondial(e|i)?\b/i, // it/fr
  /weltmeisterschaft/i, // de
  /\bfifa\b.*\bmundial/i,
  /\bfifa world\b/i,

  // Por edición concreta
  /qatar 2022/i,
  /rusia 2018/i,
  /russia 2018/i,
  /brasil 2014/i,
  /brazil 2014/i,
  /sudáfrica 2010/i,
  /south africa 2010/i,
  /alemania 2006/i,
  /germany 2006/i,
  /corea[- ]?japón 2002/i,
  /korea[- ]?japan 2002/i,
  /francia 1998/i,
  /france 1998/i,
  /usa 1994/i,
  /italia 1990/i,
  /italy 1990/i,
  /méxico 1986/i,
  /mexico 1986/i,
  /españa 1982/i,
  /spain 1982/i,
  /argentina 1978/i,
  /alemania 1974/i,
  /méxico 1970/i,
  /inglaterra 1966/i,
  /england 1966/i,
  /chile 1962/i,
  /suecia 1958/i,
  /sweden 1958/i,
  /suiza 1954/i,
  /switzerland 1954/i,
  /brasil 1950/i,
  /francia 1938/i,
  /italia 1934/i,
  /uruguay 1930/i,

  // Ediciones próximas
  /norteamérica 2026/i,
  /\bmundial 2026\b/i,

  // Frases icónicas / eventos
  /maracanazo/i,
  /mineirazo/i,
  /mano de dios/i,
  /hand of god/i,
  /gol del siglo/i,
  /milagro de berna/i,
  /wunder von bern/i,
  /maracanã/i,
  /maracaná/i,
];

function matchesAny(text: string): string | null {
  for (const re of KEYWORDS) {
    if (re.test(text)) return re.source;
  }
  return null;
}

function parseArgs() {
  const args: Record<string, string> = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      args[key] = process.argv[i + 1] ?? '';
      i++;
    }
  }
  return args;
}

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }
function escapeCsv(value: string): string {
  if (value == null) return '';
  const v = String(value).replace(/"/g, '""');
  if (/[",\n]/.test(v)) return `"${v}"`;
  return v;
}

async function main() {
  const args = parseArgs();
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86_400_000);
  const from = args.from || isoDate(monthAgo);
  const to = args.to || isoDate(today);
  const lines = parseInt(args.lines || '5000', 10);
  const out = args.out;
  const country = args.pais || process.env.DISCOVER_COUNTRY || 'ES';

  console.log(`Buscando en DiscoverSnoop pages de ${from} a ${to} (lines=${lines}, country=${country})...`);

  const pages = await fetchEndpoint<DiscoverPage>('/pages', {
    country, from_date: from, to_date: to, lines,
  });
  console.log(`  ${pages.length} páginas obtenidas`);

  const matched = pages
    .map((p) => {
      const text = `${p.title || ''} ${p.title_original || ''} ${p.title_english || ''} ${p.snippet || ''}`;
      const match = matchesAny(text);
      return match ? { ...p, _match: match } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  console.log(`  ${matched.length} páginas con match Mundial`);

  // Entidades agregadas (opcional, solo desde 10/01/2025)
  try {
    const entities = await fetchEndpoint<DiscoverEntity>('/entities', {
      country, from_date: from, to_date: to, lines: 1000,
    });
    const matchedEntities = entities.filter((e) => matchesAny(e.entity));
    console.log(`  Entidades destacadas: ${matchedEntities.length}`);
    for (const e of matchedEntities.slice(0, 30)) {
      console.log(`    [${e.position}] "${e.entity}" — score ${e.score_decimal} (${e.publications} pubs)`);
    }
  } catch (err: any) {
    console.log(`  (entities no disponible: ${err.message.slice(0, 100)})`);
  }

  // Output
  if (out === 'csv') {
    const csvRows = [
      ['fecha_rango', 'titular', 'snippet', 'publisher', 'domain', 'url', 'match', 'pais'],
      ...matched.map((p) => [
        from + '_' + to,
        p.title || '',
        p.snippet || '',
        p.publisher || '',
        p.domain || '',
        p.url || '',
        p._match,
        country,
      ]),
    ];
    const csv = csvRows.map((r) => r.map((c) => escapeCsv(c)).join(',')).join('\n');
    const filename = `mundial-discoversnoop-${country.toLowerCase()}-${from}-a-${to}.csv`;
    writeFileSync(filename, csv, 'utf8');
    console.log(`Exportado a ${filename}`);
  } else {
    for (const p of matched.slice(0, 100)) {
      console.log('---');
      console.log(`TITULAR: ${p.title}`);
      if (p.snippet) console.log(`  snippet: ${p.snippet.slice(0, 200)}`);
      console.log(`  publisher: ${p.publisher} | domain: ${p.domain}`);
      console.log(`  url: ${p.url}`);
      console.log(`  match: ${p._match}`);
    }
    if (matched.length > 100) {
      console.log(`\n... y ${matched.length - 100} más. Usa --out csv para volcado completo.`);
    }
  }
}

main().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});

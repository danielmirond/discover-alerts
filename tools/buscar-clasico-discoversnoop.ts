/**
 * Busca en la API histórica de DiscoverSnoop titulares y noticias
 * relacionadas con Real Madrid, FC Barcelona o El Clásico.
 *
 * Uso (desde la raíz del repo discover-alerts):
 *
 *   # 1. Asegúrate de tener DISCOVERSNOOP_TOKEN en .env
 *   # 2. npx tsx tools/buscar-clasico-discoversnoop.ts
 *
 * Argumentos opcionales:
 *   --from YYYY-MM-DD  (default: hace 30 días)
 *   --to YYYY-MM-DD    (default: hoy)
 *   --lines 5000       (default: 5000)
 *   --out csv          (default: imprime stdout)
 *
 * Salida: imprime/exporta filas con title, snippet, url, publisher, fecha
 * filtradas por keywords Madrid/Barça/Clásico.
 */

import 'dotenv/config';
import { writeFileSync } from 'fs';
import {
  fetchHistoricalPages,
  fetchHistoricalEntities,
} from '../src/sources/discoversnoop.js';

const KEYWORDS = [
  /real madrid/i,
  /\bbarcelona\b/i,
  /\bbarça\b/i,
  /\bbarsa\b/i,
  /clásico/i,
  /clasico/i,
  /madrid.{0,30}barça/i,
  /madrid.{0,30}barcelona/i,
  /barça.{0,30}madrid/i,
  /barcelona.{0,30}madrid/i,
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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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

  console.log(`Buscando en DiscoverSnoop pages de ${from} a ${to} (lines=${lines})...`);

  const pages = await fetchHistoricalPages({ from_date: from, to_date: to, lines });
  console.log(`  ${pages.length} páginas obtenidas`);

  const matched = pages
    .map((p) => {
      const text = `${p.title || ''} ${p.title_original || ''} ${p.title_english || ''} ${p.snippet || ''}`;
      const match = matchesAny(text);
      return match ? { ...p, _match: match } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  console.log(`  ${matched.length} páginas con match Madrid/Barça/Clásico`);

  // También busca entidades agregadas
  const entities = await fetchHistoricalEntities({ from_date: from, to_date: to, lines: 1000 });
  const matchedEntities = entities.filter((e) => matchesAny(e.entity));
  console.log(`  Entidades destacadas: ${matchedEntities.length}`);
  for (const e of matchedEntities.slice(0, 20)) {
    console.log(`    [${e.position}] "${e.entity}" — score ${e.score_decimal} (${e.publications} pubs)`);
  }

  // Output
  if (out === 'csv') {
    const csvRows = [
      ['fecha', 'titular', 'snippet', 'publisher', 'domain', 'url', 'match'],
      ...matched.map((p) => [
        from + '_' + to,
        p.title || '',
        p.snippet || '',
        p.publisher || '',
        p.domain || '',
        p.url || '',
        p._match,
      ]),
    ];
    const csv = csvRows
      .map((r) => r.map((c) => escapeCsv(c)).join(','))
      .join('\n');
    const filename = `clasico-discoversnoop-${from}-a-${to}.csv`;
    writeFileSync(filename, csv, 'utf8');
    console.log(`Exportado a ${filename}`);
  } else {
    // Print to stdout
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

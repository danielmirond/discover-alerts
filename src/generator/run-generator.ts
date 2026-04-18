// CLI para el generador de contenido. Uso:
//   npx tsx src/generator/run-generator.ts boe
//   npx tsx src/generator/run-generator.ts trending [count=3]
//   npx tsx src/generator/run-generator.ts all

import { generateBoeBrief } from './generate-boe-brief.js';
import { generateNoticiasDiscover } from './generate-trending.js';

const target = process.argv[2] ?? 'all';
const countArg = process.argv[3];

async function main() {
  const results: string[] = [];

  if (target === 'boe' || target === 'all') {
    const brief = await generateBoeBrief();
    if (brief) results.push(`brief: ${brief.filepath}`);
  }

  if (target === 'trending' || target === 'all') {
    const count = countArg ? parseInt(countArg, 10) : 3;
    const noticias = await generateNoticiasDiscover(count);
    for (const n of noticias) results.push(`noticia: ${n.filepath}`);
  }

  if (!['boe', 'trending', 'all'].includes(target)) {
    console.error(`Usage: run-generator.ts <boe|trending|all> [count]`);
    process.exit(1);
  }

  console.log(`\n[run-generator] Completed. ${results.length} articulos:`);
  for (const r of results) console.log(`  - ${r}`);

  if (results.length === 0) {
    console.log('[run-generator] No articulos generated.');
  }
}

main().catch(err => {
  console.error('[run-generator] Fatal:', err);
  process.exit(1);
});

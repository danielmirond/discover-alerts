import { analyzeImage } from './analysis/image-analyzer.js';
import { loadState, getState } from './state/store.js';

/**
 * One-off: analiza las top-N entidades que tienen imagen en state.pages.
 * Uso local:  npx tsx src/run-image-test.ts [N]
 * GitHub Actions lo invoca como demo con ANTHROPIC_API_KEY del secret.
 */
async function main() {
  const n = parseInt(process.argv[2] || '5', 10);
  await loadState();
  const state = getState();

  // Por cada entity top N en state.entities, buscar página top con imagen
  const entityNames = Object.entries(state.entities || {})
    .sort((a, b) => (b[1].score || 0) - (a[1].score || 0))
    .slice(0, n * 3) // oversample, no todas tienen imagen
    .map(([name]) => name);

  const targets: Array<{ entity: string; url: string; title: string }> = [];
  for (const name of entityNames) {
    const nameLower = name.toLowerCase();
    let best: { url: string; title: string; image?: string; score: number } | null = null;
    for (const [url, ps] of Object.entries(state.pages || {})) {
      if (!ps.title || !ps.image) continue;
      if (ps.title.toLowerCase().includes(nameLower)) {
        if (!best || (ps.score || 0) > best.score) {
          best = { url, title: ps.title, image: ps.image, score: ps.score || 0 };
        }
      }
    }
    if (best?.image) {
      targets.push({ entity: name, url: best.image, title: best.title });
      if (targets.length >= n) break;
    }
  }

  console.log(`[image-test] Analizando ${targets.length} entidades top con imagen en DS\n`);

  for (const t of targets) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Entidad: ${t.entity}`);
    console.log(`Titular: ${t.title.slice(0, 100)}`);
    console.log(`Imagen:  ${t.url}`);
    const start = Date.now();
    const analysis = await analyzeImage(t.url, { entityName: t.entity, headline: t.title });
    const ms = Date.now() - start;
    if (analysis.error) {
      console.log(`  ❌ error: ${analysis.error} (${ms}ms)`);
    } else {
      console.log(`  caption:     ${analysis.caption}`);
      console.log(`  entityMatch: ${analysis.entityMatch}/10`);
      console.log(`  notes:       ${(analysis.notes || []).join(' | ')}`);
      console.log(`  brandSafe:   ${analysis.brandSafe ? '✓' : '⚠ false'}`);
      console.log(`  (${ms}ms, ${analysis.model})`);
    }
    console.log('');
  }
}

main().catch(e => { console.error(e); process.exit(1); });

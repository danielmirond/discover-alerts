/**
 * Demo script: simulates the full alert pipeline with mock data.
 * Run with: npx tsx src/demo.ts
 */
import { updateState, getState } from './state/store.js';
import { detectEntityAlerts } from './analysis/entity-detector.js';
import { detectCategoryAlerts } from './analysis/category-detector.js';
import { detectDomainAlerts } from './analysis/domain-detector.js';
import { detectSocialAlerts } from './analysis/social-detector.js';
import { detectHeadlinePatterns } from './analysis/headline-patterns.js';
import { dedup } from './analysis/dedup.js';
import { formatAlerts } from './alerts/formatter.js';
import { persistAlerts } from './state/store.js';
import { logger } from './utils/logger.js';
import { withRetry } from './utils/retry.js';
import { validateApiResponse } from './utils/validate.js';
import type {
  DiscoverEntity,
  DiscoverCategory,
  DiscoverDomain,
  DiscoverSocial,
  DiscoverPage,
  Alert,
} from './types.js';

// ── Seed previous state to simulate a "second poll" ─────────────────
updateState({
  entities: {
    'Kylian Mbappe': { score: 30, scoreDecimal: 0.3, position: 12, publications: 5, firstSeen: '2025-06-01T10:00:00Z', lastUpdated: '2025-06-01T10:00:00Z' },
  },
  categories: {
    1: { name: 'Deportes', score: 55, scoreDecimal: 0.55, position: 3, publications: 20, lastUpdated: '2025-06-01T10:00:00Z' },
  },
  domains: {
    'elpais.com': { score: 40, position: 4, publications: 15, lastUpdated: '2025-06-01T10:00:00Z' },
  },
  social: {
    'twitter': { score: 35, position: 5, publications: 10, lastUpdated: '2025-06-01T10:00:00Z' },
  },
  headlinePatterns: {},
  dedupHashes: {},
});

// ── Mock data arriving from "APIs" ──────────────────────────────────
const entities: DiscoverEntity[] = [
  { name: 'Real Madrid', score: 85, score_decimal: 0.85, position: 1, publications: 32, firstviewed: '2025-06-01T12:00:00Z', lastviewed: '2025-06-01T14:00:00Z' },
  { name: 'Kylian Mbappe', score: 72, score_decimal: 0.72, position: 3, publications: 18, firstviewed: '2025-06-01T10:00:00Z', lastviewed: '2025-06-01T14:00:00Z' },
  { name: 'Pedro Sanchez', score: 5, score_decimal: 0.05, position: 50, publications: 1, firstviewed: '2025-06-01T14:00:00Z', lastviewed: '2025-06-01T14:00:00Z' },
];

const categories: DiscoverCategory[] = [
  { id: 1, name: 'Deportes', score: 88, score_decimal: 0.88, position: 1, publications: 48, firstviewed: '2025-01-01', lastviewed: '2025-06-01' },
];

const domains: DiscoverDomain[] = [
  { domain: 'marca.com', score: 70, score_decimal: 0.7, position: 1, publications: 40, firstviewed: '2025-06-01T12:00:00Z', lastviewed: '2025-06-01T14:00:00Z' },
  { domain: 'elpais.com', score: 65, score_decimal: 0.65, position: 2, publications: 35, firstviewed: '2025-01-01', lastviewed: '2025-06-01T14:00:00Z' },
];

const social: DiscoverSocial[] = [
  { channel: 'twitter', score: 80, score_decimal: 0.8, position: 1, publications: 30, firstviewed: '2025-01-01', lastviewed: '2025-06-01T14:00:00Z' },
  { channel: 'instagram', score: 25, score_decimal: 0.25, position: 3, publications: 8, firstviewed: '2025-06-01T13:00:00Z', lastviewed: '2025-06-01T14:00:00Z' },
];

const pages: DiscoverPage[] = [
  'Fichaje sorpresa del Barcelona para el verano',
  'Fichaje sorpresa en el Real Madrid confirmado',
  'Fichaje sorpresa del Atletico sacude LaLiga',
].map((title, i) => ({
  url: `https://example.com/page-${i}`,
  title,
  title_original: title,
  title_english: '',
  image: '',
  snippet: '',
  publisher: 'Marca',
  domain: 'marca.com',
  category: 'Deportes',
  story_type: 'article',
  score: 50 + i * 10,
  score_decimal: 0.5,
  position: i + 1,
  publications: 5,
  firstviewed: '2025-06-01T12:00:00Z',
  lastviewed: '2025-06-01T14:00:00Z',
  is_new: true,
  is_video: false,
  is_webstory: false,
  entities: ['Real Madrid'],
  ai_overviews: [],
}));

// ── Run Demo ────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(70));
console.log('  DISCOVER ALERTS — DEMO');
console.log('═'.repeat(70) + '\n');

// 1. Validate API response
console.log('━'.repeat(70));
console.log('  1. SCHEMA VALIDATION');
console.log('━'.repeat(70));
try {
  const mockApiResponse = { status: true, transaction_id: 'demo-123', transaction_state: 'completed', data: entities };
  validateApiResponse(mockApiResponse, '/liveentities');
  logger.info('API response validated OK');
} catch (err) {
  logger.error('Validation failed', { error: String(err) });
}
try {
  validateApiResponse({ bad: 'data' }, '/bad-endpoint');
} catch (err: any) {
  logger.warn('Expected validation failure caught', { error: err.message });
}

// 2. Retry demo
console.log('\n' + '━'.repeat(70));
console.log('  2. RETRY WITH BACKOFF');
console.log('━'.repeat(70));
let attempt = 0;
await withRetry(async () => {
  attempt++;
  if (attempt < 3) throw new Error('Simulated network error');
  return 'success';
}, 'demo-fetch', { maxAttempts: 3, baseDelayMs: 100 });
logger.info('Retry demo completed', { attempts: attempt });

// 3. Run detectors
console.log('\n' + '━'.repeat(70));
console.log('  3. RUNNING DETECTORS');
console.log('━'.repeat(70));

const alerts: Alert[] = [];

const entityAlerts = detectEntityAlerts(entities);
logger.info('Entity detector', { alerts: entityAlerts.length });
alerts.push(...entityAlerts);

const categoryAlerts = detectCategoryAlerts(categories);
logger.info('Category detector', { alerts: categoryAlerts.length });
alerts.push(...categoryAlerts);

const domainAlerts = detectDomainAlerts(domains);
logger.info('Domain detector', { alerts: domainAlerts.length });
alerts.push(...domainAlerts);

const socialAlerts = detectSocialAlerts(social);
logger.info('Social detector', { alerts: socialAlerts.length });
alerts.push(...socialAlerts);

const headlineAlerts = detectHeadlinePatterns(pages);
logger.info('Headline pattern detector', { alerts: headlineAlerts.length });
alerts.push(...headlineAlerts);

// 4. Dedup
console.log('\n' + '━'.repeat(70));
console.log('  4. DEDUPLICATION');
console.log('━'.repeat(70));
logger.info('Before dedup', { total: alerts.length });
const filtered = dedup(alerts);
logger.info('After dedup', { sent: filtered.length, suppressed: alerts.length - filtered.length });

// 5. Persist
persistAlerts(filtered);
const history = getState().alertHistory;
logger.info('Alert history persisted', { total: history.length });

// 6. Format for Slack
console.log('\n' + '━'.repeat(70));
console.log('  5. FORMATTED SLACK MESSAGES');
console.log('━'.repeat(70) + '\n');
const messages = formatAlerts(filtered);

for (const msg of messages) {
  for (const block of msg.blocks) {
    if (block.type === 'header') {
      console.log(`\n  ${block.text?.text}`);
    } else if (block.type === 'section' && block.text) {
      const lines = block.text.text.replace(/\*/g, '').split('\n');
      for (const line of lines) console.log(`    ${line}`);
    } else if (block.type === 'section' && block.fields) {
      for (const f of block.fields) console.log(`    ${f.text.replace(/\*/g, '')}`);
    } else if (block.type === 'context') {
      console.log(`    ─ ${block.elements?.[0]?.text.replace(/\*/g, '') ?? ''}`);
    } else if (block.type === 'divider') {
      console.log('  ──────────────────────────────────────');
    }
  }
}

// 7. Run dedup again to show suppression
console.log('\n' + '━'.repeat(70));
console.log('  6. DEDUP ON SECOND RUN (same alerts)');
console.log('━'.repeat(70));
const secondRun = dedup(alerts);
logger.info('Second dedup pass', { sent: secondRun.length, suppressed: alerts.length - secondRun.length });

console.log('\n' + '═'.repeat(70));
console.log('  DEMO COMPLETE');
console.log('═'.repeat(70) + '\n');

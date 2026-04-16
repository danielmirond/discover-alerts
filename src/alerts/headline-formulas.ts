import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Alert } from '../types.js';

/**
 * Diccionario editable (headline-formulas.json) que sugiere 2-3 fórmulas
 * de titular declarativas por cada alerta. El matching es jerárquico:
 * la regla más específica gana (type + subtype + topic > type + subtype >
 * type + topic > type). Se renderiza como un bloque `context` al final
 * del mensaje Slack para uso editorial.
 */

interface FormulaMatch {
  type: string;
  subtype?: string;
  topic?: string;
}

interface FormulaRule {
  match: FormulaMatch;
  lines: string[];
}

interface FormulasConfig {
  rules: FormulaRule[];
}

let cached: FormulasConfig | null = null;

export async function loadHeadlineFormulas(): Promise<FormulasConfig> {
  if (cached) return cached;
  const path = join(process.cwd(), process.env.HEADLINE_FORMULAS_PATH || 'headline-formulas.json');
  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw) as FormulasConfig;
    if (!Array.isArray(parsed.rules)) throw new Error('headline-formulas.json: missing rules[]');
    cached = parsed;
    console.log(`[formulas] Loaded ${parsed.rules.length} headline-formula rules from ${path}`);
    return parsed;
  } catch (err) {
    console.warn(`[formulas] Could not load ${path}, declarative suggestions disabled:`, (err as Error).message);
    cached = { rules: [] };
    return cached;
  }
}

/**
 * Especificidad: 3 si matchea subtype+topic, 2 si matchea uno, 1 si solo type.
 * Se queda con la regla de mayor especificidad cuyo `match` aplica a la alerta.
 */
function specificity(match: FormulaMatch): number {
  let n = 1; // type is always matched
  if (match.subtype) n++;
  if (match.topic) n++;
  return n;
}

function alertType(a: Alert): string { return a.type; }
function alertSubtype(a: Alert): string | undefined {
  return (a as any).subtype;
}
function alertTopic(a: Alert): string | undefined {
  return (a as any).topic;
}

function ruleMatches(rule: FormulaRule, a: Alert): boolean {
  if (rule.match.type !== alertType(a)) return false;
  if (rule.match.subtype && rule.match.subtype !== alertSubtype(a)) return false;
  if (rule.match.topic && rule.match.topic !== alertTopic(a)) return false;
  return true;
}

export async function pickFormulas(alert: Alert): Promise<string[]> {
  const cfg = await loadHeadlineFormulas();
  if (cfg.rules.length === 0) return [];

  let best: FormulaRule | null = null;
  let bestScore = 0;
  for (const r of cfg.rules) {
    if (!ruleMatches(r, alert)) continue;
    const s = specificity(r.match);
    if (s > bestScore) { best = r; bestScore = s; }
  }
  if (!best) return [];

  return best.lines.map(line => renderTemplate(line, alert)).slice(0, 3);
}

/**
 * Expande placeholders de la fórmula: {entity}, {category}, {topic}, {ngram},
 * {trend}, {count}, {outlets}, {traffic}. Si el placeholder no aplica al tipo
 * de alerta, se reemplaza por un string vacío.
 */
function renderTemplate(line: string, a: Alert): string {
  const values: Record<string, string> = {};

  // Per-type placeholder wiring
  switch (a.type) {
    case 'entity':
      values.entity = a.name;
      values.category = a.category || '';
      values.topic = a.topic || '';
      values.count = a.appearanceCount ? String(a.appearanceCount) : String(a.score - a.prevScore || '');
      break;
    case 'entity_coverage':
      values.entity = a.entityName;
      values.category = a.category || '';
      values.topic = a.topic || '';
      values.outlets = String(a.mediaOutlets.length);
      values.count = String(a.coverageCount);
      break;
    case 'own_media_absent':
      values.entity = a.entityName;
      values.category = a.category || '';
      values.topic = a.topic || '';
      values.outlets = String(a.otherOutlets.length);
      break;
    case 'entity_concordance':
      values.entity = a.entityName;
      values.category = a.category || '';
      values.topic = a.topic || '';
      break;
    case 'triple_match':
      values.entity = a.entityName;
      values.category = a.category || '';
      values.topic = a.topic || '';
      values.count = String(a.outletCount);
      values.outlets = String(a.outletCount);
      values.traffic = a.totalTrafficEstimate.toLocaleString();
      break;
    case 'multi_entity_article':
      values.entity = a.entities.slice(0, 2).join(' y ');
      values.category = a.category || '';
      values.topic = a.topic || '';
      break;
    case 'trends_without_discover':
      values.entity = a.trendTitle;
      values.trend = a.trendTitle;
      values.topic = a.topic || '';
      values.traffic = a.approxTraffic.toLocaleString();
      break;
    case 'headline_pattern':
      values.ngram = a.ngram;
      values.category = a.category || '';
      values.topic = a.topic || '';
      values.count = String(a.count);
      break;
    case 'headline_cluster':
      values.count = String(a.entitiesInCluster.length);
      values.entity = a.entitiesInCluster.slice(0, 3).join(', ');
      break;
    case 'category':
      values.entity = a.name;
      values.category = a.name;
      values.count = String(a.score - a.prevScore);
      break;
    case 'own_media':
      values.entity = a.title;
      values.category = a.category || '';
      values.topic = a.topic || '';
      break;
    // trends_correlation, trends_new_topic, stale_data: sin entidad canónica
    default:
      break;
  }

  return line.replace(/\{(\w+)\}/g, (_m, key: string) => values[key] ?? '');
}

/**
 * Construye el texto mrkdwn del bloque `context` con las fórmulas, o null
 * si no hay ninguna aplicable. Formato: cursivas + bullet, compacto.
 */
export async function buildFormulasContextText(alert: Alert): Promise<string | null> {
  const lines = await pickFormulas(alert);
  if (lines.length === 0) return null;
  const bullets = lines.map(l => `_• ${l}_`).join('\n');
  return `:pencil2: *Fórmulas sugeridas:*\n${bullets}`;
}

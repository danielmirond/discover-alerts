import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Alert } from '../types.js';

interface Route {
  name: string;
  categories: string[];
  /** Optional: match by topic (sucesos, legal, ...). Takes precedence over categories. */
  topics?: string[];
  webhookEnv: string;
}

interface RoutingConfig {
  routes: Route[];
}

let loaded = false;
let routes: Route[] = [];

async function loadRouting(): Promise<void> {
  if (loaded) return;
  try {
    const path = join(process.cwd(), 'routing.json');
    const raw = await readFile(path, 'utf-8');
    const config = JSON.parse(raw) as RoutingConfig;
    routes = config.routes || [];
    console.log(`[router] Loaded ${routes.length} routes from routing.json`);
  } catch (err) {
    console.warn('[router] No routing.json found, using default webhook only');
    routes = [];
  }
  loaded = true;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function getCategoryForAlert(alert: Alert): string | undefined {
  switch (alert.type) {
    case 'entity':
      return alert.category;
    case 'category':
      return alert.name;
    case 'headline_pattern':
      return alert.category;
    case 'entity_coverage':
      return alert.category;
    case 'entity_concordance':
      return alert.category;
    case 'own_media':
      return alert.category;
    case 'own_media_absent':
      return alert.category;
    case 'multi_entity_article':
      return alert.category;
    case 'trends_without_discover':
    case 'headline_cluster':
    case 'stale_data':
    case 'trends_correlation':
    case 'trends_new_topic':
      return undefined; // no category context
  }
}

/**
 * Extracts the topic tag (sucesos, legal, ...) from an alert if present.
 * Topics take precedence over categories in routing.
 */
function getTopicForAlert(alert: Alert): string | undefined {
  switch (alert.type) {
    case 'entity':
    case 'entity_coverage':
    case 'entity_concordance':
    case 'own_media':
    case 'own_media_absent':
    case 'multi_entity_article':
    case 'headline_pattern':
    case 'trends_without_discover':
      return (alert as any).topic;
    case 'category':
    case 'headline_cluster':
    case 'stale_data':
    case 'trends_correlation':
    case 'trends_new_topic':
      return undefined;
  }
}

function findRouteForTopic(topic: string | undefined): Route | null {
  if (!topic) return null;
  const topicNorm = normalize(topic);
  for (const route of routes) {
    if (!route.topics || route.topics.length === 0) continue;
    for (const rTopic of route.topics) {
      const rNorm = normalize(rTopic);
      if (topicNorm === rNorm) return route;
    }
  }
  return null;
}

function findRouteForCategory(category: string | undefined): Route | null {
  if (!category) return null;
  const catNorm = normalize(category);

  for (const route of routes) {
    for (const routeCat of route.categories) {
      const rNorm = normalize(routeCat);
      if (catNorm === rNorm || catNorm.includes(rNorm) || rNorm.includes(catNorm)) {
        return route;
      }
    }
  }
  return null;
}

export interface RoutedAlert {
  alert: Alert;
  webhookUrl: string;
  routeName: string;
}

export async function routeAlerts(alerts: Alert[]): Promise<RoutedAlert[]> {
  await loadRouting();
  const defaultWebhook = process.env.SLACK_WEBHOOK_URL;
  if (!defaultWebhook) {
    throw new Error('SLACK_WEBHOOK_URL env var is required as default fallback');
  }

  const result: RoutedAlert[] = [];
  for (const alert of alerts) {
    // Topic takes precedence over category: an entity tagged "legal" goes to
    // the Legal webhook even if DS categorised it as Sports/Entertainment.
    const topic = getTopicForAlert(alert);
    const category = getCategoryForAlert(alert);
    const route = findRouteForTopic(topic) || findRouteForCategory(category);

    if (route) {
      const url = process.env[route.webhookEnv];
      if (url) {
        result.push({ alert, webhookUrl: url, routeName: route.name });
        continue;
      } else {
        console.warn(
          `[router] Route "${route.name}" matched but env var ${route.webhookEnv} is empty, using default`,
        );
      }
    }

    result.push({ alert, webhookUrl: defaultWebhook, routeName: 'default' });
  }

  return result;
}

export function getRoutes(): Route[] {
  return routes;
}

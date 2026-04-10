import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Alert } from '../types.js';

interface Route {
  name: string;
  categories: string[];
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
    case 'trends_correlation':
    case 'trends_new_topic':
      return undefined; // no category context
  }
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
    const category = getCategoryForAlert(alert);
    const route = findRouteForCategory(category);

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

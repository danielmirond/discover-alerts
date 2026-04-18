import type { AppState, DiscoverEntity, DiscoverPage } from '../types.js';

export function cachedEntities(state: AppState): DiscoverEntity[] {
  return Object.entries(state.entities).map(([name, snap]) => ({
    name,
    score: snap.score,
    score_decimal: snap.scoreDecimal,
    position: snap.position,
    publications: snap.publications,
    firstviewed: snap.firstSeen,
    lastviewed: snap.lastUpdated,
  }));
}

export function cachedPages(state: AppState): DiscoverPage[] {
  return Object.entries(state.pages).map(([url, snap]) => ({
    url,
    title: snap.title,
    title_original: snap.title,
    title_english: '',
    image: '',
    snippet: '',
    publisher: '',
    domain: '',
    category: '',
    story_type: '',
    score: snap.score,
    score_decimal: 0,
    position: snap.position,
    publications: 0,
    firstviewed: '',
    lastviewed: snap.lastUpdated,
    is_new: false,
    is_video: false,
    is_webstory: false,
    entities: [],
    ai_overviews: [],
  }));
}

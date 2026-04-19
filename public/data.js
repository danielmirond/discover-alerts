// Fallback shape vacío — los datos reales llegan por adapter.js desde
// /api/live-alerts y /api/trends. Si el fetch falla, el dashboard muestra
// paneles vacíos en lugar de datos inventados (ruido visual engañoso).
window.DA_DATA = {
  now: new Date(),
  lastPoll: { discoversnoop: 0, trends: 0, media: 0, twitter: 0, meneame: 0, wikipedia: 0 },
  pollers: [
    { id: 'discoversnoop', label: 'DiscoverSnoop', cadence: 300,  last: 0, status: 'warn' },
    { id: 'trends',        label: 'Google Trends', cadence: 1800, last: 0, status: 'warn' },
    { id: 'media',         label: 'Media RSS',     cadence: 900,  last: 0, status: 'warn' },
    { id: 'twitter',       label: 'X/Twitter',     cadence: 1800, last: 0, status: 'warn' },
    { id: 'meneame',       label: 'Menéame',       cadence: 1200, last: 0, status: 'warn' },
    { id: 'wikipedia',     label: 'Wikipedia ES',  cadence: 900,  last: 0, status: 'warn' },
  ],
  alerts: [],
  gaps: [],
  entities: [],
  spikes: [],
  concordances: [],
  topMedia: [],
  formulas: [],
  headlinePatterns: [],
  weekly: [],
  trends: [],
};

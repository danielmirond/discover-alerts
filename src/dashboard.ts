import { createServer } from 'node:http';
import { fetchGoogleTrends } from './sources/google-trends.js';
import { readFile } from 'node:fs/promises';
import type { MediaFeed } from './types.js';

const PORT = 3333;

const FEEDS_PATH = new URL('../feeds.json', import.meta.url).pathname;

async function loadFeeds(): Promise<MediaFeed[]> {
  try {
    const raw = await readFile(FEEDS_PATH, 'utf-8');
    return JSON.parse(raw).feeds;
  } catch {
    return [];
  }
}

async function handleApi(path: string): Promise<object> {
  if (path === '/api/health') {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
  if (path === '/api/trends') {
    const trends = await fetchGoogleTrends();
    return { trends };
  }
  if (path === '/api/feeds') {
    const feeds = await loadFeeds();
    return { feeds };
  }
  return { error: 'not found' };
}

const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discover Alerts Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      min-height: 100vh;
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 24px 32px;
      border-bottom: 1px solid #2a2a4a;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header p {
      color: #888;
      margin-top: 4px;
      font-size: 14px;
    }
    .status-bar {
      display: flex;
      gap: 16px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .status-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.06);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4ade80;
      animation: pulse 2s infinite;
    }
    .dot.orange { background: #fb923c; }
    .dot.blue { background: #60a5fa; }
    .dot.purple { background: #a78bfa; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      overflow: hidden;
    }
    .card-header {
      padding: 16px 20px;
      border-bottom: 1px solid #2a2a2a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-header h2 {
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-body {
      padding: 16px 20px;
      max-height: 500px;
      overflow-y: auto;
    }
    .card-body::-webkit-scrollbar { width: 6px; }
    .card-body::-webkit-scrollbar-track { background: transparent; }
    .card-body::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    .badge {
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 12px;
      font-weight: 600;
    }
    .badge-green { background: rgba(74,222,128,0.15); color: #4ade80; }
    .badge-blue { background: rgba(96,165,250,0.15); color: #60a5fa; }
    .badge-orange { background: rgba(251,146,60,0.15); color: #fb923c; }
    .badge-purple { background: rgba(167,139,250,0.15); color: #a78bfa; }
    .badge-red { background: rgba(248,113,113,0.15); color: #f87171; }

    .trend-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid #222;
    }
    .trend-item:last-child { border-bottom: none; }
    .trend-rank {
      font-size: 12px;
      font-weight: 700;
      color: #555;
      width: 28px;
      text-align: center;
      flex-shrink: 0;
    }
    .trend-info { flex: 1; min-width: 0; }
    .trend-title {
      font-weight: 600;
      font-size: 14px;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .trend-traffic {
      font-size: 12px;
      color: #888;
      margin-top: 2px;
    }
    .trend-news {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .trend-news a { color: #60a5fa; text-decoration: none; }
    .trend-news a:hover { text-decoration: underline; }

    .feed-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #222;
    }
    .feed-item:last-child { border-bottom: none; }
    .feed-name {
      font-weight: 600;
      font-size: 14px;
      color: #fff;
      flex: 1;
    }

    .alert-item {
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 8px;
      border-left: 3px solid;
    }
    .alert-item:last-child { margin-bottom: 0; }
    .alert-entity { background: rgba(74,222,128,0.06); border-color: #4ade80; }
    .alert-category { background: rgba(96,165,250,0.06); border-color: #60a5fa; }
    .alert-headline { background: rgba(251,146,60,0.06); border-color: #fb923c; }
    .alert-correlation { background: rgba(167,139,250,0.06); border-color: #a78bfa; }
    .alert-media { background: rgba(248,113,113,0.06); border-color: #f87171; }
    .alert-type {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .alert-title {
      font-weight: 600;
      font-size: 14px;
      color: #fff;
    }
    .alert-detail {
      font-size: 13px;
      color: #888;
      margin-top: 4px;
    }

    .full-width { grid-column: 1 / -1; }
    .loading {
      text-align: center;
      padding: 40px;
      color: #555;
    }
    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid #333;
      border-top: 3px solid #60a5fa;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 8px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .config-section {
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      padding: 16px;
      margin-top: 12px;
    }
    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
    }
    .config-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .config-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .config-value { font-size: 14px; color: #fff; font-weight: 600; font-family: 'SF Mono', monospace; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📡 Discover Alerts</h1>
    <p>Monitorizacion en tiempo real de Google Discover, Google Trends y medios RSS para Espana</p>
    <div class="status-bar">
      <div class="status-pill"><div class="dot"></div> DiscoverSnoop (5 min)</div>
      <div class="status-pill"><div class="dot blue"></div> Google Trends (30 min)</div>
      <div class="status-pill"><div class="dot orange"></div> Media RSS (15 min)</div>
      <div class="status-pill"><div class="dot purple"></div> Slack Webhook</div>
    </div>
  </div>

  <div class="container">
    <!-- Config overview -->
    <div class="card full-width" style="margin-bottom: 20px;">
      <div class="card-header">
        <h2>⚙️ Configuracion</h2>
      </div>
      <div class="card-body">
        <div class="config-grid">
          <div class="config-item">
            <span class="config-label">Pais</span>
            <span class="config-value">ES (Espana)</span>
          </div>
          <div class="config-item">
            <span class="config-label">Ventana Discover</span>
            <span class="config-value">6 horas</span>
          </div>
          <div class="config-item">
            <span class="config-label">Threshold Entidad</span>
            <span class="config-value">+20 score</span>
          </div>
          <div class="config-item">
            <span class="config-label">Threshold Categoria</span>
            <span class="config-value">+15 score / +50% pubs</span>
          </div>
          <div class="config-item">
            <span class="config-label">Min Patron Titular</span>
            <span class="config-value">3 repeticiones</span>
          </div>
          <div class="config-item">
            <span class="config-label">Threshold Dominio</span>
            <span class="config-value">+20 score / +50% pubs</span>
          </div>
          <div class="config-item">
            <span class="config-label">Threshold Canal Social</span>
            <span class="config-value">+20 score / +50% pubs</span>
          </div>
          <div class="config-item">
            <span class="config-label">Correlacion Min</span>
            <span class="config-value">60% similitud</span>
          </div>
          <div class="config-item">
            <span class="config-label">Ventana Dedup</span>
            <span class="config-value">6 horas</span>
          </div>
          <div class="config-item">
            <span class="config-label">Max resultados/poll</span>
            <span class="config-value">100 por endpoint</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid">
      <!-- Google Trends -->
      <div class="card">
        <div class="card-header">
          <h2>🔥 Google Trends ES</h2>
          <span class="badge badge-green" id="trends-count">Cargando...</span>
        </div>
        <div class="card-body" id="trends-list">
          <div class="loading"><div class="spinner"></div><br>Cargando tendencias...</div>
        </div>
      </div>

      <!-- Media Feeds -->
      <div class="card">
        <div class="card-header">
          <h2>📰 Feeds RSS Configurados</h2>
          <span class="badge badge-blue" id="feeds-count">Cargando...</span>
        </div>
        <div class="card-body" id="feeds-list">
          <div class="loading"><div class="spinner"></div><br>Cargando feeds...</div>
        </div>
      </div>

      <!-- Sample Alerts -->
      <div class="card full-width">
        <div class="card-header">
          <h2>🔔 Tipos de Alerta (ejemplo)</h2>
          <span class="badge badge-purple">8 tipos</span>
        </div>
        <div class="card-body" id="alerts-list">
          <div class="alert-item alert-entity">
            <div class="alert-type" style="color: #4ade80;">🆕 Nueva entidad</div>
            <div class="alert-title">Real Madrid</div>
            <div class="alert-detail">Score: 87 | Posicion: #3 | Publicaciones: 24 | Primera aparicion: hace 2h</div>
          </div>
          <div class="alert-item alert-entity">
            <div class="alert-type" style="color: #4ade80;">📈 Entidad en subida</div>
            <div class="alert-title">Kylian Mbappe</div>
            <div class="alert-detail">Score: 72 (+35) | Posicion: #5 (era #18) | Publicaciones: 16</div>
          </div>
          <div class="alert-item alert-category">
            <div class="alert-type" style="color: #60a5fa;">📊 Spike en categoria</div>
            <div class="alert-title">Deportes</div>
            <div class="alert-detail">Score +22 (de 65 a 87) | Publicaciones: 48 (+60%) | Posicion: #1 (era #4)</div>
          </div>
          <div class="alert-item alert-entity">
            <div class="alert-type" style="color: #4ade80;">🌐 Nuevo dominio</div>
            <div class="alert-title">marca.com</div>
            <div class="alert-detail">Score: 65 | Posicion: #2 | Publicaciones: 32</div>
          </div>
          <div class="alert-item alert-category">
            <div class="alert-type" style="color: #60a5fa;">📢 Spike en canal social</div>
            <div class="alert-title">twitter</div>
            <div class="alert-detail">Score: 80 (+40) | Posicion: #1 (era #5) | Publicaciones: 45 (+80%)</div>
          </div>
          <div class="alert-item alert-headline">
            <div class="alert-type" style="color: #fb923c;">📰 Patron de titular</div>
            <div class="alert-title">"fichaje sorpresa"</div>
            <div class="alert-detail">Encontrado en 5 titulos: "El fichaje sorpresa del Barcelona...", "Fichaje sorpresa en el Real Madrid...", ...</div>
          </div>
          <div class="alert-item alert-correlation">
            <div class="alert-type" style="color: #a78bfa;">🔗 Trends ↔ Discover</div>
            <div class="alert-title">Mbappe (Google Trends) → Kylian Mbappe (Discover)</div>
            <div class="alert-detail">Trafico: 200,000+ | Similitud: 89% | 8 paginas mencionan "Mbappe"</div>
          </div>
          <div class="alert-item alert-media">
            <div class="alert-type" style="color: #f87171;">📡 Medio ↔ Discover</div>
            <div class="alert-title">Marca: "Mbappe confirma su fichaje por..."</div>
            <div class="alert-detail">Entidades Discover: Kylian Mbappe, Real Madrid | Similitud: 92% | Deportivo</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function loadTrends() {
      try {
        const res = await fetch('/api/trends');
        const { trends } = await res.json();
        document.getElementById('trends-count').textContent = trends.length + ' trending';
        const html = trends.map((t, i) => {
          const newsHtml = t.newsItems.length > 0
            ? '<div class="trend-news">' + t.newsItems.slice(0,1).map(n => '<a href="' + n.url + '" target="_blank">' + n.title + '</a> (' + n.source + ')').join('') + '</div>'
            : '';
          return '<div class="trend-item">' +
            '<div class="trend-rank">#' + (i+1) + '</div>' +
            '<div class="trend-info">' +
              '<div class="trend-title">' + t.title + '</div>' +
              '<div class="trend-traffic">' + (t.approxTraffic > 0 ? t.approxTraffic.toLocaleString() + '+ busquedas' : '') + '</div>' +
              newsHtml +
            '</div></div>';
        }).join('');
        document.getElementById('trends-list').innerHTML = html;
      } catch(e) {
        document.getElementById('trends-list').innerHTML = '<div class="loading">Error cargando trends</div>';
      }
    }

    async function loadFeeds() {
      try {
        const res = await fetch('/api/feeds');
        const { feeds } = await res.json();
        document.getElementById('feeds-count').textContent = feeds.length + ' feeds';

        const cats = {};
        feeds.forEach(f => {
          if (!cats[f.category]) cats[f.category] = [];
          cats[f.category].push(f);
        });

        const badgeClass = {
          'generalista': 'badge-green',
          'deportivo': 'badge-orange',
          'tech-marketing': 'badge-purple'
        };

        let html = '';
        for (const [cat, list] of Object.entries(cats)) {
          html += '<div style="margin-bottom:12px">';
          html += '<div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' + cat + '</div>';
          list.forEach(f => {
            html += '<div class="feed-item">' +
              '<span class="feed-name">' + f.name + '</span>' +
              '<span class="badge ' + (badgeClass[cat] || 'badge-blue') + '">' + cat + '</span>' +
            '</div>';
          });
          html += '</div>';
        }
        document.getElementById('feeds-list').innerHTML = html;
      } catch(e) {
        document.getElementById('feeds-list').innerHTML = '<div class="loading">Error cargando feeds</div>';
      }
    }

    loadTrends();
    loadFeeds();
  </script>
</body>
</html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname.startsWith('/api/')) {
    try {
      const data = await handleApi(url.pathname);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});

server.listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
});

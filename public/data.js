// Realistic ES newsroom data — April 2026
window.DA_DATA = {
  now: new Date(),
  lastPoll: { discoversnoop: 47, trends: 12, media: 190, twitter: 18, meneame: 8, wikipedia: 230 }, // seconds ago
  pollers: [
    { id: 'discoversnoop', label: 'DiscoverSnoop', cadence: 300, last: 47, status: 'ok' },
    { id: 'trends', label: 'Google Trends', cadence: 1800, last: 12, status: 'ok' },
    { id: 'media', label: 'Media RSS', cadence: 900, last: 190, status: 'ok' },
    { id: 'twitter', label: 'X/Twitter', cadence: 1800, last: 18, status: 'ok' },
    { id: 'meneame', label: 'Menéame', cadence: 1200, last: 8, status: 'ok' },
    { id: 'wikipedia', label: 'Wikipedia ES', cadence: 900, last: 230, status: 'warn' },
  ],

  alerts: [
    {
      id: 'a1', ts: '14:32:04', ago: 'hace 12s',
      type: 'triple_match', typeLabel: 'TRIPLE MATCH',
      velocity: 'rising', velocityRatio: 3.4,
      category: 'Política', channel: '#discover-politica',
      entity: 'Pedro Sánchez',
      headline: 'Pedro Sánchez comparece en el Congreso tras la filtración del informe de la UCO',
      snippet: 'El presidente del Gobierno defenderá ante el pleno su posición sobre los últimos movimientos judiciales…',
      discoverScore: 94, feedPos: 2, publications: 41,
      sources: { discover: true, trends: true, twitter: true, media: 41, meneame: false, wikipedia: false },
      image: { ok: true, w: 1920, h: 1080, ratio: '16:9' },
      formulas: [
        'Sánchez rompe el silencio sobre el informe de la UCO: estas son sus tres claves',
        'La UCO aprieta a Sánchez en el Congreso: qué ha dicho y qué viene ahora',
        'Por qué la comparecencia de Sánchez de hoy cambia el escenario político'
      ],
      related: ['UCO', 'Congreso', 'Moncloa']
    },
    {
      id: 'a2', ts: '14:31:48', ago: 'hace 28s',
      type: 'discover_1h', typeLabel: 'DISCOVER 1H',
      velocity: 'peaking', velocityRatio: 1.8,
      category: 'Deportes', channel: '#discover-deportes',
      entity: 'Lamine Yamal',
      headline: 'Lamine Yamal estalla en rueda de prensa: "No voy a responder a eso"',
      snippet: 'El extremo del Barça protagonizó un tenso intercambio con un periodista al ser preguntado por su vida privada…',
      discoverScore: 88, feedPos: 1, publications: 27,
      sources: { discover: true, trends: true, twitter: true, media: 27, meneame: true, wikipedia: false },
      image: { ok: true, w: 1600, h: 900, ratio: '16:9' },
      formulas: [
        'Lamine Yamal, harto en rueda de prensa: el momento que ya da la vuelta al mundo',
        'La frase de Lamine Yamal que enciende el vestuario del Barça',
        'Qué hay detrás del enfado de Lamine Yamal en sala de prensa'
      ],
      related: ['FC Barcelona', 'La Liga', 'Xavi']
    },
    {
      id: 'a3', ts: '14:30:12', ago: 'hace 2m',
      type: 'trends_without_discover', typeLabel: 'HUECO SEO',
      velocity: 'rising', velocityRatio: 4.2,
      category: 'Sucesos', channel: '#discover-sucesos',
      entity: 'DANA Valencia',
      headline: 'Aviso rojo por lluvias torrenciales en Valencia y Castellón',
      snippet: 'La AEMET activa el nivel máximo en el litoral mediterráneo. Protección Civil recomienda no viajar…',
      discoverScore: null, feedPos: null, publications: 8,
      sources: { discover: false, trends: true, twitter: true, media: 8, meneame: true, wikipedia: true },
      image: { ok: false, w: 1024, h: 576, ratio: '16:9', reason: 'resolución <1200px' },
      formulas: [
        'AEMET activa el aviso rojo: las zonas de Valencia más castigadas esta tarde',
        'Así se está preparando Valencia para la tromba: cortes, avisos y recomendaciones',
        'Qué dice la AEMET y qué hacer si vives en la costa valenciana esta noche'
      ],
      related: ['AEMET', 'Valencia', 'Protección Civil'],
      gap: true
    },
    {
      id: 'a4', ts: '14:28:55', ago: 'hace 4m',
      type: 'wikipedia_surge', typeLabel: 'WIKIPEDIA SURGE',
      velocity: 'rising', velocityRatio: 8.1,
      category: 'Entretenimiento', channel: '#discover-entretenimiento',
      entity: 'Rosalía',
      headline: 'Rosalía anuncia por sorpresa las fechas de su gira mundial 2026',
      snippet: 'La artista catalana desveló en sus redes un calendario que incluye cinco conciertos en España…',
      discoverScore: 72, feedPos: 6, publications: 19,
      sources: { discover: true, trends: true, twitter: true, media: 19, meneame: false, wikipedia: true },
      image: { ok: true, w: 2048, h: 1152, ratio: '16:9' },
      formulas: [
        'Gira mundial de Rosalía 2026: fechas, ciudades y cómo conseguir entradas',
        'Rosalía vuelve a los estadios: el calendario completo que acaba de anunciar',
        'Todo lo que sabemos del regreso de Rosalía a los grandes escenarios'
      ],
      related: ['Motomami', 'Madrid', 'Barcelona']
    },
    {
      id: 'a5', ts: '14:27:30', ago: 'hace 5m',
      type: 'meneame_hot', typeLabel: 'MENÉAME HOT',
      velocity: 'rising', velocityRatio: 2.6,
      category: 'Tecnología', channel: '#discover-tecnologia',
      entity: 'OpenAI',
      headline: 'OpenAI retira temporalmente GPT-6 tras detectar un fallo en respuestas financieras',
      snippet: 'La compañía reconoce que el modelo "ha tenido comportamientos inesperados" en consultas sobre inversiones…',
      discoverScore: null, feedPos: null, publications: 3,
      sources: { discover: false, trends: false, twitter: true, media: 3, meneame: true, wikipedia: false },
      image: null,
      formulas: [
        'OpenAI frena GPT-6: qué ha pasado y a quién afecta',
        'El bug que ha obligado a OpenAI a retirar su último modelo',
        'GPT-6 en pausa: esto es lo que ha reconocido la empresa'
      ],
      related: ['GPT-6', 'Sam Altman', 'IA'],
      firstMover: true
    },
    {
      id: 'a6', ts: '14:25:11', ago: 'hace 7m',
      type: 'entity_concordance', typeLabel: 'CONCORDANCIA',
      velocity: 'steady', velocityRatio: 1.1,
      category: 'Economía', channel: '#discover-economia',
      entity: 'BCE',
      headline: 'El BCE mantendrá los tipos en el 2,25% pese a la presión de Berlín',
      snippet: 'Lagarde evitará una nueva rebaja antes del verano, según fuentes del consejo…',
      discoverScore: 67, feedPos: 11, publications: 14,
      sources: { discover: true, trends: true, twitter: false, media: 14, meneame: false, wikipedia: false },
      image: { ok: true, w: 1440, h: 810, ratio: '16:9' },
      formulas: [
        'El BCE aguanta: qué significa para tu hipoteca esta decisión',
        'Lagarde no mueve ficha: los motivos detrás del golpe sobre la mesa del BCE',
        'Tipos al 2,25%: lo que cambia (y lo que no) para bolsillos españoles'
      ],
      related: ['Lagarde', 'Hipotecas', 'Euríbor']
    },
    {
      id: 'a7', ts: '14:22:04', ago: 'hace 10m',
      type: 'us_relevant', typeLabel: 'USA CON CABIDA',
      velocity: 'rising', velocityRatio: 5.0,
      category: 'Default', channel: '#discover-default',
      entity: 'SpaceX Starship',
      headline: 'SpaceX lanza con éxito su primera misión tripulada a Marte',
      snippet: 'El despegue desde Boca Chica marca un hito en la exploración espacial privada…',
      discoverScore: 81, feedPos: 3, publications: 0,
      sources: { discover: true, trends: true, twitter: true, media: 0, meneame: true, wikipedia: true },
      image: { ok: true, w: 3000, h: 1687, ratio: '16:9' },
      formulas: [
        'SpaceX pone rumbo a Marte: así ha sido el lanzamiento histórico',
        'Despega la primera misión tripulada a Marte: qué esperar en los próximos días',
        'De Boca Chica a Marte: las claves del viaje que cambia la era espacial'
      ],
      related: ['Elon Musk', 'NASA', 'Marte']
    },
    {
      id: 'a8', ts: '14:19:40', ago: 'hace 13m',
      type: 'headline_pattern', typeLabel: 'PATRÓN TITULAR',
      velocity: 'steady', velocityRatio: 1.0,
      category: 'Salud', channel: '#discover-default',
      entity: 'Ozempic',
      headline: 'Los endocrinos alertan: el patrón "X dijo Y sobre Z" domina titulares sobre Ozempic',
      snippet: 'Análisis interno: 17 de los últimos 23 titulares ganadores sobre Ozempic siguen la fórmula declarativa…',
      discoverScore: 55, feedPos: 18, publications: 23,
      sources: { discover: true, trends: false, twitter: false, media: 23, meneame: false, wikipedia: false },
      image: { ok: true, w: 1920, h: 1080, ratio: '16:9' },
      formulas: [
        'Lo que dicen los endocrinos sobre Ozempic (y lo que callan)',
        'Ozempic: la advertencia de los médicos que no puedes ignorar',
        'Tres cosas que los especialistas quieren que sepas antes de pedir Ozempic'
      ],
      related: ['Semaglutida', 'SEEN', 'Diabetes']
    },
  ],

  gaps: [
    { kind: 'HUECO SEO', entity: 'DANA Valencia', score: 92, detail: '4 medios, 0 en Discover · Trends +412%', ago: '2m' },
    { kind: 'NO CUBRIMOS', entity: 'Huelga transporte Madrid', score: 78, detail: 'En Discover desde hace 47m · 0 propias', ago: '47m' },
    { kind: 'TRIPLE MATCH', entity: 'Declaración Renta 2025', score: 71, detail: 'Discover + Trends + X · 12 propias', ago: '1h' },
    { kind: 'USA→ES', entity: 'Huelga guionistas Hollywood', score: 64, detail: 'US Discover top 5 · relevancia ES alta', ago: '22m' },
    { kind: 'HUECO SEO', entity: 'Precio gasolina Semana Santa', score: 59, detail: '2 medios, Trends +180%', ago: '15m' },
    { kind: 'NO CUBRIMOS', entity: 'Real Madrid vs City', score: 55, detail: 'Cobertura masiva · 0 propias', ago: '33m' },
  ],

  entities: [
    { name: 'Pedro Sánchez', momentum: 94, trend: 'up', delta: '+34', mentions: 287, cat: 'Política' },
    { name: 'Lamine Yamal', momentum: 88, trend: 'up', delta: '+22', mentions: 241, cat: 'Deportes' },
    { name: 'DANA Valencia', momentum: 86, trend: 'up', delta: '+78', mentions: 94, cat: 'Sucesos' },
    { name: 'Rosalía', momentum: 79, trend: 'up', delta: '+41', mentions: 156, cat: 'Entretenimiento' },
    { name: 'BCE', momentum: 67, trend: 'flat', delta: '+2', mentions: 88, cat: 'Economía' },
    { name: 'SpaceX Starship', momentum: 81, trend: 'up', delta: '+50', mentions: 73, cat: 'Tech' },
    { name: 'Ozempic', momentum: 55, trend: 'down', delta: '-8', mentions: 64, cat: 'Salud' },
    { name: 'Eurovisión 2026', momentum: 48, trend: 'up', delta: '+12', mentions: 52, cat: 'Entretenimiento' },
    { name: 'Mercadona', momentum: 44, trend: 'flat', delta: '0', mentions: 71, cat: 'Economía' },
    { name: 'Feijóo', momentum: 41, trend: 'down', delta: '-12', mentions: 98, cat: 'Política' },
  ],

  topMedia: [
    { name: 'Marca', pubs: 142, share: 8.4, delta: '+12', cat: 'Deportes' },
    { name: 'El País', pubs: 128, share: 7.6, delta: '+4', cat: 'Generalista' },
    { name: 'ABC', pubs: 114, share: 6.7, delta: '-3', cat: 'Generalista' },
    { name: 'La Vanguardia', pubs: 98, share: 5.8, delta: '+8', cat: 'Generalista' },
    { name: 'OK Diario', pubs: 87, share: 5.1, delta: '+21', cat: 'Generalista' },
    { name: 'El Mundo', pubs: 84, share: 4.9, delta: '+1', cat: 'Generalista' },
    { name: '20 Minutos', pubs: 76, share: 4.5, delta: '-2', cat: 'Generalista' },
    { name: 'AS', pubs: 71, share: 4.2, delta: '+5', cat: 'Deportes' },
    { name: 'La Razón', pubs: 64, share: 3.8, delta: '+6', cat: 'Generalista' },
    { name: 'ElDiario.es', pubs: 58, share: 3.4, delta: '+9', cat: 'Generalista' },
  ],

  formulas: [
    { id: 'f1', pattern: '[Entidad] rompe el silencio: "[cita]"', vertical: 'Política', uses: 34, avgReach: 187000, tier: 'winner' },
    { id: 'f2', pattern: 'Así es [entidad]: [3 cosas]', vertical: 'Entretenimiento', uses: 28, avgReach: 142000, tier: 'viral' },
    { id: 'f3', pattern: '[Entidad] estalla en [lugar]: "[cita]"', vertical: 'Deportes', uses: 24, avgReach: 221000, tier: 'viral' },
    { id: 'f4', pattern: 'Qué hay detrás de [evento] (y qué no te están contando)', vertical: 'Política', uses: 22, avgReach: 98000, tier: 'winner' },
    { id: 'f5', pattern: '[Entidad] ya no esconde [hecho]: esto es lo que ha dicho', vertical: 'Entretenimiento', uses: 19, avgReach: 165000, tier: 'viral' },
    { id: 'f6', pattern: 'AEMET activa [aviso]: las zonas más afectadas', vertical: 'Sucesos', uses: 18, avgReach: 310000, tier: 'viral' },
    { id: 'f7', pattern: 'Lo que cambia para tu [bolsillo/hipoteca/nómina] tras [decisión]', vertical: 'Economía', uses: 17, avgReach: 128000, tier: 'winner' },
    { id: 'f8', pattern: 'Tres cosas que [expertos] quieren que sepas sobre [tema]', vertical: 'Salud', uses: 15, avgReach: 88000, tier: 'winner' },
  ],

  spikes: [
    { cat: 'Sucesos', delta: 412, baseline: 23, current: 118 },
    { cat: 'Política', delta: 187, baseline: 41, current: 118 },
    { cat: 'Deportes', delta: 92, baseline: 78, current: 150 },
    { cat: 'Tech', delta: 64, baseline: 27, current: 44 },
    { cat: 'Entretenimiento', delta: 41, baseline: 52, current: 73 },
    { cat: 'Economía', delta: -8, baseline: 34, current: 31 },
    { cat: 'Salud', delta: -14, baseline: 19, current: 16 },
  ],

  concordances: [
    { entity: 'Pedro Sánchez', discover: true, trends: true, twitter: true, media: 41, score: 94 },
    { entity: 'Lamine Yamal', discover: true, trends: true, twitter: true, media: 27, score: 88 },
    { entity: 'DANA Valencia', discover: false, trends: true, twitter: true, media: 8, score: 71 },
    { entity: 'Rosalía', discover: true, trends: true, twitter: true, media: 19, score: 79 },
    { entity: 'SpaceX', discover: true, trends: true, twitter: true, media: 0, score: 81 },
    { entity: 'BCE', discover: true, trends: true, twitter: false, media: 14, score: 67 },
  ],

  headlinePatterns: [
    { pattern: '[Entidad] + verbo declarativo + cita', share: 23, delta: '+4' },
    { pattern: 'Pregunta retórica: ¿Por qué…?', share: 18, delta: '-2' },
    { pattern: 'Número + lista ("3 claves", "5 razones")', share: 14, delta: '+1' },
    { pattern: '"Así es/Así fue…" + evento', share: 12, delta: '+3' },
    { pattern: 'Advertencia: "[experto] alerta de…"', share: 9, delta: '+2' },
    { pattern: 'Contraste: "X, no Y"', share: 7, delta: '0' },
  ],

  weekly: [
    { medium: 'Marca', w: [120, 134, 128, 142, 138, 145, 142] },
    { medium: 'El País', w: [98, 112, 108, 120, 115, 125, 128] },
    { medium: 'ABC', w: [88, 94, 102, 110, 108, 118, 114] },
    { medium: 'La Vanguardia', w: [72, 80, 85, 90, 92, 95, 98] },
    { medium: 'OK Diario', w: [54, 62, 68, 75, 78, 82, 87] },
    { medium: 'El Mundo', w: [78, 81, 85, 88, 82, 85, 84] },
  ],
};

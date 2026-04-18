// Configuracion central del medio. Cambia aqui nombre, dominio y branding.
// Todos los componentes y metadatos leen de esta constante.

export const siteConfig = {
  name: 'Radar BOE',
  shortName: 'Radar BOE',
  description:
    'Lo que el BOE publica hoy y por qué te afecta. Resumen diario y noticias con contexto sobre lo que cambia en tu nomina, tu calendario y tu vida cotidiana.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://radarboe.es',
  locale: 'es-ES',
  language: 'es',
  defaultOgImage: '/og-default.png',

  // Visible "publisher" para Schema.org NewsArticle.
  publisher: {
    name: 'Radar BOE',
    logo: '/logo.png',
  },

  // Redaccion: somos transparentes sobre la generacion asistida por IA.
  authors: [
    {
      slug: 'redaccion-radar-boe',
      name: 'Redacción Radar BOE',
      role: 'Equipo editorial',
      bio: 'Equipo editorial de Radar BOE. Producimos resumenes diarios del Boletin Oficial del Estado y noticias con enfoque ciudadano. La redaccion es asistida por inteligencia artificial y revisada por editores humanos antes de publicar.',
      longBio:
        'Radar BOE nace con una conviccion sencilla: el Boletin Oficial del Estado toma decisiones que afectan a millones de personas cada dia, pero su lenguaje y formato lo hacen ilegible para el ciudadano medio. Nuestra mision es traducir esa actividad oficial a noticias claras, con foco en el impacto real sobre la nomina, el calendario, la vivienda y la vida cotidiana. Trabajamos con fuentes primarias exclusivamente, enlazamos cada afirmacion al PDF oficial correspondiente y declaramos de forma visible el uso de inteligencia artificial en la redaccion.',
      email: 'redaccion@radarboe.es',
      specialties: [
        'Interpretacion del Boletin Oficial del Estado',
        'Normativa laboral y fiscal espanola',
        'Derecho administrativo con impacto ciudadano',
      ],
      methodology: [
        'Lectura diaria integra del sumario del BOE.',
        'Seleccion por impacto ciudadano (no por volumen).',
        'Fuentes primarias exclusivamente (PDF oficial enlazado).',
        'Revision editorial humana antes de cada publicacion.',
        'Correccion publica y trazabilidad de cambios.',
      ],
    },
  ],

  social: {
    twitter: '@radarboe',
  },

  // Disclaimer de IA visible en cada articulo.
  aiDisclosure:
    'Este articulo ha sido redactado con asistencia de inteligencia artificial sobre fuentes oficiales del Boletin Oficial del Estado y revisado editorialmente antes de publicar.',
};

export type SiteConfig = typeof siteConfig;

// Paleta de color por categoria de dolor. Se usa en:
//  - Hero auto-generado de cada articulo
//  - Chip visual en tarjetas y paginas de tag
//  - OG image dinamica
export const PAIN_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  nomina:        { bg: '#059669', fg: '#ffffff', label: 'Nomina' },
  precios:       { bg: '#ea580c', fg: '#ffffff', label: 'Precios' },
  'tiempo-libre':{ bg: '#0284c7', fg: '#ffffff', label: 'Tiempo libre' },
  vivienda:      { bg: '#7c3aed', fg: '#ffffff', label: 'Vivienda' },
  horarios:      { bg: '#0891b2', fg: '#ffffff', label: 'Horarios' },
  prohibiciones: { bg: '#dc2626', fg: '#ffffff', label: 'Prohibiciones' },
  obligaciones:  { bg: '#ca8a04', fg: '#0a0a0a', label: 'Obligaciones' },
  molestias:     { bg: '#db2777', fg: '#ffffff', label: 'Molestias' },
  ayudas:        { bg: '#10b981', fg: '#ffffff', label: 'Ayudas' },
  oposiciones:   { bg: '#4f46e5', fg: '#ffffff', label: 'Oposiciones' },
  pensiones:     { bg: '#0d9488', fg: '#ffffff', label: 'Pensiones' },
  movilidad:     { bg: '#475569', fg: '#ffffff', label: 'Movilidad' },
  sanidad:       { bg: '#65a30d', fg: '#ffffff', label: 'Sanidad' },
  otros:         { bg: '#0a0a0a', fg: '#fafafa', label: 'Otros' },
};

export function painColor(pain: string) {
  return PAIN_COLORS[pain] ?? PAIN_COLORS.otros;
}

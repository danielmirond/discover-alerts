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
      bio: 'Equipo editorial de Radar BOE. Producimos resumenes diarios del Boletin Oficial del Estado y noticias con enfoque ciudadano. La redaccion es asistida por inteligencia artificial y revisada por editores humanos antes de publicar.',
      email: 'redaccion@radarboe.es',
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

// Tipos del frontmatter de los articulos. Define el contrato entre
// el LLM generator y el sitio. Todo articulo .md debe cumplir esto.

export type ArticleType = 'boe-brief' | 'noticia';

// El "dolor" del lector que toca el articulo. Eje editorial central:
// si un articulo no toca un dolor, no se publica.
export type PainCategory =
  | 'nomina'        // dinero en la nomina, IRPF, deducciones
  | 'precios'       // precios cotidianos (luz, butano, tabaco...)
  | 'tiempo-libre'  // festivos, puentes, calendario laboral
  | 'vivienda'      // comunidad de vecinos, alquiler, propiedad
  | 'horarios'      // cambio hora, jornada, horarios oficiales
  | 'prohibiciones' // que ya no puedes hacer
  | 'obligaciones'  // que ahora tienes que hacer
  | 'molestias'     // acoso telefonico, ruidos, spam
  | 'ayudas'        // subsidios, IMV, prestaciones
  | 'oposiciones'   // empleo publico, plazas
  | 'pensiones'     // jubilacion, pension
  | 'movilidad'     // trafico, carnet, vehiculos
  | 'sanidad'       // salud publica, alertas sanitarias
  | 'otros';

export interface BoeSourceItem {
  identificador: string; // BOE-A-2026-1234
  titulo: string;
  url: string; // urlPdf o urlHtml
  departamento: string;
  seccion: string;
}

export interface ArticleFrontmatter {
  // Identificacion
  type: ArticleType;
  slug: string;
  title: string;        // titular optimizado para Discover
  description: string;  // 140-160 chars, gancho del dolor
  date: string;         // ISO 8601 con timezone
  updated?: string;     // ISO 8601, si revisado posteriormente

  // SEO
  heroImage?: string;
  heroAlt?: string;

  // Editorial
  author: string;       // slug del autor (de site-config)
  pain: PainCategory;   // dolor que toca
  painHook: string;     // frase corta que articula el dolor concreto
  tags: string[];

  // Trazabilidad / E-E-A-T
  sources: BoeSourceItem[];
  aiGenerated: boolean;
  aiModel?: string;     // 'claude-sonnet-4-6'
  reviewedBy?: string;  // nombre del editor humano

  // Solo para boe-brief
  boeDate?: string;     // YYYY-MM-DD
  itemsCount?: number;
}

export interface Article {
  frontmatter: ArticleFrontmatter;
  body: string;         // markdown raw
  html: string;         // body renderizado
  readingMinutes: number;
}

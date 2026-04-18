# Aevum — Precision Longevity

Plataforma multilingüe de longevidad de precisión en **4 idiomas** (ES · EN · FR · DE).

Protocolos, biomarcadores y tecnología de optimización humana analizada con rigor científico. Sin humo, sin promesas milagro.

## Personalidad

- **Precisa, sobria, científica, premium**
- **Tono**: autoridad tranquila
- **Evitar**: estética crypto, biohacker caricaturesco, transhumanismo kitsch, claims pseudocientíficos

## Stack

- **Next.js 15** App Router + SSG
- **next-intl** para i18n con routing por locale (`/es/`, `/en/`, `/fr/`, `/de/`)
- **MDX** con `gray-matter` y `reading-time` para artículos
- **Tailwind CSS** con tema editorial (blanco + ivory + emerald + bronze)
- **Beehiiv** para newsletter ("Aevum Briefing")
- **Amazon Associates** para afiliación

## Componentes editoriales

| Componente | Uso |
|---|---|
| `ProductCard` | Hero card con specs, rating ★, precio prominente y 2 CTAs |
| `ComparisonTable` | Side-by-side de productos con CTA por columna |
| `ProsCons` | Veredicto ✓/✗ con CTA de cierre |
| `DealBox` | Promo destacada con código, descuento y urgencia |
| `StickyBuyBar` | Barra fija en mobile con producto + precio + CTA |
| `EvidenceBadge` | ★★★/★★☆/★☆☆ nivel de evidencia científica |
| `Sources` | Lista numerada de citas académicas (PubMed, instituciones) |
| `ExpertQuote` | Card con cita de experto + org |
| `AffiliateLink` | Enlace inline con `rel="nofollow sponsored"` |
| `NewsletterEmbed` | Formulario Aevum Briefing |

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:3000
```

## Despliegue

```bash
npm run build
```

Deploy en Vercel: importar repo, detecta Next.js automáticamente.

## Variables de entorno

```bash
NEXT_PUBLIC_SITE_URL=https://aevum.io
NEXT_PUBLIC_BEEHIIV_URL=https://aevum.beehiiv.com/subscribe
NEXT_PUBLIC_AMAZON_TAG_ES=aevum-21
NEXT_PUBLIC_AMAZON_TAG_EN=aevum-21
NEXT_PUBLIC_AMAZON_TAG_FR=aevum-21
NEXT_PUBLIC_AMAZON_TAG_DE=aevum-21
```

## Licencia

Proyecto privado.

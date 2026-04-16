# BiohackLab — Multilingual Biohacking Affiliate Platform

Web de afiliación de productos de biohacking y longevidad en **4 idiomas** (ES · EN · FR · DE).

Built with **Next.js 15** · **next-intl** · **MDX** · **Tailwind CSS**. 100% estático, desplegado en Vercel.

## Stack

- **Next.js 15** App Router + SSG
- **next-intl** para i18n con routing por locale (`/es/`, `/en/`, `/fr/`, `/de/`)
- **MDX** con `gray-matter` y `reading-time` para artículos
- **Tailwind CSS** con tema oscuro personalizado
- **Beehiiv** para newsletter (embed integrado)
- **Amazon Associates** para afiliación (links con `rel="nofollow sponsored"`)

## Estructura

```
src/app/[locale]/             # Rutas por idioma (home, categoría, artículo)
src/components/               # Header, Footer, LanguageSwitcher, NewsletterEmbed, AffiliateLink
src/lib/content.ts            # Loader de MDX con frontmatter
src/i18n/                     # Configuración de next-intl
messages/{es,en,fr,de}.json   # Traducciones de UI
content/{es,en,fr,de}/        # Artículos MDX por idioma y categoría
```

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:3000
```

Accede a `/es`, `/en`, `/fr` o `/de`.

## Build

```bash
npm run build        # Compila a estático + SSG
npm start            # Sirve producción
```

## Despliegue en Vercel

### Opción 1: One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/danielmirond/discover-alerts&project-name=biohacklab&repository-name=biohacklab)

### Opción 2: Desde el dashboard de Vercel

1. Ve a https://vercel.com/new
2. Importa el repo `danielmirond/discover-alerts`
3. Selecciona el branch `claude/biohacking-multilingual-platform-9F0Jt`
4. Framework preset: **Next.js** (detectado automáticamente)
5. Añade las variables de entorno (ver abajo)
6. Click en **Deploy**

### Opción 3: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Variables de entorno

Copia `.env.example` a `.env.local` y configura:

```bash
NEXT_PUBLIC_SITE_URL=https://tudominio.com
NEXT_PUBLIC_BEEHIIV_URL=https://tu-newsletter.beehiiv.com/subscribe
NEXT_PUBLIC_AMAZON_TAG_ES=tutag-21
NEXT_PUBLIC_AMAZON_TAG_EN=tutag-20
NEXT_PUBLIC_AMAZON_TAG_FR=tutag-21
NEXT_PUBLIC_AMAZON_TAG_DE=tutag-21
```

## Añadir artículos

Crea un archivo `.mdx` en `content/{locale}/{category}/{slug}.mdx`:

```mdx
---
title: "Título del artículo"
description: "Meta description para SEO"
date: "2026-04-15"
affiliate: true
alternates:
  es: "wearables/oura-ring-opinion"
  en: "wearables/oura-ring-review"
---

## Primera sección

Contenido del artículo…

<AffiliateLink href="https://amazon.es/dp/XYZ?tag=tutag-21" store="Amazon.es">
  Ver precio
</AffiliateLink>
```

Categorías por idioma:
- **ES**: `wearables`, `suplementos`, `protocolos`
- **EN**: `wearables`, `supplements`, `protocols`
- **FR**: `wearables`, `suppléments` (crear), `protocoles` (crear)
- **DE**: `wearables`, `supplements` (crear), `protokolle` (crear)

## Monetización

1. **Amazon Associates** — enlaces con tag de afiliado por mercado
2. **Programas directos** — Oura, WHOOP, Eight Sleep, Tru Niagen
3. **Newsletter Premium** — Beehiiv con tier pago de €7/mes
4. **Display ads** — Mediavine/Raptive al superar 50K visitas/mes

## SEO

- **hreflang** automático en `<head>` para todas las páginas
- **sitemap.xml** generado dinámicamente en `/sitemap.xml`
- **robots.txt** en `/robots.txt`
- **Open Graph** configurado por artículo
- **URLs localizadas** por idioma para mejor ranking local

## Licencia

Proyecto privado.

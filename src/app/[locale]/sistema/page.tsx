import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ProductCard } from "@/components/ProductCard";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ProsCons } from "@/components/ProsCons";
import { DealBox } from "@/components/DealBox";
import { EvidenceBadge } from "@/components/EvidenceBadge";
import { ExpertQuote } from "@/components/ExpertQuote";
import { Sources } from "@/components/Sources";
import { NewsletterEmbed } from "@/components/NewsletterEmbed";
import { AffiliateLink } from "@/components/AffiliateLink";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Aevum Design System",
  description: "Sistema de diseño de Aevum — tokens, tipografía, componentes.",
};

const colors = [
  { name: "bg", hex: "#ffffff", desc: "Surface base" },
  { name: "ivory", hex: "#f8f5f0", desc: "Soft surface" },
  { name: "pearl", hex: "#faf8f4", desc: "Warm off-white" },
  { name: "sand", hex: "#f0ebe2", desc: "Cream tonality" },
  { name: "charcoal", hex: "#1a1a1a", desc: "Primary text" },
  { name: "slate", hex: "#3a3a3a", desc: "Body text" },
  { name: "stone", hex: "#6b6560", desc: "Muted text" },
  { name: "mist", hex: "#a8a39d", desc: "Subtle hierarchy" },
  { name: "emerald", hex: "#0a4d3c", desc: "Primary accent" },
  { name: "emerald-light", hex: "#d4e8de", desc: "Emerald tint" },
  { name: "bronze", hex: "#a8865d", desc: "Luxury accent" },
  { name: "bronze-light", hex: "#e8dcc8", desc: "Bronze tint" },
  { name: "line", hex: "#e8e4de", desc: "Border strong" },
  { name: "hairline", hex: "#f0ece6", desc: "Border subtle" },
];

const typeScale = [
  { class: "display-xl", label: "Display XL", sample: "Architectura vitae longae", size: "44–80px · Fraunces 200" },
  { class: "display-lg", label: "Display LG", sample: "La ciencia de vivir más", size: "32–54px · Fraunces 300" },
  { class: "display-md", label: "Display MD", sample: "Los cuatro pilares", size: "24–36px · Fraunces 300" },
  { class: "display-sm", label: "Display SM", sample: "Protocolos de longevidad", size: "18–22px · Fraunces 400" },
];

export default async function DesignSystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="animate-fade-up">
      {/* HERO */}
      <section className="max-w-[1200px] mx-auto px-8 pt-20 pb-16 border-b border-hairline">
        <div className="eyebrow mb-6">Design System · v1.0</div>
        <h1 className="display-xl mb-6">
          Aevum <em className="italic text-emerald font-light">Sistema</em>
        </h1>
        <p className="text-[18px] text-slate leading-[1.6] max-w-[620px] font-light">
          Tokens de color, tipografía, componentes y principios de diseño que
          articulan la identidad editorial de Aevum.
        </p>

        {/* Nav anchors */}
        <div className="flex items-center gap-6 mt-10 flex-wrap">
          {[
            { href: "#brand", label: "01 · Marca" },
            { href: "#color", label: "02 · Color" },
            { href: "#type", label: "03 · Tipografía" },
            { href: "#components", label: "04 · Componentes" },
            { href: "#principles", label: "05 · Principios" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[10px] tracking-[0.2em] uppercase text-stone hover:text-emerald transition-colors border-b border-transparent hover:border-emerald pb-1"
            >
              {item.label}
            </a>
          ))}
        </div>
      </section>

      {/* 01 · BRAND */}
      <section id="brand" className="max-w-[1200px] mx-auto px-8 py-20">
        <div className="eyebrow mb-3">01</div>
        <h2 className="display-lg mb-12">Marca</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[1px] bg-line border border-line">
          {/* Full logo */}
          <div className="bg-bg p-16 flex flex-col items-center justify-center min-h-[280px]">
            <Logo variant="full" size={44} />
            <span className="mt-10 text-[10px] tracking-[0.2em] uppercase text-stone">
              Logo principal
            </span>
          </div>

          {/* Wordmark only */}
          <div className="bg-ivory p-16 flex flex-col items-center justify-center min-h-[280px]">
            <Logo variant="wordmark" size={52} />
            <span className="mt-10 text-[10px] tracking-[0.2em] uppercase text-stone">
              Wordmark · Cinzel
            </span>
          </div>

          {/* Seal on dark */}
          <div className="bg-charcoal p-16 flex flex-col items-center justify-center min-h-[280px]">
            <Logo variant="mark" size={96} color="#a8865d" />
            <span className="mt-10 text-[10px] tracking-[0.2em] uppercase text-bronze">
              Sello · Anillos
            </span>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1100px]">
          <div>
            <div className="eyebrow mb-3">Significado</div>
            <p className="text-slate text-[14px] leading-[1.7]">
              Aevum proviene del latín <em>aevum</em> — &ldquo;eternidad&rdquo;,
              &ldquo;edad&rdquo;, &ldquo;tiempo indefinido&rdquo;. Concepto
              filosófico medieval que denota un tiempo intermedio entre el
              instante y la eternidad.
            </p>
          </div>
          <div>
            <div className="eyebrow mb-3">Wordmark</div>
            <p className="text-slate text-[14px] leading-[1.7]">
              Tipografía <strong>Cinzel</strong> — inspirada en las
              inscripciones romanas de la Columna Trajana. Capitales clásicas
              con proporciones áureas. Color: bronce <code className="font-mono text-[12px]">#a8865d</code>.
            </p>
          </div>
          <div>
            <div className="eyebrow mb-3">Sello</div>
            <p className="text-slate text-[14px] leading-[1.7]">
              Cinco anillos concéntricos. Metáfora dual: los anillos de
              crecimiento de un árbol (longevidad medible) y los sellos
              intaglio romanos de validación documental.
            </p>
          </div>
        </div>
      </section>

      {/* 02 · COLOR */}
      <section id="color" className="bg-pearl py-20 px-8 border-y border-hairline">
        <div className="max-w-[1200px] mx-auto">
          <div className="eyebrow mb-3">02</div>
          <h2 className="display-lg mb-12">Paleta cromática</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-[1px] bg-line border border-line mb-10">
            {colors.map((c) => (
              <div key={c.name} className="bg-bg">
                <div
                  className="h-24 border-b border-hairline"
                  style={{ backgroundColor: c.hex }}
                />
                <div className="p-4">
                  <div className="font-mono text-[11px] text-charcoal mb-1">
                    {c.name}
                  </div>
                  <div className="font-mono text-[10px] text-stone mb-2">
                    {c.hex}
                  </div>
                  <div className="text-[10px] text-mist tracking-[0.05em]">
                    {c.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[900px]">
            <div>
              <div className="eyebrow mb-3">Emerald · #0a4d3c</div>
              <p className="text-slate text-[13px] leading-[1.7]">
                Acento primario clínico. CTAs principales, acentos editoriales,
                evidencia fuerte. Asociado con confianza científica.
              </p>
            </div>
            <div>
              <div className="eyebrow mb-3">Bronze · #a8865d</div>
              <p className="text-slate text-[13px] leading-[1.7]">
                Acento luxury. Numerales romanos, ornamentos, detalles
                editoriales. Asociado con premium y warmth.
              </p>
            </div>
            <div>
              <div className="eyebrow mb-3">Charcoal · #1a1a1a</div>
              <p className="text-slate text-[13px] leading-[1.7]">
                No negro puro. Mejor legibilidad en pantallas, sensación
                menos agresiva. Usado para titulares y cuerpo fuerte.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 03 · TYPOGRAPHY */}
      <section id="type" className="max-w-[1200px] mx-auto px-8 py-20">
        <div className="eyebrow mb-3">03</div>
        <h2 className="display-lg mb-12">Tipografía</h2>

        {/* Font families */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-line border border-line mb-16">
          <div className="bg-bg p-10">
            <div className="eyebrow mb-4">Display</div>
            <div className="font-serif text-[48px] font-light text-charcoal leading-[1] mb-4 tracking-tight">
              Fraunces
            </div>
            <p className="text-stone text-[12px] leading-[1.7]">
              Serif variable con eje de optical size. Pesos 200–600.
              Cursivas editoriales. Usada para titulares, quotes y
              números romanos decorativos.
            </p>
          </div>
          <div className="bg-bg p-10">
            <div className="eyebrow mb-4">Body</div>
            <div className="font-sans text-[48px] font-light text-charcoal leading-[1] mb-4">
              Inter
            </div>
            <p className="text-stone text-[12px] leading-[1.7]">
              Sans-serif neutra, excelente legibilidad en todos los tamaños.
              Pesos 300–600. Usada para cuerpo, meta, navegación.
              Optimizada para silver economy.
            </p>
          </div>
          <div className="bg-bg p-10">
            <div className="eyebrow mb-4">Mono</div>
            <div className="font-mono text-[40px] font-normal text-charcoal leading-[1] mb-4 tracking-tight">
              DM Mono
            </div>
            <p className="text-stone text-[12px] leading-[1.7]">
              Monospace geométrica. Pesos 300–400. Usada para
              códigos de descuento, labels técnicos, valores de color.
            </p>
          </div>
        </div>

        {/* Type scale */}
        <div className="eyebrow mb-6">Escala Display</div>
        <div className="divide-y divide-hairline border-y border-hairline">
          {typeScale.map((t) => (
            <div
              key={t.class}
              className="py-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-baseline"
            >
              <div>
                <div className="font-mono text-[11px] text-stone">
                  .{t.class}
                </div>
                <div className="text-[10px] text-mist mt-1">{t.size}</div>
              </div>
              <div className={t.class}>{t.sample}</div>
            </div>
          ))}
        </div>

        {/* Labels */}
        <div className="mt-16">
          <div className="eyebrow mb-6">Labels & Meta</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-soft p-8">
              <div className="eyebrow mb-3">Eyebrow label</div>
              <code className="text-[11px] text-stone font-mono">
                .eyebrow — tracking 0.22em · bronze
              </code>
            </div>
            <div className="card-soft p-8">
              <div className="eyebrow-emerald mb-3">Eyebrow emerald</div>
              <code className="text-[11px] text-stone font-mono">
                .eyebrow-emerald — same spec · emerald
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* 04 · COMPONENTS */}
      <section id="components" className="bg-ivory py-20 px-8 border-y border-hairline">
        <div className="max-w-[1200px] mx-auto">
          <div className="eyebrow mb-3">04</div>
          <h2 className="display-lg mb-12">Componentes editoriales</h2>

          {/* EvidenceBadge */}
          <div className="mb-16">
            <div className="eyebrow mb-4">EvidenceBadge · Nivel de evidencia</div>
            <div className="flex gap-3 flex-wrap bg-bg p-8 border border-line">
              <EvidenceBadge level={3} label="Evidencia fuerte" />
              <EvidenceBadge level={2} label="Evidencia moderada" />
              <EvidenceBadge level={1} label="Evidencia limitada" />
            </div>
          </div>

          {/* ProductCard */}
          <div className="mb-16">
            <div className="eyebrow mb-4">ProductCard · Hero con specs + CTAs</div>
            <div className="bg-bg border border-line p-8">
              <ProductCard
                name="Oura Ring Gen 4"
                category="Smart Ring · Demo"
                badge="Editor's Choice"
                emoji="◯"
                description="Anillo inteligente para monitorizar sueño, HRV y temperatura. Ejemplo visual del componente ProductCard."
                rating={4.7}
                testedFor="3 meses de uso"
                specs={[
                  { label: "Sensores", value: "PPG, SpO2, temperatura" },
                  { label: "Autonomía", value: "6–8 días" },
                ]}
                price="€349"
                priceContext="+ €5,99/mes suscripción"
                ctas={[
                  { label: "Comprar", url: "#", store: "Oura.com", primary: true },
                  { label: "Amazon", url: "#", store: "Amazon" },
                ]}
              />
            </div>
          </div>

          {/* ComparisonTable */}
          <div className="mb-16">
            <div className="eyebrow mb-4">ComparisonTable · Side-by-side</div>
            <div className="bg-bg border border-line p-8">
              <ComparisonTable
                title="Demo de comparativa"
                attributes={["Sueño", "Strain", "Precio/mes"]}
                products={[
                  {
                    name: "Oura Ring",
                    emoji: "◯",
                    badge: "Mejor sueño",
                    attributes: { Sueño: "★★★★★", Strain: "★★★", "Precio/mes": "€6" },
                    price: "€349",
                    ctaUrl: "#",
                    ctaStore: "Oura",
                  },
                  {
                    name: "WHOOP 5.0",
                    emoji: "▱",
                    badge: "Mejor strain",
                    attributes: { Sueño: "★★★★", Strain: "★★★★★", "Precio/mes": "€25" },
                    price: "€25/mes",
                    ctaUrl: "#",
                    ctaStore: "WHOOP",
                  },
                ]}
              />
            </div>
          </div>

          {/* ProsCons */}
          <div className="mb-16">
            <div className="eyebrow mb-4">ProsCons · Veredicto con CTA</div>
            <div className="bg-bg border border-line p-8">
              <ProsCons
                pros={[
                  "Evidencia científica sólida",
                  "Bien tolerado, bajo riesgo",
                  "Inversión a largo plazo",
                ]}
                cons={[
                  "Requiere consistencia",
                  "Coste inicial significativo",
                ]}
                verdict="Componente ProsCons en acción — veredicto editorial claro con CTA principal de cierre."
                cta={{
                  label: "Demo CTA",
                  url: "#",
                  store: "Store",
                }}
              />
            </div>
          </div>

          {/* ExpertQuote */}
          <div className="mb-16">
            <div className="eyebrow mb-4">ExpertQuote · Cita de autoridad</div>
            <ExpertQuote
              quote="La longevidad no es mágica — es la suma de decisiones diarias basadas en evidencia, ejecutadas con consistencia durante décadas."
              author="Peter Attia, MD"
              role="Autor de Outlive"
              org="Longevity Expert"
            />
          </div>

          {/* DealBox */}
          <div className="mb-16">
            <div className="eyebrow mb-4">DealBox · Promoción con urgencia</div>
            <DealBox
              title="Thorne — 10% con código AEVUM10"
              description="Ejemplo visual del componente DealBox para descuentos y promociones limitadas."
              discount="-10%"
              code="AEVUM10"
              expires="31 dic 2026"
              url="#"
              store="Thorne"
              cta="Aplicar descuento"
            />
          </div>

          {/* Sources */}
          <div className="mb-16">
            <div className="eyebrow mb-4">Sources · Citas académicas</div>
            <div className="bg-bg border border-line p-8">
              <Sources
                items={[
                  {
                    title: "What Is Biohacking",
                    url: "#",
                    org: "Cleveland Clinic",
                    year: "2025",
                  },
                  {
                    title: "Metabolic Effects of Intermittent Fasting",
                    url: "#",
                    org: "PubMed Central",
                    year: "2017",
                  },
                ]}
              />
            </div>
          </div>

          {/* AffiliateLink */}
          <div className="mb-16">
            <div className="eyebrow mb-4">AffiliateLink · CTA inline</div>
            <div className="bg-bg border border-line p-8">
              <AffiliateLink href="#" store="Amazon.es">
                Comprar NMN ProHealth
              </AffiliateLink>
            </div>
          </div>

          {/* NewsletterEmbed */}
          <div className="mb-16">
            <div className="eyebrow mb-4">NewsletterEmbed · Aevum Briefing</div>
            <NewsletterEmbed />
          </div>
        </div>
      </section>

      {/* 05 · PRINCIPLES */}
      <section id="principles" className="max-w-[1200px] mx-auto px-8 py-20">
        <div className="eyebrow mb-3">05</div>
        <h2 className="display-lg mb-12">Principios de diseño</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
          {[
            {
              n: "I",
              title: "Whitespace como valor",
              desc: "El espacio vacío no es ausencia — es jerarquía. Una página cargada señala desesperación. Aevum transmite autoridad tranquila a través del respiro visual.",
            },
            {
              n: "II",
              title: "Serifas editoriales, sans legibles",
              desc: "Fraunces comunica tradición y rigor. Inter comunica claridad moderna. Nunca mezclar más de 3 pesos por página.",
            },
            {
              n: "III",
              title: "Color con intención",
              desc: "Emerald es confianza científica. Bronze es warmth editorial. Nunca usar como decoración — siempre con significado semántico.",
            },
            {
              n: "IV",
              title: "Evidencia visible",
              desc: "Cada intervención se clasifica (★★★/★★/★). Cada artículo cita fuentes. La transparencia editorial es un elemento visual, no solo textual.",
            },
            {
              n: "V",
              title: "Números romanos, no decorativos",
              desc: "I/II/III/IV en bronze italic para marcar jerarquía ordinal. Clásico, atemporal, apropiado para longevidad.",
            },
            {
              n: "VI",
              title: "Ornamentos con propósito",
              desc: "Líneas horizontales hairline separan secciones. Divisores bronze marcan momentos editoriales. Nunca decoración sin función.",
            },
          ].map((p) => (
            <div key={p.n}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-serif italic text-bronze text-[32px] font-extralight">
                  {p.n}
                </span>
                <span className="flex-1 h-px bg-line" />
              </div>
              <h3 className="font-serif text-[22px] font-normal text-charcoal mb-3">
                {p.title}
              </h3>
              <p className="text-slate text-[14px] leading-[1.7]">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ORNAMENT CLOSING */}
      <section className="max-w-[800px] mx-auto px-8 pb-24 text-center">
        <div className="ornament text-[10px] tracking-[0.3em] uppercase">
          <span className="font-serif italic text-[16px] normal-case tracking-normal text-bronze">
            Fin
          </span>
        </div>
        <p className="text-stone text-[11px] mt-6 italic font-serif">
          Aevum Design System · v1.0 · Última actualización abril 2026
        </p>
      </section>
    </div>
  );
}

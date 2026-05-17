import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { NewsletterEmbed } from "@/components/NewsletterEmbed";

type Locale = "es" | "en";

const content: Record<Locale, {
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string[];
  methodologyTitle: string;
  methodology: { title: string; desc: string }[];
  principlesTitle: string;
  principles: { title: string; desc: string }[];
  transparencyTitle: string;
  transparency: string[];
  closingTitle: string;
  closing: string;
}> = {
  es: {
    eyebrow: "Sobre nosotros",
    title: "Una nueva arquitectura de longevidad",
    subtitle: "Aevum existe para separar la ciencia del hype en el espacio de optimización humana. Sin humo. Sin promesas milagro. Solo evidencia, protocolo y análisis.",
    intro: [
      "En los últimos 10 años, el biohacking ha pasado de ser un movimiento marginal a una industria de 85.000 millones de dólares. Con ese crecimiento llegó algo inevitable: el ruido. Influencers vendiendo peptidos sin regulación. Marcas disfrazando suplementos básicos de milagros. Wearables que prometen diagnósticos médicos.",
      "Aevum nace de una frustración simple: como consumidores que tomamos en serio nuestra salud, nos faltaba un recurso editorial que priorizara el rigor científico sobre la narrativa comercial.",
      "Somos un laboratorio editorial independiente especializado en longevidad de precisión. Analizamos protocolos, tecnología y suplementos con la misma pregunta en mente: ¿qué dice la evidencia real?"
    ],
    methodologyTitle: "Metodología editorial",
    methodology: [
      {
        title: "Niveles de evidencia",
        desc: "Cada intervención se clasifica en 3 niveles: ★★★ RCTs y meta-análisis, ★★ estudios observacionales, ★ evidencia preliminar o anecdótica. Visible en cada artículo."
      },
      {
        title: "Fuentes primarias",
        desc: "Citamos PubMed, Cochrane, instituciones médicas (Cleveland Clinic, Mayo, Harvard) y revistas peer-reviewed. Nunca pseudomedios o blogs comerciales."
      },
      {
        title: "Testing real",
        desc: "Los productos que recomendamos han sido probados durante al menos 30 días en uso real. El tiempo de test aparece en cada review."
      },
      {
        title: "Revisión semestral",
        desc: "Actualizamos reviews y listicles cada 6 meses. La ciencia avanza, nuestras recomendaciones también."
      }
    ],
    principlesTitle: "Principios editoriales",
    principles: [
      {
        title: "Autoridad tranquila",
        desc: "No exageramos. No asustamos. No vendemos miedo. El rigor no necesita volumen."
      },
      {
        title: "Independencia",
        desc: "No aceptamos pago por reviews positivos. Las marcas que aparecen en Aevum lo hacen por méritos, no por presupuesto."
      },
      {
        title: "Escepticismo productivo",
        desc: "Asumimos que toda afirmación necesita respaldo. Cuando la evidencia es débil, lo decimos. Cuando es fuerte, también."
      },
      {
        title: "Utilidad práctica",
        desc: "El contenido existe para ayudarte a tomar mejores decisiones. No para ganar premios literarios ni para impresionar con jerga técnica."
      }
    ],
    transparencyTitle: "Transparencia en afiliación",
    transparency: [
      "Aevum se financia mediante enlaces de afiliación. Cuando compras un producto recomendado a través de nuestros enlaces, recibimos una pequeña comisión sin coste adicional para ti.",
      "Este modelo nos permite operar como recurso independiente, sin publicidad invasiva ni contenido patrocinado encubierto. Todos los enlaces de afiliación están marcados con rel=\"nofollow sponsored\" y declarados al inicio del artículo.",
      "Nunca recomendamos un producto que no compraríamos nosotros mismos. Si una marca nos paga más comisión, eso no influye en si la incluimos — solo influye en cómo distribuimos nuestro tiempo de testing."
    ],
    closingTitle: "Qué NO somos",
    closing: "Aevum no es un consultorio médico. No prescribimos. No diagnosticamos. No sustituimos a tu médico. Somos un recurso editorial basado en evidencia para tomar mejores decisiones sobre tu healthspan — complementario a, nunca sustituto de, atención médica profesional."
  },
  en: {
    eyebrow: "About us",
    title: "A new architecture of longevity",
    subtitle: "Aevum exists to separate science from hype in the human optimization space. No noise. No miracle promises. Just evidence, protocol and analysis.",
    intro: [
      "In the last 10 years, biohacking has evolved from a fringe movement into an $85 billion industry. With that growth came something inevitable: noise. Influencers selling unregulated peptides. Brands dressing up basic supplements as miracle cures. Wearables promising medical diagnostics.",
      "Aevum was born from a simple frustration: as consumers taking our health seriously, we lacked an editorial resource that prioritized scientific rigor over commercial narrative.",
      "We are an independent editorial lab specialized in precision longevity. We analyze protocols, technology and supplements with the same question in mind: what does the real evidence say?"
    ],
    methodologyTitle: "Editorial methodology",
    methodology: [
      {
        title: "Evidence levels",
        desc: "Every intervention is classified in 3 tiers: ★★★ RCTs and meta-analyses, ★★ observational studies, ★ preliminary or anecdotal evidence. Visible in every article."
      },
      {
        title: "Primary sources",
        desc: "We cite PubMed, Cochrane, medical institutions (Cleveland Clinic, Mayo, Harvard) and peer-reviewed journals. Never pseudo-media or commercial blogs."
      },
      {
        title: "Real testing",
        desc: "Products we recommend have been tested for at least 30 days in real use. Test duration is noted in every review."
      },
      {
        title: "Semiannual review",
        desc: "We update reviews and listicles every 6 months. Science advances — our recommendations follow."
      }
    ],
    principlesTitle: "Editorial principles",
    principles: [
      {
        title: "Quiet authority",
        desc: "We don't exaggerate. We don't fearmonger. We don't sell anxiety. Rigor doesn't need volume."
      },
      {
        title: "Independence",
        desc: "We don't accept payment for positive reviews. Brands that appear in Aevum earn their place on merit, not budget."
      },
      {
        title: "Productive skepticism",
        desc: "We assume every claim needs backing. When evidence is weak, we say so. When it's strong, we also say so."
      },
      {
        title: "Practical utility",
        desc: "Content exists to help you make better decisions. Not to win literary awards or impress with technical jargon."
      }
    ],
    transparencyTitle: "Affiliate transparency",
    transparency: [
      "Aevum is funded through affiliate links. When you purchase a recommended product via our links, we receive a small commission at no extra cost to you.",
      "This model lets us operate as an independent resource — no invasive ads, no disguised sponsored content. All affiliate links are marked with rel=\"nofollow sponsored\" and disclosed at the top of articles.",
      "We never recommend a product we wouldn't buy ourselves. If a brand pays higher commission, it doesn't influence inclusion — only how we distribute our testing time."
    ],
    closingTitle: "What we are NOT",
    closing: "Aevum is not a medical practice. We don't prescribe. We don't diagnose. We don't replace your doctor. We are an evidence-based editorial resource to help you make better decisions about your healthspan — complementary to, never a substitute for, professional medical care."
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = content[locale as Locale] || content.en;
  return {
    title: c.title,
    description: c.subtitle,
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = content[locale as Locale] || content.en;

  return (
    <div className="animate-fade-up">
      {/* HERO */}
      <section className="max-w-[900px] mx-auto px-8 pt-20 pb-16 text-center">
        <div className="eyebrow mb-6">{c.eyebrow}</div>
        <h1 className="display-lg mb-8">{c.title}</h1>
        <p className="font-serif italic text-[20px] text-stone font-light leading-[1.5] max-w-[640px] mx-auto">
          {c.subtitle}
        </p>
      </section>

      {/* ORNAMENT */}
      <div className="max-w-[300px] mx-auto px-8">
        <div className="ornament text-[10px] tracking-[0.3em] uppercase" />
      </div>

      {/* INTRO */}
      <section className="max-w-[720px] mx-auto px-8 py-16 prose-editorial">
        {c.intro.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </section>

      {/* METHODOLOGY */}
      <section className="bg-pearl py-24 px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="eyebrow mb-3">01</div>
          <h2 className="display-md mb-12">{c.methodologyTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {c.methodology.map((item, i) => (
              <div key={i} className="bg-bg p-10">
                <div className="font-serif italic text-[32px] font-extralight text-bronze/60 mb-4">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-serif text-[20px] font-normal text-charcoal mb-3">
                  {item.title}
                </h3>
                <p className="text-slate text-[14px] leading-[1.7]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="max-w-[1200px] mx-auto px-8 py-24">
        <div className="eyebrow mb-3">02</div>
        <h2 className="display-md mb-12">{c.principlesTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {c.principles.map((item, i) => (
            <div key={i}>
              <div className="flex items-center gap-4 mb-3">
                <span className="font-serif text-bronze text-[18px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 h-px bg-line" />
              </div>
              <h3 className="font-serif text-[22px] font-normal text-charcoal mb-3">
                {item.title}
              </h3>
              <p className="text-slate text-[14px] leading-[1.7]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* TRANSPARENCY */}
      <section className="bg-ivory py-24 px-8">
        <div className="max-w-[720px] mx-auto">
          <div className="eyebrow mb-3">03</div>
          <h2 className="display-md mb-10">{c.transparencyTitle}</h2>
          <div className="prose-editorial">
            {c.transparency.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className="max-w-[720px] mx-auto px-8 py-24 text-center">
        <div className="eyebrow mb-6">{c.closingTitle}</div>
        <p className="font-serif italic text-[20px] font-light text-charcoal leading-[1.6] tracking-[-0.005em]">
          &ldquo;{c.closing}&rdquo;
        </p>
      </section>

      {/* NEWSLETTER */}
      <section className="max-w-[1200px] mx-auto px-8 pb-24">
        <NewsletterEmbed />
      </section>
    </div>
  );
}

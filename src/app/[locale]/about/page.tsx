import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { NewsletterEmbed } from "@/components/NewsletterEmbed";

type Locale = "es" | "en" | "fr" | "de";

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
  fr: {
    eyebrow: "À propos",
    title: "Une nouvelle architecture de longévité",
    subtitle: "Aevum existe pour séparer la science du battage médiatique dans l'optimisation humaine. Sans bruit. Sans promesses miracles. Juste de la preuve, du protocole et de l'analyse.",
    intro: [
      "Ces 10 dernières années, le biohacking est passé d'un mouvement marginal à une industrie de 85 milliards de dollars. Avec cette croissance est venu quelque chose d'inévitable : le bruit.",
      "Aevum est né d'une frustration simple : en tant que consommateurs prenant notre santé au sérieux, il nous manquait une ressource éditoriale priorisant la rigueur scientifique sur le récit commercial.",
      "Nous sommes un laboratoire éditorial indépendant spécialisé dans la longévité de précision."
    ],
    methodologyTitle: "Méthodologie éditoriale",
    methodology: [
      { title: "Niveaux de preuve", desc: "Chaque intervention classée en 3 niveaux : ★★★ ECR et méta-analyses, ★★ études observationnelles, ★ preuves préliminaires." },
      { title: "Sources primaires", desc: "Nous citons PubMed, Cochrane, institutions médicales (Cleveland Clinic, Mayo) et revues à comité de lecture." },
      { title: "Tests réels", desc: "Les produits recommandés sont testés pendant au moins 30 jours en usage réel." },
      { title: "Révision semestrielle", desc: "Nous mettons à jour les tests tous les 6 mois. La science avance — nos recommandations suivent." }
    ],
    principlesTitle: "Principes éditoriaux",
    principles: [
      { title: "Autorité tranquille", desc: "Nous n'exagérons pas. Nous ne vendons pas la peur. La rigueur n'a pas besoin de volume." },
      { title: "Indépendance", desc: "Nous n'acceptons pas de paiement pour des avis positifs." },
      { title: "Scepticisme productif", desc: "Nous supposons que toute affirmation nécessite des preuves." },
      { title: "Utilité pratique", desc: "Le contenu existe pour vous aider à prendre de meilleures décisions." }
    ],
    transparencyTitle: "Transparence de l'affiliation",
    transparency: [
      "Aevum se finance via des liens d'affiliation. Quand vous achetez un produit recommandé via nos liens, nous recevons une petite commission sans frais supplémentaires pour vous.",
      "Ce modèle nous permet d'opérer comme une ressource indépendante, sans publicité invasive ni contenu sponsorisé déguisé.",
      "Nous ne recommandons jamais un produit que nous n'achèterions pas nous-mêmes."
    ],
    closingTitle: "Ce que nous ne sommes PAS",
    closing: "Aevum n'est pas un cabinet médical. Nous ne prescrivons pas. Nous ne diagnostiquons pas. Nous sommes une ressource éditoriale basée sur les preuves — complémentaire à, jamais un substitut de, soins médicaux professionnels."
  },
  de: {
    eyebrow: "Über uns",
    title: "Eine neue Architektur der Langlebigkeit",
    subtitle: "Aevum existiert, um Wissenschaft vom Hype in der menschlichen Optimierung zu trennen. Kein Rauschen. Keine Wunderversprechen. Nur Evidenz, Protokoll und Analyse.",
    intro: [
      "In den letzten 10 Jahren hat sich Biohacking von einer Randbewegung zu einer 85-Milliarden-Dollar-Industrie entwickelt. Mit diesem Wachstum kam etwas Unvermeidliches: Rauschen.",
      "Aevum entstand aus einer einfachen Frustration: Als Verbraucher, die ihre Gesundheit ernst nehmen, fehlte uns eine editoriale Ressource, die wissenschaftliche Strenge über kommerzielle Narrative stellt.",
      "Wir sind ein unabhängiges editoriales Labor, spezialisiert auf Präzisions-Langlebigkeit."
    ],
    methodologyTitle: "Editoriale Methodik",
    methodology: [
      { title: "Evidenzstufen", desc: "Jede Intervention in 3 Stufen klassifiziert: ★★★ RCTs und Metaanalysen, ★★ Beobachtungsstudien, ★ vorläufige Evidenz." },
      { title: "Primärquellen", desc: "Wir zitieren PubMed, Cochrane, medizinische Institutionen (Cleveland Clinic, Mayo) und peer-reviewte Zeitschriften." },
      { title: "Echte Tests", desc: "Empfohlene Produkte werden mindestens 30 Tage in realer Anwendung getestet." },
      { title: "Halbjährliche Überprüfung", desc: "Wir aktualisieren Tests alle 6 Monate. Die Wissenschaft schreitet voran — unsere Empfehlungen folgen." }
    ],
    principlesTitle: "Editoriale Prinzipien",
    principles: [
      { title: "Ruhige Autorität", desc: "Wir übertreiben nicht. Wir verkaufen keine Angst. Strenge braucht keine Lautstärke." },
      { title: "Unabhängigkeit", desc: "Wir nehmen keine Bezahlung für positive Tests an." },
      { title: "Produktive Skepsis", desc: "Wir gehen davon aus, dass jede Behauptung belegt werden muss." },
      { title: "Praktischer Nutzen", desc: "Inhalte existieren, um dir bessere Entscheidungen zu ermöglichen." }
    ],
    transparencyTitle: "Affiliate-Transparenz",
    transparency: [
      "Aevum finanziert sich durch Affiliate-Links. Wenn du ein empfohlenes Produkt über unsere Links kaufst, erhalten wir eine kleine Provision ohne zusätzliche Kosten für dich.",
      "Dieses Modell erlaubt uns, als unabhängige Ressource zu operieren — ohne invasive Werbung oder versteckten Sponsored Content.",
      "Wir empfehlen nie ein Produkt, das wir nicht selbst kaufen würden."
    ],
    closingTitle: "Was wir NICHT sind",
    closing: "Aevum ist keine medizinische Praxis. Wir verschreiben nicht. Wir diagnostizieren nicht. Wir sind eine evidenzbasierte editoriale Ressource — ergänzend zu, niemals ein Ersatz für, professionelle medizinische Versorgung."
  }
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-line">
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

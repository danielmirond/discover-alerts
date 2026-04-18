import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

type Locale = "es" | "en" | "fr" | "de";

const content: Record<Locale, {
  eyebrow: string;
  title: string;
  subtitle: string;
  sections: { heading: string; body: string[] }[];
  closing: string;
}> = {
  es: {
    eyebrow: "Transparencia",
    title: "Política de afiliación",
    subtitle: "Cómo se financia Aevum y por qué esto importa para la integridad editorial.",
    sections: [
      {
        heading: "Cómo monetizamos",
        body: [
          "Aevum opera como medio independiente. No recibimos financiación de ninguna marca o industria. Nuestro único modelo de ingresos son los enlaces de afiliación: cuando adquieres un producto recomendado a través de los enlaces de nuestras reviews, recibimos una pequeña comisión del vendedor (habitualmente 3–15% del precio).",
          "Este modelo nos permite mantener Aevum sin publicidad invasiva, sin pop-ups, sin contenido patrocinado encubierto y sin cobros de suscripción obligatorios por el contenido editorial.",
        ],
      },
      {
        heading: "Programas de afiliación",
        body: [
          "Aevum participa en los siguientes programas: Amazon Associates (Amazon.es, Amazon.co.uk, Amazon.com, Amazon.fr, Amazon.de), programas directos de marcas seleccionadas como Oura, WHOOP, Thorne Research, Plunge, Sunlighten, Mito Red Light, y redes como Impact, ShareASale y Awin.",
          "Como afiliado de Amazon, Aevum obtiene ingresos por las compras adscritas que cumplen los requisitos aplicables.",
        ],
      },
      {
        heading: "Nuestros compromisos",
        body: [
          "Independencia editorial — Las marcas no pagan por reseñas positivas, ni por aparecer en comparativas, ni por ser destacadas como Editor's Choice. Nuestro ranking se basa exclusivamente en evidencia, testing y ratio beneficio/precio.",
          "Transparencia total — Todos los enlaces de afiliación están marcados con el atributo rel=\"nofollow sponsored\" y señalados claramente al inicio de cada artículo afiliado con un disclosure visible.",
          "No recomendamos lo que no compraríamos — Si un producto no supera nuestro testing, no aparece, independientemente de la comisión que ofrezca.",
          "Actualización continua — Reviews y recomendaciones se revisan cada 6 meses. Si un producto pierde calidad o aparece una alternativa mejor, lo reflejamos.",
        ],
      },
      {
        heading: "Qué puedes hacer tú",
        body: [
          "Si quieres apoyarnos sin coste adicional, utiliza nuestros enlaces cuando decidas comprar un producto que te hayamos recomendado.",
          "Si no te interesa el producto tras leer nuestra reseña, no lo compres. Nuestra reputación depende de recomendaciones acertadas, no de ventas volumen.",
        ],
      },
    ],
    closing: "La confianza editorial es nuestro único activo. Todo el modelo de negocio de Aevum está diseñado para protegerla.",
  },
  en: {
    eyebrow: "Transparency",
    title: "Affiliate disclosure",
    subtitle: "How Aevum is funded and why this matters for editorial integrity.",
    sections: [
      {
        heading: "How we monetize",
        body: [
          "Aevum operates as an independent publisher. We receive no funding from any brand or industry. Our sole revenue model is affiliate links: when you purchase a recommended product through links in our reviews, we receive a small commission from the seller (typically 3–15% of the price).",
          "This model lets us maintain Aevum without invasive ads, pop-ups, disguised sponsored content, or mandatory subscription fees for editorial content.",
        ],
      },
      {
        heading: "Affiliate programs",
        body: [
          "Aevum participates in the following programs: Amazon Associates (Amazon.com, Amazon.co.uk, Amazon.es, Amazon.fr, Amazon.de), direct programs of selected brands such as Oura, WHOOP, Thorne Research, Plunge, Sunlighten, Mito Red Light, and networks like Impact, ShareASale and Awin.",
          "As an Amazon Associate, Aevum earns from qualifying purchases.",
        ],
      },
      {
        heading: "Our commitments",
        body: [
          "Editorial independence — Brands do not pay for positive reviews, nor for appearing in comparisons, nor for being featured as Editor's Choice. Our rankings are based exclusively on evidence, testing and benefit-to-price ratio.",
          "Full transparency — All affiliate links carry the rel=\"nofollow sponsored\" attribute and are clearly disclosed at the top of each affiliate article with a visible notice.",
          "We don't recommend what we wouldn't buy — If a product doesn't pass our testing, it doesn't appear, regardless of commission offered.",
          "Continuous updates — Reviews and recommendations are reviewed every 6 months. If a product loses quality or a better alternative emerges, we reflect it.",
        ],
      },
      {
        heading: "What you can do",
        body: [
          "If you want to support us at no extra cost, use our links when you decide to buy a product we've recommended.",
          "If the product doesn't interest you after reading our review, don't buy it. Our reputation depends on accurate recommendations, not on sales volume.",
        ],
      },
    ],
    closing: "Editorial trust is our only asset. Every part of the Aevum business model is designed to protect it.",
  },
  fr: {
    eyebrow: "Transparence",
    title: "Politique d'affiliation",
    subtitle: "Comment Aevum est financé et pourquoi cela importe pour l'intégrité éditoriale.",
    sections: [
      {
        heading: "Comment nous monétisons",
        body: [
          "Aevum opère comme un média indépendant. Nous ne recevons aucun financement d'une marque ou industrie. Notre seul modèle de revenus est l'affiliation : lorsque vous achetez un produit recommandé via les liens de nos articles, nous recevons une petite commission (généralement 3–15% du prix).",
          "Ce modèle nous permet de maintenir Aevum sans publicité invasive ni contenu sponsorisé déguisé.",
        ],
      },
      {
        heading: "Programmes d'affiliation",
        body: [
          "Aevum participe aux programmes suivants : Amazon Partenaires (Amazon.fr, Amazon.co.uk, Amazon.com, Amazon.es, Amazon.de), programmes directs de marques sélectionnées comme Oura, WHOOP, Thorne, Plunge, Sunlighten, Mito Red Light, et réseaux comme Impact, ShareASale et Awin.",
          "En tant que Partenaire Amazon, Aevum gagne des revenus grâce aux achats éligibles.",
        ],
      },
      {
        heading: "Nos engagements",
        body: [
          "Indépendance éditoriale — Les marques ne paient pas pour des avis positifs.",
          "Transparence totale — Tous les liens d'affiliation portent l'attribut rel=\"nofollow sponsored\".",
          "Nous ne recommandons pas ce que nous n'achèterions pas.",
          "Mises à jour continues — Tests révisés tous les 6 mois.",
        ],
      },
      {
        heading: "Ce que vous pouvez faire",
        body: [
          "Si vous voulez nous soutenir sans coût supplémentaire, utilisez nos liens lorsque vous décidez d'acheter un produit que nous avons recommandé.",
        ],
      },
    ],
    closing: "La confiance éditoriale est notre seul actif.",
  },
  de: {
    eyebrow: "Transparenz",
    title: "Affiliate-Richtlinie",
    subtitle: "Wie Aevum finanziert wird und warum das für die redaktionelle Integrität wichtig ist.",
    sections: [
      {
        heading: "Wie wir monetarisieren",
        body: [
          "Aevum arbeitet als unabhängiges Medium. Wir erhalten keine Finanzierung von Marken oder der Industrie. Unser einziges Geschäftsmodell sind Affiliate-Links: Wenn du ein empfohlenes Produkt über die Links in unseren Reviews kaufst, erhalten wir eine kleine Provision (typischerweise 3–15% des Preises).",
          "Dieses Modell ermöglicht es uns, Aevum ohne invasive Werbung oder versteckte Sponsored Content zu betreiben.",
        ],
      },
      {
        heading: "Affiliate-Programme",
        body: [
          "Aevum nimmt an folgenden Programmen teil: Amazon PartnerNet (Amazon.de, Amazon.co.uk, Amazon.com, Amazon.es, Amazon.fr), direkte Programme ausgewählter Marken wie Oura, WHOOP, Thorne, Plunge, Sunlighten, Mito Red Light, sowie Netzwerke wie Impact, ShareASale und Awin.",
          "Als Amazon-Partner verdient Aevum an qualifizierten Käufen.",
        ],
      },
      {
        heading: "Unsere Verpflichtungen",
        body: [
          "Redaktionelle Unabhängigkeit — Marken zahlen nicht für positive Reviews.",
          "Volle Transparenz — Alle Affiliate-Links tragen das Attribut rel=\"nofollow sponsored\".",
          "Wir empfehlen nichts, was wir nicht selbst kaufen würden.",
          "Kontinuierliche Aktualisierungen — Reviews werden alle 6 Monate überprüft.",
        ],
      },
      {
        heading: "Was du tun kannst",
        body: [
          "Wenn du uns ohne zusätzliche Kosten unterstützen möchtest, nutze unsere Links, wenn du ein von uns empfohlenes Produkt kaufen willst.",
        ],
      },
    ],
    closing: "Redaktionelles Vertrauen ist unser einziger Vermögenswert.",
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

export default async function AffiliateDisclosurePage({
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
      <section className="max-w-[780px] mx-auto px-8 pt-20 pb-12 text-center border-b border-hairline">
        <div className="eyebrow mb-6">{c.eyebrow}</div>
        <h1 className="display-lg mb-6">{c.title}</h1>
        <p className="font-serif italic text-[18px] text-stone leading-[1.55] max-w-[560px] mx-auto font-light">
          {c.subtitle}
        </p>
      </section>

      {/* SECTIONS */}
      <section className="max-w-[720px] mx-auto px-8 py-16">
        <div className="space-y-14">
          {c.sections.map((s, i) => (
            <div key={i}>
              <div className="flex items-center gap-4 mb-5">
                <span className="font-serif italic text-bronze text-[24px] font-extralight">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 h-px bg-hairline" />
              </div>
              <h2 className="font-serif text-[26px] font-normal text-charcoal mb-5 tracking-[-0.005em]">
                {s.heading}
              </h2>
              <div className="space-y-4">
                {s.body.map((p, j) => (
                  <p
                    key={j}
                    className="text-slate text-[15px] leading-[1.75]"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CLOSING */}
      <section className="max-w-[720px] mx-auto px-8 py-20 text-center">
        <div className="ornament text-[10px] tracking-[0.3em] uppercase max-w-[300px] mx-auto mb-8" />
        <p className="font-serif italic text-[20px] font-light text-charcoal leading-[1.55] tracking-[-0.005em]">
          &ldquo;{c.closing}&rdquo;
        </p>
      </section>
    </div>
  );
}

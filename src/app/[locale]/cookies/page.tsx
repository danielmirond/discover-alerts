import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

type Locale = "es" | "en" | "fr" | "de";

const content: Record<Locale, {
  eyebrow: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: { heading: string; body: string[] }[];
  closing: string;
}> = {
  es: {
    eyebrow: "Legal",
    title: "Política de cookies",
    subtitle: "Qué cookies utilizamos, por qué las necesitamos y cómo puedes gestionarlas.",
    lastUpdated: "Última actualización: abril 2026",
    sections: [
      {
        heading: "Qué son las cookies",
        body: [
          "Las cookies son pequeños archivos de texto que los sitios web almacenan en tu navegador. Permiten recordar preferencias, analizar el tráfico y mejorar la experiencia de navegación.",
          "Aevum utiliza cookies de forma limitada y transparente, priorizando siempre tu privacidad.",
        ],
      },
      {
        heading: "Cookies que utilizamos",
        body: [
          "Cookies estrictamente necesarias — Esenciales para el funcionamiento del sitio: preferencia de idioma, consentimiento de cookies. No se pueden desactivar. Duración: sesión o 12 meses.",
          "Cookies analíticas — Utilizamos Plausible Analytics, que no usa cookies personales. La analítica es anónima, sin rastreo individual ni fingerprinting. No compartimos datos con terceros.",
          "Cookies de afiliación — Cuando haces clic en un enlace de afiliado (Amazon, Oura, WHOOP, etc.), el sitio del vendedor puede establecer cookies propias para atribuir la venta. Estas cookies son de terceros y están sujetas a sus propias políticas de privacidad.",
        ],
      },
      {
        heading: "Cookies de terceros",
        body: [
          "Amazon Associates — Amazon establece cookies cuando visitas Amazon.es/com/fr/de a través de nuestros enlaces. Duración: 24 horas (sesión estándar de Amazon). Política: amazon.es/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ",
          "Beehiiv (newsletter) — Si te suscribes al Aevum Briefing, Beehiiv puede establecer cookies funcionales para gestionar la suscripción.",
          "No utilizamos cookies de publicidad, remarketing, redes sociales ni ningún otro servicio de tracking de terceros.",
        ],
      },
      {
        heading: "Cómo gestionar las cookies",
        body: [
          "Puedes gestionar o eliminar cookies en cualquier momento desde la configuración de tu navegador:",
          "Chrome: Configuración → Privacidad y seguridad → Cookies. Firefox: Ajustes → Privacidad y seguridad. Safari: Preferencias → Privacidad. Edge: Configuración → Cookies y permisos del sitio.",
          "Ten en cuenta que desactivar las cookies estrictamente necesarias puede afectar al funcionamiento del sitio (por ejemplo, la preferencia de idioma no se recordará).",
        ],
      },
      {
        heading: "Base legal",
        body: [
          "Las cookies estrictamente necesarias se procesan bajo la base legal de interés legítimo (Art. 6.1.f RGPD). Las cookies analíticas y de afiliación requieren tu consentimiento previo (Art. 6.1.a RGPD), que puedes retirar en cualquier momento.",
          "Aevum cumple con el Reglamento General de Protección de Datos (RGPD), la Directiva ePrivacy (2002/58/CE) y la Ley 34/2002 de Servicios de la Sociedad de la Información (LSSI-CE) española.",
        ],
      },
      {
        heading: "Contacto",
        body: [
          "Para cualquier consulta sobre cookies o privacidad, puedes escribirnos a: privacidad@byaevum.com",
        ],
      },
    ],
    closing: "Transparencia no es solo una palabra — es cómo tratamos tus datos.",
  },
  en: {
    eyebrow: "Legal",
    title: "Cookie policy",
    subtitle: "What cookies we use, why we need them and how you can manage them.",
    lastUpdated: "Last updated: April 2026",
    sections: [
      {
        heading: "What are cookies",
        body: [
          "Cookies are small text files that websites store in your browser. They allow sites to remember preferences, analyze traffic and improve the browsing experience.",
          "Aevum uses cookies in a limited and transparent way, always prioritizing your privacy.",
        ],
      },
      {
        heading: "Cookies we use",
        body: [
          "Strictly necessary cookies — Essential for the website to function: language preference, cookie consent. Cannot be disabled. Duration: session or 12 months.",
          "Analytics cookies — We use Plausible Analytics, which does not use personal cookies. Analytics are anonymous, with no individual tracking or fingerprinting. We do not share data with third parties.",
          "Affiliate cookies — When you click an affiliate link (Amazon, Oura, WHOOP, etc.), the seller's site may set its own cookies for sale attribution. These are third-party cookies subject to their own privacy policies.",
        ],
      },
      {
        heading: "Third-party cookies",
        body: [
          "Amazon Associates — Amazon sets cookies when you visit Amazon through our links. Duration: 24 hours (Amazon standard session).",
          "Beehiiv (newsletter) — If you subscribe to Aevum Briefing, Beehiiv may set functional cookies to manage your subscription.",
          "We do not use advertising, remarketing, social media or any other third-party tracking cookies.",
        ],
      },
      {
        heading: "How to manage cookies",
        body: [
          "You can manage or delete cookies at any time from your browser settings:",
          "Chrome: Settings → Privacy and security → Cookies. Firefox: Settings → Privacy & Security. Safari: Preferences → Privacy. Edge: Settings → Cookies and site permissions.",
          "Note that disabling strictly necessary cookies may affect site functionality (for example, your language preference won't be remembered).",
        ],
      },
      {
        heading: "Legal basis",
        body: [
          "Strictly necessary cookies are processed under the legal basis of legitimate interest (Art. 6.1.f GDPR). Analytics and affiliate cookies require your prior consent (Art. 6.1.a GDPR), which you can withdraw at any time.",
          "Aevum complies with the General Data Protection Regulation (GDPR) and the ePrivacy Directive (2002/58/EC).",
        ],
      },
      {
        heading: "Contact",
        body: [
          "For any questions about cookies or privacy, you can write to us at: privacy@byaevum.com",
        ],
      },
    ],
    closing: "Transparency isn't just a word — it's how we handle your data.",
  },
  fr: {
    eyebrow: "Légal",
    title: "Politique de cookies",
    subtitle: "Quels cookies nous utilisons, pourquoi nous en avons besoin et comment les gérer.",
    lastUpdated: "Dernière mise à jour : avril 2026",
    sections: [
      {
        heading: "Qu'est-ce qu'un cookie",
        body: [
          "Les cookies sont de petits fichiers texte stockés dans votre navigateur par les sites web. Ils permettent de mémoriser vos préférences, d'analyser le trafic et d'améliorer l'expérience de navigation.",
          "Aevum utilise les cookies de manière limitée et transparente, en privilégiant toujours votre vie privée.",
        ],
      },
      {
        heading: "Cookies que nous utilisons",
        body: [
          "Cookies strictement nécessaires — Essentiels au fonctionnement du site : préférence de langue, consentement aux cookies. Ne peuvent pas être désactivés. Durée : session ou 12 mois.",
          "Cookies analytiques — Nous utilisons Plausible Analytics, qui n'utilise pas de cookies personnels. L'analyse est anonyme, sans suivi individuel ni fingerprinting.",
          "Cookies d'affiliation — Lorsque vous cliquez sur un lien affilié (Amazon, Oura, WHOOP, etc.), le site du vendeur peut définir ses propres cookies pour l'attribution des ventes.",
        ],
      },
      {
        heading: "Cookies tiers",
        body: [
          "Amazon Partenaires — Amazon définit des cookies lorsque vous visitez Amazon via nos liens. Durée : 24 heures.",
          "Beehiiv (newsletter) — Si vous vous abonnez à Aevum Briefing, Beehiiv peut définir des cookies fonctionnels.",
          "Nous n'utilisons pas de cookies de publicité, remarketing, réseaux sociaux ou tout autre service de tracking tiers.",
        ],
      },
      {
        heading: "Gérer les cookies",
        body: [
          "Vous pouvez gérer ou supprimer les cookies à tout moment depuis les paramètres de votre navigateur.",
          "La désactivation des cookies strictement nécessaires peut affecter le fonctionnement du site.",
        ],
      },
      {
        heading: "Base légale",
        body: [
          "Les cookies strictement nécessaires sont traités sur la base de l'intérêt légitime (Art. 6.1.f RGPD). Les cookies analytiques et d'affiliation requièrent votre consentement préalable (Art. 6.1.a RGPD).",
          "Aevum respecte le Règlement Général sur la Protection des Données (RGPD) et la Directive ePrivacy (2002/58/CE).",
        ],
      },
      {
        heading: "Contact",
        body: [
          "Pour toute question sur les cookies ou la confidentialité : privacy@byaevum.com",
        ],
      },
    ],
    closing: "La transparence n'est pas qu'un mot — c'est la façon dont nous traitons vos données.",
  },
  de: {
    eyebrow: "Rechtliches",
    title: "Cookie-Richtlinie",
    subtitle: "Welche Cookies wir verwenden, warum wir sie brauchen und wie du sie verwalten kannst.",
    lastUpdated: "Letzte Aktualisierung: April 2026",
    sections: [
      {
        heading: "Was sind Cookies",
        body: [
          "Cookies sind kleine Textdateien, die Websites in deinem Browser speichern. Sie ermöglichen es, Einstellungen zu speichern, den Datenverkehr zu analysieren und das Nutzererlebnis zu verbessern.",
          "Aevum verwendet Cookies in begrenztem und transparentem Umfang und priorisiert stets deine Privatsphäre.",
        ],
      },
      {
        heading: "Cookies, die wir verwenden",
        body: [
          "Unbedingt erforderliche Cookies — Wesentlich für die Funktion der Website: Spracheinstellung, Cookie-Einwilligung. Können nicht deaktiviert werden. Dauer: Sitzung oder 12 Monate.",
          "Analyse-Cookies — Wir verwenden Plausible Analytics, das keine persönlichen Cookies verwendet. Die Analyse ist anonym, ohne individuelles Tracking oder Fingerprinting.",
          "Affiliate-Cookies — Wenn du auf einen Affiliate-Link klickst (Amazon, Oura, WHOOP, etc.), kann die Website des Verkäufers eigene Cookies zur Verkaufszuordnung setzen.",
        ],
      },
      {
        heading: "Cookies von Drittanbietern",
        body: [
          "Amazon PartnerNet — Amazon setzt Cookies, wenn du Amazon über unsere Links besuchst. Dauer: 24 Stunden.",
          "Beehiiv (Newsletter) — Wenn du dich für das Aevum Briefing anmeldest, kann Beehiiv funktionale Cookies setzen.",
          "Wir verwenden keine Werbe-, Remarketing-, Social-Media- oder sonstigen Tracking-Cookies von Drittanbietern.",
        ],
      },
      {
        heading: "Cookies verwalten",
        body: [
          "Du kannst Cookies jederzeit in den Einstellungen deines Browsers verwalten oder löschen.",
          "Das Deaktivieren unbedingt erforderlicher Cookies kann die Funktionalität der Website beeinträchtigen.",
        ],
      },
      {
        heading: "Rechtsgrundlage",
        body: [
          "Unbedingt erforderliche Cookies werden auf Grundlage des berechtigten Interesses verarbeitet (Art. 6 Abs. 1 lit. f DSGVO). Analyse- und Affiliate-Cookies erfordern deine vorherige Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).",
          "Aevum hält die Datenschutz-Grundverordnung (DSGVO) und die ePrivacy-Richtlinie (2002/58/EG) ein.",
        ],
      },
      {
        heading: "Kontakt",
        body: [
          "Bei Fragen zu Cookies oder Datenschutz: privacy@byaevum.com",
        ],
      },
    ],
    closing: "Transparenz ist nicht nur ein Wort — es ist unser Umgang mit deinen Daten.",
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

export default async function CookiePolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = content[locale as Locale] || content.en;

  return (
    <div className="animate-fade-up">
      <section className="max-w-[780px] mx-auto px-8 pt-20 pb-12 text-center border-b border-hairline">
        <div className="eyebrow mb-6">{c.eyebrow}</div>
        <h1 className="display-lg mb-6">{c.title}</h1>
        <p className="font-serif italic text-[18px] text-stone leading-[1.55] max-w-[560px] mx-auto font-light">
          {c.subtitle}
        </p>
        <p className="text-[11px] text-mist tracking-[0.15em] uppercase mt-6">
          {c.lastUpdated}
        </p>
      </section>

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

      <section className="max-w-[720px] mx-auto px-8 py-20 text-center">
        <div className="ornament text-[10px] tracking-[0.3em] uppercase max-w-[300px] mx-auto mb-8" />
        <p className="font-serif italic text-[20px] font-light text-charcoal leading-[1.55] tracking-[-0.005em]">
          &ldquo;{c.closing}&rdquo;
        </p>
      </section>
    </div>
  );
}

import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";

type Locale = "es" | "en" | "fr" | "de";

const content: Record<Locale, {
  eyebrow: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  cookieLinkLabel: string;
  sections: { heading: string; body: string[] }[];
  closing: string;
}> = {
  es: {
    eyebrow: "Legal",
    title: "Política de privacidad",
    subtitle: "Cómo recopilamos, usamos y protegemos tu información personal.",
    lastUpdated: "Última actualización: abril 2026",
    cookieLinkLabel: "política de cookies",
    sections: [
      {
        heading: "Responsable del tratamiento",
        body: [
          "byAevum es un proyecto editorial independiente. Responsable: Daniel Mirón. Contacto: privacidad@byaevum.com",
          "Domicilio fiscal: España. El tratamiento de datos se realiza conforme al Reglamento General de Protección de Datos (RGPD) UE 2016/679.",
        ],
      },
      {
        heading: "Qué datos recopilamos",
        body: [
          "Datos de navegación — Utilizamos Plausible Analytics, una plataforma de analítica respetuosa con la privacidad que no usa cookies, no recopila datos personales y no hace fingerprinting. Los datos son agregados y anónimos.",
          "Datos de suscripción — Si te suscribes al Aevum Briefing (newsletter), recopilamos tu dirección de email. Este dato se procesa a través de Beehiiv, nuestro proveedor de email marketing, conforme a su política de privacidad.",
          "Datos de afiliación — No recopilamos datos de compra. Cuando haces clic en un enlace de afiliado, la transacción ocurre directamente en el sitio del vendedor (Amazon, Oura, etc.). Solo recibimos reportes agregados de comisiones.",
        ],
      },
      {
        heading: "Base legal del tratamiento",
        body: [
          "Consentimiento (Art. 6.1.a RGPD) — Para el envío de newsletters y cookies no esenciales.",
          "Interés legítimo (Art. 6.1.f RGPD) — Para analítica web anónima y cookies estrictamente necesarias.",
          "Puedes retirar tu consentimiento en cualquier momento sin que afecte a la licitud del tratamiento previo.",
        ],
      },
      {
        heading: "Con quién compartimos datos",
        body: [
          "No vendemos, alquilamos ni compartimos datos personales con terceros para fines comerciales.",
          "Proveedores de servicio: Vercel (hosting), Beehiiv (newsletter), Plausible (analítica anónima). Todos cumplen con el RGPD o están certificados bajo el EU-US Data Privacy Framework.",
        ],
      },
      {
        heading: "Transferencias internacionales",
        body: [
          "Algunos proveedores pueden procesar datos fuera del EEE. En esos casos, se aplican garantías adecuadas como Cláusulas Contractuales Tipo (SCC) de la Comisión Europea o certificaciones bajo el EU-US Data Privacy Framework.",
        ],
      },
      {
        heading: "Tus derechos",
        body: [
          "Conforme al RGPD, tienes derecho a: acceder a tus datos personales, rectificarlos, suprimirlos (derecho al olvido), limitar su tratamiento, oponerte al tratamiento y a la portabilidad de datos.",
          "Para ejercer estos derechos, escribe a: privacidad@byaevum.com. Responderemos en un plazo máximo de 30 días.",
          "También tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) en www.aepd.es si consideras que tus derechos no han sido respetados.",
        ],
      },
      {
        heading: "Retención de datos",
        body: [
          "Datos de newsletter — Conservamos tu email mientras mantengas la suscripción activa. Puedes darte de baja en cualquier momento desde el enlace incluido en cada email.",
          "Datos analíticos — Los datos de Plausible son anónimos y agregados. No se vinculan a usuarios individuales.",
        ],
      },
      {
        heading: "Seguridad",
        body: [
          "byAevum implementa medidas técnicas y organizativas para proteger tus datos: hosting HTTPS, cifrado en tránsito, acceso restringido a datos y proveedores con certificaciones de seguridad.",
        ],
      },
      {
        heading: "Menores",
        body: [
          "byAevum no está dirigido a menores de 16 años. No recopilamos conscientemente datos de menores.",
        ],
      },
    ],
    closing: "Tu privacidad no es un producto. Es un derecho que protegemos activamente.",
  },
  en: {
    eyebrow: "Legal",
    title: "Privacy policy",
    subtitle: "How we collect, use and protect your personal information.",
    lastUpdated: "Last updated: April 2026",
    cookieLinkLabel: "cookie policy",
    sections: [
      {
        heading: "Data controller",
        body: [
          "byAevum is an independent editorial project. Controller: Daniel Mirón. Contact: privacy@byaevum.com",
          "Registered in Spain. Data processing is carried out in accordance with the General Data Protection Regulation (GDPR) EU 2016/679.",
        ],
      },
      {
        heading: "What data we collect",
        body: [
          "Browsing data — We use Plausible Analytics, a privacy-friendly analytics platform that does not use cookies, does not collect personal data and does not fingerprint. Data is aggregated and anonymous.",
          "Subscription data — If you subscribe to Aevum Briefing (newsletter), we collect your email address. This data is processed through Beehiiv, our email marketing provider.",
          "Affiliate data — We do not collect purchase data. When you click an affiliate link, the transaction occurs directly on the seller's site. We only receive aggregated commission reports.",
        ],
      },
      {
        heading: "Legal basis for processing",
        body: [
          "Consent (Art. 6.1.a GDPR) — For sending newsletters and non-essential cookies.",
          "Legitimate interest (Art. 6.1.f GDPR) — For anonymous web analytics and strictly necessary cookies.",
          "You can withdraw your consent at any time without affecting the lawfulness of prior processing.",
        ],
      },
      {
        heading: "Who we share data with",
        body: [
          "We do not sell, rent or share personal data with third parties for commercial purposes.",
          "Service providers: Vercel (hosting), Beehiiv (newsletter), Plausible (anonymous analytics). All comply with GDPR or are certified under the EU-US Data Privacy Framework.",
        ],
      },
      {
        heading: "International transfers",
        body: [
          "Some providers may process data outside the EEA. In such cases, adequate safeguards apply, such as Standard Contractual Clauses (SCC) from the European Commission or EU-US Data Privacy Framework certifications.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Under GDPR, you have the right to: access your personal data, rectify it, erase it (right to be forgotten), restrict processing, object to processing and data portability.",
          "To exercise these rights, write to: privacy@byaevum.com. We will respond within 30 days.",
          "You also have the right to lodge a complaint with the Spanish Data Protection Agency (AEPD) at www.aepd.es.",
        ],
      },
      {
        heading: "Data retention",
        body: [
          "Newsletter data — We keep your email as long as your subscription is active. You can unsubscribe at any time via the link in each email.",
          "Analytics data — Plausible data is anonymous and aggregated. It is not linked to individual users.",
        ],
      },
      {
        heading: "Security",
        body: [
          "byAevum implements technical and organizational measures to protect your data: HTTPS hosting, encryption in transit, restricted data access and security-certified providers.",
        ],
      },
      {
        heading: "Minors",
        body: [
          "byAevum is not directed at minors under 16. We do not knowingly collect data from minors.",
        ],
      },
    ],
    closing: "Your privacy is not a product. It's a right we actively protect.",
  },
  fr: {
    eyebrow: "Légal",
    title: "Politique de confidentialité",
    subtitle: "Comment nous collectons, utilisons et protégeons vos informations personnelles.",
    lastUpdated: "Dernière mise à jour : avril 2026",
    cookieLinkLabel: "politique de cookies",
    sections: [
      {
        heading: "Responsable du traitement",
        body: [
          "byAevum est un projet éditorial indépendant. Responsable : Daniel Mirón. Contact : privacy@byaevum.com",
          "Enregistré en Espagne. Le traitement des données est effectué conformément au RGPD (UE 2016/679).",
        ],
      },
      {
        heading: "Données collectées",
        body: [
          "Données de navigation — Nous utilisons Plausible Analytics, sans cookies personnels, sans données personnelles, sans fingerprinting. Les données sont agrégées et anonymes.",
          "Données d'abonnement — Si vous vous abonnez à Aevum Briefing, nous collectons votre adresse email via Beehiiv.",
          "Données d'affiliation — Nous ne collectons pas de données d'achat. Les transactions se font directement sur le site du vendeur.",
        ],
      },
      {
        heading: "Base légale",
        body: [
          "Consentement (Art. 6.1.a RGPD) — Pour les newsletters et cookies non essentiels.",
          "Intérêt légitime (Art. 6.1.f RGPD) — Pour l'analyse web anonyme et les cookies nécessaires.",
        ],
      },
      {
        heading: "Vos droits",
        body: [
          "Conformément au RGPD : accès, rectification, suppression, limitation, opposition et portabilité de vos données. Contact : privacy@byaevum.com",
          "Vous pouvez également déposer une plainte auprès de la CNIL (www.cnil.fr).",
        ],
      },
      {
        heading: "Sécurité",
        body: [
          "byAevum met en œuvre des mesures techniques et organisationnelles pour protéger vos données : hébergement HTTPS, chiffrement en transit, accès restreint.",
        ],
      },
    ],
    closing: "Votre vie privée n'est pas un produit. C'est un droit que nous protégeons activement.",
  },
  de: {
    eyebrow: "Rechtliches",
    title: "Datenschutzerklärung",
    subtitle: "Wie wir deine persönlichen Daten erheben, verwenden und schützen.",
    lastUpdated: "Letzte Aktualisierung: April 2026",
    cookieLinkLabel: "Cookie-Richtlinie",
    sections: [
      {
        heading: "Verantwortlicher",
        body: [
          "byAevum ist ein unabhängiges redaktionelles Projekt. Verantwortlicher: Daniel Mirón. Kontakt: privacy@byaevum.com",
          "Registriert in Spanien. Die Datenverarbeitung erfolgt gemäß der DSGVO (EU 2016/679).",
        ],
      },
      {
        heading: "Welche Daten wir erheben",
        body: [
          "Browsing-Daten — Wir verwenden Plausible Analytics, ohne persönliche Cookies, ohne personenbezogene Daten, ohne Fingerprinting. Die Daten sind aggregiert und anonym.",
          "Abo-Daten — Wenn du dich für das Aevum Briefing anmeldest, erheben wir deine E-Mail-Adresse über Beehiiv.",
          "Affiliate-Daten — Wir erheben keine Kaufdaten. Transaktionen finden direkt auf der Website des Verkäufers statt.",
        ],
      },
      {
        heading: "Rechtsgrundlage",
        body: [
          "Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) — Für Newsletter und nicht wesentliche Cookies.",
          "Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) — Für anonyme Webanalyse und unbedingt erforderliche Cookies.",
        ],
      },
      {
        heading: "Deine Rechte",
        body: [
          "Gemäß DSGVO hast du das Recht auf: Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Datenübertragbarkeit. Kontakt: privacy@byaevum.com",
          "Du kannst auch eine Beschwerde bei der zuständigen Datenschutzbehörde einreichen.",
        ],
      },
      {
        heading: "Sicherheit",
        body: [
          "byAevum setzt technische und organisatorische Maßnahmen zum Schutz deiner Daten um: HTTPS-Hosting, Verschlüsselung, eingeschränkter Zugriff.",
        ],
      },
    ],
    closing: "Deine Privatsphäre ist kein Produkt. Sie ist ein Recht, das wir aktiv schützen.",
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

export default async function PrivacyPolicyPage({
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

        <div className="mt-14 p-6 bg-ivory border border-hairline text-center">
          <p className="text-stone text-[13px]">
            <Link
              href={`/${locale}/cookies`}
              className="text-emerald underline underline-offset-2 decoration-emerald/30 hover:decoration-emerald transition-all"
            >
              {c.cookieLinkLabel}
            </Link>
          </p>
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

import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { locales, type Locale } from "@/i18n/routing";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import "@/app/globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://byaevum.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  const site = messages.site;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${site.name} — ${site.tagline}`,
      template: `%s | ${site.name}`,
    },
    description: site.description,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        locales.map((l) => [l, `/${l}`])
      ),
    },
    openGraph: {
      type: "website",
      locale,
      url: `${SITE_URL}/${locale}`,
      title: `${site.name} — ${site.tagline}`,
      description: site.description,
      siteName: site.name,
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.name} — ${site.tagline}`,
      description: site.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <meta name="google-site-verification" content="wQCuOhQfn_HNZ-63sjmv3R8B4SbHzBMto8fBF7jlK-M" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {locales.map((l) => (
          <link
            key={l}
            rel="alternate"
            hrefLang={l}
            href={`/${l}`}
          />
        ))}
        <link rel="alternate" hrefLang="x-default" href="/en" />
      </head>
      <body className="min-h-screen flex flex-col bg-bg">
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

// Analytics privacy-friendly. Se activa solo si NEXT_PUBLIC_PLAUSIBLE_DOMAIN
// esta definido. Sin cookies, sin GDPR headaches.

import Script from 'next/script';

export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  const src =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ??
    'https://plausible.io/js/script.js';

  return <Script defer data-domain={domain} src={src} strategy="afterInteractive" />;
}

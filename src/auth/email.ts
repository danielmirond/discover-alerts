/**
 * Envío de emails vía Resend. Si RESEND_API_KEY no está definida,
 * logueamos el contenido en stdout (modo dev).
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || 'Discover Alerts <onboarding@resend.dev>';

  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY missing. Would send to ${opts.to}:\nSubject: ${opts.subject}\n${opts.html}`);
    return;
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend API ${resp.status}: ${text}`);
  }
}

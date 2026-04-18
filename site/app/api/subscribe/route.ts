// Endpoint de suscripcion a la newsletter.
//
// Si se configura la env var RESEND_API_KEY + RESEND_AUDIENCE_ID,
// se crea un contacto en Resend. En ausencia de esas vars, el endpoint
// responde ok pero solo hace log (util para el dev inicial sin cuenta).

import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function addToResend(email: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) return false;

  const res = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    console.error('[subscribe] Resend error:', res.status, t);
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json(
      { error: 'Email no valido' },
      { status: 400 },
    );
  }

  const ok = await addToResend(email);
  if (!ok) {
    // Sin Resend configurado: log y seguimos. En produccion debe haber Resend.
    console.log(`[subscribe] ${email} (no Resend configured, logged only)`);
  }

  return NextResponse.json({ ok: true });
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyApprovalToken, signMagicToken } from '../../src/auth/jwt.js';
import { sendEmail } from '../../src/auth/email.js';

/**
 * GET /api/auth/approve?token=xxx&action=approve|deny
 *
 * Abierto desde el email que recibe el admin. Valida el approval token
 * (firmado con AUTH_SECRET, TTL 7d) y:
 *  - action=approve → genera magic link y lo envía al solicitante.
 *  - action=deny    → no hace nada, muestra confirmación.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = String(req.query.token || '');
  const action = String(req.query.action || 'approve');

  if (!token) {
    res.status(400).send(page('Falta token.'));
    return;
  }

  const email = await verifyApprovalToken(token);
  if (!email) {
    res.status(401).send(page('El token de aprobación es inválido o ha caducado.'));
    return;
  }

  if (action === 'deny') {
    res.status(200).send(page(`Solicitud de <strong>${escapeHtml(email)}</strong> rechazada. No se ha enviado ningún enlace.`));
    return;
  }

  try {
    const magicToken = await signMagicToken(email);
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
    const link = `${appUrl}/api/auth/verify?token=${encodeURIComponent(magicToken)}`;

    await sendEmail({
      to: email,
      subject: 'Tu acceso a Discover Alerts',
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 16px 0;font-size:18px;">Acceso aprobado</h2>
          <p style="margin:0 0 16px 0;color:#333;line-height:1.5;">
            Tu solicitud de acceso a Discover Alerts ha sido aprobada.
            Haz click en el botón para entrar. El enlace caduca en 15 minutos.
          </p>
          <p style="margin:24px 0;">
            <a href="${link}"
               style="background:#0b5fff;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
              Entrar
            </a>
          </p>
          <p style="color:#666;font-size:12px;line-height:1.5;word-break:break-all;">
            Si el botón no funciona: ${link}
          </p>
        </div>
      `,
    });

    res.status(200).send(page(`Acceso aprobado. Se ha enviado el magic link a <strong>${escapeHtml(email)}</strong>.`));
  } catch (err: any) {
    console.error('[auth/approve] failed:', err);
    res.status(500).send(page('Error al enviar el magic link. Revisa los logs.'));
  }
}

function page(msg: string): string {
  return `<!doctype html><meta charset="utf-8"><title>Discover Alerts</title>
    <div style="font-family:system-ui;padding:40px;max-width:520px;margin:0 auto;color:#222;">
      <h2 style="margin:0 0 12px 0;">Discover Alerts</h2>
      <p style="line-height:1.5;">${msg}</p>
    </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

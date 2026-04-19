import type { VercelRequest, VercelResponse } from '@vercel/node';
import { signApprovalToken } from '../../src/auth/jwt.js';
import { sendEmail } from '../../src/auth/email.js';

/**
 * POST /api/auth/request
 * Body: { email: string }
 *
 * Flujo aprobación manual:
 *  - Cualquiera puede pedir acceso desde /login.html.
 *  - En vez de enviar el magic link al solicitante, enviamos un email al
 *    ADMIN_EMAIL con enlaces Aprobar / Rechazar.
 *  - Al aprobar, /api/auth/approve envía el magic link real.
 *  - Siempre respondemos 200 OK al frontend para no filtrar info.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Email inválido' });
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('[auth/request] ADMIN_EMAIL not set — cannot route approval request');
    res.status(200).json({ ok: true }); // no filtramos config
    return;
  }

  try {
    const approvalToken = await signApprovalToken(email);
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
    const approveLink = `${appUrl}/api/auth/approve?token=${encodeURIComponent(approvalToken)}&action=approve`;
    const denyLink = `${appUrl}/api/auth/approve?token=${encodeURIComponent(approvalToken)}&action=deny`;

    const userAgent = String(req.headers['user-agent'] || '—');
    const forwardedFor = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '—');
    const when = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

    await sendEmail({
      to: adminEmail,
      subject: `[Discover Alerts] Solicitud de acceso: ${email}`,
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 8px 0;font-size:18px;">Nueva solicitud de acceso</h2>
          <p style="margin:0 0 16px 0;color:#333;">
            <strong style="font-size:15px;">${escapeHtml(email)}</strong> quiere entrar a Discover Alerts.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;color:#555;">
            <tr><td style="padding:4px 0;color:#888;">Cuándo</td><td>${escapeHtml(when)}</td></tr>
            <tr><td style="padding:4px 0;color:#888;">IP</td><td>${escapeHtml(forwardedFor)}</td></tr>
            <tr><td style="padding:4px 0;color:#888;">User-Agent</td><td style="word-break:break-all;">${escapeHtml(userAgent)}</td></tr>
          </table>
          <div style="margin:28px 0;">
            <a href="${approveLink}"
               style="background:#19a463;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin-right:8px;">
              ✓ Aprobar
            </a>
            <a href="${denyLink}"
               style="background:#eee;color:#333;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
              ✗ Rechazar
            </a>
          </div>
          <p style="color:#888;font-size:12px;line-height:1.5;">
            Si apruebas, se enviará automáticamente un magic link al solicitante (válido 15min).
            El enlace de aprobación caduca en 7 días.
          </p>
        </div>
      `,
    });

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[auth/request] failed:', err);
    // Igualmente respondemos OK al cliente para no filtrar errores internos
    res.status(200).json({ ok: true });
  }
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  verifyMagicToken,
  signSessionToken,
  buildSessionCookie,
} from '../../src/auth/jwt.js';

/**
 * GET /api/auth/verify?token=xxx
 * Valida el magic token, setea cookie de sesión y redirige a /.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = String(req.query.token || '');
  if (!token) {
    res.status(400).send('Falta token');
    return;
  }

  const email = await verifyMagicToken(token);
  if (!email) {
    res.status(401).send(renderError('El enlace es inválido o ha caducado. Pide uno nuevo.'));
    return;
  }

  const session = await signSessionToken(email);
  res.setHeader('Set-Cookie', buildSessionCookie(session));
  res.setHeader('Location', '/');
  res.status(302).end();
}

function renderError(msg: string): string {
  return `<!doctype html><meta charset="utf-8"><title>Error</title>
    <div style="font-family:system-ui;padding:40px;max-width:480px;margin:0 auto;">
      <h2>No se pudo iniciar sesión</h2>
      <p>${msg}</p>
      <p><a href="/login.html">Volver al login</a></p>
    </div>`;
}

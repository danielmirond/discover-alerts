import { SignJWT, jwtVerify } from 'jose';

const MAGIC_TTL_SECONDS = 15 * 60;       // 15 min
const SESSION_TTL_SECONDS = 30 * 24 * 3600; // 30 días

const COOKIE_NAME = 'da_session';

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET env var missing or too short (min 32 chars)');
  }
  return new TextEncoder().encode(secret);
}

export function getAllowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string): boolean {
  const allowed = getAllowedEmails();
  if (allowed.length === 0) return false; // fail closed si no configurado
  return allowed.includes(email.trim().toLowerCase());
}

const APPROVAL_TTL_SECONDS = 7 * 24 * 3600; // 7 días para aprobar

export async function signApprovalToken(email: string): Promise<string> {
  return await new SignJWT({ email: email.toLowerCase(), kind: 'approval' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${APPROVAL_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyApprovalToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== 'approval' || typeof payload.email !== 'string') return null;
    return payload.email;
  } catch {
    return null;
  }
}

export async function signMagicToken(email: string): Promise<string> {
  return await new SignJWT({ email: email.toLowerCase(), kind: 'magic' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAGIC_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyMagicToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== 'magic' || typeof payload.email !== 'string') return null;
    return payload.email;
  } catch {
    return null;
  }
}

export async function signSessionToken(email: string): Promise<string> {
  return await new SignJWT({ email: email.toLowerCase(), kind: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== 'session' || typeof payload.email !== 'string') return null;
    return payload.email;
  } catch {
    return null;
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const i = pair.indexOf('=');
    if (i < 0) continue;
    const k = pair.slice(0, i).trim();
    const v = decodeURIComponent(pair.slice(i + 1).trim());
    if (k) out[k] = v;
  }
  return out;
}

export function sessionCookieName(): string { return COOKIE_NAME; }

export function buildSessionCookie(token: string, maxAgeSeconds = SESSION_TTL_SECONDS): string {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildClearCookie(): string {
  return buildSessionCookie('', 0);
}

export async function getSessionEmailFromReq(req: { headers: { cookie?: string | string[] } }): Promise<string | null> {
  const raw = req.headers.cookie;
  const header = Array.isArray(raw) ? raw.join('; ') : raw;
  const cookies = parseCookies(header);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return await verifySessionToken(token);
}

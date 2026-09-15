import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = '__Host-tlm_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type Session = { email: string; name: string; isAdmin: true; exp: number };

const base64Url = (value: string) => Buffer.from(value).toString('base64url');
const fromBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

function secret() {
  const value = (process.env.AUTH_SESSION_SECRET || '').trim().replace(/^["']|["']$/g, '');
  if (!value || value.length < 32) {
    throw new Error('AUTH_SESSION_SECRET must be configured and at least 32 characters');
  }
  return value;
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function cookieValue(req: VercelRequest) {
  const cookies = req.headers.cookie || '';
  return cookies
    .split(';')
    .map((v: string) => v.trim())
    .find((v: string) => v.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
}

export function getSession(req: VercelRequest): Session | null {
  try {
    const raw = cookieValue(req);
    if (!raw) return null;

    const parts = raw.split('.');
    if (parts.length !== 2) return null;
    const [encoded, providedSignature] = parts;
    if (!encoded || !providedSignature) return null;

    const expected = sign(encoded);
    const a = Buffer.from(providedSignature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const session = JSON.parse(fromBase64Url(encoded)) as Partial<Session>;
    if (
      !session.email ||
      !session.name ||
      session.isAdmin !== true ||
      typeof session.exp !== 'number' ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session as Session;
  } catch {
    return null;
  }
}

export function requireAdmin(req: VercelRequest, res: VercelResponse): Session | null {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
    return null;
  }
  if (!isAdminEmail(session.email)) {
    res.status(403).json({ error: 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ' });
    return null;
  }
  return session;
}

export async function verifyGoogleCredential(
  credential: string
): Promise<{ email: string; name: string; picture?: string } | null> {
  if (!credential) return null;

  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
  if (!clientId) return null;

  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!response.ok) return null;

    const token = await response.json() as {
      email?: string;
      name?: string;
      picture?: string;
      aud?: string;
      email_verified?: string | boolean;
      iss?: string;
      exp?: string;
    };

    if (token.aud !== clientId) return null;
    if (token.iss && token.iss !== 'https://accounts.google.com' && token.iss !== 'accounts.google.com') return null;
    if (String(token.email_verified).toLowerCase() !== 'true' || !token.email) return null;
    if (token.exp && Number(token.exp) <= Math.floor(Date.now() / 1000)) return null;

    const email = token.email.trim().toLowerCase();
    if (!isAdminEmail(email)) return null;

    return {
      email,
      name: token.name?.trim() || email.split('@')[0],
      picture: token.picture,
    };
  } catch {
    return null;
  }
}

export const DEFAULT_ADMIN_EMAILS = [
  'pramot.thamwi@gmail.com',
  'plyepakka@gmail.com',
];

export function isAdminEmail(email: string) {
  const raw = (process.env.ADMIN_EMAILS || '').trim();
  let list: string[] = [];
  try {
    if (raw.startsWith('[') && raw.endsWith(']')) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.map((v: unknown) => String(v).trim().toLowerCase().replace(/^["']|["']$/g, ''));
      }
    }
  } catch {}
  if (list.length === 0 && raw) {
    list = raw
      .replace(/[\[\]"']/g, '')
      .split(/[,;\n\s]+/)
      .map((v: string) => v.trim().toLowerCase())
      .filter(Boolean);
  }

  const adminList = list.length > 0 ? Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...list])) : DEFAULT_ADMIN_EMAILS;
  return adminList.includes(email.trim().toLowerCase());
}

export function setSessionCookie(
  res: VercelResponse,
  user: { email: string; name: string; isAdmin: true }
) {
  const payload: Session = {
    email: user.email.trim().toLowerCase(),
    name: user.name,
    isAdmin: true,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = base64Url(JSON.stringify(payload));
  const value = `${encoded}.${sign(encoded)}`;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`
  );
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}

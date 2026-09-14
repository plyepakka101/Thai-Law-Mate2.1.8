import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'tlm_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type Session = { email: string; name: string; isAdmin: boolean; exp: number };

const base64Url = (value: string) => Buffer.from(value).toString('base64url');
const fromBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

function secret() {
  const value = process.env.AUTH_SESSION_SECRET || 'thai_law_mate_secret_session_key_2026_super_secure';
  return value;
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function cookieValue(req: VercelRequest) {
  const cookies = req.headers.cookie || '';
  return cookies.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
}

export function getSession(req: VercelRequest): Session | null {
  try {
    const raw = cookieValue(req);
    if (!raw) return null;
    const [encoded, providedSignature] = raw.split('.');
    if (!encoded || !providedSignature) return null;
    const expected = sign(encoded);
    const a = Buffer.from(providedSignature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const session = JSON.parse(fromBase64Url(encoded)) as Session;
    return session.exp > Math.floor(Date.now() / 1000) ? session : null;
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
  if (!session.isAdmin) {
    res.status(403).json({ error: 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ' });
    return null;
  }
  return session;
}

export async function verifyGoogleCredential(credential: string): Promise<{ email: string; name: string; picture?: string } | null> {
  if (!credential) return null;
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!response.ok) return null;
    const token = await response.json() as { email?: string; name?: string; picture?: string; aud?: string; email_verified?: string };
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && token.aud !== clientId) return null;
    if (token.email_verified !== 'true' || !token.email) return null;
    return { email: token.email.toLowerCase(), name: token.name || token.email.split('@')[0], picture: token.picture };
  } catch {
    return null;
  }
}

export const DEFAULT_ADMIN_EMAILS = [
  'pramot.thamwi@gmail.com',
  'plyepakka@gmail.com'
];

export function isAdminEmail(email: string) {
  const configured = (process.env.ADMIN_EMAILS || '').split(',').map((v: string) => v.trim().toLowerCase()).filter(Boolean);
  const adminList = configured.length > 0 ? configured : DEFAULT_ADMIN_EMAILS;
  return adminList.includes(email.toLowerCase().trim());
}

export function setSessionCookie(res: VercelResponse, user: { email: string; name: string; isAdmin: boolean }) {
  const payload: Session = { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encoded = base64Url(JSON.stringify(payload));
  const value = `${encoded}.${sign(encoded)}`;
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`);
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

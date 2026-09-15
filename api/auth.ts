import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'tlm_session';
const HOST_COOKIE_NAME = '__Host-tlm_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

type Session = {
  email: string;
  name: string;
  isAdmin: true;
  exp: number;
};

export const DEFAULT_ADMIN_EMAILS = [
  'pramot.thamwi@gmail.com',
  'plyepakka@gmail.com',
];

function cleanSecret(): string {
  return (process.env.AUTH_SESSION_SECRET || '').trim().replace(/^["']|["']$/g, '');
}

function sessionConfigurationReady(): boolean {
  const secret = cleanSecret();
  return Boolean(secret && secret.length >= 32);
}

function sign(value: string): string {
  const secret = cleanSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
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

  const adminList = Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...list]));
  return adminList.includes(cleanEmail);
}

export function getSession(req: VercelRequest): Session | null {
  try {
    if (!sessionConfigurationReady()) return null;

    const cookieHeader = req.headers.cookie || '';
    const cookieList = cookieHeader.split(';').map((s: string) => s.trim());
    const cookieEntry = cookieList.find(
      (s: string) => s.startsWith(`${COOKIE_NAME}=`) || s.startsWith(`${HOST_COOKIE_NAME}=`)
    );
    if (!cookieEntry) return null;

    const raw = cookieEntry.slice(cookieEntry.indexOf('=') + 1);
    if (!raw) return null;

    const parts = raw.split('.');
    if (parts.length !== 2) return null;
    const [encoded, providedSignature] = parts;
    if (!encoded || !providedSignature) return null;

    const expected = sign(encoded);
    if (!expected) return null;

    const a = Buffer.from(providedSignature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const session = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<Session>;
    if (
      !session.email ||
      !session.name ||
      session.isAdmin !== true ||
      typeof session.exp !== 'number' ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    if (!isAdminEmail(session.email)) {
      return null;
    }

    return session as Session;
  } catch {
    return null;
  }
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
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encoded);
  const value = `${encoded}.${signature}`;

  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`,
    `${HOST_COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`,
  ]);
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    `${HOST_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  ]);
}

export async function verifyGoogleCredential(
  credential: string
): Promise<{ email: string; name: string; picture?: string } | null> {
  if (!credential) return null;

  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  if (!clientId) {
    console.error('Neither GOOGLE_CLIENT_ID nor VITE_GOOGLE_CLIENT_ID is configured on server');
    return null;
  }

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
  } catch (e) {
    console.error('Google token verification error:', e);
    return null;
  }
}

function passwordsMatch(provided: string, expected: string): boolean {
  const cleanProvided = String(provided || '').trim();
  const cleanExpected = String(expected || '').trim().replace(/^["']|["']$/g, '');
  const a = Buffer.from(cleanProvided, 'utf8');
  const b = Buffer.from(cleanExpected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === 'https://thai-law-mate2-1-8.vercel.app' || origin.endsWith('.vercel.app')) return true;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  return Boolean(vercelUrl && origin === `https://${vercelUrl}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if ((req.method === 'POST' || req.method === 'DELETE') && !isAllowedOrigin(req.headers.origin)) {
      return res.status(403).json({ error: 'คำขอจากแหล่งที่ไม่ได้รับอนุญาต' });
    }

    if (req.method === 'GET') {
      return res.status(200).json({ user: getSession(req) });
    }

    if (req.method === 'DELETE') {
      clearSessionCookie(res);
      return res.status(204).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!sessionConfigurationReady()) {
      return res.status(503).json({
        error: 'ระบบยืนยันตัวตนของเซิร์ฟเวอร์ยังไม่ได้ตั้งค่า AUTH_SESSION_SECRET (ต้องยาวอย่างน้อย 32 ตัวอักษร) ใน Vercel',
      });
    }

    // 1. Google Identity Services token verification
    if (req.body?.credential) {
      const googleUser = await verifyGoogleCredential(String(req.body.credential));
      if (!googleUser) {
        return res.status(401).json({ error: 'Google credential ไม่ถูกต้อง หมดอายุ หรือบัญชีไม่มีสิทธิ์ Admin' });
      }

      const user = { ...googleUser, isAdmin: true as const };
      try {
        setSessionCookie(res, user);
      } catch (error) {
        console.error('Google session creation failed:', error);
        return res.status(503).json({ error: 'เซิร์ฟเวอร์ไม่สามารถสร้าง Session ได้ กรุณาตรวจสอบการตั้งค่า Vercel' });
      }
      return res.status(200).json({ user });
    }

    // 2. Admin password login
    const body = req.body || {};
    const cleanEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const expectedPassword = (process.env.ADMIN_PASSWORD || '').trim().replace(/^["']|["']$/g, '');

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่านผู้ดูแลระบบ' });
    }

    if (!expectedPassword || !isAdminEmail(cleanEmail) || !passwordsMatch(password, expectedPassword)) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' });
    }

    const user = {
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      isAdmin: true as const,
    };

    try {
      setSessionCookie(res, user);
    } catch (error) {
      console.error('Password session creation failed:', error);
      return res.status(503).json({ error: 'เซิร์ฟเวอร์ไม่สามารถสร้าง Session ได้ กรุณาตรวจสอบการตั้งค่า Vercel' });
    }

    return res.status(200).json({ user });
  } catch (err: any) {
    console.error('API /auth unhandled error:', err);
    return res.status(500).json({ error: err?.message || 'เกิดข้อผิดพลาดในการประมวลผลคำขอ' });
  }
}

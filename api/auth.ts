import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookie, getSession, isAdminEmail, setSessionCookie, verifyGoogleCredential } from './_auth.ts';
import { timingSafeEqual } from 'crypto';

const PRODUCTION_ORIGIN = 'https://thai-law-mate2-1-8.vercel.app';

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === PRODUCTION_ORIGIN || origin.endsWith('.vercel.app')) return true;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  return Boolean(vercelUrl && origin === `https://${vercelUrl}`);
}

function passwordsMatch(provided: string, expected: string): boolean {
  const cleanProvided = String(provided || '').trim();
  const cleanExpected = String(expected || '').trim().replace(/^["']|["']$/g, '');
  const a = Buffer.from(cleanProvided, 'utf8');
  const b = Buffer.from(cleanExpected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function sessionConfigurationReady(): boolean {
  const secret = (process.env.AUTH_SESSION_SECRET || '').trim().replace(/^["']|["']$/g, '');
  return Boolean(secret && secret.length >= 32);
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

    // A signed session is required after every successful login.
    // Return a clear configuration error instead of an unhandled 500 when
    // AUTH_SESSION_SECRET has not yet been configured in Vercel.
    if (!sessionConfigurationReady()) {
      return res.status(503).json({
        error: 'ระบบยืนยันตัวตนของเซิร์ฟเวอร์ยังไม่ได้ตั้งค่า AUTH_SESSION_SECRET (ต้องยาวอย่างน้อย 32 ตัวอักษร) ใน Vercel',
      });
    }

    // 1. Google Identity Services: the ID token must be issued for this app's client ID
    // and the Google account must be on the server-side admin allowlist.
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

    // 2. Password login. Password is NEVER stored in source code.
    const body = req.body || {};
    const cleanEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const expectedPassword = (process.env.ADMIN_PASSWORD || '').trim().replace(/^["']|["']$/g, '');

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่านผู้ดูแลระบบ' });
    }

    // Deliberately use the same generic failure response for non-admin emails and bad passwords.
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

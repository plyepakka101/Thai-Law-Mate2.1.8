import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookie, getSession, isAdminEmail, setSessionCookie, verifyGoogleCredential } from './_auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') return res.status(200).json({ user: getSession(req) });
  if (req.method === 'DELETE') { clearSessionCookie(res); return res.status(204).end(); }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Google OAuth Token Verification
  if (req.body?.credential) {
    const googleUser = await verifyGoogleCredential(req.body?.credential);
    if (!googleUser) return res.status(401).json({ error: 'Google credential ไม่ถูกต้องหรือหมดอายุ' });
    const user = { ...googleUser, isAdmin: isAdminEmail(googleUser.email) };
    if (!user.isAdmin) return res.status(403).json({ error: 'บัญชี Google นี้ไม่มีสิทธิ์ผู้ดูแลระบบ' });
    setSessionCookie(res, user);
    return res.status(200).json({ user });
  }

  // 2. Server-side Admin Password Verification
  const { email, password } = req.body || {};
  if (email && password) {
    const cleanEmail = String(email).trim().toLowerCase();
    if (!isAdminEmail(cleanEmail)) {
      return res.status(403).json({ error: 'อีเมลนี้ไม่อยู่ในรายชื่อผู้ดูแลระบบ (Admin)' });
    }

    const expectedPassword = process.env.ADMIN_PASSWORD || 'lawmate2026';
    if (String(password).trim() !== expectedPassword) {
      return res.status(401).json({ error: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' });
    }

    const user = {
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      isAdmin: true
    };
    setSessionCookie(res, user);
    return res.status(200).json({ user });
  }

  return res.status(400).json({ error: 'ข้อมูลสำหรับเข้าสู่ระบบไม่ครบถ้วน' });
}

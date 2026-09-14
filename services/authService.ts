// Authentication Service for Thai Law Mate Admin

export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
  isAdmin: boolean;
  loginTime: number;
}

const AUTH_USER_KEY = 'thai_law_mate_auth_user';
const ADMIN_EMAILS_KEY = 'thai_law_mate_admin_emails';
const GOOGLE_CLIENT_ID_KEY = 'thai_law_mate_google_client_id';

export const getStoredGoogleClientId = (): string => {
  return localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
};

export const setStoredGoogleClientId = (clientId: string) => {
  localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId.trim());
  window.dispatchEvent(new Event('thai_law_mate_auth_changed'));
};

// Default Admin Emails (matching Deka Search project)
export const DEFAULT_ADMIN_EMAILS = [
  'pramot.thamwi@gmail.com',
  'plyepakka@gmail.com'
];

export const getAdminEmails = (): string[] => {
  try {
    const raw = localStorage.getItem(ADMIN_EMAILS_KEY);
    if (!raw) return DEFAULT_ADMIN_EMAILS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...parsed])) : DEFAULT_ADMIN_EMAILS;
  } catch {
    return DEFAULT_ADMIN_EMAILS;
  }
};

export const addAdminEmail = (email: string) => {
  const current = getAdminEmails();
  const lower = email.trim().toLowerCase();
  if (!current.includes(lower)) {
    current.push(lower);
    localStorage.setItem(ADMIN_EMAILS_KEY, JSON.stringify(current));
  }
};

export const getCurrentUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const isUserAdmin = (user: AuthUser | null): boolean => {
  if (!user || !user.email) return false;
  if (user.isAdmin === true) return true;
  const adminList = getAdminEmails().map(e => e.trim().toLowerCase());
  return adminList.includes(user.email.trim().toLowerCase());
};

// Parse Google JWT Token
export const decodeGoogleCredential = (credential: string): { email: string; name: string; picture?: string } | null => {
  try {
    const payloadPart = credential.split('.')[1];
    if (!payloadPart) return null;
    let base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      base64 += '='.repeat(4 - pad);
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return {
      email: decoded.email || '',
      name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : ''),
      picture: decoded.picture
    };
  } catch (err) {
    console.error('Failed to decode Google token:', err);
    return null;
  }
};

export const loginWithGoogleCredential = async (credential: string): Promise<{ success: boolean; user?: AuthUser; message?: string }> => {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.user) return { success: false, message: data.error || 'เข้าสู่ระบบไม่สำเร็จ' };
    const user: AuthUser = { ...data.user, loginTime: Date.now() };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('thai_law_mate_auth_changed'));
    return { success: true, user };
  } catch {
    return { success: false, message: 'เชื่อมต่อเซิร์ฟเวอร์ยืนยันตัวตนไม่ได้' };
  }
};

// Login with Admin Email & Password (verified strictly by server-side /api/auth)
export const loginWithPassword = async (email: string, password: string): Promise<{ success: boolean; user?: AuthUser; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'กรุณากรอกอีเมลที่ถูกต้อง' };
  }
  if (!password) {
    return { success: false, message: 'กรุณากรอกรหัสผ่านผู้ดูแลระบบ' };
  }

  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: password.trim() })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.user) {
      return { success: false, message: data.error || 'เข้าสู่ระบบไม่สำเร็จ' };
    }
    const user: AuthUser = { ...data.user, loginTime: Date.now() };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('thai_law_mate_auth_changed'));
    return { success: true, user };
  } catch {
    return { success: false, message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ยืนยันตัวตนได้' };
  }
};

export const loginWithGmail = loginWithPassword;

export const logout = () => {
  localStorage.removeItem(AUTH_USER_KEY);
  fetch('/api/auth', { method: 'DELETE', credentials: 'include' }).catch(() => {});
  window.dispatchEvent(new Event('thai_law_mate_auth_changed'));
};

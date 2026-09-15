// Authentication Service for Thai Law Mate Admin

export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
  isAdmin: boolean;
  loginTime: number;
}

const AUTH_USER_KEY = 'thai_law_mate_auth_user';

export const DEFAULT_ADMIN_EMAILS = [
  'pramot.thamwi@gmail.com',
  'plyepakka@gmail.com'
];

// Google Client ID is configured only through Vercel's VITE_GOOGLE_CLIENT_ID.
// It is intentionally not editable from the browser.
export const getGoogleClientId = (): string => {
  return String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
};

// Kept for compatibility with existing code. Admin authorization is server-side.
export const getAdminEmails = (): string[] => DEFAULT_ADMIN_EMAILS;
export const addAdminEmail = (_email: string) => {};

export const getCurrentUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const getServerSession = async (): Promise<AuthUser | null> => {
  try {
    const response = await fetch('/api/auth', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    if (!data.user || data.user.isAdmin !== true || !data.user.email) return null;
    return { ...data.user, loginTime: Date.now() } as AuthUser;
  } catch {
    return null;
  }
};

export const isUserAdmin = (user: AuthUser | null): boolean => {
  if (!user?.email || user.isAdmin !== true) return false;
  const email = user.email.trim().toLowerCase();
  return DEFAULT_ADMIN_EMAILS.includes(email);
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
    if (!response.ok || !data.user) {
      return { success: false, message: data.error || 'เข้าสู่ระบบ Google ไม่สำเร็จ' };
    }
    const user: AuthUser = { ...data.user, loginTime: Date.now() };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('thai_law_mate_auth_changed'));
    return { success: true, user };
  } catch {
    return { success: false, message: 'เชื่อมต่อเซิร์ฟเวอร์ยืนยันตัวตนไม่ได้' };
  }
};

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
      body: JSON.stringify({ email: cleanEmail, password })
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

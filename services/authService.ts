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

// Default Admin Emails (matching Deka Search project)
export const DEFAULT_ADMIN_EMAILS = [
  'pramot.thamwi@gmail.com',
  'plyepakka@gmail.com'
];

// Admin master passcode fallback (allows instant login if OAuth client is not yet registered on Google Cloud Console)
const ADMIN_MASTER_PASSCODE = 'lawmate2026';

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
  if (!user) return false;
  const adminList = getAdminEmails().map(e => e.toLowerCase());
  return adminList.includes(user.email.toLowerCase()) || user.isAdmin === true;
};

// Parse Google JWT Token
export const decodeGoogleCredential = (credential: string): { email: string; name: string; picture?: string } | null => {
  try {
    const payloadPart = credential.split('.')[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return {
      email: decoded.email,
      name: decoded.name || decoded.email.split('@')[0],
      picture: decoded.picture
    };
  } catch (err) {
    console.error('Failed to decode Google token:', err);
    return null;
  }
};

export const loginWithGoogleCredential = (credential: string): { success: boolean; user?: AuthUser; message?: string } => {
  const decoded = decodeGoogleCredential(credential);
  if (!decoded || !decoded.email) {
    return { success: false, message: 'ไม่สามารถอ่านข้อมูลจาก Google Token ได้' };
  }

  const isAdmin = isUserAdmin({ email: decoded.email, name: decoded.name, isAdmin: false, loginTime: 0 });
  const user: AuthUser = {
    email: decoded.email.toLowerCase(),
    name: decoded.name,
    picture: decoded.picture,
    isAdmin,
    loginTime: Date.now()
  };

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('thai_law_mate_auth_changed'));

  if (!isAdmin) {
    return { 
      success: false, 
      user, 
      message: `บัญชี ${decoded.email} ไม่มีสิทธิ์ผู้ดูแลระบบ (Admin) กรุณาใช้ Gmail ที่ได้รับอนุญาต` 
    };
  }

  return { success: true, user };
};

// Login with Gmail directly (with admin email validation or passcode verification)
export const loginWithGmail = (email: string, passcode?: string): { success: boolean; user?: AuthUser; message?: string } => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'กรุณากรอกอีเมล Gmail ที่ถูกต้อง' };
  }

  const adminList = getAdminEmails().map(e => e.toLowerCase());
  const isDesignatedAdmin = adminList.includes(cleanEmail);

  // If passcode is provided, check against master passcode
  if (passcode && passcode.trim() !== ADMIN_MASTER_PASSCODE && !isDesignatedAdmin) {
    return { success: false, message: 'รหัสผ่านแอดมินไม่ถูกต้อง' };
  }

  if (!isDesignatedAdmin && passcode?.trim() !== ADMIN_MASTER_PASSCODE) {
    return { 
      success: false, 
      message: `อีเมล ${cleanEmail} ไม่อยู่ในรายชื่อผู้ดูแลระบบ (Admin)` 
    };
  }

  const user: AuthUser = {
    email: cleanEmail,
    name: cleanEmail.split('@')[0],
    isAdmin: true,
    loginTime: Date.now()
  };

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('thai_law_mate_auth_changed'));
  return { success: true, user };
};

export const logout = () => {
  localStorage.removeItem(AUTH_USER_KEY);
  window.dispatchEvent(new Event('thai_law_mate_auth_changed'));
};

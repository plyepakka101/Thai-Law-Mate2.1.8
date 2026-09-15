import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import {
  getServerSession,
  getGoogleClientId,
  loginWithGoogleCredential,
  loginWithPassword,
  isUserAdmin,
  AuthUser,
} from '../services/authService';

interface Props {
  children: React.ReactNode;
  onClose?: () => void;
}

export const AdminLoginGuard: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const clientId = getGoogleClientId();
  const hasValidClientId = Boolean(
    clientId &&
    clientId.endsWith('.apps.googleusercontent.com') &&
    !clientId.includes('your-google-client-id')
  );

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      const serverUser = await getServerSession();
      if (!mounted) return;

      if (serverUser && isUserAdmin(serverUser)) {
        setUser(serverUser);
      } else {
        localStorage.removeItem('thai_law_mate_auth_user');
        setUser(null);
      }
      setAuthChecked(true);
    };

    verifySession();

    const handleAuthChange = () => {
      verifySession();
    };

    window.addEventListener('thai_law_mate_auth_changed', handleAuthChange);
    return () => {
      mounted = false;
      window.removeEventListener('thai_law_mate_auth_changed', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    const checkGsi = () => {
      if ((window as any).google?.accounts?.id) setIsGsiLoaded(true);
    };
    checkGsi();
    const interval = window.setInterval(checkGsi, 400);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!hasValidClientId || !isGsiLoaded || !googleBtnRef.current || user) return;

    try {
      const google = (window as any).google;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          if (!response?.credential) return;
          setIsLoading(true);
          setErrorMsg('');
          const result = await loginWithGoogleCredential(response.credential);
          setIsLoading(false);

          if (result.success && result.user) {
            setUser(result.user);
          } else {
            setErrorMsg(result.message || 'เข้าสู่ระบบ Google ไม่สำเร็จ');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      googleBtnRef.current.innerHTML = '';
      google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: 300,
      });
    } catch (error: any) {
      console.error('Google Sign-In render error:', error);
      setErrorMsg('ไม่สามารถโหลดระบบ Google Sign-In ได้');
    }
  }, [hasValidClientId, isGsiLoaded, clientId, user]);

  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const result = await loginWithPassword(emailInput, passwordInput);
      if (result.success && result.user) {
        setUser(result.user);
        setPasswordInput('');
      } else {
        setErrorMsg(result.message || 'อีเมลหรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง');
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="max-w-md mx-auto my-10 p-8 text-center text-sm text-slate-500">
        กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...
      </div>
    );
  }

  if (user && isUserAdmin(user)) return <>{children}</>;

  return (
    <div className="max-w-md mx-auto my-10 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-5 animate-in fade-in duration-150">
      <div className="w-14 h-14 bg-law-50 dark:bg-law-950/60 text-law-600 dark:text-law-400 rounded-full mx-auto flex items-center justify-center">
        <ShieldCheck size={32} />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">เข้าสู่ระบบผู้ดูแลระบบ (Admin)</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          ระบบยืนยันตัวตนความปลอดภัยสูง เฉพาะผู้ดูแลระบบที่ได้รับอนุญาตเท่านั้น
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2 border border-red-200 dark:border-red-800/50 text-left">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {hasValidClientId && (
        <div className="space-y-2 text-center pb-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">ลงชื่อเข้าใช้ด้วยบัญชี Google</span>
          <div className="py-1 flex flex-col items-center justify-center">
            <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center">
              {!isGsiLoaded && <span className="text-xs text-slate-400 animate-pulse">กำลังโหลดระบบ Google Sign-In...</span>}
            </div>
          </div>
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="flex-shrink mx-3 text-[11px] text-slate-400">หรือ</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>
        </div>
      )}

      <form onSubmit={handlePasswordLogin} className="space-y-3 text-left" autoComplete="off">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Lock size={14} className="text-law-600 dark:text-law-400" />
          <span>เข้าสู่ระบบด้วยรหัสผ่านผู้ดูแลระบบ</span>
        </div>

        <div>
          <label htmlFor="admin-login-email" className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">อีเมลผู้ดูแลระบบ:</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              id="admin-login-email"
              name="admin-login-email"
              type="email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="กรอกอีเมลผู้ดูแลระบบ"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-law-500"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="admin-login-password" className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">รหัสผ่านผู้ดูแลระบบ:</label>
          <div className="relative">
            <KeyRound size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              id="admin-login-password"
              name="admin-login-password"
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="กรอกรหัสผ่านผู้ดูแลระบบ"
              autoComplete="new-password"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-law-500"
              required
            />
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-law-600 hover:bg-law-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm">
          {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบผู้ดูแลระบบ'}
        </button>
      </form>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
        การตั้งค่าระบบ Google ถูกจัดการโดยผู้ดูแลระบบและจะไม่แสดงในหน้านี้
      </div>
    </div>
  );
};

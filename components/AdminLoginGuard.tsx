import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, LogOut, User, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { getCurrentUser, loginWithGmail, loginWithGoogleCredential, logout, isUserAdmin, AuthUser } from '../services/authService';

interface Props {
  children: React.ReactNode;
  onClose?: () => void;
}

export const AdminLoginGuard: React.FC<Props> = ({ children, onClose }) => {
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser());
  const [emailInput, setEmailInput] = useState('');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('thai_law_mate_auth_changed', handleAuthChange);
    return () => window.removeEventListener('thai_law_mate_auth_changed', handleAuthChange);
  }, []);

  // Initialize Google Identity Services ONLY if a real client ID is configured
  const googleClientId = (window as any).GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasRealGoogleClientId = Boolean(googleClientId && !googleClientId.includes('your-google-client-id'));

  useEffect(() => {
    if (hasRealGoogleClientId && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            if (response.credential) {
              const res = loginWithGoogleCredential(response.credential);
              if (res.success && res.user) {
                setUser(res.user);
                setSuccessMsg(`ยินดีต้อนรับ ${res.user.name}`);
              } else {
                setErrorMsg(res.message || 'เข้าสู่ระบบไม่สำเร็จ');
              }
            }
          }
        });
        const btnContainer = document.getElementById('google-signin-btn-container');
        if (btnContainer) {
          (window as any).google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            width: 280
          });
        }
      } catch (err) {
        console.warn('Google GIS init warning:', err);
      }
    }
  }, [hasRealGoogleClientId, googleClientId]);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMsg('กรุณาระบุอีเมล Gmail');
      return;
    }
    setIsBusy(true);
    setErrorMsg('');
    const res = loginWithGmail(emailInput, passcodeInput);
    setIsBusy(false);
    if (res.success && res.user) {
      setUser(res.user);
      setSuccessMsg(`เข้าสู่ระบบสำเร็จในฐานะ ${res.user.email}`);
    } else {
      setErrorMsg(res.message || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setSuccessMsg('');
    setErrorMsg('');
  };

  // If user is logged in as admin, show the protected content (LawManager) with an admin header bar
  if (user && isUserAdmin(user)) {
    return (
      <div>
        <div className="mb-4 p-3 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800/60 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center font-bold">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full" />
              ) : (
                <ShieldCheck size={20} />
              )}
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">เข้าสู่ระบบในฐานะผู้ดูแลระบบ</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>{user.email}</span>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full font-semibold">
                  Admin
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <LogOut size={14} />
            <span>ออกจากระบบ</span>
          </button>
        </div>

        {children}
      </div>
    );
  }

  // Not logged in or not admin -> Show Gmail Login Screen
  return (
    <div className="max-w-md mx-auto my-8 p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-law-50 dark:bg-law-900/40 text-law-600 dark:text-law-400 rounded-2xl mx-auto flex items-center justify-center shadow-inner mb-4">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">เข้าสู่ระบบจัดการกฎหมาย</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          กรุณายืนยันตัวตนด้วย Gmail ของผู้ดูแลระบบเพื่อเข้าถึงส่วนจัดการกฎหมาย
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-start gap-2">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {hasRealGoogleClientId && (
        <>
          <div id="google-signin-btn-container" className="flex justify-center mb-4 min-h-[44px]"></div>
          <div className="relative flex py-2 items-center mb-4">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            <span className="flex-shrink mx-3 text-xs text-gray-400">หรือระบุ Gmail ของผู้ดูแลระบบ</span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          </div>
        </>
      )}

      <form onSubmit={handleManualLogin} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Gmail ผู้ดูแลระบบ</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="กรอก Gmail ผู้ดูแลระบบ"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-law-500 outline-none"
              required
            />
          </div>
        </div>

        {showPasscode && (
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">รหัสผ่านแอดมิน (ถ้ามี)</label>
            <input
              type="password"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="กรอกรหัสผ่านแอดมิน (ถ้ามี)"
              className="w-full px-3 py-2.5 rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-law-500 outline-none"
            />
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setShowPasscode(!showPasscode)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
          >
            {showPasscode ? 'ซ่อนรหัสผ่าน' : 'ใส่รหัสผ่านแอดมิน (ถ้ามี)'}
          </button>
        </div>

        <button
          type="submit"
          disabled={isBusy}
          className="w-full py-3 bg-law-600 hover:bg-law-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>{isBusy ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}</span>
        </button>
      </form>
    </div>
  );
};

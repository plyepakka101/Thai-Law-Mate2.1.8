import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCircle, 
  AlertCircle, 
  KeyRound, 
  Settings, 
  HelpCircle,
  ShieldCheck,
  LogIn,
  Copy,
  ExternalLink,
  Lock,
  Mail,
  Loader2
} from 'lucide-react';
import { 
  getCurrentUser, 
  loginWithGoogleCredential, 
  loginWithPassword,
  isUserAdmin, 
  AuthUser,
  getStoredGoogleClientId,
  setStoredGoogleClientId,
  getAdminEmails
} from '../services/authService';

interface Props {
  children: React.ReactNode;
  onClose?: () => void;
}

export const AdminLoginGuard: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser());
  const [clientId, setClientId] = useState<string>(getStoredGoogleClientId());
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [inputClientId, setInputClientId] = useState<string>(clientId);
  const [errorMsg, setErrorMsg] = useState('');
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Credentials login state
  const adminList = getAdminEmails();
  const [emailInput, setEmailInput] = useState<string>(adminList[0] || 'pramot.thamwi@gmail.com');
  const [passwordInput, setPasswordInput] = useState('');
  
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(getCurrentUser());
      setClientId(getStoredGoogleClientId());
    };
    window.addEventListener('thai_law_mate_auth_changed', handleAuthChange);
    return () => window.removeEventListener('thai_law_mate_auth_changed', handleAuthChange);
  }, []);

  // Poll or check if Google Identity Services (GIS) script is ready
  useEffect(() => {
    const checkGsi = () => {
      if ((window as any).google?.accounts?.id) {
        setIsGsiLoaded(true);
      }
    };
    checkGsi();
    const interval = setInterval(checkGsi, 400);
    return () => clearInterval(interval);
  }, []);

  const hasValidClientId = Boolean(
    clientId && 
    clientId.includes('.apps.googleusercontent.com') && 
    !clientId.includes('your-google-client-id')
  );

  // Initialize and render the official Google Sign-In Button
  useEffect(() => {
    if (!hasValidClientId || !isGsiLoaded || !googleBtnRef.current || user) {
      return;
    }

    try {
      (window as any).google.accounts.id.initialize({
        client_id: clientId.trim(),
        callback: async (response: any) => {
          if (response.credential) {
            setIsLoading(true);
            const res = await loginWithGoogleCredential(response.credential);
            setIsLoading(false);
            if (res.success && res.user) {
              setUser(res.user);
              setErrorMsg('');
            } else {
              setErrorMsg(res.message || 'เข้าสู่ระบบไม่สำเร็จ บัญชี Google ของคุณอาจไม่มีสิทธิ์แอดมิน');
            }
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Clear previous button contents
      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'filled_blue',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 300,
        });
      }
    } catch (err: any) {
      console.error('GIS Render Error:', err);
      setErrorMsg(`เกิดข้อผิดพลาดในการโหลดปุ่ม Google: ${err?.message || err}`);
    }
  }, [hasValidClientId, isGsiLoaded, clientId, user]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await loginWithPassword(emailInput, passwordInput);
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setErrorMsg(res.message || 'อีเมลหรือรหัสผ่านแอดมินไม่ถูกต้อง');
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputClientId.trim();
    if (!cleaned) {
      setErrorMsg('กรุณากรอก Google Client ID');
      return;
    }
    if (!cleaned.includes('.apps.googleusercontent.com')) {
      setErrorMsg('Google Client ID ต้องลงท้ายด้วย .apps.googleusercontent.com');
      return;
    }
    setStoredGoogleClientId(cleaned);
    setClientId(cleaned);
    setShowConfigModal(false);
    setErrorMsg('');
  };

  const handleCopyOrigin = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://thai-law-mate2-1-8.vercel.app';
    navigator.clipboard.writeText(origin);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  function renderClientIdModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b dark:border-gray-700">
            <div className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
              <KeyRound size={20} className="text-law-600" />
              <span>กำหนดค่า Google OAuth Client ID</span>
            </div>
            <button
              onClick={() => setShowConfigModal(false)}
              className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            ระบบใช้ระบบยืนยันตัวตน Google Identity Services หากต้องการใช้งานปุ่ม Google Sign-In 
            โปรดระบุ <strong>Client ID (Web application)</strong> ที่สร้างจาก Google Cloud Console
          </p>

          <form onSubmit={handleSaveClientId} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Google Client ID:
              </label>
              <input
                type="text"
                value={inputClientId}
                onChange={(e) => setInputClientId(e.target.value)}
                placeholder="xxxx-xxxxxxxx.apps.googleusercontent.com"
                className="w-full px-3 py-2 text-xs rounded-xl border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-mono focus:ring-2 focus:ring-law-500 outline-none"
                required
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800/50 text-[11px] text-blue-900 dark:text-blue-200 space-y-1.5">
              <div className="font-semibold flex items-center justify-between">
                <span>URL ต้นทาง (Authorized JavaScript origins):</span>
              </div>
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-2 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 font-mono text-[10px] text-blue-800 dark:text-blue-300">
                <span className="truncate">{typeof window !== 'undefined' ? window.location.origin : 'https://thai-law-mate2-1-8.vercel.app'}</span>
                <button
                  type="button"
                  onClick={handleCopyOrigin}
                  className="ml-2 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-sans flex items-center gap-1 shrink-0"
                >
                  <Copy size={10} />
                  <span>{copiedOrigin ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
                </button>
              </div>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium pt-0.5"
              >
                <span>เปิด Google Cloud Console Credentials</span>
                <ExternalLink size={11} />
              </a>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs rounded-xl bg-law-600 hover:bg-law-700 text-white font-bold transition-colors"
              >
                บันทึก Client ID
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // If user is logged in as admin, show LawManager directly without blocking banner
  if (user && isUserAdmin(user)) {
    return <>{children}</>;
  }

  // Not logged in or not admin -> Show clean, secure login card
  return (
    <div className="max-w-md mx-auto my-10 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-5 animate-in fade-in duration-150">
      <div className="w-14 h-14 bg-law-50 dark:bg-law-950/60 text-law-600 dark:text-law-400 rounded-full mx-auto flex items-center justify-center">
        <ShieldCheck size={32} />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">เข้าสู่ระบบจัดการกฎหมาย</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          ฟังก์ชันนี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น กรุณายืนยันตัวตนเพื่อความปลอดภัย
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2 border border-red-200 dark:border-red-800/50 text-left">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Google Sign-In (if configured) */}
      {hasValidClientId && (
        <div className="space-y-2 text-center pb-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            ลงชื่อเข้าใช้ด้วยบัญชี Google
          </span>
          <div className="py-1 flex flex-col items-center justify-center">
            <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center">
              {!isGsiLoaded && (
                <span className="text-xs text-slate-400 animate-pulse">กำลังโหลดระบบ Google Sign-In...</span>
              )}
            </div>
          </div>
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-400">หรือ</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>
        </div>
      )}

      {/* Secure Server-Verified Login Form */}
      <form onSubmit={handlePasswordLogin} className="space-y-3 text-left">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Lock size={14} className="text-law-600 dark:text-law-400" />
          <span>เข้าสู่ระบบด้วยรหัสผ่านผู้ดูแลระบบ:</span>
        </div>

        <div>
          <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
            อีเมล Gmail ผู้ดูแลระบบ:
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="เช่น pramot.thamwi@gmail.com"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-law-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
            รหัสผ่านผู้ดูแลระบบ:
          </label>
          <div className="relative">
            <KeyRound size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="กรอกรหัสผ่านผู้ดูแลระบบ"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-law-500"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-law-600 hover:bg-law-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>กำลังตรวจสอบสิทธิ์กับเซิร์ฟเวอร์...</span>
            </>
          ) : (
            <>
              <LogIn size={14} />
              <span>เข้าสู่ระบบ</span>
            </>
          )}
        </button>
      </form>

      {/* Config Button */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
        <button
          type="button"
          onClick={() => setShowConfigModal(true)}
          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 inline-flex items-center gap-1"
        >
          <Settings size={12} />
          <span>ตั้งค่า Google OAuth Client ID {hasValidClientId ? '(เชื่อมต่อแล้ว)' : ''}</span>
        </button>
      </div>

      {showConfigModal && renderClientIdModal()}
    </div>
  );
};



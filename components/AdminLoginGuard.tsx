import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCircle, 
  AlertCircle, 
  KeyRound, 
  Settings, 
  HelpCircle,
  ShieldCheck,
  Sparkles,
  LogIn,
  Copy,
  ExternalLink
} from 'lucide-react';
import { 
  getCurrentUser, 
  loginWithGoogleCredential, 
  loginWithGmail,
  quickAdminLogin,
  isUserAdmin, 
  AuthUser,
  getStoredGoogleClientId,
  setStoredGoogleClientId,
  getAdminEmails,
  ADMIN_MASTER_PASSCODE
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
  const [successMsg, setSuccessMsg] = useState('');
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  
  // Passcode login state
  const adminList = getAdminEmails();
  const [selectedEmail, setSelectedEmail] = useState<string>(adminList[0] || 'pramot.thamwi@gmail.com');
  const [passcode, setPasscode] = useState('');
  
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
            const res = await loginWithGoogleCredential(response.credential);
            if (res.success && res.user) {
              setUser(res.user);
              setErrorMsg('');
            } else {
              setErrorMsg(res.message || 'เข้าสู่ระบบไม่สำเร็จ บัญชีของคุณอาจไม่มีสิทธิ์แอดมิน');
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

  const handleQuickLogin = (email: string) => {
    setErrorMsg('');
    const res = quickAdminLogin(email);
    if (res.success && res.user) {
      setUser(res.user);
    } else {
      setErrorMsg(res.message || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  const handlePasscodeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const res = loginWithGmail(selectedEmail, passcode);
    if (res.success && res.user) {
      setUser(res.user);
    } else {
      setErrorMsg(res.message || 'รหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้น: lawmate2026)');
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

  // Not logged in or not admin -> Show clean card with 1-click & passcode login
  return (
    <div className="max-w-md mx-auto my-10 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-5 animate-in fade-in duration-150">
      <div className="w-14 h-14 bg-law-50 dark:bg-law-950/60 text-law-600 dark:text-law-400 rounded-full mx-auto flex items-center justify-center">
        <ShieldCheck size={32} />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">เข้าสู่ระบบเพื่อจัดการกฎหมาย</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          ฟังก์ชันนี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น เข้าใช้งานด่วนด้วย 1-Click หรือรหัสผ่าน
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2 border border-red-200 dark:border-red-800/50 text-left">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1-Click Fast Admin Sign-In */}
      <div className="space-y-2 text-left">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Sparkles size={14} className="text-amber-500" />
          <span>เข้าสู่ระบบด่วน 1-Click สำหรับผู้ดูแลระบบ:</span>
        </label>
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('pramot.thamwi@gmail.com')}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-law-50 hover:border-law-300 dark:hover:bg-slate-800 dark:hover:border-law-500 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-law-100 dark:bg-law-900/60 text-law-700 dark:text-law-300 flex items-center justify-center font-bold text-xs">
                P
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-law-700 dark:group-hover:text-law-400">
                  ปราโมช (แอดมิน)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  pramot.thamwi@gmail.com
                </div>
              </div>
            </div>
            <span className="text-xs text-law-600 dark:text-law-400 font-medium px-2.5 py-1 bg-white dark:bg-slate-700 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-600">
              เข้าใช้งาน ➜
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('plyepakka@gmail.com')}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-slate-800 dark:hover:border-purple-500 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                P
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-700 dark:group-hover:text-purple-400">
                  พลอย (แอดมิน)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  plyepakka@gmail.com
                </div>
              </div>
            </div>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium px-2.5 py-1 bg-white dark:bg-slate-700 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-600">
              เข้าใช้งาน ➜
            </span>
          </button>
        </div>
      </div>

      {/* Or Login with Passcode Form */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-left">
        <form onSubmit={handlePasscodeLogin} className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <KeyRound size={14} className="text-slate-500" />
            <span>หรือเข้าสู่ระบบด้วยรหัสผ่านแอดมิน:</span>
          </div>

          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
              อีเมล Gmail ผู้ดูแลระบบ:
            </label>
            <input
              type="email"
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              placeholder="ระบุ Gmail ผู้ดูแลระบบ"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-law-500"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-500 dark:text-slate-400">
                รหัสผ่านแอดมิน:
              </label>
              <span className="text-[10px] text-slate-400">
                (รหัสตั้งต้น: <code className="text-law-600 font-mono font-bold">lawmate2026</code>)
              </span>
            </div>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="ใส่รหัสผ่าน เช่น lawmate2026"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-law-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <LogIn size={14} />
            <span>ยืนยันเข้าสู่ระบบ</span>
          </button>
        </form>
      </div>

      {hasValidClientId && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
          <span className="text-[11px] text-slate-400 block">หรือเข้าสู่ระบบด้วย Google Identity:</span>
          <div className="py-1 flex flex-col items-center justify-center">
            <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center">
              {!isGsiLoaded && (
                <span className="text-xs text-slate-400 animate-pulse">กำลังโหลดระบบ Google Sign-In...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Config Button */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={() => setShowConfigModal(true)}
          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 inline-flex items-center gap-1"
        >
          <Settings size={12} />
          <span>ตั้งค่า Google Client ID (ตัวเลือกเสริม)</span>
        </button>
      </div>

      {showConfigModal && renderClientIdModal()}
    </div>
  );
};


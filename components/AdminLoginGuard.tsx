import React, { useState, useEffect, useRef } from 'react';
import { Lock, ShieldCheck, LogOut, Mail, CheckCircle2, AlertCircle, KeyRound, Settings, ExternalLink, HelpCircle } from 'lucide-react';
import { 
  getCurrentUser, 
  loginWithGoogleCredential, 
  logout, 
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
  const [successMsg, setSuccessMsg] = useState('');
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
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
        callback: (response: any) => {
          if (response.credential) {
            const res = loginWithGoogleCredential(response.credential);
            if (res.success && res.user) {
              setUser(res.user);
              setErrorMsg('');
              setSuccessMsg(`ยินดีต้อนรับ ${res.user.name || res.user.email}`);
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
    setSuccessMsg('บันทึก Google Client ID สำเร็จ');
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setSuccessMsg('');
    setErrorMsg('');
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
            ระบบใช้ระบบยืนยันตัวตนความปลอดภัยสูงของ Google (Google Identity Services) 
            โปรดระบุ <strong>Client ID (Web application)</strong> ที่สร้างจาก Google Cloud Console เพื่อเปิดใช้งานปุ่มล็อกอิน
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

            <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <HelpCircle size={13} />
                <span>อย่าลืมเพิ่ม Authorized JavaScript origins ใน Google Cloud Console:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 font-mono text-[10px]">
                <li>https://thai-law-mate2-1-8.vercel.app</li>
                <li>http://localhost:5173</li>
              </ul>
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

  // If user is logged in as admin, show the protected content (LawManager) with an admin header bar
  if (user && isUserAdmin(user)) {
    return (
      <div>
        <div className="mb-4 p-3 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800/60 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center font-bold overflow-hidden">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <ShieldCheck size={20} />
              )}
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">เข้าสู่ระบบด้วย Google เรียบร้อยแล้ว</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>{user.email}</span>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full font-semibold">
                  Admin
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="ตั้งค่า Google Client ID"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <LogOut size={14} />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>

        {children}

        {showConfigModal && renderClientIdModal()}
      </div>
    );
  }

  // Not logged in or not admin -> Show Real Google OAuth Login Screen
  return (
    <div className="max-w-md mx-auto my-8 p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-law-50 dark:bg-law-900/40 text-law-600 dark:text-law-400 rounded-2xl mx-auto flex items-center justify-center shadow-inner mb-4">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">เข้าสู่ระบบจัดการกฎหมาย</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          ระบบความปลอดภัยสูง ต้องยืนยันตัวตนด้วยบัญชี Gmail ของผู้ดูแลระบบ
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

      {/* Real Google OAuth Login Button */}
      {hasValidClientId ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200/80 dark:border-gray-700">
            <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center">
              {!isGsiLoaded && (
                <span className="text-xs text-gray-400 animate-pulse">กำลังโหลดระบบ Google Sign-In...</span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2.5">
              เฉพาะอีเมลแอดมินที่ได้รับสิทธิ์เท่านั้น
            </p>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => setShowConfigModal(true)}
              className="text-[11px] text-gray-400 hover:text-law-600 dark:hover:text-law-400 underline inline-flex items-center gap-1"
            >
              <Settings size={12} />
              <span>เปลี่ยน Google Client ID</span>
            </button>
          </div>
        </div>
      ) : (
        /* Prompt to setup Google Client ID */
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-left space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
              <KeyRound size={15} />
              <span>ยังไม่ได้กำหนด Google OAuth Client ID</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              เพื่อให้ระบบล็อกอินด้วย Gmail ทำงานอย่างปลอดภัย กรุณาระบุ Google OAuth Client ID จาก Google Cloud Console
            </p>
            <button
              onClick={() => setShowConfigModal(true)}
              className="w-full mt-2 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Settings size={14} />
              <span>กดที่นี่เพื่อใส่ Google Client ID</span>
            </button>
          </div>

          <div className="text-center pt-2">
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-law-600 dark:text-law-400 hover:underline inline-flex items-center gap-1"
            >
              <span>ไปที่ Google Cloud Console เพื่อสร้าง Client ID</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}

      {/* Admin Information Box */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-left">
        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold mb-1">
          บัญชีผู้ดูแลระบบ (Admin) ที่อนุญาต:
        </div>
        <div className="space-y-1">
          {getAdminEmails().map((adminEmail) => (
            <div key={adminEmail} className="text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 font-mono">
              <Mail size={12} className="text-law-500 shrink-0" />
              <span>{adminEmail}</span>
            </div>
          ))}
        </div>
      </div>

      {showConfigModal && renderClientIdModal()}
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, AlertCircle, KeyRound, Settings, HelpCircle } from 'lucide-react';
import { 
  getCurrentUser, 
  loginWithGoogleCredential, 
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

  // If user is logged in as admin, show LawManager directly without blocking banner
  if (user && isUserAdmin(user)) {
    return <>{children}</>;
  }

  // Not logged in or not admin -> Show clean card aligned with deka-search
  return (
    <div className="max-w-md mx-auto my-10 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-5 animate-in fade-in duration-150">
      <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full mx-auto flex items-center justify-center">
        <UserCircle size={32} />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">เข้าสู่ระบบเพื่อจัดการกฎหมาย</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          ฟังก์ชันนี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2 border border-red-200 dark:border-red-800/50 text-left">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {hasValidClientId ? (
        <div className="py-2 flex flex-col items-center justify-center">
          <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center">
            {!isGsiLoaded && (
              <span className="text-xs text-slate-400 animate-pulse">กำลังโหลดระบบ Google Sign-In...</span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-left space-y-2 text-xs">
          <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <KeyRound size={15} />
            <span>ยังไม่ได้กำหนด Google Client ID</span>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs transition-colors"
          >
            ใส่ Google Client ID
          </button>
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>อีเมลแอดมิน: {getAdminEmails()[0]}</span>
        <button 
          type="button" 
          onClick={() => setShowConfigModal(true)}
          className="hover:text-law-600 dark:hover:text-law-400 flex items-center gap-1"
        >
          <Settings size={12} />
          <span>ตั้งค่า Client ID</span>
        </button>
      </div>

      {showConfigModal && renderClientIdModal()}
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { X, UserCircle, AlertCircle, CheckCircle2, KeyRound, Settings } from 'lucide-react';
import { 
  loginWithGoogleCredential, 
  getStoredGoogleClientId, 
  setStoredGoogleClientId, 
  getAdminEmails,
  AuthUser 
} from '../services/authService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: AuthUser) => void;
}

export const LoginModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [clientId, setClientId] = useState<string>(getStoredGoogleClientId());
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [inputClientId, setInputClientId] = useState(clientId);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setClientId(getStoredGoogleClientId());
  }, [isOpen]);

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

  useEffect(() => {
    if (!isOpen || !hasValidClientId || !isGsiLoaded || !googleBtnRef.current) {
      return;
    }

    try {
      (window as any).google.accounts.id.initialize({
        client_id: clientId.trim(),
        callback: (response: any) => {
          if (response.credential) {
            const res = loginWithGoogleCredential(response.credential);
            if (res.success && res.user) {
              setSuccessMsg(`ยินดีต้อนรับ ${res.user.name || res.user.email}`);
              setErrorMsg('');
              if (onSuccess) onSuccess(res.user);
              setTimeout(() => {
                onClose();
              }, 400);
            } else {
              setErrorMsg(res.message || 'เข้าสู่ระบบไม่สำเร็จ บัญชีของคุณอาจไม่มีสิทธิ์แอดมิน');
            }
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 280,
        });
      }

      // Also trigger Google One Tap prompt if supported
      (window as any).google.accounts.id.prompt();
    } catch (err: any) {
      console.error('GIS Render Error in Modal:', err);
    }
  }, [isOpen, hasValidClientId, isGsiLoaded, clientId]);

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputClientId.trim();
    if (!cleaned || !cleaned.includes('.apps.googleusercontent.com')) {
      setErrorMsg('Google Client ID ต้องลงท้ายด้วย .apps.googleusercontent.com');
      return;
    }
    setStoredGoogleClientId(cleaned);
    setClientId(cleaned);
    setShowConfig(false);
    setErrorMsg('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-law-600 dark:text-law-400" />
            <span className="font-bold text-base text-slate-800 dark:text-slate-100">เข้าสู่ระบบ</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            ลงชื่อเข้าใช้ด้วยบัญชี Google
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            เฉพาะผู้ดูแลระบบ (Admin) เพื่อจัดการตัวบทกฎหมาย
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2 border border-red-200 dark:border-red-800/50">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-start gap-2 border border-emerald-200 dark:border-emerald-800/50">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {hasValidClientId ? (
          <div className="py-3 flex flex-col items-center justify-center">
            <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center">
              {!isGsiLoaded && (
                <span className="text-xs text-slate-400 animate-pulse">กำลังโหลด Google Sign-In...</span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-xs">
            <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <KeyRound size={15} />
              <span>ต้องการ Google OAuth Client ID</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              โปรดระบุ Google Client ID เพื่อเปิดใช้งานปุ่มล็อกอิน
            </p>
            <button
              onClick={() => setShowConfig(true)}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs transition-colors"
            >
              ตั้งค่า Google Client ID
            </button>
          </div>
        )}

        {/* Config drawer */}
        {showConfig && (
          <form onSubmit={handleSaveClientId} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
              Google Client ID:
            </label>
            <input
              type="text"
              value={inputClientId}
              onChange={(e) => setInputClientId(e.target.value)}
              placeholder="xxxx.apps.googleusercontent.com"
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-law-500"
              required
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs bg-law-600 hover:bg-law-700 text-white font-medium rounded-md"
              >
                บันทึก
              </button>
            </div>
          </form>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>แอดมิน: {getAdminEmails()[0]}</span>
          <button 
            type="button" 
            onClick={() => setShowConfig(!showConfig)}
            className="hover:text-law-600 dark:hover:text-law-400 flex items-center gap-1"
          >
            <Settings size={12} />
            <span>ตั้งค่า</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UserCircle, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  Settings, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  LogIn,
  Lock,
  Mail,
  Loader2
} from 'lucide-react';
import { 
  loginWithGoogleCredential, 
  loginWithPassword,
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
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  
  // Credentials login state
  const adminList = getAdminEmails();
  const [emailInput, setEmailInput] = useState<string>(adminList[0] || 'pramot.thamwi@gmail.com');
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
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
        callback: async (response: any) => {
          if (response.credential) {
            setIsLoading(true);
            const res = await loginWithGoogleCredential(response.credential);
            setIsLoading(false);
            if (res.success && res.user) {
              setSuccessMsg(`ยินดีต้อนรับ ${res.user.name || res.user.email}`);
              setErrorMsg('');
              if (onSuccess) onSuccess(res.user);
              setTimeout(() => {
                onClose();
              }, 400);
            } else {
              setErrorMsg(res.message || 'เข้าสู่ระบบไม่สำเร็จ บัญชี Google ของคุณอาจไม่มีสิทธิ์แอดมิน');
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

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await loginWithPassword(emailInput, passwordInput);
      if (res.success && res.user) {
        setSuccessMsg(`เข้าสู่ระบบแอดมินสำเร็จ (${res.user.name || res.user.email})`);
        if (onSuccess) onSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 400);
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
    if (!cleaned || !cleaned.includes('.apps.googleusercontent.com')) {
      setErrorMsg('Google Client ID ต้องลงท้ายด้วย .apps.googleusercontent.com');
      return;
    }
    setStoredGoogleClientId(cleaned);
    setClientId(cleaned);
    setShowConfig(false);
    setErrorMsg('');
  };

  const handleCopyOrigin = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://thai-law-mate2-1-8.vercel.app';
    navigator.clipboard.writeText(origin);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-law-600 dark:text-law-400" />
            <span className="font-bold text-base text-slate-800 dark:text-slate-100">เข้าสู่ระบบผู้ดูแลระบบ (Admin)</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          ระบบยืนยันตัวตนความปลอดภัยสูง เฉพาะผู้ดูแลระบบที่ได้รับอนุญาตเท่านั้น
        </p>

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

        {/* Google Sign-In Section (if configured) */}
        {hasValidClientId && (
          <div className="space-y-2 text-center pb-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              ลงชื่อเข้าใช้ด้วยบัญชี Google
            </span>
            <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center">
              {!isGsiLoaded && (
                <span className="text-xs text-slate-400 animate-pulse">กำลังโหลด Google Sign-In...</span>
              )}
            </div>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[11px] text-slate-400">หรือ</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>
          </div>
        )}

        {/* Secure Admin Password Login Form (Server-Verified) */}
        <form onSubmit={handlePasswordLogin} className="space-y-3">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Lock size={14} className="text-law-600 dark:text-law-400" />
            <span>เข้าสู่ระบบด้วยรหัสผ่านแอดมิน:</span>
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

        {/* Google OAuth Config Toggle */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="w-full flex items-center justify-between text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-1"
          >
            <span className="flex items-center gap-1">
              <Settings size={12} />
              <span>ตั้งค่า Google OAuth Client ID {hasValidClientId ? '(เชื่อมต่อแล้ว)' : ''}</span>
            </span>
            {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showConfig && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/50 text-xs space-y-1.5">
                <div className="font-semibold text-blue-900 dark:text-blue-200 flex items-center justify-between">
                  <span>URL ต้นทาง (Authorized JavaScript origins):</span>
                </div>
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-2 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 font-mono text-[11px] text-blue-800 dark:text-blue-300">
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
                  <span>เปิดหน้า Credentials ใน Google Cloud Console</span>
                  <ExternalLink size={11} />
                </a>
              </div>

              <form onSubmit={handleSaveClientId} className="space-y-2">
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
                    ปิด
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs bg-law-600 hover:bg-law-700 text-white font-medium rounded-md"
                  >
                    บันทึก Client ID
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};


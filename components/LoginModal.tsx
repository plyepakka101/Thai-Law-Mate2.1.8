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
  Sparkles
} from 'lucide-react';
import { 
  loginWithGoogleCredential, 
  loginWithGmail,
  quickAdminLogin,
  getStoredGoogleClientId, 
  setStoredGoogleClientId, 
  getAdminEmails,
  ADMIN_MASTER_PASSCODE,
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
  
  // Passcode login state
  const adminList = getAdminEmails();
  const [selectedEmail, setSelectedEmail] = useState<string>(adminList[0] || 'pramot.thamwi@gmail.com');
  const [passcode, setPasscode] = useState('');
  
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
            const res = await loginWithGoogleCredential(response.credential);
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

  const handleQuickLogin = (email: string) => {
    setErrorMsg('');
    const res = quickAdminLogin(email);
    if (res.success && res.user) {
      setSuccessMsg(`เข้าสู่ระบบสำเร็จในฐานะ ${res.user.name || res.user.email} (Admin)`);
      if (onSuccess) onSuccess(res.user);
      setTimeout(() => {
        onClose();
      }, 400);
    } else {
      setErrorMsg(res.message || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  const handlePasscodeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const res = loginWithGmail(selectedEmail, passcode);
    if (res.success && res.user) {
      setSuccessMsg(`เข้าสู่ระบบแอดมินสำเร็จ (${res.user.name || res.user.email})`);
      if (onSuccess) onSuccess(res.user);
      setTimeout(() => {
        onClose();
      }, 400);
    } else {
      setErrorMsg(res.message || 'รหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้น: lawmate2026)');
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

        {/* 1-Click Fast Admin Sign-In */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            <span>เข้าสู่ระบบด่วน 1-Click (เฉพาะบัญชีแอดมิน):</span>
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
              <span className="text-xs text-law-600 dark:text-law-400 font-medium px-2 py-1 bg-white dark:bg-slate-700 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-600">
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
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium px-2 py-1 bg-white dark:bg-slate-700 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-600">
                เข้าใช้งาน ➜
              </span>
            </button>
          </div>
        </div>

        {/* Or Login with Passcode Form */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
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
                  (รหัสผ่านตั้งต้น: <code className="text-law-600 font-mono font-bold">lawmate2026</code>)
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

        {/* Optional Google Sign-In button if configured */}
        {hasValidClientId && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
            <span className="text-[11px] text-slate-400 block">หรือเข้าสู่ระบบด้วย Google Identity:</span>
            <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center">
              {!isGsiLoaded && (
                <span className="text-xs text-slate-400 animate-pulse">กำลังโหลด Google Sign-In...</span>
              )}
            </div>
          </div>
        )}

        {/* Expandable Google OAuth Config Section */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="w-full flex items-center justify-between text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-1"
          >
            <span className="flex items-center gap-1">
              <Settings size={12} />
              <span>ตั้งค่า Google OAuth Client ID (ตัวเลือกเสริม)</span>
            </span>
            {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showConfig && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              {/* Origin Helper */}
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

              {/* Client ID Form */}
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

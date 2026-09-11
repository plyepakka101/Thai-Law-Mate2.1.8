import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { onSyncError, SyncErrorEntry } from '../services/dataService';

/**
 * Mount this once near the root of the app (e.g. inside AppV3.tsx,
 * right above the main content). It stays invisible until a Neon sync
 * actually fails, then shows the real error message so it's no longer
 * silent.
 */
const SyncErrorBanner: React.FC = () => {
  const [error, setError] = useState<SyncErrorEntry | null>(null);

  useEffect(() => {
    return onSyncError((entry) => setError(entry));
  }, []);

  if (!error) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-800 rounded-lg shadow-lg p-4 flex items-start gap-3">
      <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
      <div className="flex-1 text-sm text-red-800 dark:text-red-200">
        <p className="font-semibold mb-0.5">ซิงค์ขึ้น Neon ไม่สำเร็จ</p>
        <p>{error.message}</p>
        <p className="text-xs mt-1 text-red-600 dark:text-red-400">
          ข้อมูลยังอยู่ในเครื่องนี้ แต่ยังไม่ขึ้นฐานข้อมูลกลาง ลองใหม่ภายหลังหรือกด "ซิงค์ข้อมูล" ในหน้าตั้งค่า
        </p>
      </div>
      <button
        onClick={() => setError(null)}
        className="text-red-500 hover:text-red-700 shrink-0"
        aria-label="ปิด"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default SyncErrorBanner;

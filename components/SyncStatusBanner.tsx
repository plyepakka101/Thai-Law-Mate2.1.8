import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { flushPendingSync, getSyncState, onSyncStateChange, SyncState } from '../services/syncQueue';

export const SyncStatusBanner: React.FC = () => {
  const [state, setState] = useState<SyncState>(getSyncState());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = onSyncStateChange(next => {
      setState(next);
      if (next.pending > 0) setDismissed(false);
    });
    return () => { unsubscribe(); };
  }, []);

  if (state.pending === 0 || dismissed) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 left-4 md:left-auto md:w-[26rem] z-50">
      <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/40 dark:border-amber-700 shadow-lg p-4 text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-600 dark:text-amber-300 shrink-0" size={18} />
          <div className="flex-1">
            <div className="font-semibold text-amber-900 dark:text-amber-100">
              ยังไม่ได้บันทึกขึ้นฐานข้อมูล Neon ({state.pending} รายการ)
            </div>
            <div className="mt-1 text-amber-800 dark:text-amber-200 text-xs">
              ข้อมูลถูกเก็บไว้ในเครื่องนี้ก่อน และจะเห็นบนเครื่องอื่นก็ต่อเมื่อซิงค์สำเร็จ
            </div>
            {state.lastError && (
              <div className="mt-1 text-amber-700 dark:text-amber-300 text-xs break-words">{state.lastError}</div>
            )}
            <button
              onClick={() => { void flushPendingSync(); }}
              disabled={state.syncing}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-3 py-1.5 text-white text-xs font-medium"
            >
              <RefreshCw size={14} className={state.syncing ? 'animate-spin' : ''} />
              <span>{state.syncing ? 'กำลังลองใหม่...' : 'ลองซิงค์อีกครั้ง'}</span>
            </button>
          </div>
          <button onClick={() => setDismissed(true)} className="text-amber-700 dark:text-amber-300 hover:opacity-70" aria-label="ปิด">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

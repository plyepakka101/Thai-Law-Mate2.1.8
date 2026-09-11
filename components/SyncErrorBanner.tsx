import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
// แก้ไขจุดที่ 1: นำเข้าประเภทข้อมูล SyncQueueEntry หรือจัดการเคสที่ไม่มี dataService 
// โดยหากใช้ offlineService หรือชื่ออื่น สามารถปรับเปลี่ยนตามโครงสร้างจริงได้
export interface SyncQueueEntry {
  id: string;
  action: string;
  timestamp: string | number;
  data?: Record<string, unknown>;
  error?: string;
}

interface SyncErrorBannerProps {
  queue?: SyncQueueEntry[];
  onRetry?: () => void;
  onClear?: () => void;
}

export const SyncErrorBanner: React.FC<SyncErrorBannerProps> = ({
  queue = [],
  onRetry,
  onClear,
}) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (queue.length > 0) {
      setDismissed(false);
    }
  }, [queue.length]);

  if (queue.length === 0 || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 mb-4 rounded-r shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              พบรายการที่ยังไม่ได้ซิงค์ ({queue.length} รายการ)
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              เกิดข้อผิดพลาดในการส่งข้อมูลไปยังเซิร์ฟเวอร์ ข้อมูลของคุณถูกบันทึกไว้ในเครื่องแล้ว
            </p>
            
            {/* รายการข้อผิดพลาด */}
            <ul className="mt-2 text-xs text-amber-800 dark:text-amber-200 space-y-1 max-h-32 overflow-y-auto">
              {/* แก้ไขจุดที่ 2: ระบุ Type ให้กับพารามิเตอร์ entry อย่างชัดเจน (entry: SyncQueueEntry) */}
              {queue.map((entry: SyncQueueEntry) => (
                <li key={entry.id} className="flex items-center gap-1">
                  <span>• {entry.action}</span>
                  {entry.error && (
                    <span className="text-red-500 text-[10px]">({entry.error})</span>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex gap-2 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                >
                  <RefreshCw size={12} /> ลองอีกครั้ง
                </button>
              )}
              {onClear && (
                <button
                  onClick={onClear}
                  className="text-xs text-amber-700 dark:text-amber-300 hover:underline px-2 py-1"
                >
                  ล้างคิวที่ไม่สำเร็จ
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 p-1 rounded"
          aria-label="ปิดการแจ้งเตือน"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default SyncErrorBanner;
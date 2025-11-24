
import React, { useRef } from 'react';
import { Download, Upload, Settings as SettingsIcon, Monitor, Cloud, HardDrive, Info } from 'lucide-react';
import { exportData, importData } from '../services/dataService';
import { AppSettings } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thai-law-mate-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (importData(content)) {
        alert('นำเข้าข้อมูลสำเร็จ ระบบจะรีโหลดหน้าเว็บ');
        window.location.reload();
      } else {
        alert('ไฟล์ไม่ถูกต้อง หรือรูปแบบข้อมูลผิดพลาด');
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center space-x-3 mb-4 px-2">
        <div className="bg-gradient-to-br from-law-500 to-law-700 text-white p-2.5 rounded-xl shadow-lg">
          <SettingsIcon size={24} />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-law-900 dark:text-law-100">การตั้งค่า</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">ปรับแต่งการใช้งานและจัดการข้อมูล</p>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
           <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <Monitor className="mr-2 text-law-600 dark:text-law-400" size={20} />
              การแสดงผล
           </h3>
        </div>
        
        <div className="p-6 space-y-6">
           {/* Dark Mode */}
           <div className="flex items-center justify-between">
              <div>
                 <div className="text-base font-medium text-gray-900 dark:text-gray-100">โหมดกลางคืน</div>
                 <div className="text-sm text-gray-500 dark:text-gray-400">พื้นหลังสีเข้ม ถนอมสายตา</div>
              </div>
              <button
                 onClick={() => updateSetting('darkMode', !settings.darkMode)}
                 className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-law-500 focus:ring-offset-2 ${settings.darkMode ? 'bg-law-600' : 'bg-gray-200'}`}
              >
                 <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
           </div>

           <hr className="border-gray-100 dark:border-gray-700" />

           {/* Font Style */}
           <div>
              <div className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">รูปแบบตัวอักษร</div>
              <div className="grid grid-cols-2 gap-4">
                 <button
                    onClick={() => updateSetting('fontStyle', 'modern')}
                    className={`p-4 rounded-xl border text-center transition-all font-sans relative ${settings.fontStyle === 'modern' ? 'border-law-500 bg-law-50 dark:bg-law-900/30 text-law-700 dark:text-law-200 ring-1 ring-law-500' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                 >
                    <div className="text-2xl mb-2">กขค</div>
                    <div className="text-sm font-medium">Sarabun</div>
                    <div className="text-xs opacity-70">อ่านง่าย ทันสมัย</div>
                 </button>
                 <button
                    onClick={() => updateSetting('fontStyle', 'traditional')}
                    className={`p-4 rounded-xl border text-center transition-all font-serif relative ${settings.fontStyle === 'traditional' ? 'border-law-500 bg-law-50 dark:bg-law-900/30 text-law-700 dark:text-law-200 ring-1 ring-law-500' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                 >
                    <div className="text-2xl mb-2">กขค</div>
                    <div className="text-sm font-medium">TH Sarabun</div>
                    <div className="text-xs opacity-70">แบบราชการ</div>
                 </button>
              </div>
           </div>

           <hr className="border-gray-100 dark:border-gray-700" />

           {/* Font Size */}
           <div>
              <div className="flex justify-between mb-4">
                 <div className="text-base font-medium text-gray-900 dark:text-gray-100">ขนาดตัวอักษร</div>
                 <div className="text-sm font-bold text-law-600 dark:text-law-400 bg-law-50 dark:bg-law-900/50 px-2 py-0.5 rounded">ระดับ {settings.fontSize}</div>
              </div>
              <input 
                 type="range" 
                 min="1" 
                 max="5" 
                 step="1" 
                 value={settings.fontSize}
                 onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                 className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-law-600"
              />
              <div className="flex justify-between mt-2 text-xs text-gray-400 font-sans px-1">
                 <span>เล็ก</span>
                 <span>กลาง</span>
                 <span>ใหญ่</span>
                 <span>ใหญ่มาก</span>
                 <span>ใหญ่พิเศษ</span>
              </div>
           </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <HardDrive className="mr-2 text-law-600 dark:text-law-400" size={20} />
            จัดการข้อมูล
          </h3>
        </div>

        <div className="p-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 flex items-start space-x-3">
                <Info className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-semibold mb-1">การสำรองข้อมูลบน Cloud</p>
                    <p className="opacity-90 leading-relaxed">
                        คุณสามารถกด <strong>"ส่งออกไฟล์"</strong> แล้วนำไฟล์ที่ได้ไปเก็บไว้ใน <strong>Google Drive</strong>, <strong>iCloud</strong> หรือส่งเข้าอีเมลเพื่อป้องกันข้อมูลสูญหายได้
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-3">
                        <Download size={24} />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">สำรองข้อมูล (Backup)</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 h-8">
                        ดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ .json เพื่อเก็บรักษาไว้
                    </p>
                    <button 
                        onClick={handleExport}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                        <Cloud size={16} />
                        <span>ส่งออกไฟล์</span>
                    </button>
                </div>

                {/* Import */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mb-3">
                        <Upload size={24} />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">กู้คืนข้อมูล (Restore)</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 h-8">
                        นำไฟล์ .json ที่เคยสำรองไว้ กลับเข้ามาในระบบ
                    </p>
                    <button 
                        onClick={handleImportClick}
                        className="w-full py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        <span>เลือกไฟล์</span>
                    </button>
                </div>
            </div>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
            />
        </div>
      </div>
      
      <div className="text-center text-xs text-gray-400 mt-8 pb-8">
          Thai Law Mate v2.1.7
      </div>
    </div>
  );
};

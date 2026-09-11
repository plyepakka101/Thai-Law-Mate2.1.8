import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Settings as SettingsIcon, Monitor, Cloud, HardDrive, Info, Volume2, Database, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { exportData, importData, checkNeonStatus, syncToNeon, syncFromNeon, getCachedNeonStatus, NeonStatus } from '../services/dataService';
import { AppSettings } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [neonStatus, setNeonStatus] = useState<NeonStatus>(getCachedNeonStatus());
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    checkNeonStatus().then(status => setNeonStatus(status));
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    
    // Some browsers load voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

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

  const handleCheckNeon = async () => {
    setSyncMessage('กำลังตรวจสอบการเชื่อมต่อกับ Neon...');
    const status = await checkNeonStatus();
    setNeonStatus(status);
    setSyncMessage(status.message || (status.connected ? 'เชื่อมต่อสำเร็จ' : 'ยังไม่ได้เชื่อมต่อ'));
    setTimeout(() => setSyncMessage(null), 4000);
  };

  const handleSyncToNeon = async () => {
    setSyncing(true);
    setSyncMessage('กำลังซิงค์ข้อมูลขึ้น Neon...');
    const res = await syncToNeon();
    setSyncing(false);
    setSyncMessage(res.message);
    if (res.success) {
      const status = await checkNeonStatus();
      setNeonStatus(status);
    }
    setTimeout(() => setSyncMessage(null), 5000);
  };

  const handleSyncFromNeon = async () => {
    setSyncing(true);
    setSyncMessage('กำลังดึงข้อมูลล่าสุดจาก Neon (ซิงค์ข้ามเครื่อง)...');
    const res = await syncFromNeon();
    setSyncing(false);
    setSyncMessage(res.message);
    if (res.success) {
      const status = await checkNeonStatus();
      setNeonStatus(status);
    }
    setTimeout(() => setSyncMessage(null), 6000);
  };

  // Filter only Thai voices
  const thaiVoices = voices.filter(v => v.lang.includes('th'));

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
                    <div className="text-sm font-medium">TH Sarabun New</div>
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

      {/* Text-to-Speech Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
           <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <Volume2 className="mr-2 text-law-600 dark:text-law-400" size={20} />
              การอ่านออกเสียง (Text-to-Speech)
           </h3>
        </div>
        
        <div className="p-6 space-y-6">
           {/* Voice Selection */}
           <div>
              <div className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">เสียงอ่าน (ภาษาไทย)</div>
              <select
                 value={settings.voiceURI || ''}
                 onChange={(e) => updateSetting('voiceURI', e.target.value)}
                 className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-law-100 focus:border-law-500 outline-none transition-all"
              >
                 <option value="">อัตโนมัติ (แนะนำ)</option>
                 {thaiVoices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                       {voice.name}
                    </option>
                 ))}
              </select>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                 แสดงเฉพาะเสียงที่รองรับภาษาไทยในอุปกรณ์ของคุณ
              </div>
           </div>

           <hr className="border-gray-100 dark:border-gray-700" />

           {/* Speaking Rate */}
           <div>
              <div className="flex justify-between mb-4">
                 <div className="text-base font-medium text-gray-900 dark:text-gray-100">ความเร็วการอ่าน</div>
                 <div className="text-sm font-bold text-law-600 dark:text-law-400 bg-law-50 dark:bg-law-900/50 px-2 py-0.5 rounded">
                    {settings.speakingRate || 1.0}x
                 </div>
              </div>
              <input 
                 type="range" 
                 min="0.5" 
                 max="2.0" 
                 step="0.1" 
                 value={settings.speakingRate || 1.0}
                 onChange={(e) => updateSetting('speakingRate', parseFloat(e.target.value))}
                 className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-law-600"
              />
              <div className="flex justify-between mt-2 text-xs text-gray-400 font-sans px-1">
                 <span>ช้า (0.5x)</span>
                 <span>ปกติ (1.0x)</span>
                 <span>เร็ว (2.0x)</span>
              </div>
           </div>
        </div>
      </div>

      {/* Neon Serverless PostgreSQL Cloud Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Database className="mr-2 text-emerald-600 dark:text-emerald-400" size={20} />
            ฐานข้อมูลบนคลาวด์ Neon (PostgreSQL)
          </h3>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${neonStatus.connected ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            <span className={`w-2 h-2 rounded-full ${neonStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
            {neonStatus.connected ? 'เชื่อมต่อแล้ว' : 'ออฟไลน์ / Local'}
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            ระบบเชื่อมต่อกับ <strong>Neon Serverless PostgreSQL</strong> เพื่อจัดเก็บเล่มกฎหมาย มาตรา และบันทึกส่วนตัวอย่างปลอดภัย ข้อมูลไม่สูญหายแม้ล้างแคชหรือเปลี่ยนเครื่อง
          </div>

          {neonStatus.stats && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">เล่มกฎหมาย</div>
                <div className="text-lg font-bold text-law-600 dark:text-law-400">{neonStatus.stats.books}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">มาตราในระบบ</div>
                <div className="text-lg font-bold text-law-600 dark:text-law-400">{neonStatus.stats.sections}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">บันทึกบนคลาวด์</div>
                <div className="text-lg font-bold text-law-600 dark:text-law-400">{neonStatus.stats.notes}</div>
              </div>
            </div>
          )}

          {syncMessage && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-lg flex items-center gap-2">
              <Info size={16} />
              <span>{syncMessage}</span>
            </div>
          )}

          {!neonStatus.connected && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">ข้อแนะนำ: </span>
                หากเปิดบนเครื่องอื่นหรือผ่าน Vercel แล้วยังไม่เชื่อมต่อ กรุณาตรวจสอบว่าได้ตั้งค่า <strong>DATABASE_URL</strong> ใน <strong>Vercel Dashboard &gt; Project Settings &gt; Environment Variables</strong> แล้วหรือยัง
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={handleSyncFromNeon}
              disabled={syncing}
              className="py-2.5 px-3 rounded-xl bg-law-600 hover:bg-law-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
              title="ดึงกฎหมายและโน้ตล่าสุดจากคลาวด์ลงมายังเครื่องนี้"
            >
              {syncing ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
              <span>ดึงข้อมูลล่าสุดจาก Neon</span>
            </button>

            <button
              onClick={handleSyncToNeon}
              disabled={syncing}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
              title="ส่งกฎหมายและโน้ตที่เพิ่มในเครื่องนี้ขึ้น Neon"
            >
              {syncing ? <RefreshCw size={15} className="animate-spin" /> : <Cloud size={15} />}
              <span>ซิงค์ข้อมูลขึ้น Neon</span>
            </button>

            <button
              onClick={handleCheckNeon}
              className="py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={15} />
              <span>ตรวจการเชื่อมต่อ</span>
            </button>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500">
            <span>จัดการแดชบอร์ดโครงการ</span>
            <a
              href="https://console.neon.tech/app/org-lucky-dream-51929614/projects"
              target="_blank"
              rel="noopener noreferrer"
              className="text-law-600 dark:text-law-400 hover:underline flex items-center gap-1"
            >
              <span>เปิด Neon Console</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <HardDrive className="mr-2 text-law-600 dark:text-law-400" size={20} />
            จัดการข้อมูล (Backup & Restore)
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
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">สำรองข้อมูล</h4>
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
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">กู้คืนข้อมูล</h4>
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
          Thai Law Mate Version 2.1.8
      </div>
    </div>
  );
};
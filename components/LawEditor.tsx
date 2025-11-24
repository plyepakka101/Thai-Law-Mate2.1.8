
import React, { useState, useEffect } from 'react';
import { Save, Search, AlertCircle, RotateCcw, BookOpen } from 'lucide-react';
import { LawSection, LawBook } from '../types';
import { getLaws, getBooks, getOriginalLaw } from '../services/dataService';
import { thaiToArabic, VALID_SUFFIXES } from '../utils/textUtils';

interface LawEditorProps {
  initialLaw?: LawSection; // If provided, we are editing this specific law
  initialBookId?: string | null;
  onSave: (law: Omit<LawSection, 'id'> & { id?: string }) => void;
  onCancel?: () => void;
}

export const LawEditor: React.FC<LawEditorProps> = ({ initialLaw, initialBookId, onSave, onCancel }) => {
  const [bookId, setBookId] = useState(initialBookId || (initialLaw?.bookId || 'crim'));
  const [sectionNumber, setSectionNumber] = useState(initialLaw?.sectionNumber || '');
  const [content, setContent] = useState(initialLaw?.content || '');
  const [category, setCategory] = useState(initialLaw?.category || '');
  const [existingId, setExistingId] = useState<string | undefined>(initialLaw?.id);
  
  // Search state
  const [searchMessage, setSearchMessage] = useState('');
  const [sectionError, setSectionError] = useState('');
  
  const books = getBooks();

  useEffect(() => {
    if (initialLaw) {
        setBookId(initialLaw.bookId || 'crim');
        setSectionNumber(initialLaw.sectionNumber);
        setContent(initialLaw.content);
        setCategory(initialLaw.category || '');
        setExistingId(initialLaw.id);
    }
  }, [initialLaw]);

  const handleSearchSection = () => {
      if (!sectionNumber.trim()) return;
      
      const allLaws = getLaws();
      const normSection = thaiToArabic(sectionNumber).trim();
      
      // Find law in the selected book
      const foundLaw = allLaws.find(l => 
          l.bookId === bookId && 
          thaiToArabic(l.sectionNumber) === normSection
      );

      if (foundLaw) {
          setContent(foundLaw.content);
          setCategory(foundLaw.category || '');
          setExistingId(foundLaw.id);
          setSearchMessage(`พบข้อมูลเดิมของมาตรา ${foundLaw.sectionNumber}`);
      } else {
          // Reset to blank if not found (treat as adding new)
          // But don't clear content if user already typed something
          if (!content) {
             setContent('');
             setCategory('');
          }
          setExistingId(undefined);
          setSearchMessage('ไม่พบข้อมูลเดิม (จะเป็นการเพิ่มมาตราใหม่)');
      }
  };

  const handleRestoreOriginal = () => {
      if (existingId) {
          const original = getOriginalLaw(existingId);
          if (original) {
              setContent(original.content);
              alert('คืนค่าเนื้อหาต้นฉบับแล้ว');
          } else {
              alert('ไม่พบต้นฉบับของมาตรานี้');
          }
      }
  }

  const validateFormat = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return true; // Let empty check handle emptiness
      
      const suffixes = VALID_SUFFIXES.join('|');
      // Pattern: Numbers (Thai/Arabic) -> Optional slash+Numbers -> Optional whitespace+Suffix
      const pattern = `^[0-9๐-๙]+(?:\\/[0-9๐-๙]+)?(?:\\s+(?:${suffixes}))?$`;
      const regex = new RegExp(pattern);
      
      return regex.test(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSectionError('');

    if (!sectionNumber.trim()) {
        setSectionError('กรุณาระบุเลขมาตรา');
        return;
    }

    if (!validateFormat(sectionNumber)) {
        setSectionError('รูปแบบไม่ถูกต้อง (ตัวอย่าง: 123, 123/1, 123 ทวิ)');
        return;
    }

    if (!content) return;

    const currentBook = books.find(b => b.id === bookId);
    
    // If category is empty, try to generate a default one
    let finalCategory = category;
    if (!finalCategory && currentBook) {
        finalCategory = currentBook.name;
    }

    onSave({
      id: existingId, // If undefined, dataService will create or find it
      sectionNumber,
      content,
      category: finalCategory,
      bookId: bookId,
      isCustom: true
    });

    if (!initialLaw) {
        // Reset if in standalone add mode
        setSectionNumber('');
        setContent('');
        setSearchMessage('');
        alert('บันทึกการแก้ไขเรียบร้อยแล้ว');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2 text-law-800 dark:text-law-200">
            <div className="p-2 bg-law-100 dark:bg-law-900/50 rounded-lg">
                <BookOpen size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold">แก้ไข / เพิ่มเติมกฎหมาย</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">ปรับปรุงเนื้อหากฎหมายให้เป็นปัจจุบัน</p>
            </div>
        </div>
        {onCancel && (
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 text-sm underline">
                ยกเลิก
            </button>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Book Selector */}
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">กฎหมายฉบับ</label>
            <select 
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-law-100 focus:border-law-500 outline-none transition-all"
                disabled={!!initialLaw} // Disable changing book if editing specific law
            >
                {books.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                ))}
                <option value="custom">อื่นๆ (กำหนดเอง)</option>
            </select>
        </div>

        {/* Section Number Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            เลขมาตรา <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-2">
            <div className="flex-1">
                <input
                    type="text"
                    value={sectionNumber}
                    onChange={(e) => {
                        setSectionNumber(e.target.value);
                        if (sectionError) setSectionError('');
                    }}
                    onBlur={handleSearchSection}
                    placeholder="เช่น 112, 288, 39 ทวิ"
                    className={`w-full p-3 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-law-100 focus:border-law-500 outline-none transition-all font-bold text-lg ${sectionError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 dark:border-gray-600'}`}
                    required
                    disabled={!!initialLaw}
                />
                {sectionError && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{sectionError}</p>
                )}
            </div>
            {!initialLaw && (
                <button 
                    type="button"
                    onClick={handleSearchSection}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 h-[52px]"
                >
                    <Search size={20} />
                </button>
            )}
          </div>
          {searchMessage && !sectionError && (
              <div className="mt-2 text-xs flex items-center text-law-600 dark:text-law-400">
                  <AlertCircle size={12} className="mr-1" />
                  {searchMessage}
              </div>
          )}
        </div>
        
        {/* Content Editor */}
        <div className="relative">
          <div className="flex justify-between items-center mb-1">
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เนื้อหา <span className="text-red-500">*</span></label>
             {existingId && (
                 <button 
                    type="button"
                    onClick={handleRestoreOriginal}
                    className="text-xs flex items-center text-law-600 hover:underline"
                 >
                     <RotateCcw size={12} className="mr-1"/>
                     เรียกคืนต้นฉบับ
                 </button>
             )}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="รายละเอียดของตัวบทกฎหมาย..."
            className="w-full p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-law-100 focus:border-law-500 min-h-[200px] outline-none transition-all font-sarabun text-base leading-relaxed"
            required
          />
        </div>
        
        {/* Optional Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมวดหมู่ / ส่วนที่ (ถ้ามี)</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="เช่น ภาค 1 บทบัญญัติทั่วไป"
            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm focus:ring-2 focus:ring-law-100 focus:border-law-500 outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-law-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-law-200 dark:shadow-none hover:bg-law-700 hover:shadow-xl transition-all flex items-center justify-center space-x-2 mt-4"
        >
          <Save size={20} />
          <span>บันทึกการแก้ไข</span>
        </button>
      </form>
    </div>
  );
};

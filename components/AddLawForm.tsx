
import React, { useState } from 'react';
import { Save, PlusCircle } from 'lucide-react';
import { LawSection } from '../types';

interface AddLawFormProps {
  onAdd: (law: Omit<LawSection, 'id'>) => void;
}

export const AddLawForm: React.FC<AddLawFormProps> = ({ onAdd }) => {
  const [sectionNumber, setSectionNumber] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionNumber || !content) return;

    onAdd({
      sectionNumber,
      content,
      category: category || 'กฎหมายเพิ่มเติม',
      isCustom: true
    });

    // Reset
    setSectionNumber('');
    setContent('');
    setCategory('');
    alert('บันทึกกฎหมายใหม่เรียบร้อยแล้ว');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-2 mb-6 text-law-800 dark:text-law-200">
        <PlusCircle size={24} />
        <h2 className="text-xl font-bold">เพิ่มกฎหมายใหม่</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เลขมาตรา <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={sectionNumber}
            onChange={(e) => setSectionNumber(e.target.value)}
            placeholder="เช่น 300, 50 ทวิ"
            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-law-100 focus:border-law-500 outline-none transition-all"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมวดหมู่ / ชื่อกฎหมาย</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="เช่น พรบ.คอมพิวเตอร์, กฎหมายแพ่ง"
            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-law-100 focus:border-law-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เนื้อหา <span className="text-red-500">*</span></label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="รายละเอียดของตัวบทกฎหมาย..."
            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-law-100 focus:border-law-500 min-h-[150px] outline-none transition-all"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-law-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-law-200 dark:shadow-none hover:bg-law-700 hover:shadow-xl transition-all flex items-center justify-center space-x-2"
        >
          <Save size={20} />
          <span>บันทึกกฎหมาย</span>
        </button>
      </form>
    </div>
  );
};


import React from 'react';
import { LawBook, LawSection } from '../types';
import { Book, ChevronRight, Library } from 'lucide-react';

interface BookshelfProps {
  books: LawBook[];
  laws: LawSection[];
  onSelectBook: (bookId: string) => void;
}

export const Bookshelf: React.FC<BookshelfProps> = ({ books, laws, onSelectBook }) => {
  
  const getLawCount = (bookId: string) => {
    return laws.filter(l => l.bookId === bookId).length;
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in zoom-in duration-300">
      <div className="flex items-center justify-center mb-8 md:mb-12">
         <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-2">
            <Library size={48} className="text-law-600 dark:text-law-400" />
         </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 px-4">
        {books.map((book) => {
          const count = getLawCount(book.id);
          // Extract Tailwind color class to build specific class strings
          // Assuming book.color is like 'bg-red-500'
          const colorClass = book.color || 'bg-gray-500';
          
          return (
            <button
              key={book.id}
              onClick={() => onSelectBook(book.id)}
              className="relative group flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 overflow-hidden text-left h-full transform hover:-translate-y-1"
            >
              <div className={`h-2 w-full ${colorClass}`} />
              
              <div className="p-6 flex-1 flex flex-row items-start space-x-4">
                 <div className={`w-12 h-16 rounded-md shadow-sm flex-shrink-0 flex items-center justify-center text-white font-bold text-xs ${colorClass} bg-opacity-90`}>
                    <span className="transform -rotate-90 whitespace-nowrap">{book.abbreviation}</span>
                 </div>
                 
                 <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 font-sans group-hover:text-law-600 dark:group-hover:text-law-400 transition-colors line-clamp-2">
                        {book.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-sans">
                        {book.description}
                    </p>
                    <div className="flex items-center text-xs text-gray-400 font-medium">
                        <Book size={12} className="mr-1" />
                        <span>{count} มาตรา</span>
                    </div>
                 </div>
                 
                 <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity text-law-500 transform translate-x-2 group-hover:translate-x-0">
                    <ChevronRight size={24} />
                 </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

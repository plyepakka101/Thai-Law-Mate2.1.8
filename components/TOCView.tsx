
import React, { useMemo, useState } from 'react';
import { LawSection } from '../types';
import { ChevronRight, ChevronDown, FileText, CornerDownRight, ArrowRightCircle, ListTree } from 'lucide-react';

interface TOCViewProps {
  laws: LawSection[];
  onNavigate: (id: string) => void;
}

interface TOCNode {
  label: string;
  id?: string; // ID of the first section in this group
  children: TOCNode[];
  level: number;
}

export const TOCView: React.FC<TOCViewProps> = ({ laws, onNavigate }) => {
  
  const tree = useMemo(() => {
    const root: TOCNode[] = [];
    
    laws.forEach(law => {
      if (!law.category) return;
      
      const parts = law.category.split(' > ');
      let currentLevel = root;
      
      // Build hierarchy from category parts
      parts.forEach((part, index) => {
        let existingNode = currentLevel.find(n => n.label === part);
        if (!existingNode) {
          existingNode = {
            label: part,
            children: [],
            level: index,
            // Point to this law if it's the specific category leaf
            id: index === parts.length - 1 ? law.id : undefined 
          };
          currentLevel.push(existingNode);
        } else if (index === parts.length - 1 && !existingNode.id) {
           // If we found the node but it didn't have an ID yet (maybe it was created as a parent previously),
           // assign the ID now because it's also a leaf for this specific law.
           existingNode.id = law.id;
        }
        currentLevel = existingNode.children;
      });
    });

    return root;
  }, [laws]);

  // Recursive render component
  const NodeItem: React.FC<{ node: TOCNode }> = ({ node }) => {
    const [isExpanded, setIsExpanded] = useState(node.level === 0); // Auto-expand root level
    const hasChildren = node.children.length > 0;
    const isClickable = !!node.id;

    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        setIsExpanded(!isExpanded);
      } else if (isClickable) {
          onNavigate(node.id!);
      }
    };

    const handleNavigate = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.id) onNavigate(node.id);
    };

    // Level 0: Root Cards (Part/Book)
    if (node.level === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-4 transition-all hover:shadow-md">
                <div 
                    onClick={handleToggle}
                    className="bg-law-50/50 dark:bg-law-900/20 p-4 flex items-center justify-between cursor-pointer hover:bg-law-100/50 dark:hover:bg-law-900/30 transition-colors"
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="bg-law-600 text-white p-1.5 rounded-md shadow-sm flex-shrink-0">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                        <span className="font-bold text-law-900 dark:text-law-100 text-lg break-words leading-tight">{node.label}</span>
                    </div>
                    {isClickable && (
                         <button 
                            onClick={handleNavigate}
                            className="text-law-600 dark:text-law-400 hover:text-law-800 dark:hover:text-law-200 p-1 ml-2 flex-shrink-0"
                            title="ไปที่ส่วนนี้"
                         >
                             <ArrowRightCircle size={20} />
                         </button>
                    )}
                </div>
                {isExpanded && hasChildren && (
                    <div className="border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        {node.children.map((child, idx) => (
                            <NodeItem key={`${child.label}-${idx}`} node={child} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Level 1+: Nested Items
    const paddingLeft = node.level === 1 ? 'pl-4' : node.level === 2 ? 'pl-8' : 'pl-12';
    
    return (
      <div className="border-b border-gray-50 dark:border-gray-700 last:border-0">
        <div 
          onClick={handleToggle}
          className={`
            flex items-center justify-between py-3 pr-4 cursor-pointer transition-colors
            ${paddingLeft}
            ${node.level === 1 ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}
            ${isClickable ? '' : ''}
          `}
        >
          <div className="flex items-start gap-2 overflow-hidden">
            {hasChildren && (
               <span className={`text-gray-400 transition-transform duration-200 mt-0.5 ${isExpanded ? 'rotate-90' : ''}`}>
                   <ChevronRight size={14} />
               </span>
            )}
            {!hasChildren && node.level > 1 && (
                <CornerDownRight size={12} className="text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1.5" />
            )}
            
            <span className={`break-words leading-snug ${node.level === 1 ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-sm text-gray-700 dark:text-gray-300'}`}>
              {node.label}
            </span>
          </div>

          {isClickable && (
              <button 
                onClick={handleNavigate}
                className="text-gray-300 hover:text-law-600 dark:text-gray-600 dark:hover:text-law-400 transition-colors ml-2 flex-shrink-0"
              >
                  <ArrowRightCircle size={16} />
              </button>
          )}
        </div>
        
        {isExpanded && hasChildren && (
          <div className="">
            {node.children.map((child, idx) => (
              <NodeItem key={`${child.label}-${idx}`} node={child} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="flex items-center justify-between px-2 mb-6">
         <div className="flex items-center space-x-2 text-law-900 dark:text-law-100">
            <ListTree size={24} />
            <h2 className="text-2xl font-bold">สารบัญกฎหมาย</h2>
         </div>
         <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            {laws.length} มาตรา
         </div>
      </div>
      
      <div className="space-y-1">
        {tree.map((node, idx) => (
          <NodeItem key={idx} node={node} />
        ))}
      </div>
    </div>
  );
};

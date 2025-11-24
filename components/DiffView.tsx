
import React, { useMemo } from 'react';
import { computeDiff } from '../utils/diffUtils';

interface DiffViewProps {
  original: string;
  modified: string;
}

export const DiffView: React.FC<DiffViewProps> = ({ original, modified }) => {
  const diffs = useMemo(() => computeDiff(original, modified), [original, modified]);

  return (
    <div className="font-sarabun text-base leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      {diffs.map((part, index) => {
        if (part.type === 'insert') {
          return (
            <span key={index} className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 decoration-clone py-0.5 rounded">
              {part.value}
            </span>
          );
        }
        if (part.type === 'delete') {
          return (
            <span key={index} className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 line-through decoration-red-500 decoration-2 decoration-clone py-0.5 rounded opacity-70">
              {part.value}
            </span>
          );
        }
        return <span key={index} className="text-gray-500 dark:text-gray-500">{part.value}</span>;
      })}
    </div>
  );
};

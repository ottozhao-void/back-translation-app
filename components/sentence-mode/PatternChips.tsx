import React from 'react';
import { SentenceAnalysis } from '../../types';

interface PatternChipsProps {
  patterns: SentenceAnalysis['patterns'];
  hoveredPatternId: string | null;
  onPatternHover: (patternId: string | null) => void;
  onPatternClick: (pattern: SentenceAnalysis['patterns'][0]) => void;
}

export const PatternChips: React.FC<PatternChipsProps> = ({
  patterns,
  hoveredPatternId,
  onPatternHover,
  onPatternClick,
}) => {
  if (!patterns || patterns.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {patterns.map((pattern) => (
        <button
          key={pattern.id}
          onMouseEnter={() => onPatternHover(pattern.id)}
          onMouseLeave={() => onPatternHover(null)}
          onClick={() => onPatternClick(pattern)}
          className="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: hoveredPatternId === pattern.id ? 'var(--accent-yellow, #FBBF24)' : 'var(--accent-yellow, #FBBF24)30',
            color: hoveredPatternId === pattern.id ? '#000' : 'var(--accent-yellow, #FBBF24)',
            border: '1px solid var(--accent-yellow, #FBBF24)',
          }}
          title={pattern.explanation}
        >
          {pattern.template}
        </button>
      ))}
    </div>
  );
};

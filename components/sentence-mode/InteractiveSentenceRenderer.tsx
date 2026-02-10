import React, { useMemo } from 'react';
import { SentenceAnalysis, SemanticUnit } from '../../types';

interface InteractiveSentenceRendererProps {
  sentence: string;
  analysis: SentenceAnalysis;
  onUnitClick: (unit: SemanticUnit) => void;
  hoveredPatternId: string | null;
}

const COLOR_MAP = {
  word: '#60A5FA',      // Blue
  collocation: '#A78BFA', // Purple
  pattern: '#FBBF24'     // Yellow
};

export const InteractiveSentenceRenderer: React.FC<InteractiveSentenceRendererProps> = ({
  sentence,
  analysis,
  onUnitClick,
  hoveredPatternId,
}) => {
  // Build clickable units from analysis
  const semanticUnits = useMemo(() => {
    const units: SemanticUnit[] = [];

    // Build a map of which tokens belong to hovered pattern
    const hoveredAnchors = new Set<number>();
    if (hoveredPatternId) {
      const pattern = analysis.patterns.find(p => p.id === hoveredPatternId);
      if (pattern) {
        pattern.anchors.forEach(a => hoveredAnchors.add(a.index));
      }
    }

    // Add non-stopword tokens as clickable words
    analysis.tokens.forEach((token) => {
      if (!token.isStopword) {
        units.push({
          text: token.text,
          type: 'word',
          startIndex: token.index,
          endIndex: token.index + token.length,
        });
      }
    });

    // Add chunks (idioms, collocations)
    analysis.chunks.forEach((chunk, chunkIdx) => {
      const firstToken = analysis.tokens[chunk.indices[0]];
      const lastToken = analysis.tokens[chunk.indices[chunk.indices.length - 1]];
      if (firstToken && lastToken) {
        units.push({
          text: chunk.text,
          type: 'collocation',
          startIndex: firstToken.index,
          endIndex: lastToken.index + lastToken.length,
          chunkIndex: chunkIdx,
        });
      }
    });

    // Sort by position and deduplicate overlapping units
    units.sort((a, b) => a.startIndex - b.startIndex);

    // Filter out units that are completely contained within larger units
    const deduplicatedUnits: SemanticUnit[] = [];
    for (const unit of units) {
      const isContained = deduplicatedUnits.some(existing =>
        unit.startIndex >= existing.startIndex && unit.endIndex <= existing.endIndex
      );
      if (!isContained) {
        deduplicatedUnits.push(unit);
      }
    }

    return deduplicatedUnits;
  }, [analysis, hoveredPatternId]);

  // Render sentence with clickable spans
  const renderSentence = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    semanticUnits.forEach((unit, i) => {
      // Add non-clickable text before this unit
      if (unit.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${i}`} style={{ color: 'var(--text-main)' }}>
            {sentence.slice(lastIndex, unit.startIndex)}
          </span>
        );
      }

      // Determine styling based on type and hover state
      const unitColor = COLOR_MAP[unit.type];
      const isHighlighted = hoveredPatternId !== null;

      parts.push(
        <span
          key={`unit-${i}`}
          onClick={() => {
            onUnitClick(unit);
          }}
          className="cursor-pointer transition-all duration-150 hover:opacity-80 rounded px-0.5"
          style={{
            color: unitColor,
            borderBottom: isHighlighted ? '2px solid' : '1px dashed',
            borderColor: isHighlighted ? unitColor : 'transparent',
            backgroundColor: isHighlighted ? `${unitColor}15` : 'transparent',
            fontWeight: unit.type === 'collocation' ? 500 : 400,
          }}
          title={`Click to add ${unit.type}`}
        >
          {unit.text}
        </span>
      );

      lastIndex = unit.endIndex;
    });

    // Add remaining text
    if (lastIndex < sentence.length) {
      parts.push(
        <span key="text-end" style={{ color: 'var(--text-main)' }}>
          {sentence.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <p className="text-xl leading-relaxed font-serif-sc">
      {renderSentence()}
    </p>
  );
};

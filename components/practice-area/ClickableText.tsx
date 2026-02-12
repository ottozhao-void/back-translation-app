import React, { useCallback } from 'react';

interface ClickableTextProps {
  text: string;
  language: 'en' | 'zh';
  onWordClick: (word: string, rect: DOMRect) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Chinese punctuation that should not be clickable
const ZH_PUNCTUATION = /^[，。！？；：""''、（）《》【】…—·\s]+$/;
// Strip leading/trailing punctuation from English words
const EN_PUNCTUATION_STRIP = /^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g;

/**
 * ClickableText - Renders text with individually clickable words.
 *
 * English: Split by whitespace, each word is clickable.
 * Chinese: Each character is clickable (punctuation excluded).
 * The LLM handles Chinese word boundary detection.
 */
export const ClickableText: React.FC<ClickableTextProps> = ({
  text,
  language,
  onWordClick,
  className,
  style,
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>, word: string) => {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      onWordClick(word, rect);
    },
    [onWordClick]
  );

  if (language === 'zh') {
    return (
      <span className={className} style={style}>
        {[...text].map((char, i) => {
          if (ZH_PUNCTUATION.test(char)) {
            return <span key={i}>{char}</span>;
          }
          return (
            <span
              key={i}
              className="cursor-pointer hover:underline decoration-dashed decoration-1 underline-offset-4"
              style={{ textDecorationColor: 'var(--text-secondary)' }}
              onClick={(e) => handleClick(e, char)}
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  }

  // English: split preserving whitespace
  const tokens = text.split(/(\s+)/);

  return (
    <span className={className} style={style}>
      {tokens.map((token, i) => {
        // Whitespace tokens rendered as-is
        if (/^\s+$/.test(token)) {
          return <span key={i}>{token}</span>;
        }

        // Strip punctuation for the callback, but display original
        const cleanWord = token.replace(EN_PUNCTUATION_STRIP, '');
        if (!cleanWord) {
          return <span key={i}>{token}</span>;
        }

        return (
          <span
            key={i}
            className="cursor-pointer hover:underline decoration-dashed decoration-1 underline-offset-4"
            style={{ textDecorationColor: 'var(--text-secondary)' }}
            onClick={(e) => handleClick(e, cleanWord)}
          >
            {token}
          </span>
        );
      })}
    </span>
  );
};

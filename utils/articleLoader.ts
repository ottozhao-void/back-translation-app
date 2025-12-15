import { Article, Paragraph } from '../types';
import { ARTICLE_FILENAMES } from '../constants';

/**
 * Parses raw markdown content into an Article object.
 * Expects format:
 * # 英文原文
 * [English Paragraphs]
 * # 中文原文
 * [Chinese Paragraphs]
 */
export const parseArticle = (text: string, id: string): Article => {
  // Normalize line endings and split
  const lines = text.split(/\r?\n/);
  const enLines: string[] = [];
  const zhLines: string[] = [];
  
  let currentSection: 'HEAD' | 'EN' | 'ZH' = 'HEAD';

  for (const line of lines) {
    const trimmed = line.trim();
    // Check for section headers
    if (trimmed.startsWith('# 英文原文')) {
      currentSection = 'EN';
      continue;
    }
    if (trimmed.startsWith('# 中文原文')) {
      currentSection = 'ZH';
      continue;
    }

    // Capture lines based on current section
    if (currentSection === 'EN') {
      enLines.push(line);
    } else if (currentSection === 'ZH') {
      zhLines.push(line);
    }
  }

  // Helper to process lines into paragraphs
  const processSection = (lines: string[]) => {
    const fullText = lines.join('\n');
    return fullText
      .split(/\n\s*\n/) // Split by double newlines (empty lines)
      .map(p => p.replace(/\n/g, ' ').trim()) // Merge single newlines within a paragraph into spaces
      .filter(p => p.length > 0);
  };

  const enParagraphs = processSection(enLines);
  const zhParagraphs = processSection(zhLines);

  // Zip paragraphs
  const content: Paragraph[] = [];
  const maxLen = Math.max(enParagraphs.length, zhParagraphs.length);

  for (let i = 0; i < maxLen; i++) {
    content.push({
      id: `${id}_p${i}`,
      en: enParagraphs[i] || "",
      zh: zhParagraphs[i] || "",
    });
  }

  // Infer metadata
  // Title: Use the first sentence of the first paragraph, or the filename
  let title = id;
  if (enParagraphs.length > 0) {
    const firstPara = enParagraphs[0];
    // Take first 8 words or first sentence
    const firstSentence = firstPara.split('.')[0];
    title = firstSentence.length < 60 ? firstSentence : firstSentence.substring(0, 60) + '...';
  }

  return {
    id,
    title: title,
    category: 'Practice', // Default category
    date: new Date().toLocaleDateString(),
    coverImage: `https://picsum.photos/seed/${id}/400/600`, // Consistent random image
    content
  };
};

/**
 * Fetches all articles defined in ARTICLE_FILENAMES
 */
export const fetchArticles = async (): Promise<Article[]> => {
  const promises = ARTICLE_FILENAMES.map(async (filename) => {
    try {
      const response = await fetch(`./articles/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.statusText}`);
      }
      let text = await response.text();
      
      // Handle Byte Order Mark (BOM) if present. 
      // 0xFEFF is the UTF-16 BOM, but in UTF-8 string reading it can appear as char code 65279.
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }
      
      return parseArticle(text, filename.replace('.md', ''));
    } catch (error) {
      console.error(error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((article): article is Article => article !== null);
};

import { Article, Paragraph, UserTranslation } from '../types';
import { ARTICLE_FILENAMES } from '../constants';

/**
 * Parses content into an Article object.
 * Handles both legacy Markdown and new JSON format.
 */
export const parseArticle = (text: string, id: string): Article | null => {
  try {
    const json = JSON.parse(text);
    if (json.content && Array.isArray(json.content)) {
      return { ...json, id };
    }
  } catch (e) {
    // Ignore
  }
  return null;
};

export const parseMarkdownArticle = (text: string, id: string): Article => {
  // Normalize line endings and split
  const lines = text.split(/\r?\n/);
  const enLines: string[] = [];
  const zhLines: string[] = [];
  const userZhLines: string[] = []; // For En->Zh
  const userEnLines: string[] = []; // For Zh->En
  
  let currentSection: 'HEAD' | 'EN' | 'ZH' | 'USER_ZH' | 'USER_EN' = 'HEAD';

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
    if (trimmed.startsWith('# 用户译文 (英译中)')) {
      currentSection = 'USER_ZH';
      continue;
    }
    if (trimmed.startsWith('# 用户译文 (中译英)')) {
      currentSection = 'USER_EN';
      continue;
    }
    // Legacy support
    if (trimmed.startsWith('# 用户译文') && !trimmed.includes('(')) {
      currentSection = 'USER_ZH'; // Default to En->Zh
      continue;
    }

    // Capture lines based on current section
    if (currentSection === 'EN') {
      enLines.push(line);
    } else if (currentSection === 'ZH') {
      zhLines.push(line);
    } else if (currentSection === 'USER_ZH') {
      userZhLines.push(line);
    } else if (currentSection === 'USER_EN') {
      userEnLines.push(line);
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

  const processUserSection = (lines: string[]) => {
    const fullText = lines.join('\n');
    if (!fullText.trim()) return [];
    return fullText
      .split(/\n\s*\n/)
      .map(p => p.replace(/\n/g, ' ').trim());
  };

  const enParagraphs = processSection(enLines);
  const zhParagraphs = processSection(zhLines);
  const userZhParagraphs = processUserSection(userZhLines);
  const userEnParagraphs = processUserSection(userEnLines);

  // Zip paragraphs
  const content: Paragraph[] = [];
  const maxLen = Math.max(enParagraphs.length, zhParagraphs.length);

  for (let i = 0; i < maxLen; i++) {
    const userTransZhStr = userZhParagraphs[i];
    const userTransEnStr = userEnParagraphs[i];
    
    const userTranslationZh: UserTranslation | undefined = (userTransZhStr && userTransZhStr !== "(no translation)") 
      ? { type: 'diff', text: userTransZhStr, timestamp: Date.now() } 
      : undefined;

    const userTranslationEn: UserTranslation | undefined = (userTransEnStr && userTransEnStr !== "(no translation)")
      ? { type: 'diff', text: userTransEnStr, timestamp: Date.now() }
      : undefined;

    content.push({
      id: `${id}_p${i}`,
      en: enParagraphs[i] || "",
      zh: zhParagraphs[i] || "",
      userTranslationZh,
      userTranslationEn,
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

export const serializeArticle = (article: Article): string => {
  return JSON.stringify(article, null, 2);
};

/**
 * Fetches all articles from the server
 */
export const fetchArticles = async (): Promise<Article[]> => {
  try {
    // 1. Get list of files from API or Fallback
    let filenames: string[] = [];
    try {
      const listResponse = await fetch('/api/articles');
      if (listResponse.ok) {
        filenames = await listResponse.json();
      } else {
        // Fallback if API returns 404 or other error
        filenames = ARTICLE_FILENAMES;
      }
    } catch (e) {
      console.warn('API not available, falling back to static list');
      filenames = ARTICLE_FILENAMES; 
    }

    const jsonFiles = filenames.filter(f => f.endsWith('.json'));

    // 2. Fetch content for each file
    const promises = jsonFiles.map(async (filename) => {
      try {
        // Add timestamp to prevent caching
        const response = await fetch(`./articles/${filename}?t=${Date.now()}`);
        if (!response.ok) {
          throw new Error(`Failed to load ${filename}: ${response.statusText}`);
        }
        let text = await response.text();
        
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }
        
        // Use filename as ID
        return parseArticle(text, filename);
      } catch (error) {
        console.error(error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((article): article is Article => article !== null);
  } catch (error) {
    console.error("Failed to fetch articles", error);
    return [];
  }
};

export const saveArticleToServer = async (filename: string, content: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename, content }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to save article', error);
    return false;
  }
};

export const deleteArticleFromServer = async (filename: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/articles?filename=${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to delete article', error);
    return false;
  }
};

import { Article, Paragraph } from '../types';

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
    const userTransZh = userZhParagraphs[i];
    const userTransEn = userEnParagraphs[i];
    content.push({
      id: `${id}_p${i}`,
      en: enParagraphs[i] || "",
      zh: zhParagraphs[i] || "",
      userTranslationZh: (userTransZh === "(no translation)" ? "" : userTransZh) || "",
      userTranslationEn: (userTransEn === "(no translation)" ? "" : userTransEn) || "",
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
  const enText = article.content.map(p => p.en).join('\n\n');
  const zhText = article.content.map(p => p.zh).join('\n\n');
  const userZhText = article.content.map(p => p.userTranslationZh || "(no translation)").join('\n\n');
  const userEnText = article.content.map(p => p.userTranslationEn || "(no translation)").join('\n\n');

  return `# 英文原文\n${enText}\n\n# 中文原文\n${zhText}\n\n# 用户译文 (英译中)\n${userZhText}\n\n# 用户译文 (中译英)\n${userEnText}`;
};

/**
 * Fetches all articles from the server
 */
export const fetchArticles = async (): Promise<Article[]> => {
  try {
    // 1. Get list of files from API
    const listResponse = await fetch('/api/articles');
    if (!listResponse.ok) {
      console.warn('API not available, falling back to static list');
      return []; 
    }
    const filenames: string[] = await listResponse.json();

    // 2. Fetch content for each file
    const promises = filenames.map(async (filename) => {
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

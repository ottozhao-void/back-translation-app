import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleLLMRequest } from './server/llm/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const articleServerPlugin = (): Plugin => {
  return {
    name: 'article-server-plugin',
    configureServer(server) {
        setupMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
        setupMiddleware(server.middlewares);
    }
  };
};

function setupMiddleware(middlewares: any) {
    middlewares.use(async (req: any, res: any, next: any) => {
        const articlesDir = path.resolve(__dirname, 'public', 'articles');
        const distArticlesDir = path.resolve(__dirname, 'dist', 'articles');
        const dataDir = path.resolve(__dirname, 'public', 'data');
        const distDataDir = path.resolve(__dirname, 'dist', 'data');
        const sentencesFile = path.join(dataDir, 'sentences.json');
        const distSentencesFile = path.join(distDataDir, 'sentences.json');
        const tagsFile = path.join(dataDir, 'tags.json');
        const distTagsFile = path.join(distDataDir, 'tags.json');

        if (!fs.existsSync(articlesDir)) {
          fs.mkdirSync(articlesDir, { recursive: true });
        }
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }

        try {
          const url = new URL(req.url || '', `http://${req.headers.host}`);

          // === LLM API Routes ===
          if (url.pathname.startsWith('/api/llm/')) {
            const handled = await handleLLMRequest(req, res);
            if (handled) return;
          }

          // 1. Handle API requests (POST/DELETE)
          if (url.pathname === '/api/articles/rename' && req.method === 'POST') {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: any) => chunks.push(chunk));
            req.on('end', () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const { oldFilename, newFilename } = body;
                
                if (!oldFilename || !newFilename) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing filenames' }));
                  return;
                }

                const safeOldFilename = path.basename(oldFilename);
                const safeNewFilename = path.basename(newFilename);
                
                const oldPath = path.join(articlesDir, safeOldFilename);
                const newPath = path.join(articlesDir, safeNewFilename);

                if (!fs.existsSync(oldPath)) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ error: 'File not found' }));
                    return;
                }
                if (fs.existsSync(newPath)) {
                    res.statusCode = 409;
                    res.end(JSON.stringify({ error: 'New filename already exists' }));
                    return;
                }

                fs.renameSync(oldPath, newPath);

                // Also rename in dist if it exists
                const oldDistPath = path.join(distArticlesDir, safeOldFilename);
                const newDistPath = path.join(distArticlesDir, safeNewFilename);
                if (fs.existsSync(oldDistPath)) {
                     fs.renameSync(oldDistPath, newDistPath);
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, newFilename: safeNewFilename }));
              } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to rename file' }));
              }
            });
            return;
          }

          // === Sentence API Routes ===

          // GET /api/sentences/summary - Mobile-optimized list
          if (url.pathname === '/api/sentences/summary' && req.method === 'GET') {
            try {
              if (!fs.existsSync(sentencesFile)) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, data: [], total: 0 }));
                return;
              }

              const content = fs.readFileSync(sentencesFile, 'utf-8');
              const store = JSON.parse(content);

              const summary = (store.sentences || []).map((s: any) => ({
                id: s.id,
                en: s.en ? (s.en.substring(0, 50) + (s.en.length > 50 ? '...' : '')) : '',
                zh: s.zh ? (s.zh.substring(0, 50) + (s.zh.length > 50 ? '...' : '')) : '',
                sourceType: s.sourceType,
                articleId: s.articleId,
                paragraphId: s.paragraphId,
                hasUserTranslation: !!(s.userTranslationZh || s.userTranslationEn),
                lastPracticed: s.lastPracticed,
                createdAt: s.createdAt,
                tags: s.tags || [],
              }));

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, data: summary, total: summary.length }));
            } catch (e) {
              console.error('Failed to get sentence summary:', e);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: 'Failed to get summary' }));
            }
            return;
          }

          // GET/PATCH /api/sentences/:id - Single sentence operations
          const sentenceIdMatch = url.pathname.match(/^\/api\/sentences\/([^/]+)$/);
          if (sentenceIdMatch && url.pathname !== '/api/sentences/summary') {
            const sentenceId = decodeURIComponent(sentenceIdMatch[1]);

            if (req.method === 'GET') {
              try {
                if (!fs.existsSync(sentencesFile)) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, error: 'Sentence not found' }));
                  return;
                }

                const content = fs.readFileSync(sentencesFile, 'utf-8');
                const store = JSON.parse(content);
                const sentence = (store.sentences || []).find((s: any) => s.id === sentenceId);

                if (!sentence) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, error: 'Sentence not found' }));
                  return;
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, data: sentence }));
              } catch (e) {
                console.error('Failed to get sentence:', e);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: 'Failed to get sentence' }));
              }
              return;
            }

            if (req.method === 'PATCH') {
              const chunks: Buffer[] = [];
              req.on('data', (chunk: any) => chunks.push(chunk));
              req.on('end', () => {
                try {
                  const updates = JSON.parse(Buffer.concat(chunks).toString());

                  if (!fs.existsSync(sentencesFile)) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ success: false, error: 'Sentence not found' }));
                    return;
                  }

                  const content = fs.readFileSync(sentencesFile, 'utf-8');
                  const store = JSON.parse(content);
                  const index = (store.sentences || []).findIndex((s: any) => s.id === sentenceId);

                  if (index === -1) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ success: false, error: 'Sentence not found' }));
                    return;
                  }

                  // Merge updates
                  store.sentences[index] = { ...store.sentences[index], ...updates };
                  store.lastModified = Date.now();

                  const updatedContent = JSON.stringify(store, null, 2);

                  // Update public (Source of Truth)
                  fs.writeFileSync(sentencesFile, updatedContent);

                  // Update dist if it exists
                  if (fs.existsSync(distDataDir)) {
                    fs.writeFileSync(distSentencesFile, updatedContent);
                  }

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, data: store.sentences[index] }));
                } catch (e) {
                  console.error('Failed to patch sentence:', e);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: 'Failed to patch sentence' }));
                }
              });
              return;
            }
          }

          if (url.pathname === '/api/sentences') {
            if (req.method === 'GET') {
              try {
                if (fs.existsSync(sentencesFile)) {
                  const content = fs.readFileSync(sentencesFile, 'utf-8');
                  res.setHeader('Content-Type', 'application/json');
                  res.end(content);
                } else {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ version: 1, sentences: [], lastModified: Date.now() }));
                }
              } catch (e) {
                console.error('Failed to read sentences:', e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to read sentences' }));
              }
              return;
            }

            if (req.method === 'POST') {
              const chunks: Buffer[] = [];
              req.on('data', (chunk: any) => chunks.push(chunk));
              req.on('end', () => {
                try {
                  const store = JSON.parse(Buffer.concat(chunks).toString());
                  if (!store || !Array.isArray(store.sentences)) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Invalid sentence store format' }));
                    return;
                  }

                  const content = JSON.stringify(store, null, 2);

                  // Update public (Source of Truth)
                  fs.writeFileSync(sentencesFile, content);

                  // Update dist if it exists
                  if (fs.existsSync(distDataDir)) {
                    fs.writeFileSync(distSentencesFile, content);
                  }

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, count: store.sentences.length }));
                } catch (e) {
                  console.error('Failed to save sentences:', e);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Failed to save sentences' }));
                }
              });
              return;
            }
          }

          // === Tag API Routes ===
          const DEFAULT_TAG_STORE = { version: 1, userTags: [], lastModified: Date.now() };

          // Helper to load tag store
          const loadTagStore = () => {
            try {
              if (fs.existsSync(tagsFile)) {
                return JSON.parse(fs.readFileSync(tagsFile, 'utf-8'));
              }
            } catch (e) {
              console.error('Failed to load tags:', e);
            }
            return { ...DEFAULT_TAG_STORE };
          };

          // Helper to save tag store
          const saveTagStore = (store: any) => {
            const content = JSON.stringify(store, null, 2);
            fs.writeFileSync(tagsFile, content);
            if (fs.existsSync(distDataDir)) {
              fs.writeFileSync(distTagsFile, content);
            }
          };

          // GET /api/tags - Get all user tags
          if (url.pathname === '/api/tags' && req.method === 'GET') {
            try {
              const store = loadTagStore();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, data: store.userTags || [] }));
            } catch (e) {
              console.error('Failed to get tags:', e);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: 'Failed to get tags' }));
            }
            return;
          }

          // POST /api/tags - Create new user tag
          if (url.pathname === '/api/tags' && req.method === 'POST') {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: any) => chunks.push(chunk));
            req.on('end', () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const { label, color } = body;

                if (!label || typeof label !== 'string') {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, error: 'Missing or invalid label' }));
                  return;
                }

                const store = loadTagStore();
                const newTag = {
                  id: `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  label: label.trim(),
                  color: color || '#3b82f6',
                  isSystem: false,
                  createdAt: Date.now(),
                };

                store.userTags = store.userTags || [];
                store.userTags.push(newTag);
                store.lastModified = Date.now();
                saveTagStore(store);

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, data: newTag }));
              } catch (e) {
                console.error('Failed to create tag:', e);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: 'Failed to create tag' }));
              }
            });
            return;
          }

          // DELETE /api/tags?id=xxx - Delete user tag
          if (url.pathname === '/api/tags' && req.method === 'DELETE') {
            try {
              const tagId = url.searchParams.get('id');
              if (!tagId) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Missing tag id' }));
                return;
              }

              // Prevent deleting system tags
              if (tagId.startsWith('_')) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Cannot delete system tags' }));
                return;
              }

              const store = loadTagStore();
              const initialLength = store.userTags?.length || 0;
              store.userTags = (store.userTags || []).filter((t: any) => t.id !== tagId);

              if (store.userTags.length === initialLength) {
                res.statusCode = 404;
                res.end(JSON.stringify({ success: false, error: 'Tag not found' }));
                return;
              }

              store.lastModified = Date.now();
              saveTagStore(store);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              console.error('Failed to delete tag:', e);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: 'Failed to delete tag' }));
            }
            return;
          }

          // PATCH /api/tags/:id - Update user tag
          const tagIdMatch = url.pathname.match(/^\/api\/tags\/([^/]+)$/);
          if (tagIdMatch && req.method === 'PATCH') {
            const tagId = decodeURIComponent(tagIdMatch[1]);

            // Prevent updating system tags
            if (tagId.startsWith('_')) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Cannot update system tags' }));
              return;
            }

            const chunks: Buffer[] = [];
            req.on('data', (chunk: any) => chunks.push(chunk));
            req.on('end', () => {
              try {
                const updates = JSON.parse(Buffer.concat(chunks).toString());
                const store = loadTagStore();
                const index = (store.userTags || []).findIndex((t: any) => t.id === tagId);

                if (index === -1) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, error: 'Tag not found' }));
                  return;
                }

                // Only allow updating label and color
                if (updates.label) store.userTags[index].label = updates.label.trim();
                if (updates.color) store.userTags[index].color = updates.color;

                store.lastModified = Date.now();
                saveTagStore(store);

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, data: store.userTags[index] }));
              } catch (e) {
                console.error('Failed to update tag:', e);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: 'Failed to update tag' }));
              }
            });
            return;
          }

          if (url.pathname === '/api/articles') {
             if (req.method === 'GET') {
                const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.json'));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(files));
                return;
             }

             if (req.method === 'POST') {
                const chunks: Buffer[] = [];
                req.on('data', (chunk: any) => chunks.push(chunk));
                req.on('end', () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { filename, content } = body;
                    
                    if (!filename || !content) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ error: 'Missing filename or content' }));
                      return;
                    }

                    const safeFilename = path.basename(filename);
                    
                    // Update public (source)
                    fs.writeFileSync(path.join(articlesDir, safeFilename), content);
                    
                    // Update dist (build output) if it exists, so it stays in sync
                    if (fs.existsSync(distArticlesDir)) {
                        fs.writeFileSync(path.join(distArticlesDir, safeFilename), content);
                    }
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, filename: safeFilename }));
                  } catch (e) {
                    console.error(e);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'Failed to save file' }));
                  }
                });
                return;
             }

             if (req.method === 'DELETE') {
                const filename = url.searchParams.get('filename');
                if (!filename) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing filename' }));
                  return;
                }
                const safeFilename = path.basename(filename);
                
                const filePath = path.join(articlesDir, safeFilename);
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                }
                
                const distFilePath = path.join(distArticlesDir, safeFilename);
                if (fs.existsSync(distFilePath)) {
                    fs.unlinkSync(distFilePath);
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
                return;
             }
          }

          // 2. Intercept GET requests for articles to ensure we serve the latest version from public/
          // This is crucial for 'vite preview' which otherwise serves stale files from dist/
          if (req.method === 'GET' && url.pathname.startsWith('/articles/')) {
              const filename = path.basename(url.pathname);
              const filePath = path.join(articlesDir, filename);
              
              if (fs.existsSync(filePath)) {
                  const content = fs.readFileSync(filePath);
                  if (filename.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
                  else if (filename.endsWith('.txt')) res.setHeader('Content-Type', 'text/plain');
                  else if (filename.endsWith('.md')) res.setHeader('Content-Type', 'text/markdown');
                  
                  res.end(content);
                  return;
              }
          }

        } catch (error) {
          console.error('Middleware error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal server error' }));
          return;
        }

        next();
    });
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), articleServerPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

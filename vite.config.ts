import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

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
        
        if (!fs.existsSync(articlesDir)) {
          fs.mkdirSync(articlesDir, { recursive: true });
        }

        try {
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          
          // 1. Handle API requests (POST/DELETE)
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

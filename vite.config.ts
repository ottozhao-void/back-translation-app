import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const articleServerPlugin = (): Plugin => {
  return {
    name: 'article-server-plugin',
    configureServer(server) {
      server.middlewares.use('/api/articles', async (req, res, next) => {
        const articlesDir = path.resolve(__dirname, 'articles');
        
        if (!fs.existsSync(articlesDir)) {
          fs.mkdirSync(articlesDir);
        }

        try {
          if (req.method === 'GET') {
            const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(files));
            return;
          }

          if (req.method === 'POST') {
            const chunks: Buffer[] = [];
            req.on('data', (chunk) => chunks.push(chunk));
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
                fs.writeFileSync(path.join(articlesDir, safeFilename), content);
                
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
            const url = new URL(req.url || '', `http://${req.headers.host}`);
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
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'File not found' }));
            }
            return;
          }
        } catch (error) {
          console.error('Middleware error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal server error' }));
          return;
        }

        next();
      });
    },
  };
};

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

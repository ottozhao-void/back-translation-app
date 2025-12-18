import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

const articlesDir = path.join(__dirname, 'public', 'articles');
const distArticlesDir = path.join(__dirname, 'dist', 'articles');

// Ensure directories exist
if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });

// API Routes
app.get('/api/articles', (req, res) => {
    try {
        const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.json'));
        res.json(files);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/articles', (req, res) => {
    try {
        const { filename, content } = req.body;
        if (!filename || !content) return res.status(400).json({ error: 'Missing filename or content' });

        const safeFilename = path.basename(filename);
        
        // Update public (Source of Truth)
        fs.writeFileSync(path.join(articlesDir, safeFilename), content);
        
        // Update dist (Build Output) if it exists
        if (fs.existsSync(distArticlesDir)) {
            fs.writeFileSync(path.join(distArticlesDir, safeFilename), content);
        }

        res.json({ success: true, filename: safeFilename });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to save file' });
    }
});

app.delete('/api/articles', (req, res) => {
    try {
        const filename = req.query.filename;
        if (!filename) return res.status(400).json({ error: 'Missing filename' });

        const safeFilename = path.basename(filename);
        const filePath = path.join(articlesDir, safeFilename);
        
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        const distFilePath = path.join(distArticlesDir, safeFilename);
        if (fs.existsSync(distFilePath)) fs.unlinkSync(distFilePath);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Intercept /articles/* requests to serve fresh content from public
// This ensures that even if dist/ has an old version, we serve the new one
app.get('/articles/:filename', (req, res, next) => {
    const filename = req.params.filename;
    const filePath = path.join(articlesDir, filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        next();
    }
});

// Fallback for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

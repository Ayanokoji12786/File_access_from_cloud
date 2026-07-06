const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');

fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

// Setup multer for file uploads
const upload = multer({ dest: UPLOAD_DIR });

// GET /api/files?path=/some/path
app.get('/api/files', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  
  try {
    const targetPath = req.query.path || '';
    const fullPath = path.join(UPLOAD_DIR, targetPath);

    if (!fullPath.startsWith(UPLOAD_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    
    const files = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(fullPath, entry.name);
        const stat = await fs.stat(entryPath);
        
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'folder' : 'file',
          size: stat.size,
          modified: stat.mtime.toISOString(),
        };
      })
    );

    res.json({ files, currentPath: targetPath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    message: 'File uploaded successfully',
    file: {
      name: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
    },
  });
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
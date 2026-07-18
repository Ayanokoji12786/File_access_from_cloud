const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    folder: 'cloud_file_manager',
    // Cloudinary blocks unsigned/signed delivery of PDFs stored under
    // resource_type 'image' (its PDF/ZIP security restriction returns
    // 401 "deny or ACL failure"). Store non-image files as 'raw' to
    // avoid that restriction; only actual images use 'image'.
    resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
  }),
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.send('Backend Server is Running!');
});

// Serve diagnostic page
app.get('/diagnostic', (req, res) => {
  const diagnosticHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloud File Manager - PDF Diagnostics</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        h1 {
            margin-bottom: 10px;
            color: #333;
        }
        
        .info {
            background: #e8f4f8;
            border-left: 4px solid #0066cc;
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 4px;
            font-size: 14px;
            color: #0066cc;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #333;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 10px;
        }
        
        button {
            padding: 8px 16px;
            font-size: 14px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            background: #0066cc;
            color: white;
            transition: background 0.2s;
            margin-right: 8px;
            margin-bottom: 8px;
        }
        
        button:hover {
            background: #0052a3;
        }
        
        button.secondary {
            background: #666;
            margin-right: 4px;
            padding: 6px 12px;
            font-size: 12px;
        }
        
        button.secondary:hover {
            background: #444;
        }
        
        .output {
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin-top: 15px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            max-height: 400px;
            overflow-y: auto;
            color: #333;
            white-space: pre-wrap;
            word-break: break-all;
        }
        
        .success {
            color: #28a745;
            font-weight: bold;
        }
        
        .error {
            color: #dc3545;
            font-weight: bold;
        }
        
        .warning {
            color: #ff9800;
            font-weight: bold;
        }
        
        #fileButtons {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Cloud File Manager - PDF Diagnostics</h1>
        <div class="info">
            This tool helps diagnose why some PDFs fail to load. It tests your files and shows status codes.
        </div>
        
        <div class="section">
            <div class="section-title">Step 1: Load File List</div>
            <button onclick="loadFiles()">📋 Fetch All Files from Cloudinary</button>
            <div id="fileListOutput" class="output">Click the button to load your files...</div>
        </div>
        
        <div class="section">
            <div class="section-title">Step 2: Select a File to Test</div>
            <div id="fileButtons"></div>
        </div>
        
        <div class="section">
            <div class="section-title">Step 3: Test Results</div>
            <div id="testOutput" class="output">Select a file above to test...</div>
        </div>
    </div>

    <script>
        const BACKEND_URL = window.location.origin;

        async function loadFiles() {
            const output = document.getElementById('fileListOutput');
            output.textContent = '⏳ Loading files...';
            
            try {
                const response = await fetch(BACKEND_URL + '/files');
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                
                const data = await response.json();
                
                if (!Array.isArray(data)) {
                    throw new Error('Expected array, got: ' + typeof data);
                }
                
                output.innerHTML = '<span class="success">✅ Loaded ' + data.length + ' files</span>\\n\\n';
                
                const buttonsContainer = document.getElementById('fileButtons');
                buttonsContainer.innerHTML = '';
                
                if (data.length === 0) {
                    output.innerHTML += '<span class="warning">⚠️ No files found in Cloudinary</span>';
                    return;
                }
                
                data.forEach((file, idx) => {
                    if (!file) {
                        console.warn('File at index ' + idx + ' is null or undefined');
                        return;
                    }
                    
                    const btn = document.createElement('button');
                    btn.textContent = '📄 ' + (file.name || 'Unknown');
                    btn.className = 'secondary';
                    btn.onclick = () => testFile(file);
                    buttonsContainer.appendChild(btn);
                    
                    output.innerHTML += (idx + 1) + '. ' + (file.name || 'Unknown') + ' (' + file.public_id + ')\\n';
                });
                
            } catch (error) {
                output.innerHTML = '<span class="error">❌ Error: ' + error.message + '</span>';
                console.error('Load error:', error);
            }
        }

        async function testFile(file) {
            const output = document.getElementById('testOutput');
            output.textContent = '⏳ Testing ' + file.name + '...\\n';
            
            if (!file.public_id) {
                output.innerHTML = '<span class="error">❌ Error: No public_id for this file</span>';
                return;
            }
            
            try {
                const response = await fetch(BACKEND_URL + '/debug/check/' + encodeURIComponent(file.public_id));
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                
                const data = await response.json();
                
                let html = '<span class="success">✅ File: ' + file.name + '</span>\\n';
                html += 'Public ID: ' + data.fileInfo.public_id + '\\n';
                html += 'Format: ' + data.fileInfo.format + '\\n';
                html += 'Resource Type: ' + data.fileInfo.resource_type + '\\n';
                html += 'Size: ' + (data.fileInfo.bytes / 1024).toFixed(2) + ' KB\\n';
                html += 'Access Mode: ' + data.fileInfo.access_mode + '\\n\\n';
                
                html += '<span class="success">Status Code Check:</span>\\n';
                if (data.headersCheck.direct.error) {
                    html += 'Direct URL: <span class="error">ERROR - ' + data.headersCheck.direct.error + '</span>\\n';
                } else {
                    const directStatus = data.headersCheck.direct.statusCode;
                    const directColor = directStatus === 200 ? 'success' : 'error';
                    html += 'Direct URL: <span class="' + directColor + '">' + directStatus + '</span>\\n';
                }
                
                if (data.headersCheck.signed.error) {
                    html += 'Signed URL: <span class="error">ERROR - ' + data.headersCheck.signed.error + '</span>\\n\\n';
                } else {
                    const signedStatus = data.headersCheck.signed.statusCode;
                    const signedColor = signedStatus === 200 ? 'success' : 'error';
                    html += 'Signed URL: <span class="' + signedColor + '">' + signedStatus + '</span>\\n\\n';
                }
                
                html += '<span class="success">Try downloading via proxy:</span>\\n';
                html += '<a href="' + BACKEND_URL + '/proxy/' + encodeURIComponent(file.public_id) + '" target="_blank" style="color: #0066cc; text-decoration: underline;">📥 Click here to download</a>';
                
                output.innerHTML = html;
                
            } catch (error) {
                output.innerHTML = '<span class="error">❌ Error: ' + error.message + '</span>';
                console.error('Test error:', error);
            }
        }

        window.onload = () => {
            document.getElementById('fileListOutput').textContent = '👉 Click "Fetch All Files" to begin...';
        };
    </script>
</body>
</html>`;
  res.send(diagnosticHTML);
});

app.post('/upload', upload.single('file'), (req, res) => {
  try {
    res.status(200).json({
      message: 'File uploaded successfully!',
      fileUrl: req.file.path,
      fileName: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/files', async (req, res) => {
  try {
    // 1. Fetch both raw and image types to ensure coverage
    const [rawRes, imgRes] = await Promise.all([
      cloudinary.api.resources({ type: 'upload', prefix: 'cloud_file_manager/', resource_type: 'raw' }),
      cloudinary.api.resources({ type: 'upload', prefix: 'cloud_file_manager/', resource_type: 'image' })
    ]);
    const allFiles = [...rawRes.resources, ...imgRes.resources];

    // 2. Map files and ensure the URL forces a download/open behavior
    const files = allFiles.map(file => {
      let url = file.secure_url;

      // If it's a raw file (like many PDFs), add the attachment flag to force accessibility
      if (file.resource_type === 'raw') {
        url = url.replace('/raw/upload/', '/raw/upload/fl_attachment/');
      }

      return {
        name: file.public_id.split('/').pop() + (file.format ? '.' + file.format : ''),
        public_id: file.public_id,
        url: url,
        bytes: file.bytes,
        created_at: file.created_at
      };
    });
    res.json(files);
  } catch (error) {
    console.error("Cloudinary listing error:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

app.delete('/files/*splat', async (req, res) => {
  try {
    const publicId = req.params.splat.join('/');

    const resource = await cloudinary.api.resource(publicId);
    await cloudinary.uploader.destroy(publicId, { resource_type: resource.resource_type });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// NEW: Diagnostic route to check file metadata in Cloudinary
app.get('/debug/files', async (req, res) => {
  try {
    const [rawRes, imgRes] = await Promise.all([
      cloudinary.api.resources({ type: 'upload', prefix: 'cloud_file_manager/', resource_type: 'raw', max_results: 100 }),
      cloudinary.api.resources({ type: 'upload', prefix: 'cloud_file_manager/', resource_type: 'image', max_results: 100 })
    ]);

    const allFiles = [...(rawRes.resources || []), ...(imgRes.resources || [])];

    if (!allFiles || allFiles.length === 0) {
      return res.json([]);
    }

    // Return detailed metadata for debugging
    const filesMetadata = allFiles.map(file => {
      const fileName = file.public_id ? file.public_id.split('/').pop() : 'unknown';
      const format = file.format ? '.' + file.format : '';

      return {
        name: fileName + format,
        public_id: file.public_id || 'unknown',
        format: file.format || 'unknown',
        resource_type: file.resource_type || 'unknown',
        type: file.type || 'upload',
        bytes: file.bytes || 0,
        access_mode: file.access_mode || 'unknown',
        created_at: file.created_at || new Date(),
        secure_url: file.secure_url || '',
        url: file.url || ''
      };
    });

    res.json(filesMetadata);
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: Check file headers and content type
app.get('/debug/check/*splat', async (req, res) => {
  try {
    const publicId = req.params.splat.join('/');

    if (!publicId) {
      return res.status(400).json({ error: 'public_id parameter is required' });
    }

    // Fetch metadata
    let resource;
    try {
      resource = await cloudinary.api.resource(publicId);
    } catch (error) {
      return res.status(404).json({ error: 'File not found in Cloudinary: ' + publicId });
    }

    // Generate different URLs
    const directUrl = resource.secure_url || resource.url;
    const signedUrl = cloudinary.url(publicId, {
      resource_type: resource.resource_type || 'raw',
      secure: true,
      sign_url: true,
      type: resource.type || 'upload'
    });

    // Function to check URL headers
    const checkUrl = (url) => {
      return new Promise((resolve) => {
        const isHttps = url.startsWith('https');
        const lib = isHttps ? require('https') : require('http');

        const request = lib.request(url, { method: 'HEAD' }, (res) => {
          resolve({
            statusCode: res.statusCode,
            contentType: res.headers['content-type'] || 'unknown',
            contentLength: res.headers['content-length'] || 'unknown'
          });
        });

        request.on('error', (error) => {
          resolve({ error: error.message });
        });

        request.end();
      });
    };

    // Test both URLs
    const [directCheck, signedCheck] = await Promise.all([
      checkUrl(directUrl),
      checkUrl(signedUrl)
    ]);

    res.json({
      fileInfo: {
        public_id: publicId,
        format: resource.format || 'unknown',
        resource_type: resource.resource_type || 'raw',
        bytes: resource.bytes || 0,
        access_mode: resource.access_mode || 'unknown',
        created_at: resource.created_at || new Date()
      },
      urls: {
        direct: directUrl,
        signed: signedUrl
      },
      headersCheck: {
        direct: directCheck,
        signed: signedCheck
      }
    });
  } catch (error) {
    console.error("Check error:", error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: Proxy endpoint to actually retrieve the file
app.get('/proxy/*splat', async (req, res) => {
  try {
    const publicId = req.params.splat.join('/');

    // Get file resource info
    const resource = await cloudinary.api.resource(publicId);

    // Generate signed URL
    const url = cloudinary.url(publicId, {
      resource_type: resource.resource_type,
      secure: true,
      sign_url: true,
      type: resource.type || 'upload'
    });

    const https = require('https');

    https.get(url, (cloudinaryRes) => {
      // Log for debugging
      console.log(`Fetching ${publicId}:`, {
        statusCode: cloudinaryRes.statusCode,
        contentType: cloudinaryRes.headers['content-type'],
        contentLength: cloudinaryRes.headers['content-length']
      });

      // Set response headers
      res.setHeader('Content-Type', cloudinaryRes.headers['content-type'] || 'application/pdf');
      res.setHeader('Content-Length', cloudinaryRes.headers['content-length'] || 0);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Pipe the file
      cloudinaryRes.pipe(res);
    }).on('error', (error) => {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Failed to fetch file', details: error.message });
    });
  } catch (error) {
    console.error('Proxy route error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/download/*splat', async (req, res) => {
  try {
    const publicId = req.params.splat.join('/');

    // Get file resource info to determine actual resource_type/type
    const resource = await cloudinary.api.resource(publicId);

    // Generate signed URL with attachment disposition to force download
    const url = cloudinary.url(publicId, {
      resource_type: resource.resource_type || 'raw',
      secure: true,
      sign_url: true,
      type: resource.type || 'upload',
      attachment: true // Force download instead of preview
    });

    // Set proper headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${publicId.split('/').pop()}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Redirect to the signed URL
    res.redirect(url);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Stream the file inline so the browser renders it (e.g. its built-in PDF viewer)
// instead of downloading it, unlike /file which forces attachment.
app.get('/view/*splat', async (req, res) => {
  try {
    const publicId = req.params.splat.join('/');
    const fileName = publicId.split('/').pop();

    const resource = await cloudinary.api.resource(publicId);

    const url = cloudinary.url(publicId, {
      resource_type: resource.resource_type || 'raw',
      secure: true,
      sign_url: true,
      type: resource.type || 'upload'
    });

    const https = require('https');
    https.get(url, (cloudinaryRes) => {
      res.setHeader('Content-Type', cloudinaryRes.headers['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (cloudinaryRes.headers['content-length']) {
        res.setHeader('Content-Length', cloudinaryRes.headers['content-length']);
      }

      cloudinaryRes.pipe(res);
    }).on('error', (error) => {
      console.error('View fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch file' });
    });
  } catch (error) {
    console.error('View route error:', error);
    res.status(500).json({ error: 'Failed to process file request' });
  }
});

// Alternative: Direct file streaming (more secure than redirect)
app.get('/file/*splat', async (req, res) => {
  try {
    // Extract everything after /file/ as the public_id (handles slashes)
    const publicId = req.params.splat.join('/');
    const fileName = publicId.split('/').pop();

    // Get file resource info to determine actual resource_type/type
    const resource = await cloudinary.api.resource(publicId);

    // Generate signed URL
    const url = cloudinary.url(publicId, {
      resource_type: resource.resource_type || 'raw',
      secure: true,
      sign_url: true,
      type: resource.type || 'upload'
    });

    // Fetch the file from Cloudinary
    const https = require('https');
    https.get(url, (cloudinaryRes) => {
      // Set proper headers for download
      res.setHeader('Content-Type', cloudinaryRes.headers['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Length', cloudinaryRes.headers['content-length']);

      // Pipe the response
      cloudinaryRes.pipe(res);
    }).on('error', (error) => {
      console.error('File fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch file' });
    });
  } catch (error) {
    console.error('File route error:', error);
    res.status(500).json({ error: 'Failed to process file request' });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
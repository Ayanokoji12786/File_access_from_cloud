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
  params: {
    folder: 'cloud_file_manager',
    resource_type: 'auto', // Keep 'auto' to let Cloudinary detect types
  },
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
        }
        
        .error {
            color: #dc3545;
        }
        
        #fileButtons {
            display: flex;
            flex-wrap: wrap;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Cloud File Manager - PDF Diagnostics</h1>
        <div class="info">
            This tool helps diagnose why some PDFs fail to load. Click "Fetch Files" to start.
        </div>
        
        <div class="section">
            <div class="section-title">Step 1: Load File List</div>
            <button onclick="loadFiles()">📋 Fetch All Files from Cloudinary</button>
            <div id="fileListOutput" class="output">Click the button to start...</div>
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
                const response = await fetch(BACKEND_URL + '/debug/files');
                const data = await response.json();
                
                output.innerHTML = '<span class="success">✅ Loaded ' + data.length + ' files</span>';
                
                const buttonsContainer = document.getElementById('fileButtons');
                buttonsContainer.innerHTML = '';
                
                data.forEach((file) => {
                    const btn = document.createElement('button');
                    btn.textContent = '📄 ' + file.name;
                    btn.className = 'secondary';
                    btn.onclick = () => testFile(file);
                    buttonsContainer.appendChild(btn);
                });
                
            } catch (error) {
                output.innerHTML = '<span class="error">❌ Error: ' + error.message + '</span>';
            }
        }

        async function testFile(file) {
            const output = document.getElementById('testOutput');
            output.textContent = '⏳ Testing ' + file.name + '...';
            
            try {
                const response = await fetch(BACKEND_URL + '/debug/check/' + file.public_id);
                const data = await response.json();
                
                let html = '<span class="success">✅ File Info:</span>\\n';
                html += 'Name: ' + data.fileInfo.public_id + '\\n';
                html += 'Format: ' + data.fileInfo.format + '\\n';
                html += 'Type: ' + data.fileInfo.resource_type + '\\n';
                html += 'Size: ' + (data.fileInfo.bytes / 1024).toFixed(2) + ' KB\\n';
                html += 'Access: ' + data.fileInfo.access_mode + '\\n\\n';
                
                html += '<span class="success">✅ Status Codes:</span>\\n';
                if (data.headersCheck.direct.statusCode === 200) {
                    html += 'Direct URL: <span class="success">200 OK</span>\\n';
                } else {
                    html += 'Direct URL: <span class="error">' + data.headersCheck.direct.statusCode + '</span>\\n';
                }
                if (data.headersCheck.signed.statusCode === 200) {
                    html += 'Signed URL: <span class="success">200 OK</span>\\n\\n';
                } else {
                    html += 'Signed URL: <span class="error">' + data.headersCheck.signed.statusCode + '</span>\\n\\n';
                }
                
                html += '<span class="success">Try downloading via proxy:</span>\\n';
                html += '<a href="' + BACKEND_URL + '/proxy/' + data.fileInfo.public_id + '" target="_blank">Click to Download</a>\\n\\n';
                
                html += '<span class="success">Full metadata:</span>\\n' + JSON.stringify(data, null, 2);
                
                output.innerHTML = html;
                
            } catch (error) {
                output.innerHTML = '<span class="error">❌ Error: ' + error.message + '</span>';
            }
        }

        window.onload = () => {
            document.getElementById('fileListOutput').textContent = 'Ready! Click "Fetch All Files" to start.';
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

// NEW: Diagnostic route to check file metadata in Cloudinary
app.get('/debug/files', async (req, res) => {
  try {
    const [rawRes, imgRes] = await Promise.all([
      cloudinary.api.resources({ type: 'upload', prefix: 'cloud_file_manager/', resource_type: 'raw', max_results: 100 }),
      cloudinary.api.resources({ type: 'upload', prefix: 'cloud_file_manager/', resource_type: 'image', max_results: 100 })
    ]);

    const allFiles = [...rawRes.resources, ...imgRes.resources];

    // Return detailed metadata for debugging
    const filesMetadata = allFiles.map(file => ({
      name: file.public_id,
      format: file.format,
      resource_type: file.resource_type,
      type: file.type,
      bytes: file.bytes,
      access_mode: file.access_mode, // THIS IS KEY - check if private/public
      created_at: file.created_at,
      secure_url: file.secure_url,
      url: file.url,
      // Try generating different URL formats
      urls: {
        direct: file.secure_url,
        with_attachment: file.secure_url.replace('/raw/upload/', '/raw/upload/fl_attachment/'),
        with_signature: cloudinary.url(file.public_id, {
          resource_type: file.resource_type,
          secure: true,
          sign_url: true,
          type: 'authenticated'
        })
      }
    }));

    res.json(filesMetadata);
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: Check file headers and content type
app.get('/debug/check/:public_id', async (req, res) => {
  try {
    const publicId = req.params.public_id;

    // Fetch metadata
    const resource = await cloudinary.api.resource(publicId);

    // Generate different URLs
    const directUrl = resource.secure_url;
    const signedUrl = cloudinary.url(publicId, {
      resource_type: resource.resource_type,
      secure: true,
      sign_url: true,
      type: 'authenticated'
    });

    // Fetch the file to check headers
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');

    const checkUrl = (url) => {
      return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        protocol.head(url, { timeout: 5000 }, (res) => {
          resolve({
            statusCode: res.statusCode,
            contentType: res.headers['content-type'],
            contentLength: res.headers['content-length'],
            headers: res.headers
          });
        }).on('error', reject);
      });
    };

    // Test both URLs
    const [directCheck, signedCheck] = await Promise.all([
      checkUrl(directUrl).catch(e => ({ error: e.message })),
      checkUrl(signedUrl).catch(e => ({ error: e.message }))
    ]);

    res.json({
      fileInfo: {
        public_id: publicId,
        format: resource.format,
        resource_type: resource.resource_type,
        bytes: resource.bytes,
        access_mode: resource.access_mode,
        created_at: resource.created_at
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
app.get('/proxy/:public_id', async (req, res) => {
  try {
    const publicId = req.params.public_id;

    // Get file resource info
    const resource = await cloudinary.api.resource(publicId);

    // Generate signed URL
    const url = cloudinary.url(publicId, {
      resource_type: resource.resource_type,
      secure: true,
      sign_url: true,
      type: 'authenticated'
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

app.get('/download/:public_id', async (req, res) => {
  try {
    const publicId = req.params.public_id;

    // Generate signed URL with attachment disposition to force download
    const url = cloudinary.url(publicId, {
      resource_type: 'raw',
      secure: true,
      sign_url: true,
      type: 'authenticated',
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

// Alternative: Direct file streaming (more secure than redirect)
app.get('/file/:public_id', async (req, res) => {
  try {
    const publicId = req.params.public_id;
    const fileName = publicId.split('/').pop();

    // Generate signed URL with authentication
    const url = cloudinary.url(publicId, {
      resource_type: 'raw',
      secure: true,
      sign_url: true,
      type: 'authenticated'
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
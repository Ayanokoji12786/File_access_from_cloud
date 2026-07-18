const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
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

app.get('/download/:public_id', (req, res) => {
  const publicId = req.params.public_id;
  // Generate the cloudinary URL with the transformation if needed
  const url = cloudinary.url(publicId, { resource_type: 'raw', secure: true });

  // Redirect to the URL or pipe the stream
  res.redirect(url);
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
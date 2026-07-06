const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();

// Enable CORS so your Vercel frontend can talk to this Render backend
app.use(cors());
app.use(express.json());

// 1. Configure Cloudinary with Environment Variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Setup Cloudinary Storage Engine for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cloud_file_manager', // Folder name inside Cloudinary
    resource_type: 'auto',        // Supports images, PDFs, videos, etc.
  },
});

const upload = multer({ storage: storage });

// Health check route
app.get('/', (req, res) => {
  res.send('Backend Server is Running and Cloudinary is Configured!');
});

// 3. Your Cloud Upload Route
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    res.status(200).json({
      message: 'File uploaded successfully to the cloud!',
      fileUrl: req.file.path, 
      fileName: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Robust route using Admin API to fetch all uploaded files
app.get('/files', async (req, res) => {
  try {
    // Using api.resources instead of search to bypass account restrictions
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'cloud_file_manager/', // Filter files in this folder
      max_results: 30
    });

    // Map Cloudinary resources to match your frontend expectations
    const files = result.resources.map(file => {
      const cleanName = file.public_id.replace('cloud_file_manager/', '');
      return {
        name: cleanName + '.' + file.format,
        url: file.secure_url,
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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
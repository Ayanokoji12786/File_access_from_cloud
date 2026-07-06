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
    // req.file.path is the permanent cloud URL from Cloudinary
    res.status(200).json({
      message: 'File uploaded successfully to the cloud!',
      fileUrl: req.file.path, 
      fileName: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
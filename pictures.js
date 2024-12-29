const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');  // Import CORS

const app = express();
const PORT = process.env.PORT || 8080;

const corsOptions = {
    origin: 'https://labb2frontend.app.cloud.cbh.kth.se', // Tillåt endast din frontend
    methods: ['GET', 'POST'], // Endast GET och POST
    allowedHeaders: ['Content-Type'], // Endast Content-Type header
    credentials: true, // Om cookies eller sessions används
};
app.use(cors(corsOptions));

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath); // Files will be saved in the 'uploads' directory
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName); // File name will be timestamped to avoid duplicates
    },
});

// Configure multer with limits and file filter
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const mimeType = allowedTypes.test(file.mimetype);
        const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimeType && extName) {
            return cb(null, true);
        }
        cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed!'));
    },
});

// Routes
// POST route to upload an image
app.post('/images', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Respond with the path to the uploaded image
    res.json({
        message: 'Image uploaded successfully',
        filePath: `/images/${req.file.filename}`,
    });
});

// GET route to list all uploaded images
app.get('/images', (req, res) => {
    fs.readdir(uploadPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Could not list files' });
        }

        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpeg', '.jpg', '.png', '.gif'].includes(ext);
        });

        res.json({
            message: 'List of uploaded images',
            files: imageFiles,
        });
    });
});
//innanjag fukar runt
// Serve images statically (to be accessed by URL)
app.use('/images', express.static(uploadPath));

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Handle Multer-specific errors (e.g., file size issues)
        return res.status(400).json({ error: err.message });
    } else if (err) {
        // Handle other errors
        return res.status(500).json({ error: err.message });
    }
    next();
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on https://labb2frontend.app.cloud.cbh.kth.se${PORT}`);
});

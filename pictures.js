const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

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
        cb(null, uniqueName); // File name will be timestamped
    },
});

// Configure multer
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
// Upload a file
app.post('/images', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
        message: 'Image uploaded successfully',
        filePath: `/images/${req.file.filename}`,
    });
});

// Get a list of all saved image names
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

// Serve images statically
app.use('/images', express.static(uploadPath));

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Handle multer-specific errors
        return res.status(400).json({ error: err.message });
    } else if (err) {
        // Handle other errors
        return res.status(500).json({ error: err.message });
    }
    next();
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

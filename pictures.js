const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Import JWT for token validation

const app = express();
const PORT = process.env.PORT || 8080;

// CORS Configuration
const corsOptions = {
    origin: 'https://labb2frontend.app.cloud.cbh.kth.se',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'], // Include Authorization for token
    credentials: true,
};
app.use(cors(corsOptions));



// Middleware for Token Validation
const keycloakPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq
IIrf+muKn04rMtZ0N7Oc7XWms+CzYAXGSG/A+OkE3wssb
ztRo39ilDPByycazooPeh4kFZTwCBKEZi2nuvHTw1uLhE
vmgpHB0zk9/lEPNoRlvFZQagpOYjCyVDGCles02LQ1JgV
jTH4sOclqxk+QayMGz1ePylUdbaZZo2vfpVxIHLetd+eI
fmMzKPLboF7Vk6gZlaNMjQDAjklsKX4/C5x/YPy4oDGru
hLPyyqiobJ04YyplQceNpaWcUnQImXhhWy06g0KI9GYo7
8UkfBzDG5Gy/Qeu1colSPOsKhFbpf5qKqsTOpjmcUqQKb
41sd4cQwy3WAugo7klkSOROiXwIDAQAB
-----END PUBLIC KEY-----`;

const validateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, keycloakPublicKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        req.user = decoded; // Attach decoded token to request object
        next();
    });
};

// Role-Based Access Middleware
const requireRole = (allowedRoles) => (req, res, next) => {
    const roles = req.user?.realm_access?.roles || [];
    console.log('Roles in Token:', roles);  // Log the roles to see if 'doctor' is included
    const hasAccess = allowedRoles.some(role => roles.includes(role));

    if (!hasAccess) {
        return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
    next();
};

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
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
app.post('/images', validateToken, requireRole(['worker', 'doctor']), upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
        message: 'Image uploaded successfully',
        filePath: `/images/${req.file.filename}`,
    });
});

app.get('/images', validateToken, requireRole(['worker', 'doctor']), (req, res) => {
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
        return res.status(400).json({ error: err.message });
    } else if (err) {
        return res.status(500).json({ error: err.message });
    }
    next();
});

// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on https://labb2frontend.app.cloud.cbh.kth.se:${PORT}`);
    });
}

module.exports = app; // Exportera appen för testning


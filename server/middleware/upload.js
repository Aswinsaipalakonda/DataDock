const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadBaseDir = path.join(process.cwd(), 'server', 'uploads', 'materials');

try {
  if (!fs.existsSync(uploadBaseDir)) {
    fs.mkdirSync(uploadBaseDir, { recursive: true });
  }
} catch (e) {
  // Directory might already exist or running in restricted environment
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadBaseDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

const allowedExtensions = [
  // Documents & Presentations
  '.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.md', '.rtf', '.odt',
  // Spreadsheets & Data
  '.xls', '.xlsx', '.csv',
  // Coding & Source files
  '.py', '.java', '.c', '.cpp', '.h', '.cs', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.json', '.sql', '.ipynb', '.sh', '.xml', '.yaml', '.yml',
  // Archives
  '.zip', '.rar', '.7z', '.tar', '.gz',
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File format "${ext}" is not supported. Supported formats: PDF, Word, PowerPoint, Excel, Code, ZIP, TXT, and Images.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB per file
  },
});

module.exports = {
  upload,
  uploadBaseDir,
  allowedExtensions,
};

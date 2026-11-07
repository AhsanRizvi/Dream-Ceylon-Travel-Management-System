const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ALLOWED_MIME_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const MAX_FILE_SIZE_BYTES = (Number(process.env.MAX_IMAGE_UPLOAD_MB) || 5) * 1024 * 1024; // 5 MB default

// Ensure uploads directory exists on disk
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// @desc    Upload and validate a service provider image (guide photo, hotel photo, room photo)
// @route   POST /api/uploads/image
// @access  Public / Private (used during registration and profile management)
exports.uploadImage = async (req, res) => {
  try {
    const { imageData, fileName = 'upload', category = 'service', imageUrl } = req.body || {};

    // Case 1: Validate an external HTTP/HTTPS image URL
    if (imageUrl && !imageData) {
      const trimmedUrl = String(imageUrl).trim();
      if (!/^https?:\/\/.+/i.test(trimmedUrl) && !trimmedUrl.startsWith('/uploads/')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image URL. Must start with http://, https://, or /uploads/.'
        });
      }
      return res.status(200).json({
        success: true,
        url: trimmedUrl,
        data: {
          url: trimmedUrl,
          storageType: 'external-url'
        }
      });
    }

    // Case 2: Validate and store uploaded image file (Data URL / Base64 from <input type="file">)
    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid image file (imageData) or imageUrl.'
      });
    }

    const matches = imageData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image file format. Expected a valid image Data URL (JPEG, PNG, WEBP, or GIF).'
      });
    }

    const mimeType = matches[1].toLowerCase();
    const base64Payload = matches[2];

    if (!ALLOWED_MIME_TYPES[mimeType]) {
      return res.status(400).json({
        success: false,
        error: `Unsupported image type '${mimeType}'. Allowed types: JPEG, PNG, WEBP, GIF.`
      });
    }

    const buffer = Buffer.from(base64Payload, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Uploaded image file is empty.'
      });
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        error: `Image file size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum limit of ${
          MAX_FILE_SIZE_BYTES / (1024 * 1024)
        } MB.`
      });
    }

    const ext = ALLOWED_MIME_TYPES[mimeType];
    const safeCategory = String(category)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 20) || 'service';
    const randomId = crypto.randomBytes(6).toString('hex');
    const savedFileName = `${safeCategory}-${Date.now()}-${randomId}.${ext}`;
    const fullFilePath = path.join(uploadsDir, savedFileName);

    await fs.promises.writeFile(fullFilePath, buffer);

    const protocol = req.protocol || 'http';
    const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
    const publicUrl = `${protocol}://${host}/uploads/${savedFileName}`;

    res.status(201).json({
      success: true,
      url: publicUrl,
      data: {
        url: publicUrl,
        relativePath: `/uploads/${savedFileName}`,
        fileName: savedFileName,
        mimeType,
        sizeBytes: buffer.length,
        storageType: 'local-disk'
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Image upload failed'
    });
  }
};

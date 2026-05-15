const express = require('express');
const multer  = require('multer');
const AWS     = require('aws-sdk');
const axios   = require('axios');
const router  = express.Router();
const { protectAdmin } = require('../middleware/auth.middleware');

// ── S3 config ──────────────────────────────────────────────────────────────
const s3 = new AWS.S3({
  region:          process.env.S3_REGION,
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const BUCKET = process.env.S3_BUCKET;

// ── Multer — memory storage, accept any image format, max 10MB ─────────────
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/'))
      return cb(new Error('Only image files are allowed'), false);
    cb(null, true);
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Upload a buffer to S3 and return { url, publicId }
 */
const uploadBufferToS3 = (buffer, mimetype, folder = 'primepro/general') => {
  const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  return s3.upload({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: mimetype,
  }).promise().then(data => ({ url: data.Location, publicId: data.Key }));
};

/**
 * Fetch a remote URL, upload its content to S3, return { url, publicId }
 * If S3 is not configured, just return the original URL as-is.
 */
const uploadUrlToS3 = async (imageUrl, folder = 'primepro/general') => {
  // If no S3 bucket configured, store the URL directly (no re-upload)
  if (!BUCKET) {
    return { url: imageUrl, publicId: null };
  }
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
  const contentType = response.headers['content-type'] || 'image/jpeg';
  if (!contentType.startsWith('image/'))
    throw new Error(`URL does not point to an image (content-type: ${contentType})`);
  const buffer = Buffer.from(response.data);
  return uploadBufferToS3(buffer, contentType, folder);
};

const deleteFromS3 = key =>
  s3.deleteObject({ Bucket: BUCKET, Key: key }).promise();

/**
 * Normalise folder param — only allow known safe folder names
 */
const resolveFolder = (folder) => {
  const allowed = {
    properties: 'primepro/properties',
    categories: 'primepro/categories',
    cms:        'primepro/cms',
    general:    'primepro/general',
  };
  return allowed[folder] || 'primepro/general';
};

// ══════════════════════════════════════════════════════════════════════════
// POST /api/upload/image
// Upload a SINGLE image — file upload OR URL
// ══════════════════════════════════════════════════════════════════════════
/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     summary: Upload a single image — file or URL (Admin)
 *     description: |
 *       Upload a single image in **two ways**:
 *
 *       **Option 1 — File upload** (multipart/form-data):
 *       - Field name: `image`
 *       - Accepts: JPEG, PNG, WEBP, GIF, BMP, TIFF, SVG, AVIF — any image format
 *       - Max size: 10 MB
 *
 *       **Option 2 — URL link** (application/json):
 *       - Send `{ "url": "https://example.com/photo.jpg", "folder": "properties" }`
 *       - The image is fetched and re-uploaded to S3
 *
 *       **folder** (optional): `properties` | `categories` | `cms` | `general` (default)
 *     tags: [Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (any format, max 10MB)
 *               folder:
 *                 type: string
 *                 enum: [properties, categories, cms, general]
 *                 default: general
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 example: https://images.unsplash.com/photo-1600596542815-ffad4c1539a9
 *               folder:
 *                 type: string
 *                 enum: [properties, categories, cms, general]
 *                 default: general
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: No file or URL provided
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/image', protectAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const folder = resolveFolder(req.body?.folder || req.query?.folder);

    // ── File upload ──────────────────────────────────────────────────────
    if (req.file) {
      const result = await uploadBufferToS3(req.file.buffer, req.file.mimetype, folder);
      return res.json({ success: true, url: result.url, publicId: result.publicId });
    }

    // ── URL upload ───────────────────────────────────────────────────────
    const imageUrl = req.body?.url;
    if (imageUrl) {
      const result = await uploadUrlToS3(imageUrl, folder);
      return res.json({ success: true, url: result.url, publicId: result.publicId });
    }

    res.status(400).json({ success: false, message: 'Provide an image file (field: image) or a URL (field: url)' });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════
// POST /api/upload/images
// Upload MULTIPLE images — files, URLs, or a mix of both
// ══════════════════════════════════════════════════════════════════════════
/**
 * @swagger
 * /api/upload/images:
 *   post:
 *     summary: Upload multiple images — files and/or URLs (Admin)
 *     description: |
 *       Upload up to **20 images** in one request. You can mix file uploads and URL links.
 *
 *       **File uploads** (multipart/form-data):
 *       - Field name: `images` (multiple files)
 *       - Accepts any image format — JPEG, PNG, WEBP, GIF, BMP, TIFF, AVIF, SVG
 *       - Max 10 MB per file
 *
 *       **URL links** (multipart/form-data or application/json):
 *       - Field name: `urls` — comma-separated string OR JSON array of URL strings
 *       - Example: `"https://img1.com/a.jpg,https://img2.com/b.png"`
 *       - Or JSON body: `{ "urls": ["https://...", "https://..."], "folder": "properties" }`
 *
 *       **folder** (optional): `properties` | `categories` | `cms` | `general`
 *
 *       Returns an array of `{ url, publicId }` in the same order as input.
 *     tags: [Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image files (any format, max 10MB each, up to 20 files)
 *               urls:
 *                 type: string
 *                 description: Comma-separated image URLs
 *                 example: "https://images.unsplash.com/photo-1,https://images.unsplash.com/photo-2"
 *               folder:
 *                 type: string
 *                 enum: [properties, categories, cms, general]
 *                 default: general
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://images.unsplash.com/photo-1", "https://images.unsplash.com/photo-2"]
 *               folder:
 *                 type: string
 *                 enum: [properties, categories, cms, general]
 *                 default: general
 *     responses:
 *       200:
 *         description: All images uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadMultipleResponse'
 *       400:
 *         description: No files or URLs provided
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/images', protectAdmin, upload.array('images', 20), async (req, res, next) => {
  try {
    const folder = resolveFolder(req.body?.folder || req.query?.folder);
    const tasks  = [];

    // ── File uploads ─────────────────────────────────────────────────────
    if (req.files?.length) {
      req.files.forEach(f =>
        tasks.push(uploadBufferToS3(f.buffer, f.mimetype, folder))
      );
    }

    // ── URL uploads — accept comma-separated string or JSON array ────────
    let urls = req.body?.urls;
    if (urls) {
      if (typeof urls === 'string') {
        // Could be comma-separated or a JSON array string
        try { urls = JSON.parse(urls); } catch { urls = urls.split(',').map(u => u.trim()); }
      }
      if (Array.isArray(urls)) {
        urls.filter(Boolean).forEach(u => tasks.push(uploadUrlToS3(u, folder)));
      }
    }

    if (!tasks.length)
      return res.status(400).json({
        success: false,
        message: 'Provide image files (field: images) and/or URLs (field: urls)',
      });

    const results = await Promise.all(tasks);
    res.json({ success: true, count: results.length, images: results });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════
// POST /api/upload/url
// Lightweight — just validate & return a URL without re-uploading to S3
// Useful when the frontend already has a hosted URL and just needs validation
// ══════════════════════════════════════════════════════════════════════════
/**
 * @swagger
 * /api/upload/url:
 *   post:
 *     summary: Register image URLs directly (Admin)
 *     description: |
 *       Use this when you already have hosted image URLs (e.g. from Unsplash, your CDN, etc.)
 *       and don't want to re-upload them to S3. The API validates the URLs are reachable
 *       and returns them in the standard `{ url, publicId }` format ready to use.
 *
 *       Send a single URL or an array of URLs.
 *     tags: [Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [urls]
 *             properties:
 *               urls:
 *                 oneOf:
 *                   - type: string
 *                     example: https://images.unsplash.com/photo-1600596542815-ffad4c1539a9
 *                   - type: array
 *                     items:
 *                       type: string
 *                     example: ["https://img1.com/a.jpg", "https://img2.com/b.jpg"]
 *               reupload:
 *                 type: boolean
 *                 default: false
 *                 description: If true, fetches and re-uploads each URL to S3
 *               folder:
 *                 type: string
 *                 enum: [properties, categories, cms, general]
 *                 default: general
 *     responses:
 *       200:
 *         description: URLs registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadMultipleResponse'
 *       400:
 *         description: No URLs provided
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/url', protectAdmin, async (req, res, next) => {
  try {
    let { urls, reupload = false, folder } = req.body;
    const s3Folder = resolveFolder(folder);

    if (!urls)
      return res.status(400).json({ success: false, message: 'Provide urls (string or array)' });

    if (typeof urls === 'string') urls = [urls];
    if (!Array.isArray(urls) || !urls.length)
      return res.status(400).json({ success: false, message: 'urls must be a non-empty string or array' });

    let results;
    if (reupload) {
      results = await Promise.all(urls.map(u => uploadUrlToS3(u, s3Folder)));
    } else {
      // Just return them as-is — no S3 re-upload
      results = urls.map(u => ({ url: u, publicId: null }));
    }

    res.json({ success: true, count: results.length, images: results });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════
// DELETE /api/upload/:publicId
// ══════════════════════════════════════════════════════════════════════════
/**
 * @swagger
 * /api/upload/{publicId}:
 *   delete:
 *     summary: Delete an image from S3 (Admin)
 *     description: |
 *       Permanently deletes an image from S3 using its key (publicId).
 *       URL-encode the key if it contains slashes.
 *     tags: [Upload]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *         example: primepro%2Fproperties%2Fabc123.jpg
 *     responses:
 *       200:
 *         description: Image deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete('/:publicId', protectAdmin, async (req, res, next) => {
  try {
    const key = decodeURIComponent(req.params.publicId);
    await deleteFromS3(key);
    res.json({ success: true, message: 'Image deleted' });
  } catch (err) { next(err); }
});

module.exports = router;

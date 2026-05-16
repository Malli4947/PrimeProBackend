const express = require('express');
const router  = express.Router();
const { protectAdmin } = require('../middleware/auth.middleware');

// ── Helper: validate a URL string ─────────────────────────────────────────
const isValidUrl = (str) => {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// ── Helper: normalise a raw urls value (string | array) → string[] ────────
const parseUrls = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(u => String(u).trim()).filter(Boolean);
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { /* not JSON */ }
    return raw.split(',').map(u => u.trim()).filter(Boolean);
  }
  return [];
};

// ══════════════════════════════════════════════════════════════════════════
// POST /api/upload/image
// Register a SINGLE image URL — no file upload, URL only
// ══════════════════════════════════════════════════════════════════════════
/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     summary: Register a single image URL (Admin)
 *     description: |
 *       Accepts an image URL and returns it in the standard `{ url, publicId }` format
 *       ready to use in properties, categories, or CMS entries.
 *
 *       No file upload — paste the image link directly.
 *     tags: [Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 example: https://images.unsplash.com/photo-1600596542815-ffad4c1539a9
 *     responses:
 *       200:
 *         description: URL registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: No URL provided or invalid URL
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/image', protectAdmin, async (req, res, next) => {
  try {
    const imageUrl = req.body?.url;

    if (!imageUrl)
      return res.status(400).json({ success: false, message: 'Provide an image URL in the `url` field' });

    if (!isValidUrl(imageUrl))
      return res.status(400).json({ success: false, message: 'Invalid URL — must start with http:// or https://' });

    res.json({ success: true, url: imageUrl, publicId: null });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════
// POST /api/upload/images
// Register MULTIPLE image URLs at once
// ══════════════════════════════════════════════════════════════════════════
/**
 * @swagger
 * /api/upload/images:
 *   post:
 *     summary: Register multiple image URLs (Admin)
 *     description: |
 *       Accepts an array of image URLs and returns them in the standard
 *       `[{ url, publicId }]` format ready to use in properties, categories, or CMS.
 *
 *       No file upload — paste image links directly.
 *
 *       **Accepted formats:**
 *       - JSON array: `{ "urls": ["https://...", "https://..."] }`
 *       - Comma-separated string: `{ "urls": "https://a.jpg,https://b.jpg" }`
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
 *                   - type: array
 *                     items:
 *                       type: string
 *                     example: ["https://images.unsplash.com/photo-1", "https://images.unsplash.com/photo-2"]
 *                   - type: string
 *                     example: "https://images.unsplash.com/photo-1,https://images.unsplash.com/photo-2"
 *     responses:
 *       200:
 *         description: URLs registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadMultipleResponse'
 *       400:
 *         description: No URLs provided
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/images', protectAdmin, async (req, res, next) => {
  try {
    const urls = parseUrls(req.body?.urls);

    if (!urls.length)
      return res.status(400).json({
        success: false,
        message: 'Provide image URLs in the `urls` field (array or comma-separated string)',
      });

    const invalid = urls.filter(u => !isValidUrl(u));
    if (invalid.length)
      return res.status(400).json({
        success: false,
        message: `Invalid URL(s): ${invalid.join(', ')}`,
      });

    const images = urls.map(u => ({ url: u, publicId: null }));
    res.json({ success: true, count: images.length, images });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════
// POST /api/upload/url  (alias — same as /images, kept for compatibility)
// ══════════════════════════════════════════════════════════════════════════
/**
 * @swagger
 * /api/upload/url:
 *   post:
 *     summary: Register image URLs directly (Admin)
 *     description: |
 *       Alias for `/api/upload/images`. Accepts a single URL string or an array of URLs
 *       and returns them in the standard `{ url, publicId }` format.
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
    const raw  = req.body?.urls ?? req.body?.url;
    const urls = parseUrls(
      typeof raw === 'string' && !raw.startsWith('[') && !raw.includes(',')
        ? [raw]
        : raw
    );

    if (!urls.length)
      return res.status(400).json({ success: false, message: 'Provide urls (string or array)' });

    const invalid = urls.filter(u => !isValidUrl(u));
    if (invalid.length)
      return res.status(400).json({ success: false, message: `Invalid URL(s): ${invalid.join(', ')}` });

    const images = urls.map(u => ({ url: u, publicId: null }));
    res.json({ success: true, count: images.length, images });
  } catch (err) { next(err); }
});

module.exports = router;

const express    = require('express');
const multer     = require('multer');
const cloudinary = require('../config/cloudinary');
const router     = express.Router();
const { protectAdmin } = require('../middleware/auth.middleware');

const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/'))
      return cb(new Error('Only image files are allowed'), false);
    cb(null, true);
  },
});

const uploadToCloudinary = (buffer, folder = 'primepro/properties') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, quality: 'auto', fetch_format: 'auto' },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(buffer);
  });

/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     summary: Upload a single image (Admin)
 *     description: |
 *       Upload a single image file to Cloudinary. Returns the secure URL and public ID.
 *
 *       - **Max file size:** 5 MB
 *       - **Accepted formats:** JPEG, PNG, WEBP, GIF
 *       - **Auto-optimization:** quality and format are auto-selected by Cloudinary
 *       - Images are stored under `primepro/properties/` folder
 *
 *       Use the returned `url` as the image URL when creating/updating a property.
 *     tags: [Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (max 5MB, JPEG/PNG/WEBP/GIF)
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *             example:
 *               success: true
 *               url: https://res.cloudinary.com/demo/image/upload/v1714000000/primepro/properties/abc123.jpg
 *               publicId: primepro/properties/abc123
 *       400:
 *         description: No file uploaded or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/image', protectAdmin, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const result = await uploadToCloudinary(req.file.buffer);
    res.json({ success: true, url: result.secure_url, publicId: result.public_id });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/upload/images:
 *   post:
 *     summary: Upload multiple images (Admin)
 *     description: |
 *       Upload up to **10 images** in a single request. All files are uploaded to Cloudinary in parallel.
 *       Returns an array of URL + publicId pairs.
 *     tags: [Upload]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image files to upload (max 10 files, 5MB each)
 *     responses:
 *       200:
 *         description: All images uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadMultipleResponse'
 *             example:
 *               success: true
 *               images:
 *                 - url: https://res.cloudinary.com/demo/image/upload/v1/primepro/properties/img1.jpg
 *                   publicId: primepro/properties/img1
 *                 - url: https://res.cloudinary.com/demo/image/upload/v1/primepro/properties/img2.jpg
 *                   publicId: primepro/properties/img2
 *       400:
 *         description: No files uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/images', protectAdmin, upload.array('images', 10), async (req, res, next) => {
  try {
    if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files uploaded' });
    const results = await Promise.all(req.files.map(f => uploadToCloudinary(f.buffer)));
    res.json({ success: true, images: results.map(r => ({ url: r.secure_url, publicId: r.public_id })) });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/upload/{publicId}:
 *   delete:
 *     summary: Delete an image from Cloudinary (Admin)
 *     description: |
 *       Permanently deletes an image from Cloudinary using its public ID.
 *       The `publicId` must be URL-encoded if it contains slashes (e.g. `primepro%2Fproperties%2Fabc123`).
 *     tags: [Upload]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *         description: URL-encoded Cloudinary public ID
 *         example: primepro%2Fproperties%2Fabc123
 *     responses:
 *       200:
 *         description: Image deleted from Cloudinary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         description: Cloudinary deletion failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:publicId', protectAdmin, async (req, res, next) => {
  try {
    await cloudinary.uploader.destroy(decodeURIComponent(req.params.publicId));
    res.json({ success: true, message: 'Image deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
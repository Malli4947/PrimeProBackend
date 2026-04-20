const express = require('express');
const multer  = require('multer');
const AWS     = require('aws-sdk');
const router  = express.Router();
const { protectAdmin } = require('../middleware/auth.middleware');

// ── S3 config ─────────────────────────────────────────────────────────────
const s3 = new AWS.S3({
  region:          process.env.S3_REGION,
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const BUCKET = process.env.S3_BUCKET;

// ── Multer memory storage ─────────────────────────────────────────────────
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

// ── Upload helper ─────────────────────────────────────────────────────────
const uploadToS3 = (buffer, mimetype, originalname, folder = 'primepro/properties') => {
  const ext = mimetype.split('/')[1] || 'jpg';
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  return s3.upload({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: mimetype,
  }).promise().then(data => ({
    url:      data.Location,
    publicId: data.Key,
  }));
};

// ── Delete helper ─────────────────────────────────────────────────────────
const deleteFromS3 = key =>
  s3.deleteObject({ Bucket: BUCKET, Key: key }).promise();

/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     summary: Upload a single image (Admin)
 *     description: |
 *       Upload a single image file to AWS S3. Returns the public URL and S3 key.
 *
 *       - **Max file size:** 5 MB
 *       - **Accepted formats:** JPEG, PNG, WEBP, GIF
 *       - Images are stored under `primepro/properties/` folder in S3
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
 *               url: https://techmate-pro.s3.ap-south-1.amazonaws.com/primepro/properties/abc123.jpg
 *               publicId: primepro/properties/abc123.jpg
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
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });

    const result = await uploadToS3(req.file.buffer, req.file.mimetype, req.file.originalname);
    res.json({ success: true, url: result.url, publicId: result.publicId });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/upload/images:
 *   post:
 *     summary: Upload multiple images (Admin)
 *     description: |
 *       Upload up to **10 images** in a single request. All files are uploaded to S3 in parallel.
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
 *                 - url: https://techmate-pro.s3.ap-south-1.amazonaws.com/primepro/properties/img1.jpg
 *                   publicId: primepro/properties/img1.jpg
 *                 - url: https://techmate-pro.s3.ap-south-1.amazonaws.com/primepro/properties/img2.jpg
 *                   publicId: primepro/properties/img2.jpg
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
    if (!req.files?.length)
      return res.status(400).json({ success: false, message: 'No files uploaded' });

    const results = await Promise.all(
      req.files.map(f => uploadToS3(f.buffer, f.mimetype, f.originalname))
    );
    res.json({ success: true, images: results });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /api/upload/{publicId}:
 *   delete:
 *     summary: Delete an image from S3 (Admin)
 *     description: |
 *       Permanently deletes an image from S3 using its key (publicId).
 *       The `publicId` must be URL-encoded if it contains slashes
 *       (e.g. `primepro%2Fproperties%2Fabc123.jpg`).
 *     tags: [Upload]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *         description: URL-encoded S3 object key
 *         example: primepro%2Fproperties%2Fabc123.jpg
 *     responses:
 *       200:
 *         description: Image deleted from S3
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         description: S3 deletion failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:publicId', protectAdmin, async (req, res, next) => {
  try {
    const key = decodeURIComponent(req.params.publicId);
    await deleteFromS3(key);
    res.json({ success: true, message: 'Image deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
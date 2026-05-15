const CMS    = require('../models/CMS.model');
const AWS    = require('aws-sdk');
const multer = require('multer');
const { asyncHandler } = require('../middleware/error.middleware');

// ── S3 client (reuse env vars already used by upload.routes.js) ───────────
const s3 = new AWS.S3({
  region:          process.env.S3_REGION,
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const BUCKET = process.env.S3_BUCKET;

// ── Multer — memory storage, images only, 10 MB per file ─────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/'))
      return cb(new Error('Only image files are allowed'), false);
    cb(null, true);
  },
});

/** Exported so the router can attach it as middleware */
exports.uploadMiddleware = upload.array('images', 20);

// ── Upload a buffer to S3 ─────────────────────────────────────────────────
const uploadToS3 = (buffer, mimetype) => {
  const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const key = `primepro/cms/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  return s3.upload({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: mimetype,
  }).promise().then(data => ({ url: data.Location, publicId: data.Key }));
};

// ── Helper: normalise incoming images ────────────────────────────────────
const normaliseImages = (raw, startIdx = 0) => {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter(Boolean)
    .map((item, idx) => {
      if (typeof item === 'string') {
        return { url: item, publicId: null, isPrimary: startIdx + idx === 0, caption: '' };
      }
      return {
        url:       item.url,
        publicId:  item.publicId  ?? null,
        isPrimary: item.isPrimary ?? (startIdx + idx === 0),
        caption:   item.caption   ?? '',
      };
    });
};

// ── GET /api/cms  (public) ────────────────────────────────────────────────
exports.getCMS = asyncHandler(async (req, res) => {
  const docs = await CMS.find();
  const data = {};
  docs.forEach(d => {
    data[d.key] = {
      value:  d.value,
      images: d.images || [],
      label:  d.label,
    };
  });
  res.json({ success: true, cms: data });
});

// ── GET /api/cms/:key  (public) ───────────────────────────────────────────
exports.getCMSByKey = asyncHandler(async (req, res) => {
  const doc = await CMS.findOne({ key: req.params.key });
  if (!doc) return res.status(404).json({ success: false, message: 'CMS key not found' });
  res.json({
    success: true,
    key:     doc.key,
    value:   doc.value,
    images:  doc.images || [],
    label:   doc.label,
  });
});

// ── POST /api/cms  (admin) — upsert text/value fields ────────────────────
// Accepts application/json. Does NOT touch images unless explicitly provided.
exports.upsertCMS = asyncHandler(async (req, res) => {
  const { key, value, label, images, appendImages } = req.body;

  if (!key) return res.status(400).json({ success: false, message: '`key` is required' });

  // Build the $set payload — only include defined fields
  const $set = {};
  if (value     !== undefined) $set.value = value;
  if (label     !== undefined) $set.label = label;

  let doc;

  if (images !== undefined) {
    const normalised = normaliseImages(images);

    if (appendImages) {
      // Atomically push new images without a read-then-write race
      doc = await CMS.findOneAndUpdate(
        { key },
        {
          $set,
          $push: { images: { $each: normalised } },
        },
        { new: true, upsert: true, runValidators: true }
      );
    } else {
      // Replace images array entirely
      $set.images = normalised;
      doc = await CMS.findOneAndUpdate(
        { key },
        { $set },
        { new: true, upsert: true, runValidators: true }
      );
    }
  } else {
    // No images in this request — only update text fields
    doc = await CMS.findOneAndUpdate(
      { key },
      { $set },
      { new: true, upsert: true, runValidators: true }
    );
  }

  res.json({ success: true, message: 'CMS updated', cms: doc });
});

// ── POST /api/cms/upload  (admin) — upload images directly to a CMS key ──
// Accepts multipart/form-data with:
//   - images   : one or more image files  (field name: images)
//   - key      : CMS key to attach images to  (field name: key)
//   - append   : "true" to append, omit/false to replace  (field name: append)
//   - captions : JSON array of caption strings, one per file (optional)
exports.uploadCMSImages = asyncHandler(async (req, res) => {
  const key    = req.body?.key;
  const append = req.body?.append === 'true' || req.body?.append === true;

  if (!key) return res.status(400).json({ success: false, message: '`key` field is required' });

  if (!req.files?.length)
    return res.status(400).json({ success: false, message: 'No image files received. Use field name `images`.' });

  // Parse optional captions array
  let captions = [];
  try {
    if (req.body?.captions) captions = JSON.parse(req.body.captions);
  } catch { /* ignore malformed captions */ }

  // Upload all files to S3 in parallel
  if (!BUCKET) {
    return res.status(500).json({
      success: false,
      message: 'S3 is not configured (S3_BUCKET env var missing). Cannot upload files.',
    });
  }

  const uploaded = await Promise.all(
    req.files.map(f => uploadToS3(f.buffer, f.mimetype))
  );

  // Build image objects
  const newImages = uploaded.map((result, idx) => ({
    url:       result.url,
    publicId:  result.publicId,
    isPrimary: !append && idx === 0,   // first image is primary only when replacing
    caption:   captions[idx] || '',
  }));

  let doc;
  if (append) {
    doc = await CMS.findOneAndUpdate(
      { key },
      { $push: { images: { $each: newImages } } },
      { new: true, upsert: true }
    );
  } else {
    doc = await CMS.findOneAndUpdate(
      { key },
      { $set: { images: newImages } },
      { new: true, upsert: true }
    );
  }

  res.json({
    success: true,
    message: `${newImages.length} image(s) uploaded and saved to CMS key "${key}"`,
    images:  newImages,
    cms:     doc,
  });
});

// ── DELETE /api/cms/:key/images/:publicId  (admin) — remove one image ────
exports.deleteCMSImage = asyncHandler(async (req, res) => {
  const { key, publicId } = req.params;
  const decodedId = decodeURIComponent(publicId);

  // Remove from DB
  const doc = await CMS.findOneAndUpdate(
    { key },
    { $pull: { images: { publicId: decodedId } } },
    { new: true }
  );

  if (!doc) return res.status(404).json({ success: false, message: 'CMS key not found' });

  // Best-effort S3 delete (don't fail the request if S3 errors)
  if (BUCKET && decodedId) {
    try {
      await s3.deleteObject({ Bucket: BUCKET, Key: decodedId }).promise();
    } catch (e) {
      console.warn('S3 delete warning:', e.message);
    }
  }

  res.json({ success: true, message: 'Image removed', cms: doc });
});

// ── DELETE /api/cms/:key  (admin) ─────────────────────────────────────────
exports.deleteCMSKey = asyncHandler(async (req, res) => {
  await CMS.findOneAndDelete({ key: req.params.key });
  res.json({ success: true, message: 'CMS key deleted' });
});

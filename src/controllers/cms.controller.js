const CMS    = require('../models/CMS.model');
const { asyncHandler } = require('../middleware/error.middleware');

// ── Helper: normalise incoming images ────────────────────────────────────
// Accepts:
//   - Array of { url, publicId?, isPrimary?, caption? } objects
//   - Array of plain URL strings
//   - A single URL string
//   - undefined / null  → returns []
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

// ── POST /api/cms  (admin) — upsert text/value + optional image URLs ──────
// Accepts application/json only.
// Pass images as URL strings or { url, isPrimary, caption } objects.
exports.upsertCMS = asyncHandler(async (req, res) => {
  const { key, value, label, images, appendImages } = req.body;

  if (!key) return res.status(400).json({ success: false, message: '`key` is required' });

  const $set = {};
  if (value !== undefined) $set.value = value;
  if (label !== undefined) $set.label = label;

  let doc;

  if (images !== undefined) {
    const normalised = normaliseImages(images);

    if (appendImages) {
      doc = await CMS.findOneAndUpdate(
        { key },
        { $set, $push: { images: { $each: normalised } } },
        { new: true, upsert: true, runValidators: true }
      );
    } else {
      $set.images = normalised;
      doc = await CMS.findOneAndUpdate(
        { key },
        { $set },
        { new: true, upsert: true, runValidators: true }
      );
    }
  } else {
    doc = await CMS.findOneAndUpdate(
      { key },
      { $set },
      { new: true, upsert: true, runValidators: true }
    );
  }

  res.json({ success: true, message: 'CMS updated', cms: doc });
});

// ── POST /api/cms/images  (admin) — attach image URLs to a CMS key ────────
// Accepts application/json:
//   { key, images: ["https://...", ...], append: true/false, captions: ["..."] }
exports.addCMSImages = asyncHandler(async (req, res) => {
  const { key, images, append = false, captions = [] } = req.body;

  if (!key)
    return res.status(400).json({ success: false, message: '`key` is required' });

  if (!images || !images.length)
    return res.status(400).json({ success: false, message: '`images` array of URLs is required' });

  const urls = Array.isArray(images) ? images : [images];

  // Build image objects — merge optional captions
  const newImages = urls.map((item, idx) => {
    const url = typeof item === 'string' ? item : item.url;
    return {
      url,
      publicId:  null,
      isPrimary: !append && idx === 0,
      caption:   captions[idx] || (typeof item === 'object' ? item.caption : '') || '',
    };
  });

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
    message: `${newImages.length} image(s) saved to CMS key "${key}"`,
    images:  newImages,
    cms:     doc,
  });
});

// ── DELETE /api/cms/:key/images/:imageUrl  (admin) — remove one image ─────
// Pass the image URL encoded as a path param (URL-encode it)
exports.deleteCMSImage = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const imageUrl = decodeURIComponent(req.params.imageUrl);

  const doc = await CMS.findOneAndUpdate(
    { key },
    { $pull: { images: { url: imageUrl } } },
    { new: true }
  );

  if (!doc) return res.status(404).json({ success: false, message: 'CMS key not found' });

  res.json({ success: true, message: 'Image removed', cms: doc });
});

// ── DELETE /api/cms/:key  (admin) ─────────────────────────────────────────
exports.deleteCMSKey = asyncHandler(async (req, res) => {
  await CMS.findOneAndDelete({ key: req.params.key });
  res.json({ success: true, message: 'CMS key deleted' });
});

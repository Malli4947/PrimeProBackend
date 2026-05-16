const Category = require('../models/Category.model');
const Property = require('../models/Property.model');
const { asyncHandler } = require('../middleware/error.middleware');

// ── Helper: normalise incoming images ─────────────────────────────────────
// Accepts:
//   - Array of { url, publicId?, isPrimary?, caption? } objects
//   - Array of plain URL strings
//   - A single URL string
//   - undefined / null  → returns []
const normaliseImages = (raw) => {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter(Boolean)
    .map((item, idx) => {
      if (typeof item === 'string') {
        return { url: item, publicId: null, isPrimary: idx === 0, caption: '' };
      }
      return {
        url:       item.url,
        publicId:  item.publicId  ?? null,
        isPrimary: item.isPrimary ?? idx === 0,
        caption:   item.caption   ?? '',
      };
    });
};

// ── GET /api/categories  (public) ─────────────────────────────────────────
exports.getCategories = asyncHandler(async (req, res) => {
  const cats = await Category.find({ isActive: true }).sort('sortOrder');
  const withCounts = await Promise.all(cats.map(async cat => {
    const count = await Property.countDocuments({ type: cat.name, isActive: true });
    return { ...cat.toObject(), propertyCount: count };
  }));
  res.json({ success: true, categories: withCounts });
});

// ── GET /api/categories/all  (admin) ──────────────────────────────────────
exports.getAllCategories = asyncHandler(async (req, res) => {
  const cats = await Category.find().sort('sortOrder');
  const withCounts = await Promise.all(cats.map(async cat => {
    const count = await Property.countDocuments({ type: cat.name, isActive: true });
    return { ...cat.toObject(), propertyCount: count };
  }));
  res.json({ success: true, categories: withCounts });
});

// ── GET /api/categories/:slug ─────────────────────────────────────────────
exports.getCategoryBySlug = asyncHandler(async (req, res) => {
  const cat = await Category.findOne({ slug: req.params.slug });
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
  const count = await Property.countDocuments({ type: cat.name, isActive: true });
  res.json({ success: true, category: { ...cat.toObject(), propertyCount: count } });
});

// ── POST /api/categories  (admin) ─────────────────────────────────────────
// Pass images as URL strings or { url, isPrimary, caption } objects in the body.
// Example: { "name": "Residential", "images": ["https://...", "https://..."] }
exports.createCategory = asyncHandler(async (req, res) => {
  const body = { ...req.body };

  if (body.images !== undefined) {
    body.images = normaliseImages(body.images);
    // Keep legacy single `image` field in sync with first image
    if (!body.image && body.images.length) body.image = body.images[0].url;
  }

  const cat = await Category.create(body);
  res.status(201).json({ success: true, message: 'Category created', category: cat });
});

// ── PUT /api/categories/:id  (admin) ──────────────────────────────────────
// Pass images as URL strings or { url, isPrimary, caption } objects.
// Pass ?append=true to add to existing images instead of replacing.
exports.updateCategory = asyncHandler(async (req, res) => {
  const body = { ...req.body };

  if (body.images !== undefined) {
    body.images = normaliseImages(body.images);
    if (body.images.length && !body.image) body.image = body.images[0].url;
  }

  if (req.query.append === 'true' && body.images?.length) {
    const existing = await Category.findById(req.params.id).select('images');
    if (existing) {
      body.images = [...(existing.images || []), ...body.images];
    }
  }

  const cat = await Category.findByIdAndUpdate(
    req.params.id,
    body,
    { new: true, runValidators: true }
  );
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, message: 'Category updated', category: cat });
});

// ── POST /api/categories/:id/images  (admin) ──────────────────────────────
// Add image URLs to a category without touching other fields.
// Body: { images: ["https://...", ...], append: true/false }
exports.addCategoryImages = asyncHandler(async (req, res) => {
  const { images, append = false } = req.body;

  if (!images || !images.length)
    return res.status(400).json({ success: false, message: '`images` array of URLs is required' });

  const newImages = normaliseImages(Array.isArray(images) ? images : [images]);

  let cat;
  if (append) {
    cat = await Category.findByIdAndUpdate(
      req.params.id,
      { $push: { images: { $each: newImages } } },
      { new: true }
    );
  } else {
    cat = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: { images: newImages, image: newImages[0]?.url || null } },
      { new: true }
    );
  }

  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, message: `${newImages.length} image(s) saved`, category: cat });
});

// ── DELETE /api/categories/:id/images  (admin) ────────────────────────────
// Remove a specific image URL from a category.
// Body: { url: "https://..." }
exports.removeCategoryImage = asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url)
    return res.status(400).json({ success: false, message: '`url` is required' });

  const cat = await Category.findByIdAndUpdate(
    req.params.id,
    { $pull: { images: { url } } },
    { new: true }
  );

  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

  // Keep legacy image field in sync
  if (cat.image === url) {
    cat.image = cat.images[0]?.url || null;
    await cat.save();
  }

  res.json({ success: true, message: 'Image removed', category: cat });
});

// ── DELETE /api/categories/:id  (admin) ───────────────────────────────────
exports.deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, message: 'Category deleted' });
});

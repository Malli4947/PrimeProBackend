const Property         = require('../models/Property.model');
const { asyncHandler } = require('../middleware/error.middleware');

// ── Helper: check if a string is a valid MongoDB ObjectId ────────────────────
const isValidObjectId = val => /^[0-9a-fA-F]{24}$/.test(val);

// ═══════════════════════════════════════════════════════════════
// GET /api/properties
// PUBLIC  → shows ALL active properties (isActive: true)
// ADMIN   → pass showAll=true to see everything including inactive
// All filter params are 100% optional.
// ═══════════════════════════════════════════════════════════════
exports.getProperties = asyncHandler(async (req, res) => {
  const {
    type, status, subtype, locality, city,
    minPrice, maxPrice, beds, featured, badge,
    search,
    sort    = '-createdAt',
    page    = 1,
    limit   = 12,
    showAll = 'false',
  } = req.query;

  // ── Base filter ──────────────────────────────────────────────
  const filter = showAll === 'true' ? {} : { isActive: true };

  // ── Optional filters ─────────────────────────────────────────
  if (type     && type     !== 'All' && type     !== '') filter.type   = type;
  if (status   && status   !== 'All' && status   !== '') filter.status = status;
  if (badge    && badge    !== 'All' && badge    !== '') filter.badge  = badge;

  if (subtype  && subtype  !== 'All' && subtype  !== '')
    filter.subtype = { $regex: new RegExp(subtype.trim(), 'i') };

  if (locality && locality !== '')
    filter['location.locality'] = { $regex: new RegExp(locality.trim(), 'i') };

  if (city && city !== '')
    filter['location.city'] = { $regex: new RegExp(city.trim(), 'i') };

  if (beds && beds !== '')
    filter.beds = parseInt(beds);

  if (featured === 'true')  filter.featured = true;
  if (featured === 'false') filter.featured = false;

  // ── Price range ──────────────────────────────────────────────
  if ((minPrice && minPrice !== '') || (maxPrice && maxPrice !== '')) {
    filter.price = {};
    if (minPrice && minPrice !== '') filter.price.$gte = parseInt(minPrice);
    if (maxPrice && maxPrice !== '') filter.price.$lte = parseInt(maxPrice);
  }

  // ── Full-text search (regex — no index required) ─────────────
  if (search && search.trim() !== '') {
    const q = search.trim();
    filter.$or = [
      { title:               { $regex: new RegExp(q, 'i') } },
      { description:         { $regex: new RegExp(q, 'i') } },
      { 'location.locality': { $regex: new RegExp(q, 'i') } },
      { 'location.city':     { $regex: new RegExp(q, 'i') } },
      { developer:           { $regex: new RegExp(q, 'i') } },
      { subtype:             { $regex: new RegExp(q, 'i') } },
    ];
  }

  // ── Pagination ───────────────────────────────────────────────
  const pageNum  = Math.max(parseInt(page)  || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 12, 1), 100);
  const skip     = (pageNum - 1) * limitNum;

  const [total, properties] = await Promise.all([
    Property.countDocuments(filter),
    Property.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v'),
  ]);

  res.json({
    success:    true,
    total,
    count:      properties.length,
    page:       pageNum,
    pages:      Math.ceil(total / limitNum) || 0,
    properties,
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/properties/featured
// Returns featured=true + isActive=true
// ═══════════════════════════════════════════════════════════════
exports.getFeatured = asyncHandler(async (req, res) => {
  const limitNum = Math.min(parseInt(req.query.limit) || 6, 20);

  const properties = await Property.find({ featured: true, isActive: true })
    .sort('-createdAt')
    .limit(limitNum)
    .select('-__v');

  res.json({ success: true, count: properties.length, properties });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/properties/stats  (admin only)
// ═══════════════════════════════════════════════════════════════
exports.getStats = asyncHandler(async (req, res) => {
  const [
    totalActive, totalAll,
    byType, byStatus, byBadge,
    topViewed,
  ] = await Promise.all([
    Property.countDocuments({ isActive: true }),
    Property.countDocuments(),
    Property.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type',   count: { $sum: 1 } } },
      { $sort:  { count: -1 } },
    ]),
    Property.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort:  { count: -1 } },
    ]),
    Property.aggregate([
      { $match: { isActive: true, badge: { $ne: null } } },
      { $group: { _id: '$badge',  count: { $sum: 1 } } },
      { $sort:  { count: -1 } },
    ]),
    Property.find({ isActive: true })
      .sort('-views')
      .limit(5)
      .select('title price priceLabel views enquiries location.locality badge type subtype'),
  ]);

  res.json({
    success: true,
    stats: {
      total:    totalActive,
      totalAll,
      inactive: totalAll - totalActive,
      byType,
      byStatus,
      byBadge,
      topViewed,
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/properties/:id  (ObjectId or slug)
// Admins can view inactive; public cannot.
// Increments view counter on every call.
// ═══════════════════════════════════════════════════════════════
exports.getPropertyById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Admins (req.user set by optionalAuth) can see inactive props
  const visibilityFilter = req.user ? {} : { isActive: true };

  const property = await Property.findOne({
    ...(isValidObjectId(id) ? { _id: id } : { slug: id }),
    ...visibilityFilter,
  });

  if (!property)
    return res.status(404).json({ success: false, message: 'Property not found' });

  // Increment views — non-blocking, no await needed
  Property.findByIdAndUpdate(property._id, { $inc: { views: 1 } }).exec();

  // 3 related properties of same type
  const related = await Property.find({
    _id:      { $ne: property._id },
    type:     property.type,
    isActive: true,
  })
    .limit(3)
    .select('title price priceLabel location images status beds baths area badge type subtype slug');

  res.json({ success: true, property, related });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/properties  (admin)
// ─────────────────────────────────────────────────────────────
// FIX: Static admins have non-ObjectId IDs like "static-admin-001".
//      Only set createdBy when req.user._id is a real 24-char ObjectId.
//      If your Property model has createdBy as required:true, make it
//      optional (required: false) — see Property.model.js note below.
// ═══════════════════════════════════════════════════════════════
exports.createProperty = asyncHandler(async (req, res) => {
  const body = { ...req.body };

  // Only attach createdBy when the logged-in user has a real MongoDB ObjectId.
  // Static admins (e.g. "static-admin-001") are NOT valid ObjectIds — skip them.
  if (req.user?._id && isValidObjectId(String(req.user._id))) {
    body.createdBy = req.user._id;
  }
  // If you need to track which static admin created the property, use a
  // separate string field instead:
  // body.createdByEmail = req.user?.email;

  const property = await Property.create(body);

  res.status(201).json({
    success:  true,
    message:  'Property created successfully',
    property,
  });
});

// ═══════════════════════════════════════════════════════════════
// PUT /api/properties/:id  (admin)
// ═══════════════════════════════════════════════════════════════
exports.updateProperty = asyncHandler(async (req, res) => {
  const update = { ...req.body };

  // Protect immutable system fields — never allow these to be overwritten
  delete update.slug;
  delete update.createdBy;
  delete update.__v;
  delete update._id;

  const property = await Property.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true, runValidators: true }
  );

  if (!property)
    return res.status(404).json({ success: false, message: 'Property not found' });

  res.json({ success: true, message: 'Property updated', property });
});

// ═══════════════════════════════════════════════════════════════
// DELETE /api/properties/:id  (admin — soft delete)
// Sets isActive=false; data is preserved. Use PATCH /restore to undo.
// ═══════════════════════════════════════════════════════════════
exports.deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!property)
    return res.status(404).json({ success: false, message: 'Property not found' });

  res.json({ success: true, message: 'Property removed successfully' });
});

// ═══════════════════════════════════════════════════════════════
// PATCH /api/properties/:id/restore  (admin)
// ═══════════════════════════════════════════════════════════════
exports.restoreProperty = asyncHandler(async (req, res) => {
  const property = await Property.findByIdAndUpdate(
    req.params.id,
    { isActive: true },
    { new: true }
  );

  if (!property)
    return res.status(404).json({ success: false, message: 'Property not found' });

  res.json({ success: true, message: 'Property restored successfully', property });
});
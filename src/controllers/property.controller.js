const Property         = require('../models/Property.model');
const { asyncHandler } = require('../middleware/error.middleware');

// ── Helper: check if a string is a valid MongoDB ObjectId ────────────────────
const isValidObjectId = val => /^[0-9a-fA-F]{24}$/.test(val);

// ── Helper: normalise incoming images ────────────────────────────────────────
// Accepts:
//   - Array of { url, publicId?, isPrimary?, caption? } objects  (from upload API)
//   - Array of plain URL strings
//   - A single URL string
//   - undefined / null  → returns undefined (field not touched)
const normaliseImages = (raw) => {
  if (raw === undefined || raw === null) return undefined;
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

// ── Helper: build a safe numeric update payload from the UI form ──────────────
// The UI sends all fields; we coerce types and strip undefined/null-ish values
// so Mongoose validators don't choke on empty strings.
const sanitisePropertyBody = (body) => {
  const b = { ...body };

  // ── Numeric coercions ──────────────────────────────────────────
  const toFloat = (v) => (v !== undefined && v !== null && v !== '') ? parseFloat(v) : null;
  const toInt   = (v) => (v !== undefined && v !== null && v !== '') ? parseInt(v, 10) : null;

  // Plot / Open Plots
  if ('sqy'         in b) b.sqy         = toFloat(b.sqy);
  if ('acres'       in b) b.acres       = toFloat(b.acres);
  if ('totalPlots'  in b) b.totalPlots  = toInt(b.totalPlots);
  if ('minSqy'      in b) b.minSqy      = toFloat(b.minSqy);
  if ('maxSqy'      in b) b.maxSqy      = toFloat(b.maxSqy);
  if ('pricePerSqy' in b) b.pricePerSqy = toFloat(b.pricePerSqy);

  // Apartment / Villa
  if ('floors'      in b) b.floors      = toInt(b.floors);
  if ('totalUnits'  in b) b.totalUnits  = toInt(b.totalUnits);
  if ('minSft'      in b) b.minSft      = toFloat(b.minSft);
  if ('maxSft'      in b) b.maxSft      = toFloat(b.maxSft);
  if ('pricePerSft' in b) b.pricePerSft = toFloat(b.pricePerSft);

  // Pricing
  if ('totalPrice'  in b) b.totalPrice  = toFloat(b.totalPrice);
  if ('price'       in b) b.price       = toFloat(b.price);

  // ── Empty-string → null for optional string fields ─────────────
  const nullIfEmpty = (v) => (v === '' ? null : v);
  ['projectStatus', 'badge', 'facing', 'plotType', 'unitType',
   'developer', 'possession', 'rera', 'brochureLink',
   'totalPriceLabel', 'priceLabel'].forEach(key => {
    if (key in b) b[key] = nullIfEmpty(b[key]);
  });

  return b;
};

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
    isActive,
    search,
    sort    = '-createdAt',
    page    = 1,
    limit   = 12,
    showAll = 'false',
  } = req.query;

  // ── Base filter ──────────────────────────────────────────────
  const filter = showAll === 'true' ? {} : { isActive: true };

  // ── isActive override (admin filter bar) ─────────────────────
  if (showAll === 'true' && isActive !== undefined && isActive !== '') {
    filter.isActive = isActive === 'true';
  }

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
    filter.beds = parseInt(beds, 10);

  if (featured === 'true')  filter.featured = true;
  if (featured === 'false') filter.featured = false;

  // ── Price range — checks both totalPrice and price fields ─────
  if ((minPrice && minPrice !== '') || (maxPrice && maxPrice !== '')) {
    const priceFilter = {};
    if (minPrice && minPrice !== '') priceFilter.$gte = parseInt(minPrice, 10);
    if (maxPrice && maxPrice !== '') priceFilter.$lte = parseInt(maxPrice, 10);
    // Match on either totalPrice or legacy price field
    filter.$or = [
      { totalPrice: priceFilter },
      { price:      priceFilter },
    ];
  }

  // ── Full-text search (regex — no index required) ─────────────
  if (search && search.trim() !== '') {
    const q = search.trim();
    const searchOr = [
      { title:               { $regex: new RegExp(q, 'i') } },
      { description:         { $regex: new RegExp(q, 'i') } },
      { 'location.locality': { $regex: new RegExp(q, 'i') } },
      { 'location.city':     { $regex: new RegExp(q, 'i') } },
      { developer:           { $regex: new RegExp(q, 'i') } },
      { subtype:             { $regex: new RegExp(q, 'i') } },
    ];
    // Merge with any existing $or (e.g. price range)
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
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
      .select('title totalPrice totalPriceLabel price priceLabel views enquiries location.locality badge type subtype'),
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

  // Increment views — non-blocking
  Property.findByIdAndUpdate(property._id, { $inc: { views: 1 } }).exec();

  // 3 related properties of same type
  const related = await Property.find({
    _id:      { $ne: property._id },
    type:     property.type,
    isActive: true,
  })
    .limit(3)
    .select('title totalPrice totalPriceLabel price priceLabel location images status beds baths area badge type subtype slug');

  res.json({ success: true, property, related });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/properties  (admin)
// ═══════════════════════════════════════════════════════════════
exports.createProperty = asyncHandler(async (req, res) => {
  let body = sanitisePropertyBody(req.body);

  // Normalise images
  if (body.images !== undefined) {
    body.images = normaliseImages(body.images);
  }

  // Only attach createdBy when the logged-in user has a real MongoDB ObjectId.
  // Static admins (e.g. "static-admin-001") are NOT valid ObjectIds — skip them.
  if (req.user?._id && isValidObjectId(String(req.user._id))) {
    body.createdBy = req.user._id;
  }

  // Mirror totalPrice → price for backward-compat (search filters, etc.)
  if (body.totalPrice && !body.price) {
    body.price = body.totalPrice;
  }

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
  let update = sanitisePropertyBody(req.body);

  // Protect immutable system fields
  delete update.slug;
  delete update.createdBy;
  delete update.__v;
  delete update._id;

  // Normalise images if provided
  if (update.images !== undefined) {
    update.images = normaliseImages(update.images);
  }

  // Allow appending images instead of replacing — pass ?append=true
  if (req.query.append === 'true' && update.images?.length) {
    const existing = await Property.findById(req.params.id).select('images');
    if (existing) {
      update.images = [...(existing.images || []), ...update.images];
    }
  }

  // Mirror totalPrice → price for backward-compat
  if (update.totalPrice !== undefined && update.totalPrice !== null && !update.price) {
    update.price = update.totalPrice;
  }

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

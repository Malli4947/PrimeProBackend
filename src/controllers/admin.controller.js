// admin.controller.js  — add all missing exports

const User       = require('../models/User.model');
const Property   = require('../models/Property.model');   // adjust path if different
const Enquiry    = require('../models/Enquiry.model');     // adjust path if different
const { asyncHandler } = require('../middleware/error.middleware');

// ── GET /api/admin/dashboard ─────────────────────────────────────────────────
exports.getDashboard = asyncHandler(async (req, res) => {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalUsers,
    totalProperties,
    totalEnquiries,
    newUsersToday,
    activeListings,
    featuredCount,
    recentEnquiries,
    recentProperties,
  ] = await Promise.all([
    User.countDocuments(),
    Property.countDocuments(),
    Enquiry.countDocuments(),
    User.countDocuments({ createdAt: { $gte: today } }),
    Property.countDocuments({ status: 'active' }),
    Property.countDocuments({ isFeatured: true }),
    Enquiry.find().sort({ createdAt: -1 }).limit(8).populate('user', 'name email').populate('property', 'title'),
    Property.find().sort({ createdAt: -1 }).limit(6).select('title price location type status'),
  ]);

  // Monthly enquiry trend — last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const monthlyTrend = await Enquiry.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const enquiriesByType  = await Enquiry.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  const propertiesByType = await Property.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalProperties,
      totalEnquiries,
      newUsersToday,
      activeListings,
      featuredCount,
    },
    recentEnquiries,
    recentProperties,
    charts: {
      monthlyEnquiryTrend: monthlyTrend,
      enquiriesByType,
      propertiesByType,
    },
  });
});

// ── GET /api/admin/users ─────────────────────────────────────────────────────
exports.getUsers = asyncHandler(async (req, res) => {
  const { role, isActive, search, sort = '-createdAt', page = 1, limit = 20 } = req.query;

  const filter = {};
  if (role)     filter.role     = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search)   filter.$or = [
    { name:  { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
    { phone: { $regex: search, $options: 'i' } },
  ];

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await User.countDocuments(filter);

  const users = await User.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))
    .select('-password');

  res.json({
    success: true,
    total,
    page:  Number(page),
    pages: Math.ceil(total / Number(limit)),
    users,
  });
});

// ── GET /api/admin/users/:id ─────────────────────────────────────────────────
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('wishlist', 'title price location.locality status type');

  if (!user)
    return res.status(404).json({ success: false, message: 'User not found' });

  res.json({ success: true, user });
});

// ── PUT /api/admin/users/:id ─────────────────────────────────────────────────
exports.updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, role, isActive, isVerified } = req.body;
  const isSuperadmin = req.user.role === 'superadmin';

  // Only superadmin can change role
  if (role && !isSuperadmin)
    return res.status(403).json({ success: false, message: 'Only superadmin can change roles' });

  // Nobody can change their own role
  if (role && req.params.id === req.user.id)
    return res.status(403).json({ success: false, message: 'You cannot change your own role' });

  const allowed = { name, email, phone, isActive, isVerified };
  if (role && isSuperadmin) allowed.role = role;

  // Strip undefined keys
  Object.keys(allowed).forEach(k => allowed[k] === undefined && delete allowed[k]);

  const user = await User.findByIdAndUpdate(req.params.id, allowed, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!user)
    return res.status(404).json({ success: false, message: 'User not found' });

  res.json({ success: true, message: 'User updated successfully', user });
});

// ── DELETE /api/admin/users/:id ──────────────────────────────────────────────
exports.deleteUser = asyncHandler(async (req, res) => {
  // Prevent self-deactivation
  if (req.params.id === req.user.id)
    return res.status(403).json({ success: false, message: 'You cannot deactivate yourself' });

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true },
  ).select('-password');

  if (!user)
    return res.status(404).json({ success: false, message: 'User not found' });

  res.json({ success: true, message: 'User deactivated successfully', user });
});
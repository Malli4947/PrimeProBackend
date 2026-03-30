const User                   = require('../models/User.model');
const { sendTokenResponse }  = require('../utils/jwt.utils');
const { asyncHandler }       = require('../middleware/error.middleware');
const jwt                    = require('jsonwebtoken');

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (await User.findOne({ email }))
    return res.status(409).json({ success: false, message: 'Email already registered. Please login.' });
  if (await User.findOne({ phone }))
    return res.status(409).json({ success: false, message: 'Phone number already registered.' });

  const user = await User.create({ name, email, phone, password });
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 201, res, 'Account created successfully! Welcome to PrimePro.');
});

// POST /api/auth/login  (email OR phone)
exports.login = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: 'Password is required' });

  const user = email
    ? await User.findOne({ email }).select('+password')
    : await User.findOne({ phone }).select('+password');

  if (!user)           return res.status(401).json({ success: false, message: 'Invalid credentials' });
  if (!user.isActive)  return res.status(403).json({ success: false, message: 'Account deactivated. Contact support.' });
  if (!await user.matchPassword(password))
    return res.status(401).json({ success: false, message: 'Invalid credentials' });

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res, 'Login successful');
});

// POST /api/auth/admin/login
// ── Static credentials — no DB lookup needed ──────────────
// Admin:      admin@primepro.in  /  Admin@123
// Superadmin: super@primepro.in  /  Super@123
const STATIC_ADMINS = [
  {
    id:    'static-admin-001',
    name:  'Admin',
    email: 'admin@primepro.in',
    password: 'Admin@123',
    role:  'admin',
  },
  {
    id:    'static-super-001',
    name:  'Super Admin',
    email: 'super@primepro.in',
    password: 'Super@123',
    role:  'superadmin',
  },
];

exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });

  // Find matching static admin
  const admin = STATIC_ADMINS.find(
    a => a.email === email.trim().toLowerCase() && a.password === password
  );

  if (!admin)
    return res.status(401).json({ success: false, message: 'Invalid admin credentials' });

  // Sign JWT with static id so protectAdmin middleware can verify it
  // protectAdmin tries ADMIN_JWT_SECRET first, then JWT_SECRET
  const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  const token  = jwt.sign(
    { id: admin.id, role: admin.role, email: admin.email },
    secret,
    { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '1d' }
  );

  res.status(200).json({
    success: true,
    message: 'Admin login successful',
    token,
    user: {
      _id:       admin.id,
      name:      admin.name,
      email:     admin.email,
      phone:     null,
      role:      admin.role,
      avatar:    null,
      isActive:  true,
      createdAt: new Date().toISOString(),
    },
  });
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('wishlist', 'title price location.locality image status type subtype');
  res.json({ success: true, user });
});

// PUT /api/auth/profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'avatar'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, message: 'Profile updated', user });
});

// PUT /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!await user.matchPassword(currentPassword))
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
});

// POST /api/auth/wishlist/:propertyId  — toggle
exports.toggleWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { propertyId } = req.params;
  const idx    = user.wishlist.findIndex(id => id.toString() === propertyId);
  const action = idx === -1 ? 'added' : 'removed';
  if (idx === -1) user.wishlist.push(propertyId);
  else            user.wishlist.splice(idx, 1);
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: `Property ${action} from wishlist`, wishlist: user.wishlist });
});
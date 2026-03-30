const jwt  = require('jsonwebtoken');
const User = require('../models/User.model');

// ── Static admin registry — mirrors auth.controller.js ───────
const STATIC_ADMINS = {
  'static-admin-001': { _id:'static-admin-001', id:'static-admin-001', name:'Admin', email:'admin@primepro.in',  role:'admin',      isActive:true, phone:null },
  'static-super-001': { _id:'static-super-001', id:'static-super-001', name:'Super Admin',   email:'super@primepro.in',  role:'superadmin', isActive:true, phone:null },
};

// ── User JWT ─────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'No token, access denied' });

    const token   = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user)          return res.status(401).json({ success: false, message: 'User not found' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated' });
    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired, please login again' : 'Invalid token';
    return res.status(401).json({ success: false, message: msg });
  }
};

// ── Admin JWT ─────────────────────────────────────────────────
const protectAdmin = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'No token, access denied' });

    const token = auth.split(' ')[1];

    // Verify — try ADMIN_JWT_SECRET first, fall back to JWT_SECRET
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    } catch {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    }

    // ── Static admin: id starts with 'static-'
    // Set BOTH _id and id so admin.controller.js never crashes
    if (typeof decoded.id === 'string' && decoded.id.startsWith('static-')) {
      const staticAdmin = STATIC_ADMINS[decoded.id];
      if (!staticAdmin)
        return res.status(401).json({ success: false, message: 'Invalid admin token' });
      req.user = staticAdmin;   // has _id, id, role, name, email
      return next();
    }

    // ── Real DB admin
    const user = await User.findById(decoded.id).select('-password');
    if (!user)
      return res.status(401).json({ success: false, message: 'Admin not found' });
    if (!['admin', 'superadmin'].includes(user.role))
      return res.status(403).json({ success: false, message: 'Access denied: admins only' });
    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account deactivated' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ── Role guard ────────────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: `Role '${req.user.role}' is not authorised for this action` });
  next();
};

// ── Optional auth ─────────────────────────────────────────────
const optionalAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const token   = auth.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (_) { /* ignore */ }
  next();
};

module.exports = { protect, protectAdmin, authorize, optionalAuth };
const jwt = require('jsonwebtoken');

const generateToken = (id, role = 'user') => {
  const isAdmin = ['admin','superadmin'].includes(role);
  return jwt.sign(
    { id, role },
    isAdmin ? process.env.ADMIN_JWT_SECRET : process.env.JWT_SECRET,
    { expiresIn: isAdmin ? (process.env.ADMIN_JWT_EXPIRES_IN || '1d') : (process.env.JWT_EXPIRES_IN || '7d') }
  );
};

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id, user.role);
  res.status(statusCode).json({
    success: true, message, token,
    user: {
      _id: user._id, name: user.name, email: user.email,
      phone: user.phone, role: user.role,
      avatar: user.avatar, isActive: user.isActive,
      createdAt: user.createdAt,
    },
  });
};

module.exports = { generateToken, sendTokenResponse };
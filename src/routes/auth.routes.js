const express   = require('express');
const { body }  = require('express-validator');
const router    = express.Router();
const ctrl      = require('../controllers/auth.controller');
const { protect }  = require('../middleware/auth.middleware');
const validate  = require('../middleware/validate.middleware');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with name, email, phone and password. Returns a JWT token on success.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *           example:
 *             name: Arjun Mehta
 *             email: arjun@example.com
 *             phone: "9876543210"
 *             password: Secret@123
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       409:
 *         description: Email or phone already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         $ref: '#/components/responses/ValidationErr'
 */
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 80 }),
    body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate, ctrl.register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email OR phone
 *     description: Authenticate using either your email address or phone number along with your password. Returns a JWT token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *           examples:
 *             loginWithEmail:
 *               summary: Login with email
 *               value:
 *                 email: arjun@example.com
 *                 password: Secret@123
 *             loginWithPhone:
 *               summary: Login with phone
 *               value:
 *                 phone: "9876543210"
 *                 password: Secret@123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         $ref: '#/components/responses/ValidationErr'
 */
router.post('/login',
  [body('password').notEmpty().withMessage('Password is required')],
  validate, ctrl.login
);

/**
 * @swagger
 * /api/auth/admin/login:
 *   post:
 *     summary: Admin login
 *     description: Login as an admin or superadmin. Returns an admin JWT token with a 1-day expiry.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminLoginInput'
 *           examples:
 *             admin:
 *               summary: Admin credentials
 *               value:
 *                 email: admin@primepro.in
 *                 password: Admin@123
 *             superAdmin:
 *               summary: Super Admin credentials
 *               value:
 *                 email: super@primepro.in
 *                 password: Super@123
 *     responses:
 *       200:
 *         description: Admin login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid admin credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         $ref: '#/components/responses/ValidationErr'
 */
router.post('/admin/login',
  [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate, ctrl.adminLogin
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the authenticated user's full profile including their wishlist of saved properties.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile with wishlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/UserPublic'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me', protect, ctrl.getMe);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update name, phone, or avatar for the authenticated user.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileInput'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile updated
 *                 user:
 *                   $ref: '#/components/schemas/UserPublic'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put('/profile', protect, ctrl.updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change password
 *     description: Change the authenticated user's password. Requires the current password for verification.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordInput'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Current password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         $ref: '#/components/responses/ValidationErr'
 */
router.put('/change-password', protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate, ctrl.changePassword
);

/**
 * @swagger
 * /api/auth/wishlist/{propertyId}:
 *   post:
 *     summary: Toggle property in wishlist
 *     description: Add a property to wishlist if not present, or remove it if already saved. Acts as a toggle.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the property
 *         example: 64a1f3c2b5e8a23456789abc
 *     responses:
 *       200:
 *         description: Wishlist updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Property added to wishlist
 *                 wishlist:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["64a1f3c2b5e8a23456789abc"]
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/wishlist/:propertyId', protect, ctrl.toggleWishlist);

module.exports = router;
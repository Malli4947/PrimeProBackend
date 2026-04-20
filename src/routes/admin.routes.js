const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/admin.controller');
const { protectAdmin } = require('../middleware/auth.middleware');

// All routes require admin or superadmin token
// Role-level restrictions (what admin vs superadmin can do) are
// handled inside each controller function — NOT via middleware here.
router.use(protectAdmin);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard data
 *     description: |
 *       Returns comprehensive dashboard data including:
 *       - **Stats:** total properties, users, enquiries, new today, active listings, featured count
 *       - **Recent enquiries:** last 8 enquiries
 *       - **Recent properties:** last 6 created
 *       - **Charts data:** enquiries by type, properties by type, monthly enquiry trend (last 6 months)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Full dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/dashboard', ctrl.getDashboard);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all users (Admin + Superadmin)
 *     description: Returns a paginated, filterable list of all users.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { in: query, name: role,     schema: { type: string, enum: [user,admin,superadmin] } }
 *       - { in: query, name: isActive, schema: { type: string, enum: [true,false] } }
 *       - { in: query, name: search,   schema: { type: string }, example: arjun }
 *       - { in: query, name: sort,     schema: { type: string }, example: -createdAt }
 *       - { in: query, name: page,     schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit,    schema: { type: integer, default: 20 } }
 *     responses:
 *       200:
 *         description: Paginated user list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 total:   { type: number }
 *                 page:    { type: number }
 *                 pages:   { type: number }
 *                 users:   { type: array, items: { $ref: '#/components/schemas/UserPublic' } }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/users', ctrl.getUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin + Superadmin)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: User details with wishlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 user:    { $ref: '#/components/schemas/UserPublic' }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/users/:id', ctrl.getUserById);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update a user (Admin + Superadmin)
 *     description: |
 *       Both admin and superadmin can update: name, email, phone, isActive, isVerified.
 *       Only **superadmin** can change the `role` field.
 *       No one can change their own role.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:       { type: string }
 *               email:      { type: string }
 *               phone:      { type: string }
 *               role:       { type: string, enum: [user,admin,superadmin], description: "Superadmin only" }
 *               isActive:   { type: boolean }
 *               isVerified: { type: boolean }
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:  { type: boolean }
 *                 message:  { type: string }
 *                 user:     { $ref: '#/components/schemas/UserPublic' }
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/users/:id', ctrl.updateUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Deactivate a user (Admin + Superadmin)
 *     description: |
 *       Soft-deactivates a user (sets isActive=false). Both admin and superadmin can do this.
 *       You cannot deactivate yourself.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: User deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/users/:id', ctrl.deleteUser);

module.exports = router;
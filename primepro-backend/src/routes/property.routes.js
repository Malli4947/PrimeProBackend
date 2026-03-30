const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/property.controller');
const { protectAdmin, optionalAuth } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Get all properties
 *     description: |
 *       Returns all active properties by default. Every filter is optional — calling
 *       `GET /api/properties` with no params returns ALL active listings.
 *
 *       Pass `showAll=true` (admin only) to include inactive properties.
 *
 *       **Filters (all optional):**
 *       - `type` — Residential | Commercial | Agriculture | Industrial | Luxury
 *       - `status` — For Sale | For Rent | For Lease | Sold | Rented
 *       - `subtype` — partial match e.g. Villa
 *       - `locality` — partial match e.g. Banjara Hills
 *       - `city` — e.g. Hyderabad
 *       - `minPrice` / `maxPrice` — price range in ₹
 *       - `beds` — number of bedrooms
 *       - `featured` — true | false
 *       - `badge` — Premium | Featured | Hot | New Launch | Commercial | Lease
 *       - `search` — searches title, description, locality, developer
 *
 *       **Sort:** `-createdAt` (default) | `price` | `-price` | `-views` | `-enquiries`
 *
 *       **Pagination:** `page=1&limit=12`
 *     tags: [Properties]
 *     parameters:
 *       - { in: query, name: type,     schema: { type: string, enum: [Residential,Commercial,Agriculture,Industrial,Luxury] } }
 *       - { in: query, name: status,   schema: { type: string, enum: [For Sale,For Rent,For Lease,Sold,Rented] } }
 *       - { in: query, name: subtype,  schema: { type: string }, example: Villa }
 *       - { in: query, name: locality, schema: { type: string }, example: Banjara Hills }
 *       - { in: query, name: city,     schema: { type: string }, example: Hyderabad }
 *       - { in: query, name: minPrice, schema: { type: number }, example: 10000000 }
 *       - { in: query, name: maxPrice, schema: { type: number }, example: 50000000 }
 *       - { in: query, name: beds,     schema: { type: number }, example: 3 }
 *       - { in: query, name: featured, schema: { type: string, enum: [true,false] } }
 *       - { in: query, name: badge,    schema: { type: string, enum: [Premium,Featured,Hot,New Launch,Commercial,Lease] } }
 *       - { in: query, name: search,   schema: { type: string }, example: penthouse }
 *       - { in: query, name: sort,     schema: { type: string }, example: -createdAt }
 *       - { in: query, name: page,     schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit,    schema: { type: integer, default: 12 } }
 *       - { in: query, name: showAll,  schema: { type: string, enum: [true] }, description: "Admin only — include inactive properties" }
 *     responses:
 *       200:
 *         description: Properties list with pagination
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertiesListResponse'
 */
router.get('/', optionalAuth, ctrl.getProperties);

// ── IMPORTANT: named routes MUST come before /:id ──────────────
// Otherwise Express matches "featured" and "stats" as :id values

/**
 * @swagger
 * /api/properties/featured:
 *   get:
 *     summary: Get featured properties
 *     description: Returns active properties where `featured=true`, sorted by newest. Use `?limit=N` to control count (default 6).
 *     tags: [Properties]
 *     parameters:
 *       - { in: query, name: limit, schema: { type: integer, default: 6 }, description: Max results }
 *     responses:
 *       200:
 *         description: Featured properties
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:    { type: boolean }
 *                 count:      { type: number }
 *                 properties: { type: array, items: { $ref: '#/components/schemas/Property' } }
 */
router.get('/featured', ctrl.getFeatured);

/**
 * @swagger
 * /api/properties/stats:
 *   get:
 *     summary: Property statistics (Admin)
 *     description: Total count, breakdown by type/status/badge, and top 5 most viewed.
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Property statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:    { type: number, example: 9, description: Active count }
 *                     totalAll: { type: number, example: 11 }
 *                     inactive: { type: number, example: 2 }
 *                     byType:   { type: array }
 *                     byStatus: { type: array }
 *                     byBadge:  { type: array }
 *                     topViewed: { type: array }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/stats', protectAdmin, ctrl.getStats);

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get property by ID or slug
 *     description: |
 *       Returns full property details. Accepts MongoDB ObjectId or URL slug.
 *       Increments the view counter on each call.
 *       Returns 3 related properties of the same type.
 *       Admins can view inactive properties; public users cannot.
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 64a1f3c2b5e8a23456789abc
 *         description: MongoDB ObjectId or URL slug
 *     responses:
 *       200:
 *         description: Property detail + related
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:  { type: boolean }
 *                 property: { $ref: '#/components/schemas/Property' }
 *                 related:  { type: array, items: { $ref: '#/components/schemas/Property' } }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', optionalAuth, ctrl.getPropertyById);

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a property (Admin)
 *     description: Creates a new property listing. Slug is auto-generated from title.
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePropertyInput'
 *     responses:
 *       201:
 *         description: Property created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:  { type: boolean }
 *                 message:  { type: string }
 *                 property: { $ref: '#/components/schemas/Property' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', protectAdmin, ctrl.createProperty);

/**
 * @swagger
 * /api/properties/{id}:
 *   put:
 *     summary: Update a property (Admin)
 *     description: |
 *       Update any fields of an existing property. Only send fields you want to change.
 *       Slug and createdBy are protected and cannot be changed.
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePropertyInput'
 *           examples:
 *             updatePrice:
 *               summary: Update price only
 *               value:
 *                 price: 45000000
 *                 priceLabel: "₹4.5 Cr"
 *             markFeatured:
 *               summary: Mark as featured
 *               value:
 *                 featured: true
 *             deactivate:
 *               summary: Deactivate listing
 *               value:
 *                 isActive: false
 *     responses:
 *       200:
 *         description: Property updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:  { type: boolean }
 *                 message:  { type: string }
 *                 property: { $ref: '#/components/schemas/Property' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', protectAdmin, ctrl.updateProperty);

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Soft-delete a property (Admin)
 *     description: Sets `isActive=false`. Data is preserved. Use PUT to restore.
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Property removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', protectAdmin, ctrl.deleteProperty);

/**
 * @swagger
 * /api/properties/{id}/restore:
 *   patch:
 *     summary: Restore a soft-deleted property (Admin)
 *     description: Sets `isActive=true` to make a previously deleted property visible again.
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Property restored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:  { type: boolean }
 *                 message:  { type: string }
 *                 property: { $ref: '#/components/schemas/Property' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/restore', protectAdmin, ctrl.restoreProperty);

module.exports = router;
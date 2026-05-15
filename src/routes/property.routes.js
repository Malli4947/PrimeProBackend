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
 *       Returns all active properties by default. Every filter is optional.
 *
 *       Pass `showAll=true` (admin) to include inactive properties.
 *
 *       **Filters (all optional):**
 *       - `type`       — Residential | Commercial | Agriculture
 *       - `status`     — For Sale | For Rent | For Lease | Sold | Rented
 *       - `subtype`    — partial match e.g. Villa
 *       - `locality`   — partial match e.g. Banjara Hills
 *       - `city`       — e.g. Hyderabad
 *       - `minPrice` / `maxPrice` — price range in ₹ (matches totalPrice or price)
 *       - `featured`   — true | false
 *       - `badge`      — Premium | Ultra Premium | Luxury | Ultra Luxury | Featured | Hot
 *       - `isActive`   — true | false (only respected when showAll=true)
 *       - `search`     — searches title, description, locality, developer, subtype
 *
 *       **Sort:** `-createdAt` (default) | `totalPrice` | `-totalPrice` | `-views` | `-enquiries`
 *
 *       **Pagination:** `page=1&limit=12`
 *     tags: [Properties]
 *     parameters:
 *       - { in: query, name: type,     schema: { type: string, enum: [Residential,Commercial,Agriculture] } }
 *       - { in: query, name: status,   schema: { type: string, enum: [For Sale,For Rent,For Lease,Sold,Rented] } }
 *       - { in: query, name: subtype,  schema: { type: string }, example: Villa }
 *       - { in: query, name: locality, schema: { type: string }, example: Banjara Hills }
 *       - { in: query, name: city,     schema: { type: string }, example: Hyderabad }
 *       - { in: query, name: minPrice, schema: { type: number }, example: 10000000 }
 *       - { in: query, name: maxPrice, schema: { type: number }, example: 50000000 }
 *       - { in: query, name: featured, schema: { type: string, enum: [true,false] } }
 *       - { in: query, name: badge,    schema: { type: string, enum: [Premium,Ultra Premium,Luxury,Ultra Luxury,Featured,Hot] } }
 *       - { in: query, name: isActive, schema: { type: string, enum: [true,false] }, description: "Only respected when showAll=true" }
 *       - { in: query, name: search,   schema: { type: string }, example: penthouse }
 *       - { in: query, name: sort,     schema: { type: string }, example: -createdAt }
 *       - { in: query, name: page,     schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit,    schema: { type: integer, default: 12 } }
 *       - { in: query, name: showAll,  schema: { type: string, enum: [true] }, description: "Admin only — include inactive properties" }
 *     responses:
 *       200:
 *         description: Properties list with pagination
 */
router.get('/', optionalAuth, ctrl.getProperties);

// ── IMPORTANT: named routes MUST come before /:id ──────────────

/**
 * @swagger
 * /api/properties/featured:
 *   get:
 *     summary: Get featured properties
 *     description: Returns active properties where `featured=true`, sorted by newest. Use `?limit=N` to control count (default 6).
 *     tags: [Properties]
 *     parameters:
 *       - { in: query, name: limit, schema: { type: integer, default: 6 } }
 *     responses:
 *       200:
 *         description: Featured properties
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
 *         schema: { type: string }
 *         example: 64a1f3c2b5e8a23456789abc
 *     responses:
 *       200:
 *         description: Property detail + related
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', optionalAuth, ctrl.getPropertyById);

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a property (Admin)
 *     description: |
 *       Creates a new property listing. Slug is auto-generated from title.
 *
 *       **Required fields:** `title`, `type`, `subtype`, `location.address`, `location.locality`, `location.city`
 *
 *       **Plot / Open Plots fields:** `sqy`, `acres`, `totalPlots`, `plotType`, `minSqy`, `maxSqy`, `pricePerSqy`, `facing`
 *
 *       **Apartment / Villa fields:** `floors`, `totalUnits`, `unitType`, `minSft`, `maxSft`, `pricePerSft`
 *
 *       **Shared pricing:** `totalPrice`, `totalPriceLabel`, `priceType`
 *
 *       **Admin controls:** `badge`, `featured`, `isActive`, `projectStatus`, `brochureLink`
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, subtype, location]
 *             properties:
 *               title:           { type: string, example: "Green Valley Villas" }
 *               description:     { type: string }
 *               priceType:       { type: string, enum: [fixed, negotiable, on_request] }
 *               type:            { type: string, enum: [Residential, Commercial, Agriculture] }
 *               subtype:         { type: string, example: "Open Plots" }
 *               status:          { type: string, enum: [For Sale, For Rent, For Lease, Sold, Rented] }
 *               projectStatus:   { type: string, enum: [Ready to Move, Pre-Launch, Under Construction, OC Received] }
 *               badge:           { type: string, enum: [Premium, Ultra Premium, Luxury, Ultra Luxury, Featured, Hot] }
 *               featured:        { type: boolean }
 *               isActive:        { type: boolean }
 *               totalPrice:      { type: number, example: 12000000 }
 *               totalPriceLabel: { type: string, example: "₹1.2 Cr" }
 *               pricePerSqy:     { type: number, example: 15000 }
 *               pricePerSft:     { type: number, example: 6500 }
 *               sqy:             { type: number, example: 200 }
 *               acres:           { type: number, example: 5.5 }
 *               totalPlots:      { type: number, example: 120 }
 *               plotType:        { type: string, enum: [Commercial, Residential, Lease] }
 *               minSqy:          { type: number, example: 100 }
 *               maxSqy:          { type: number, example: 500 }
 *               facing:          { type: string, enum: [E, W, N, S, "E & W", "E, W & N"] }
 *               floors:          { type: number, example: 20 }
 *               totalUnits:      { type: number, example: 240 }
 *               unitType:        { type: string, example: "2 & 3 BHK" }
 *               minSft:          { type: number, example: 1200 }
 *               maxSft:          { type: number, example: 2400 }
 *               developer:       { type: string, example: "Rajapushpa Group" }
 *               possession:      { type: string, example: "Dec 2026" }
 *               rera:            { type: string, example: "P02400003987" }
 *               brochureLink:    { type: string, example: "https://example.com/brochure.pdf" }
 *               amenities:       { type: array, items: { type: string } }
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:       { type: string }
 *                     publicId:  { type: string }
 *                     isPrimary: { type: boolean }
 *                     caption:   { type: string }
 *               location:
 *                 type: object
 *                 required: [address, locality, city]
 *                 properties:
 *                   address:  { type: string }
 *                   locality: { type: string }
 *                   city:     { type: string, default: Hyderabad }
 *                   state:    { type: string, default: Telangana }
 *                   pincode:  { type: string }
 *     responses:
 *       201:
 *         description: Property created
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
 *       `slug` and `createdBy` are protected and cannot be changed.
 *       Pass `?append=true` to append images instead of replacing them.
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: query, name: append, schema: { type: string, enum: [true] }, description: "Append images instead of replacing" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *           examples:
 *             markFeatured:
 *               summary: Mark as featured
 *               value: { featured: true }
 *             deactivate:
 *               summary: Deactivate listing
 *               value: { isActive: false }
 *             updatePrice:
 *               summary: Update total price
 *               value: { totalPrice: 15000000, totalPriceLabel: "₹1.5 Cr" }
 *     responses:
 *       200:
 *         description: Property updated
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
 *     description: Sets `isActive=false`. Data is preserved. Use PATCH /restore to undo.
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Property removed
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id/restore', protectAdmin, ctrl.restoreProperty);

module.exports = router;

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/category.controller');
const { protectAdmin } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all active categories
 *     description: Returns all active property categories sorted by sortOrder, each with a live property count.
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of active categories
 */
router.get('/', ctrl.getCategories);

/**
 * @swagger
 * /api/categories/all:
 *   get:
 *     summary: Get ALL categories including inactive (Admin)
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All categories (active + inactive)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/all', protectAdmin, ctrl.getAllCategories);

/**
 * @swagger
 * /api/categories/{slug}:
 *   get:
 *     summary: Get category by slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: residential
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:slug', ctrl.getCategoryBySlug);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category (Admin)
 *     description: |
 *       Create a new property category. Slug is auto-generated from name.
 *
 *       Pass `images` as an array of URL strings or `{ url, isPrimary, caption }` objects.
 *       No file upload — paste image links directly.
 *
 *       **Example:**
 *       ```json
 *       {
 *         "name": "Residential",
 *         "description": "Apartments, Villas & Row Houses",
 *         "icon": "🏠",
 *         "color": "#3B82F6",
 *         "sortOrder": 1,
 *         "images": [
 *           "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
 *           "https://images.unsplash.com/photo-1560518883-ce09059eeffa"
 *         ]
 *       }
 *       ```
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:        { type: string, example: Residential }
 *               description: { type: string }
 *               icon:        { type: string, example: "🏠" }
 *               color:       { type: string, example: "#3B82F6" }
 *               sortOrder:   { type: integer, example: 1 }
 *               isActive:    { type: boolean, default: true }
 *               images:
 *                 type: array
 *                 description: Array of image URLs or { url, isPrimary, caption } objects
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                       example: https://images.unsplash.com/photo-1600596542815-ffad4c1539a9
 *                     - type: object
 *                       properties:
 *                         url:       { type: string }
 *                         isPrimary: { type: boolean }
 *                         caption:   { type: string }
 *     responses:
 *       201:
 *         description: Category created
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Category name already exists
 */
router.post('/', protectAdmin, ctrl.createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category (Admin)
 *     description: |
 *       Update any fields of an existing category.
 *
 *       Pass `images` as URL strings or `{ url, isPrimary, caption }` objects — replaces existing images.
 *       Pass `?append=true` to add to existing images instead of replacing.
 *
 *       **Example — update images only:**
 *       ```json
 *       {
 *         "images": [
 *           "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9"
 *         ]
 *       }
 *       ```
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: append
 *         schema: { type: string, enum: [true] }
 *         description: Append images instead of replacing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:        { type: string }
 *               description: { type: string }
 *               icon:        { type: string }
 *               color:       { type: string }
 *               sortOrder:   { type: integer }
 *               isActive:    { type: boolean }
 *               images:
 *                 type: array
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *                       properties:
 *                         url:       { type: string }
 *                         isPrimary: { type: boolean }
 *                         caption:   { type: string }
 *     responses:
 *       200:
 *         description: Category updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', protectAdmin, ctrl.updateCategory);

/**
 * @swagger
 * /api/categories/{id}/images:
 *   post:
 *     summary: Add image URLs to a category (Admin)
 *     description: |
 *       Add one or more image URLs to a category without touching other fields.
 *       No file upload — paste links directly.
 *
 *       **Example:**
 *       ```json
 *       {
 *         "images": [
 *           "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
 *           "https://images.unsplash.com/photo-1560518883-ce09059eeffa"
 *         ],
 *         "append": false
 *       }
 *       ```
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *                       properties:
 *                         url:       { type: string }
 *                         isPrimary: { type: boolean }
 *                         caption:   { type: string }
 *               append:
 *                 type: boolean
 *                 default: false
 *                 description: true = add to existing images, false = replace all
 *     responses:
 *       200:
 *         description: Images saved
 *       400:
 *         description: Missing images
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:id/images', protectAdmin, ctrl.addCategoryImages);

/**
 * @swagger
 * /api/categories/{id}/images:
 *   delete:
 *     summary: Remove an image from a category (Admin)
 *     description: |
 *       Remove a specific image from a category by its URL.
 *
 *       **Example:**
 *       ```json
 *       { "url": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9" }
 *       ```
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 example: https://images.unsplash.com/photo-1600596542815-ffad4c1539a9
 *     responses:
 *       200:
 *         description: Image removed
 *       400:
 *         description: Missing url
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id/images', protectAdmin, ctrl.removeCategoryImage);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category (Admin)
 *     description: Permanently deletes a category. Properties under this category are NOT deleted.
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Category deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', protectAdmin, ctrl.deleteCategory);

module.exports = router;

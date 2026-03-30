const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/category.controller');
const { protectAdmin } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all active categories
 *     description: Returns all active property categories sorted by `sortOrder`, each with a live property count.
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of active categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *             example:
 *               success: true
 *               categories:
 *                 - _id: 64a1f3c2b5e8a23456789001
 *                   name: Residential
 *                   slug: residential
 *                   description: Apartments, Villas, Row Houses & Duplexes
 *                   icon: 🏠
 *                   color: "#3B82F6"
 *                   sortOrder: 1
 *                   isActive: true
 *                   propertyCount: 6
 */
router.get('/', ctrl.getCategories);

/**
 * @swagger
 * /api/categories/all:
 *   get:
 *     summary: Get ALL categories including inactive (Admin)
 *     description: Returns all categories regardless of isActive status. Useful for admin management views.
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All categories (active + inactive)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/all', protectAdmin, ctrl.getAllCategories);

/**
 * @swagger
 * /api/categories/{slug}:
 *   get:
 *     summary: Get category by slug
 *     description: Returns a single category by its URL slug, including the live property count.
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: URL slug of the category
 *         example: residential
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:slug', ctrl.getCategoryBySlug);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category (Admin)
 *     description: Create a new property category. The slug is auto-generated from the name.
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryInput'
 *           example:
 *             name: Luxury
 *             description: Ultra-Premium & Signature Properties
 *             icon: 💎
 *             color: "#8B5CF6"
 *             sortOrder: 4
 *             isActive: true
 *     responses:
 *       201:
 *         description: Category created
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
 *                   example: Category created
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Category name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', protectAdmin, ctrl.createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category (Admin)
 *     description: Update any fields of an existing category.
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryInput'
 *           example:
 *             icon: 🏡
 *             color: "#2563EB"
 *             isActive: false
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Category updated
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', protectAdmin, ctrl.updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category (Admin)
 *     description: Permanently deletes a category. Properties under this category are NOT deleted but will become uncategorised.
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', protectAdmin, ctrl.deleteCategory);

module.exports = router;
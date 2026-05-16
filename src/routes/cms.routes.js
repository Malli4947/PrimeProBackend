const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/cms.controller');
const { protectAdmin } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/cms/images:
 *   post:
 *     summary: Attach image URLs to a CMS key (Admin)
 *     description: |
 *       Save one or more image URLs to a CMS key. No file upload — paste links directly.
 *
 *       **Body fields:**
 *       - `key`      — CMS key to attach images to (e.g. `hero`, `banners`)
 *       - `images`   — array of URL strings or `{ url, caption }` objects
 *       - `append`   — `true` to add to existing images; `false` (default) to replace
 *       - `captions` — optional array of caption strings, one per image
 *
 *       **Example:**
 *       ```json
 *       {
 *         "key": "hero",
 *         "images": [
 *           "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
 *           "https://images.unsplash.com/photo-1560518883-ce09059eeffa"
 *         ],
 *         "append": false
 *       }
 *       ```
 *     tags: [CMS]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, images]
 *             properties:
 *               key:
 *                 type: string
 *                 example: hero
 *               images:
 *                 type: array
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *                       properties:
 *                         url:     { type: string }
 *                         caption: { type: string }
 *               append:
 *                 type: boolean
 *                 default: false
 *               captions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Images saved to CMS key
 *       400:
 *         description: Missing key or images
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/images', protectAdmin, ctrl.addCMSImages);

/**
 * @swagger
 * /api/cms/{key}/images/{imageUrl}:
 *   delete:
 *     summary: Remove a single image from a CMS key (Admin)
 *     description: Pass the image URL encoded as a path param.
 *     tags: [CMS]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *         example: hero
 *       - in: path
 *         name: imageUrl
 *         required: true
 *         schema: { type: string }
 *         description: URL-encoded image URL to remove
 *     responses:
 *       200:
 *         description: Image removed
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete('/:key/images/:imageUrl', protectAdmin, ctrl.deleteCMSImage);

/**
 * @swagger
 * /api/cms:
 *   get:
 *     summary: Get all CMS content
 *     tags: [CMS]
 *     responses:
 *       200:
 *         description: All CMS content as a key-value map
 */
router.get('/', ctrl.getCMS);

/**
 * @swagger
 * /api/cms/{key}:
 *   get:
 *     summary: Get CMS content by key
 *     tags: [CMS]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *         example: hero
 *     responses:
 *       200:
 *         description: CMS key value
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:key', ctrl.getCMSByKey);

/**
 * @swagger
 * /api/cms:
 *   post:
 *     summary: Create or update a CMS entry (Admin)
 *     description: |
 *       Upserts a CMS key-value pair. Pass `images` as an array of URL strings or
 *       `{ url, isPrimary, caption }` objects. Set `appendImages: true` to add to
 *       existing images instead of replacing them.
 *     tags: [CMS]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CMSUpsertInput'
 *           examples:
 *             updateHero:
 *               summary: Update hero section with image URLs
 *               value:
 *                 key: hero
 *                 label: Hero Section
 *                 value:
 *                   title: Find Your Dream Property in Hyderabad
 *                   subtitle: Discover 1,200+ verified listings. Zero brokerage.
 *                   ctaText: Browse Properties
 *                 images:
 *                   - https://images.unsplash.com/photo-1600596542815-ffad4c1539a9
 *                   - https://images.unsplash.com/photo-1560518883-ce09059eeffa
 *             updateSEO:
 *               summary: Update SEO settings
 *               value:
 *                 key: seo
 *                 label: SEO Settings
 *                 value:
 *                   metaTitle: PrimePro — Premium Real Estate in Hyderabad
 *                   metaDescription: Find verified properties. No brokerage. RERA certified.
 *                   keywords: real estate hyderabad, buy flat, villa for sale
 *     responses:
 *       200:
 *         description: CMS entry upserted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/', protectAdmin, ctrl.upsertCMS);

/**
 * @swagger
 * /api/cms/{key}:
 *   delete:
 *     summary: Delete a CMS entry (Admin)
 *     tags: [CMS]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *         example: banners
 *     responses:
 *       200:
 *         description: CMS key deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.delete('/:key', protectAdmin, ctrl.deleteCMSKey);

module.exports = router;

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/cms.controller');
const { protectAdmin } = require('../middleware/auth.middleware');

/**
 * @swagger
 * /api/cms/upload:
 *   post:
 *     summary: Upload images directly to a CMS key (Admin)
 *     description: |
 *       Upload one or more image files (multipart/form-data) and attach them to a CMS key in one step.
 *
 *       **Fields:**
 *       - `images`   — one or more image files (field name must be `images`)
 *       - `key`      — the CMS key to attach images to (e.g. `hero`, `banners`)
 *       - `append`   — `"true"` to add to existing images; omit or `"false"` to replace
 *       - `captions` — optional JSON array of caption strings, one per file
 *
 *       **Example (replace hero images):**
 *       ```
 *       POST /api/cms/upload
 *       Content-Type: multipart/form-data
 *       images: [file1.jpg, file2.jpg]
 *       key: hero
 *       append: false
 *       ```
 *     tags: [CMS]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [key, images]
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               key:
 *                 type: string
 *                 example: hero
 *               append:
 *                 type: string
 *                 enum: ["true", "false"]
 *                 default: "false"
 *               captions:
 *                 type: string
 *                 description: JSON array of captions e.g. '["Main banner","Secondary"]'
 *     responses:
 *       200:
 *         description: Images uploaded and saved
 *       400:
 *         description: Missing key or no files
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/upload', protectAdmin, ctrl.uploadMiddleware, ctrl.uploadCMSImages);

/**
 * @swagger
 * /api/cms/{key}/images/{publicId}:
 *   delete:
 *     summary: Remove a single image from a CMS key (Admin)
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
 *         name: publicId
 *         required: true
 *         schema: { type: string }
 *         description: URL-encoded S3 key of the image
 *     responses:
 *       200:
 *         description: Image removed
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete('/:key/images/:publicId', protectAdmin, ctrl.deleteCMSImage);

/**
 * @swagger
 * /api/cms:
 *   get:
 *     summary: Get all CMS content
 *     description: |
 *       Returns all CMS key-value pairs as a single object. Used by the frontend to load dynamic content.
 *
 *       **Standard CMS keys:**
 *       - `hero` — Homepage hero section (title, subtitle, ctaText, backgroundImage)
 *       - `about` — About section (heading, body, yearsExperience, email, phone)
 *       - `seo` — SEO meta tags (metaTitle, metaDescription, keywords)
 *       - `banners` — Promotional banners array
 *     tags: [CMS]
 *     responses:
 *       200:
 *         description: All CMS content as a key-value map
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 cms:
 *                   type: object
 *                   example:
 *                     hero:
 *                       title: Find Your Dream Property in Hyderabad
 *                       subtitle: Discover 1,200+ verified listings. Zero brokerage.
 *                       ctaText: Browse Properties
 *                     about:
 *                       heading: Hyderabad's Most Trusted Real Estate Platform
 *                       yearsExperience: 12
 *                       email: primeproprojects@gmail.com
 *                       phone: 1800 500 600
 *                     seo:
 *                       metaTitle: PrimePro — Premium Real Estate in Hyderabad
 *                       metaDescription: Find verified properties. No brokerage. RERA certified.
 */
router.get('/', ctrl.getCMS);

/**
 * @swagger
 * /api/cms/{key}:
 *   get:
 *     summary: Get CMS content by key
 *     description: Returns the value for a specific CMS key.
 *     tags: [CMS]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: CMS key name
 *         example: hero
 *     responses:
 *       200:
 *         description: CMS key value
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 key:
 *                   type: string
 *                   example: hero
 *                 value:
 *                   type: object
 *                   example:
 *                     title: Find Your Dream Property
 *                     subtitle: Discover 1,200+ verified listings.
 *                     ctaText: Browse Properties
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
 *       Upserts a CMS key-value pair. If the key already exists, its value is updated. If not, it is created.
 *       This is how you update the homepage hero, about section, SEO settings, and banners from the admin panel.
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
 *               summary: Update hero section
 *               value:
 *                 key: hero
 *                 label: Hero Section
 *                 value:
 *                   title: Find Your Dream Property in Hyderabad
 *                   subtitle: Discover 1,200+ verified listings. Zero brokerage. RERA compliant.
 *                   ctaText: Browse Properties
 *                   backgroundImage: https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600
 *             updateSEO:
 *               summary: Update SEO settings
 *               value:
 *                 key: seo
 *                 label: SEO Settings
 *                 value:
 *                   metaTitle: PrimePro — Premium Real Estate in Hyderabad
 *                   metaDescription: Find verified residential, commercial and agricultural properties. No brokerage. RERA certified.
 *                   keywords: real estate hyderabad, buy flat, villa for sale
 *             updateBanners:
 *               summary: Update promotional banners
 *               value:
 *                 key: banners
 *                 label: Promo Banners
 *                 value:
 *                   - _id: b1
 *                     title: Summer Offer
 *                     subtitle: Free legal consultation with every purchase
 *                     isActive: true
 *                     image: https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800
 *     responses:
 *       200:
 *         description: CMS entry upserted successfully
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
 *                   example: CMS updated
 *                 cms:
 *                   type: object
 *                   properties:
 *                     key:   { type: string, example: hero }
 *                     label: { type: string, example: Hero Section }
 *                     value: { type: object }
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
 *     description: Permanently deletes a CMS key-value entry. Use with caution — this will cause the frontend to show default values.
 *     tags: [CMS]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: CMS key to delete
 *         example: banners
 *     responses:
 *       200:
 *         description: CMS key deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.delete('/:key', protectAdmin, ctrl.deleteCMSKey);

module.exports = router;
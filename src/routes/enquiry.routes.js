const express   = require('express');
const { body }  = require('express-validator');
const router    = express.Router();
const ctrl      = require('../controllers/enquiry.controller');
const { optionalAuth, protectAdmin } = require('../middleware/auth.middleware');
const validate  = require('../middleware/validate.middleware');

/**
 * @swagger
 * /api/enquiries:
 *   post:
 *     summary: Submit an enquiry
 *     description: |
 *       Submit a property enquiry. Works for both guests and logged-in users.
 *       - If authenticated, the user is automatically linked to the enquiry.
 *       - If `propertyId` is provided, the property's enquiry counter is incremented.
 *       - A confirmation email is sent to the enquirer (if SMTP is configured).
 *       - A notification email is sent to the admin.
 *     tags: [Enquiries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEnquiryInput'
 *           examples:
 *             siteVisit:
 *               summary: Site visit request
 *               value:
 *                 propertyId: 64a1f3c2b5e8a23456789abc
 *                 name: Arjun Mehta
 *                 email: arjun@example.com
 *                 phone: "9876543210"
 *                 message: I'd like to visit the property this Saturday.
 *                 type: Site Visit
 *                 scheduleDate: "2025-04-15"
 *             generalEnquiry:
 *               summary: General enquiry (no property)
 *               value:
 *                 name: Priya Sharma
 *                 email: priya@example.com
 *                 phone: "9876543211"
 *                 message: Looking for 3BHK in Gachibowli under 2 Cr.
 *                 type: Buy Property
 *     responses:
 *       201:
 *         description: Enquiry submitted successfully
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
 *                   example: Enquiry submitted! Our team will contact you within 2 hours.
 *                 enquiryId:
 *                   type: string
 *                   example: 64a1f3c2b5e8a23456789xyz
 *       422:
 *         $ref: '#/components/responses/ValidationErr'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', optionalAuth,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  validate, ctrl.createEnquiry
);

/**
 * @swagger
 * /api/enquiries:
 *   get:
 *     summary: List all enquiries (Admin)
 *     description: Returns all enquiries with optional filters. Supports search, status filter, type filter and pagination.
 *     tags: [Enquiries]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, read, replied, closed]
 *         description: Filter by status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [General Enquiry, Buy Property, Rent / Lease, Sell Property, NRI Enquiry, Site Visit]
 *         description: Filter by enquiry type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, phone or message
 *         example: arjun
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated enquiries list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: number
 *                   example: 6
 *                 page:
 *                   type: number
 *                   example: 1
 *                 enquiries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Enquiry'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', protectAdmin, ctrl.getEnquiries);

/**
 * @swagger
 * /api/enquiries/stats:
 *   get:
 *     summary: Get enquiry statistics (Admin)
 *     description: Returns total counts broken down by status and type, plus today's new enquiry count.
 *     tags: [Enquiries]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Enquiry statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 6
 *                     todayCount:
 *                       type: number
 *                       example: 2
 *                     byStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:   { type: string, example: new }
 *                           count: { type: number, example: 3 }
 *                     byType:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:   { type: string, example: Site Visit }
 *                           count: { type: number, example: 2 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/stats', protectAdmin, ctrl.getStats);

/**
 * @swagger
 * /api/enquiries/{id}:
 *   get:
 *     summary: Get enquiry by ID (Admin)
 *     description: Returns full enquiry details including populated property and user references.
 *     tags: [Enquiries]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the enquiry
 *     responses:
 *       200:
 *         description: Enquiry details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 enquiry:
 *                   $ref: '#/components/schemas/Enquiry'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', protectAdmin, ctrl.getEnquiryById);

/**
 * @swagger
 * /api/enquiries/{id}:
 *   put:
 *     summary: Update enquiry status or notes (Admin)
 *     description: Update the status and/or add internal notes to an enquiry. When status is set to `replied`, `repliedAt` is automatically recorded.
 *     tags: [Enquiries]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEnquiryInput'
 *           example:
 *             status: replied
 *             notes: Called client. Confirmed visit for Saturday 10am.
 *     responses:
 *       200:
 *         description: Enquiry updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Enquiry updated
 *                 enquiry:
 *                   $ref: '#/components/schemas/Enquiry'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', protectAdmin, ctrl.updateEnquiry);

/**
 * @swagger
 * /api/enquiries/{id}:
 *   delete:
 *     summary: Delete an enquiry (Admin)
 *     description: Permanently deletes an enquiry from the database.
 *     tags: [Enquiries]
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
 *         description: Enquiry deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', protectAdmin, ctrl.deleteEnquiry);

module.exports = router;
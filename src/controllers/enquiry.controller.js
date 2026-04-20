const Enquiry  = require('../models/Enquiry.model');
const Property = require('../models/Property.model');
const { sendEnquiryConfirmation, sendEnquiryNotification } = require('../utils/email.utils');
const { asyncHandler } = require('../middleware/error.middleware');

// POST /api/enquiries  (public)
exports.createEnquiry = asyncHandler(async (req, res) => {
  const { propertyId, name, email, phone, message, subject, type, scheduleDate } = req.body;

  const data = {
    name, email, phone, message,
    subject: subject || type || 'General Enquiry',
    type:    type    || 'General Enquiry',
    scheduleDate: scheduleDate || null,
  };

  if (propertyId) {
    const prop = await Property.findById(propertyId);
    if (prop) { data.property = propertyId; prop.enquiries += 1; await prop.save({ validateBeforeSave: false }); }
  }
  if (req.user) data.user = req.user._id;

  const enquiry = await Enquiry.create(data);

  // Send emails (non-blocking)
  sendEnquiryConfirmation(enquiry).catch(console.error);
  sendEnquiryNotification(enquiry).catch(console.error);

  res.status(201).json({ success: true, message: 'Enquiry submitted! Our team will contact you within 2 hours.', enquiryId: enquiry._id });
});

// GET /api/enquiries  (admin)
exports.getEnquiries = asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 20, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type)   filter.type   = type;
  if (search) {
    filter.$or = [
      { name:    new RegExp(search, 'i') },
      { email:   new RegExp(search, 'i') },
      { phone:   new RegExp(search, 'i') },
      { message: new RegExp(search, 'i') },
    ];
  }
  const skip  = (parseInt(page) - 1) * parseInt(limit);
  const total = await Enquiry.countDocuments(filter);
  const enquiries = await Enquiry.find(filter)
    .populate('property', 'title location.locality price')
    .populate('user',     'name email phone')
    .sort('-createdAt').skip(skip).limit(parseInt(limit));

  res.json({ success: true, total, page: parseInt(page), enquiries });
});

// GET /api/enquiries/stats  (admin)
exports.getStats = asyncHandler(async (req, res) => {
  const [total, byStatus, byType, todayCount] = await Promise.all([
    Enquiry.countDocuments(),
    Enquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Enquiry.aggregate([{ $group: { _id: '$type',   count: { $sum: 1 } } }]),
    Enquiry.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
  ]);
  res.json({ success: true, stats: { total, byStatus, byType, todayCount } });
});

// GET /api/enquiries/:id  (admin)
exports.getEnquiryById = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id)
    .populate('property', 'title location price images')
    .populate('user', 'name email phone');
  if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });
  res.json({ success: true, enquiry });
});

// PUT /api/enquiries/:id  (admin)
exports.updateEnquiry = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const update = { notes };
  if (status) {
    update.status = status;
    if (status === 'replied') { update.repliedAt = new Date(); update.repliedBy = req.user._id; }
  }
  const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });
  res.json({ success: true, message: 'Enquiry updated', enquiry });
});

// DELETE /api/enquiries/:id  (admin)
exports.deleteEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
  if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });
  res.json({ success: true, message: 'Enquiry deleted' });
});
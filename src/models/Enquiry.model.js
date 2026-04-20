const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',     default: null },

    // Sender details (even for guests)
    name:    { type: String, required: true, trim: true },
    email:   { type: String, required: true, lowercase: true, trim: true },
    phone:   { type: String, required: true },
    message: { type: String, required: true },
    subject: { type: String, default: 'General Enquiry' },

    type: {
      type: String,
      enum: ['General Enquiry','Buy Property','Rent / Lease','Sell Property','NRI Enquiry','Site Visit'],
      default: 'General Enquiry',
    },

    scheduleDate: { type: Date, default: null },

    status: {
      type: String,
      enum: ['new','read','replied','closed'],
      default: 'new',
    },

    notes:     { type: String, default: '' },
    repliedAt: { type: Date },
    repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ property: 1 });

module.exports = mongoose.model('Enquiry', enquirySchema);
const mongoose = require('mongoose');

const cmsImageSchema = new mongoose.Schema(
  {
    url:       { type: String, required: true },
    publicId:  { type: String },
    isPrimary: { type: Boolean, default: false },
    caption:   { type: String },
  },
  { _id: false }
);

const cmsSchema = new mongoose.Schema(
  {
    key:    { type: String, required: true, unique: true },
    value:  { type: mongoose.Schema.Types.Mixed, required: true },
    label:  { type: String },
    // Dedicated images array — works alongside value for any CMS section
    images: { type: [cmsImageSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CMS', cmsSchema);

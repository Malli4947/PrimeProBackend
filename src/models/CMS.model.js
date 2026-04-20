const mongoose = require('mongoose');

const cmsSchema = new mongoose.Schema(
  {
    key:   { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    label: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CMS', cmsSchema);
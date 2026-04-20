const mongoose = require('mongoose');
const slugify  = require('slugify');

const categorySchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, unique: true },
    slug:        { type: String, unique: true, lowercase: true },
    description: { type: String, default: '' },
    icon:        { type: String, default: '🏠' },
    color:       { type: String, default: '#3B82F6' },
    image:       { type: String, default: null },
    sortOrder:   { type: Number, default: 1 },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Virtual: count of active properties in this category
categorySchema.virtual('propertyCount', {
  ref:          'Property',
  localField:   'name',
  foreignField: 'type',
  count:        true,
});

module.exports = mongoose.model('Category', categorySchema);
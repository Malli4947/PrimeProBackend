const Category = require('../models/Category.model');
const Property = require('../models/Property.model');
const { asyncHandler } = require('../middleware/error.middleware');

exports.getCategories = asyncHandler(async (req, res) => {
  const cats = await Category.find({ isActive: true }).sort('sortOrder');
  // Attach live property counts
  const withCounts = await Promise.all(cats.map(async cat => {
    const count = await Property.countDocuments({ type: cat.name, isActive: true });
    return { ...cat.toObject(), propertyCount: count };
  }));
  res.json({ success: true, categories: withCounts });
});

exports.getAllCategories = asyncHandler(async (req, res) => {
  const cats = await Category.find().sort('sortOrder');
  const withCounts = await Promise.all(cats.map(async cat => {
    const count = await Property.countDocuments({ type: cat.name, isActive: true });
    return { ...cat.toObject(), propertyCount: count };
  }));
  res.json({ success: true, categories: withCounts });
});

exports.getCategoryBySlug = asyncHandler(async (req, res) => {
  const cat = await Category.findOne({ slug: req.params.slug });
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
  const count = await Property.countDocuments({ type: cat.name, isActive: true });
  res.json({ success: true, category: { ...cat.toObject(), propertyCount: count } });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const cat = await Category.create(req.body);
  res.status(201).json({ success: true, message: 'Category created', category: cat });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, message: 'Category updated', category: cat });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, message: 'Category deleted' });
});
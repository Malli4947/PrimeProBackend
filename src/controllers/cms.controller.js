const CMS = require('../models/CMS.model');
const { asyncHandler } = require('../middleware/error.middleware');

exports.getCMS = asyncHandler(async (req, res) => {
  const docs = await CMS.find();
  const data = {};
  docs.forEach(d => { data[d.key] = d.value; });
  res.json({ success: true, cms: data });
});

exports.getCMSByKey = asyncHandler(async (req, res) => {
  const doc = await CMS.findOne({ key: req.params.key });
  if (!doc) return res.status(404).json({ success: false, message: 'CMS key not found' });
  res.json({ success: true, key: doc.key, value: doc.value });
});

exports.upsertCMS = asyncHandler(async (req, res) => {
  const { key, value, label } = req.body;
  const doc = await CMS.findOneAndUpdate(
    { key },
    { value, label },
    { new: true, upsert: true, runValidators: true }
  );
  res.json({ success: true, message: 'CMS updated', cms: doc });
});

exports.deleteCMSKey = asyncHandler(async (req, res) => {
  await CMS.findOneAndDelete({ key: req.params.key });
  res.json({ success: true, message: 'CMS key deleted' });
});
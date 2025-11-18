const mongoose = require('mongoose');

const wallpaperSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Static method to count wallpapers by user
wallpaperSchema.statics.countByUser = async function(userId) {
  return this.countDocuments({ uploadedBy: userId });
};

// Static method to get all wallpapers with uploader info
wallpaperSchema.statics.getAllWithUploader = function() {
  return this.find().populate('uploadedBy', 'name email').sort({ createdAt: -1 });
};

module.exports = mongoose.model('Wallpaper', wallpaperSchema);
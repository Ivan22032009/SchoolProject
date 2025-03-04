const mongoose = require('mongoose'); // Додано імпорт mongoose

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  totalWeight: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  avatar: { type: String, default: '' },
  verified: { type: Boolean, default: false },
  bio: String,
  birthday: Date,
  country: String,
  phone: String,
  
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

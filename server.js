require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Підключення до MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Підключено до MongoDB'))
  .catch(err => console.error('Помилка підключення:', err));

// Схема користувача
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  totalWeight: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

// Реєстрація
app.post('/api/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      email: req.body.email,
      password: hashedPassword
    });
    await user.save();
    res.status(201).send('Користувача створено');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Вхід
app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send('Користувача не знайдено');
  
  const validPass = await bcrypt.compare(req.body.password, user.password);
  if (!validPass) return res.status(400).send('Невірний пароль');
  
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  res.header('auth-token', token).send({ token, email: user.email });
});

// Додати дані
app.post('/api/add-data', async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    user.totalWeight += req.body.weight;
    user.totalPoints += req.body.weight * 5;
    await user.save();
    res.send('Дані оновлено');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Рейтинг
app.get('/api/leaderboard', async (req, res) => {
  const users = await User.find().sort({ totalWeight: -1 });
  res.send(users);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер працює на порті ${PORT}`));
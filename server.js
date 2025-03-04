require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const app = express();

// ==================== Налаштування CORS ====================
const corsOptions = {
  origin: ['https://schoolproject12.netlify.app', 'https://ecofast.space'],
  methods: ['GET', 'POST', 'PUT'], // Now includes PUT
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Політика безпеки (CSP)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "script-src 'self' https://schoolproject-1-kkzu.onrender.com;" +
    "default-src 'self';" +
    "style-src 'self' 'unsafe-inline';" +
    "img-src 'self' data:;"
  );
  next();
});

app.use(express.json());

// ==================== Імітація БД ====================
let users = [];

class InMemoryDB {
  static findUserByEmail(email) {
    return users.find(user => user.email === email);
  }

  static createUser(userData) {
    const user = { 
      ...userData, 
      id: uuidv4(), 
      totalWeight: 0, 
      totalPoints: 0,
      verified: true // Користувач завжди верифікований
    };
    users.push(user);
    return user;
  }

  static updateUser(userId, updateFn) {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;
    users[userIndex] = updateFn(users[userIndex]);
    return users[userIndex];
  }

  static getLeaderboard() {
    return users
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10)
      .map(user => ({
        firstName: user.firstName,
        lastName: user.lastName,
        totalWeight: user.totalWeight,
        totalPoints: user.totalPoints
      }));
  }
}

// ==================== Модель користувача ====================
const User = mongoose.model('User', userSchema);
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

// ==================== Роути ====================

// Функція надсилання email
async function sendVerificationEmail(email, token) {
  const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
      }
  });

  const url = `http://localhost:3000/verify-email?token=${token}`;

  await transporter.sendMail({
      from: `"EcoFast" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Підтвердження реєстрації",
      html: `<h3>Перейдіть за посиланням для підтвердження email:</h3><a href="${url}">${url}</a>`
  });
}

// Реєстрація

app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Перевірка наявності користувача
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Користувач вже існує" });
    }

    // Хешування паролю
    const hashedPassword = await bcrypt.hash(password, 10);

    // Створення користувача
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    await user.save();

      // Генерація токену для підтвердження
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });

      // Надсилаємо листа для підтвердження
      await sendVerificationEmail(email, token);

      res.json({ message: "Реєстрація успішна! Перевірте email для підтвердження." });

  } catch (error) {
      console.error('Помилка реєстрації:', error);
      res.status(500).json({ error: "Помилка сервера" });
  }
});

app.get('/api/verify-email', async (req, res) => {
  try {
      const { token } = req.query;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');

      const user = users.find(u => u.id === decoded.id);
      if (!user) return res.status(400).json({ error: "Невірний токен" });

      user.verified = true;
      res.json({ message: "Email підтверджено! Тепер можете увійти." });
  } catch (error) {
      res.status(400).json({ error: "Невірний або прострочений токен" });
  }
});

// Вхід
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ error: "Користувача не знайдено" });
    if (!user.verified) return res.status(400).json({ error: "Email не підтверджено" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Невірний пароль" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, firstName: user.firstName, lastName: user.lastName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Не авторизовано" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "Користувача не знайдено" });

    res.json({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar,
    });
  } catch (error) {
    res.status(401).json({ error: "Недійсний токен" });
  }
});

// Зміна паролю
app.put('/api/change-password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Не авторизовано" });

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
      const { oldPassword, newPassword } = req.body;
      
      const user = users.find(u => u.id === decoded.id);
      const validPassword = await bcrypt.compare(oldPassword, user.password);
      if (!validPassword) return res.status(400).json({ error: "Невірний старий пароль" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;

      res.json({ message: "Пароль успішно змінено" });
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});
app.post('/api/update-avatar', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Не авторизовано" });

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
      const user = users.find(u => u.id === decoded.id);
      if (!user) return res.status(404).json({ error: "Користувача не знайдено" });

      // Тут має бути логіка завантаження файлу на сервер
      // Припустимо, що ми отримуємо URL аватара
      user.avatar = req.body.avatarUrl;
      res.json({ message: "Аватар оновлено" });
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});

app.post('/api/submit-waste', async (req, res) => {
  try {
    const { weight } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    user.totalWeight += parseFloat(weight);
    user.totalPoints += Math.floor(weight * 10);
    await user.save();

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Оновлення профілю
app.put('/api/update-profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Не авторизовано" });

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
      const { firstName, lastName, email, bio, birthday, country, phone } = req.body;
    
    const updatedUser = InMemoryDB.updateUser(decoded.id, (user) => ({
        ...user,
        firstName,
        lastName,
        email, 
        bio,
        birthday,
        country,
        phone
    }));
    
    res.json(updatedUser);
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaders = await User.find()
      .sort({ totalPoints: -1 })
      .limit(10)
      .select('firstName lastName totalWeight totalPoints');

    res.json(leaders);
  } catch (error) {
    res.status(500).json({ error: "Помилка сервера" });
  }
});
// Запуск сервера
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🟢 Сервер працює на порті ${PORT}`));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('🟢 Підключено до MongoDB'))
.catch(err => console.error('🔴 Помилка підключення:', err));
require('dotenv').config();
const API_BASE_URL = 'https://schoolproject-1-kkzu.onrender.com';
const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const User = require('./models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
let submissions = [];
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
     cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
     cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });
// ==================== Налаштування CORS ====================
const corsOptions = {
  origin: ['https://schoolproject12.netlify.app', 'https://ecofast.space'],
  methods: ['GET', 'POST', 'PUT'],
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

// Видалено функцію sendVerificationEmail та маршрут для верифікації email,
// оскільки верифікація email більше не використовується

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

    // Створення користувача без верифікації
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      verified: true // Автоматична верифікація
    });

    await user.save();
    res.json({ message: "Реєстрація успішна!" });

  } catch (error) {
    console.error('Помилка реєстрації:', error);
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// Вхід
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Користувача не знайдено" });
    }

    // Видалено перевірку верифікації email
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Невірний пароль" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, firstName: user.firstName, lastName: user.lastName });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отримання даних користувача
app.get('/api/user', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Не авторизовано" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "Користувача не знайдено" });
    }

    res.json({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    const { oldPassword, newPassword } = req.body;

    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Невірний старий пароль" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Пароль успішно змінено" });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
app.post('/api/submit-photo', upload.single('photo'), async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Не авторизовано" });

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ error: "Користувача не знайдено" });
      
      const photo = req.file;
      if (!photo) {
          return res.status(400).json({ error: "Фото не прикріплено" });
      }

      // Нараховуємо 1 бал за фото
      user.totalPoints = (user.totalPoints || 0) + 1;
      
      // (Опційно) Записуємо інформацію про фото у користувача
      if (!user.submissions) {
          user.submissions = [];
      }
      user.submissions.push({ photo: photo.filename, date: new Date() });
      await user.save();

      // Додаємо запис до глобального масиву дописів
      submissions.push({
          firstName: user.firstName,
          lastName: user.lastName,
          photo: photo.filename,
          points: 1,
          date: new Date()
      });
      // Залишаємо лише останні 5 записів
      if (submissions.length > 5) {
          submissions.shift();
      }

      res.json({ message: "Фото успішно надіслано!", totalPoints: user.totalPoints, submissions });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Помилка сервера" });
  }
});
app.get('/api/leaderboard', (req, res) => {
  // Повертаємо останні 5 дописів
  res.json(submissions);
});
app.use('/uploads', express.static('uploads'));
// Запуск сервера
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🟢 Сервер працює на порті ${PORT}`));

// Підключення до MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('🟢 Підключено до MongoDB'))
  .catch(err => console.error('🔴 Помилка підключення:', err));

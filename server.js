require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const User = require('./models/User');
const app = express();

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

// ==================== Роути ====================

// Функція відправки верифікаційного листа
async function sendVerificationEmail(email, token) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const verificationUrl = `https://ecofast.space/verify.html?token=${token}`;

  await transporter.sendMail({
    from: `"EcoFast" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Підтвердження реєстрації",
    html: `
      <h3>Перейдіть за посиланням для підтвердження email:</h3>
      <a href="${verificationUrl}">${verificationUrl}</a>
    `
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
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Створення користувача
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      verificationToken,
      verified: false
    });

    await user.save();
    await sendVerificationEmail(email, verificationToken);

    res.json({ message: "Реєстрація успішна! Перевірте email для підтвердження." });

  } catch (error) {
    console.error('Помилка реєстрації:', error);
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// Верифікація email
app.get('/api/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(400).send('Невірний токен');
    }

    user.verified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send('Email успішно підтверджено! Тепер можете увійти.');

  } catch (error) {
    res.status(400).send('Невірний або прострочений токен');
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

    if (!user.verified) {
      return res.status(401).json({ error: "Email не верифіковано" });
    }

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

// Запуск сервера
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🟢 Сервер працює на порті ${PORT}`));

// Підключення до MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('🟢 Підключено до MongoDB'))
  .catch(err => console.error('🔴 Помилка підключення:', err));
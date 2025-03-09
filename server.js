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
const upload = multer({ storage: multer.memoryStorage() });

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

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY
  }
});

async function uploadFileToR3(fileBuffer, filename, mimetype) {
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET,
    Key: filename,
    Body: fileBuffer,
    ContentType: mimetype
  });

  try {
    await s3Client.send(command);
    // URL файлу (якщо бакет публічний або ви використовуєте інший метод доступу)
    const fileUrl = `https://5422d97df114d5f4a097bb028d9910f5.r2.cloudflarestorage.com/ecofast/${filename}`;
    return fileUrl;
  } catch (error) {
    console.error("Помилка завантаження:", error);
    throw error;
  }
}

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

      // Завантаження файлу до Cloudflare R2
      const fileUrl = await uploadFileToR3(photo.buffer || fs.readFileSync(photo.path), photo.filename, photo.mimetype);

      // Нараховуємо 1 бал та оновлюємо користувача
      user.totalPoints = (user.totalPoints || 0) + 1;
      if (!user.submissions) user.submissions = [];
      user.submissions.push({ photo: fileUrl, date: new Date() });
      await user.save();

      // Додаємо запис до глобального масиву (нове фото - на початку)
      submissions.unshift({
          firstName: user.firstName,
          lastName: user.lastName,
          photo: fileUrl, // зберігаємо URL замість локального імені файлу
          points: user.totalPoints,
          date: new Date()
      });
      if (submissions.length > 5) {
          submissions.pop();
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

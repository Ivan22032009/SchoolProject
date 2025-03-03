require('dotenv').config();
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
      verified: false // Користувач завжди верифікований
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


app.post('/api/register', async (req, res) => {
  try {
      const { firstName, lastName, email, password } = req.body;

      if (!firstName || !lastName || !email || !password) {
          return res.status(400).json({ error: "Заповніть усі поля" });
      }

      if (InMemoryDB.findUserByEmail(email)) {
          return res.status(400).json({ error: "Користувач вже існує" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = InMemoryDB.createUser({
          firstName,
          lastName,
          email,
          password: hashedPassword,
          verified: false
      });

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
    const user = InMemoryDB.findUserByEmail(email);
    
    if (!user) return res.status(400).json({ error: "Користувача не знайдено" });
    if (!user.verified) return res.status(400).json({ error: "Email не підтверджено. Перевірте пошту." });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Невірний пароль" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_key', { 
      expiresIn: '1h' 
    });

    res.json({ 
      token,
      firstName: user.firstName,
      lastName: user.lastName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Не авторизовано" });

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
      const user = users.find(u => u.id === decoded.id);
      if (!user) return res.status(404).json({ error: "Користувача не знайдено" });
      
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

app.post('/api/submit-waste', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { weight } = req.body;
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
  const user = users.find(u => u.id === decoded.id);
  
  user.totalWeight += parseFloat(weight);
  user.totalPoints += Math.floor(weight * 10); // 10 балів за кг
  
  res.json({ success: true });
});

app.get('/api/leaderboard', (req, res) => {
  res.json(InMemoryDB.getLeaderboard());
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
// Запуск сервера
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🟢 Сервер працює на порті ${PORT}`));
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
  methods: ['GET', 'POST'],
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

// ==================== Роути ====================

// Реєстрація
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    // Валідація
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "Заповніть усі поля" });
    }

    if (InMemoryDB.findUserByEmail(email)) {
      return res.status(400).json({ error: "Користувач вже існує" });
    }

    // Збереження користувача
    const hashedPassword = await bcrypt.hash(password, 10);
    InMemoryDB.createUser({
      firstName,
      lastName,
      email,
      password: hashedPassword
    });

    res.json({ message: "Користувача зареєстровано" });

  } catch (error) {
    console.error('Помилка реєстрації:', error);
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// Вхід
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = InMemoryDB.findUserByEmail(email);
    if (!user) return res.status(400).json({ error: "Користувача не знайдено" });

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

// Інші роути (submit, leaderboard, verifyToken) залишаються без змін
// ... (див. оригінальний код, видаливши лише частини з верифікацією)

// Запуск сервера
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🟢 Сервер працює на порті ${PORT}`));
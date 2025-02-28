require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

// ==================== Конфігурація ====================
// Видалено налаштування SendGrid

// Налаштування CORS
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
      verified: false 
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
      .filter(user => user.verified)
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

    // Генерація коду верифікації
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    
    // Логіку відправки email прибрано. За потреби реалізуйте альтернативну перевірку.

    // Збереження користувача з хешованим паролем
    const hashedPassword = await bcrypt.hash(password, 10);
    InMemoryDB.createUser({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      verificationCode
    });

    res.json({ message: "Користувача зареєстровано", code: verificationCode });

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

    if (!user.verified) return res.status(403).json({ error: "Email не верифіковано" });

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

// Перевірка токена
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Токен відсутній" });

  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, decoded) => {
    if (err) return res.status(403).json({ error: "Недійсний токен" });
    req.userId = decoded.id;
    next();
  });
}

// Відправка даних про відходи
app.post('/api/submit', verifyToken, (req, res) => {
  try {
    const weight = parseFloat(req.body.weight);
    if (isNaN(weight)) throw new Error("Невірний формат ваги");

    const updatedUser = InMemoryDB.updateUser(req.userId, (user) => {
      user.totalWeight += weight;
      user.totalPoints += Math.round(weight * 10);
      return user;
    });

    res.json({
      totalWeight: updatedUser.totalWeight,
      totalPoints: updatedUser.totalPoints
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Рейтинг
app.get('/api/leaderboard', (req, res) => {
  res.json(InMemoryDB.getLeaderboard());
});

// Запуск сервера
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🟢 Сервер працює на порті ${PORT}`));

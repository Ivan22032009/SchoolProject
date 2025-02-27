require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // Додано для генерації ID

const app = express();

// Налаштування CORS (замініть на ваш домен)
const corsOptions = {
  origin: ['https://schoolproject12.netlify.app', 'https://ecofast.space'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "script-src 'self' https://schoolproject-9nrp.onrender.com 'unsafe-eval';" +
    "default-src 'self';" +
    "style-src 'self' 'unsafe-inline';" // Дозволити inline стилі, якщо потрібно
  );
  next();
});
// Імітація бази даних у пам'яті
let users = [];

class InMemoryDB {
  static findUserByEmail(email) {
    return users.find(user => user.email === email);
  }

  static createUser(userData) {
    const user = { ...userData, id: uuidv4(), totalWeight: 0, totalPoints: 0 };
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
    return users.slice()
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

// Реєстрація
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "Заповніть усі поля" });
    }

    if (InMemoryDB.findUserByEmail(email)) {
      return res.status(400).json({ error: "Користувач з таким email вже існує" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = InMemoryDB.createUser({
      firstName,
      lastName,
      email,
      password: hashedPassword
    });

    res.status(201).json({ message: "Користувача створено" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Вхід
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Заповніть усі поля" });
    }

    const user = InMemoryDB.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Користувача не знайдено" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Невірний пароль" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });
    
    res.json({ 
      token, 
      email: user.email,
      firstName: user.firstName, 
      lastName: user.lastName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware для перевірки токена
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Токен не надано" });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, decoded) => {
    if (err) return res.status(403).json({ error: "Недійсний токен" });
    req.userId = decoded.id;
    next();
  });
}

// Отримання даних користувача
app.get('/api/user', verifyToken, (req, res) => {
  const user = users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "Користувача не знайдено" });
  res.json({ firstName: user.firstName, lastName: user.lastName });
});

app.post('/api/send-verification', async (req, res) => {
  const { email } = req.body;
  const verificationCode = Math.floor(100000 + Math.random() * 900000); // Генеруємо 6-значний код

  try {
      await sendVerificationEmail(email, verificationCode);
      res.json({ message: "Код відправлено!", code: verificationCode });
  } catch (error) {
      res.status(500).json({ error: "Не вдалося відправити код" });
  }
});


// Відправка даних про відходи
app.post('/api/submit', verifyToken, async (req, res) => {
  try {
    const weight = parseFloat(req.body.weight);
    if (isNaN(weight)) throw new Error("Невірна вага");
    const updatedUser = InMemoryDB.updateUser(req.userId, (user) => {
      user.totalWeight += weight;
      user.totalPoints += Math.round(weight * 10);
      return user;
    });

    if (!updatedUser) throw new Error("Користувача не знайдено");
    
    res.json({ 
      message: "Дані оновлено",
      user: {
        totalWeight: updatedUser.totalWeight,
        totalPoints: updatedUser.totalPoints
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

require('dotenv').config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function sendVerificationEmail(toEmail, verificationCode) {
    const msg = {
        to: toEmail,
        from: process.env.SENDER_EMAIL,
        subject: 'Підтвердження електронної пошти',
        text: `Ваш код підтвердження: ${verificationCode}`,
        html: `<p>Ваш код підтвердження: <strong>${verificationCode}</strong></p>`,
    };
    return sgMail.send(msg);
}


// Рейтинг
app.get('/api/leaderboard', (req, res) => {
  res.json(InMemoryDB.getLeaderboard());
});

// Запуск сервера
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🟢 Сервер працює на порті ${PORT}`));
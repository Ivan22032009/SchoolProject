require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Налаштування CORS
const corsOptions = {
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Обробка OPTIONS-запитів
app.options('*', cors(corsOptions));

// Парсинг JSON
app.use(express.json());

app.use(cors({ origin: '*' })); 

// Підключення до MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecotrack')
  .then(() => console.log('✅ Підключено до MongoDB'))
  .catch(err => console.error('❌ Помилка підключення:', err));

// Схема користувача
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  totalWeight: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

// Реєстрація
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "Заповніть усі поля" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Користувач з таким email вже існує" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ firstName, lastName, email, password: hashedPassword });
    await user.save();

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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Користувача не знайдено" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Невірний пароль" });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });
    
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

// Отримання даних користувача
app.get('/api/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Неавторизований запит" });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    
    const user = await User.findById(decoded._id).select('firstName lastName');
    if (!user) {
      return res.status(404).json({ error: "Користувача не знайдено" });
    }

    res.json(user);
  } catch (error) {
    res.status(401).json({ error: "Недійсний або прострочений токен" });
  }
});

// Перевірка авторизації
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Токен не надано або некоректний" });
  }

  const token = authHeader.split(' ')[1];
  
  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
      req.user = decoded; // Зберігаємо дані користувача
      next();
  } catch (error) {
      console.error("Помилка валідації JWT:", error.message);
      return res.status(401).json({ error: "Недійсний токен" });
  }
}

// Використання middleware у маршрутах
app.get('/api/user', verifyToken, async (req, res) => {
  try {
      const user = await User.findById(req.user._id).select('firstName lastName');
      if (!user) {
          return res.status(404).json({ error: "Користувача не знайдено" });
      }
      res.json(user);
  } catch (error) {
      res.status(500).json({ error: "Помилка сервера" });
  }
});

app.post('/api/submit', verifyToken, async (req, res) => {
  try {
      const user = await User.findById(req.user._id);
      if (!user) {
          return res.status(404).json({ error: "Користувача не знайдено" });
      }

      const weight = req.body.weight;
      if (typeof weight !== 'number' || weight <= 0) {
          return res.status(400).json({ error: "Невірна вага" });
      }

      user.totalWeight += weight;
      user.totalPoints += Math.round(weight * 10);
      await user.save();

      res.json({ message: "Дані оновлено", user });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Отримання рейтингу
app.get('/api/leaderboard', async (req, res) => {
  try {
      const users = await User.find({})
          .sort({ totalPoints: -1 })
          .select('firstName lastName totalWeight totalPoints')
          .limit(10);
          
      res.json(users);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`🟢 Сервер працює на порті ${PORT}`));

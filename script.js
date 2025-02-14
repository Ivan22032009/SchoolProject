// Модальне вікно
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
let authToken = null;

// Відкрити модальне вікно
document.querySelectorAll('.loginBtn').forEach(btn => {
  btn.addEventListener('click', () => loginModal.style.display = 'block');
});

// Реєстрація/вхід
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const isRegister = e.submitter.id === 'registerBtn';

  try {
    const response = await fetch(`/api/${isRegister ? 'register' : 'login'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) throw new Error(await response.text());
    
    if (isRegister) {
      alert('Реєстрація успішна! Увійдіть.');
    } else {
      const data = await response.json();
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      updateUI(data.email);
    }
  } catch (error) {
    alert(error.message);
  }
});

// Додати дані
document.getElementById('recycleForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const weight = parseFloat(document.getElementById('weight').value);

  try {
    const response = await fetch('/api/add-data', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ weight })
    });
    
    if (!response.ok) throw new Error(await response.text());
    
    updateLeaderboard();
    alert('Дані додано!');
  } catch (error) {
    alert(error.message);
  }
});

// Оновлення інтерфейсу
function updateUI(email) {
  document.getElementById('userEmail').textContent = email;
  document.getElementById('profileSection').style.display = 'block';
  document.querySelectorAll('.loginBtn').forEach(btn => btn.style.display = 'none');
}

// Отримати рейтинг
async function updateLeaderboard() {
  const response = await fetch('/api/leaderboard');
  const users = await response.json();
  
  const tbody = document.querySelector('.leaderboard-table tbody');
  tbody.innerHTML = users.map((user, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${user.email}</td>
      <td>${user.totalWeight}</td>
      <td>${user.totalPoints}</td>
    </tr>
  `).join('');
}

// Перевірка авторизації при завантаженні
window.addEventListener('load', async () => {
  authToken = localStorage.getItem('authToken');
  if (authToken) {
    try {
      const response = await fetch('/api/validate', { 
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const user = await response.json();
        updateUI(user.email);
      }
    } catch (error) {
      localStorage.removeItem('authToken');
    }
  }
  updateLeaderboard();
});
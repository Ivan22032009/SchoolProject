document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById("loginModal");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const switchToRegister = document.getElementById("switchToRegister");
    const switchToLogin = document.getElementById("switchToLogin");
    const userNavElements = document.querySelectorAll(".userNav");
    const authButtons = document.querySelectorAll(".authButton");
    const submitSection = document.getElementById("submitSection");
    const submitModal = document.getElementById("submitModal");
    const submitWasteBtn = document.getElementById("submitWaste");
    const wasteForm = document.getElementById("wasteForm");
    const leaderboardTable = document.querySelector(".leaderboard-table tbody");
  
    let authToken = localStorage.getItem('authToken') || null;
  
    // Оновлений URL для Render
    const API_BASE_URL = 'https://schoolproject-9nrp.onrender.com'; // Замініть на ваш Render URL
  
    // Закриття модальних вікон
    document.querySelectorAll(".close").forEach(button => {
        button.addEventListener("click", () => {
            loginModal.style.display = "none";
            submitModal.style.display = "none";
        });
    });
  
    updateLeaderboard();
  
    // Перевірка авторизації
    if (authToken) {
        checkAuthStatus();
    } else {
        updateAuthButtons(false);
        submitSection.style.display = 'none';
    }
  
    async function checkAuthStatus() {
        if (!authToken) {
            updateAuthButtons(false);
            return;
        }
  
        try {
            const response = await fetch(`${API_BASE_URL}/api/user`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
  
            if (!response.ok) throw new Error("Неавторизований користувач");
  
            const user = await response.json();
            userNavElements.forEach(nav => {
                nav.textContent = `${user.firstName} ${user.lastName}`;
                nav.style.display = 'inline-block';
            });
            updateAuthButtons(true);
            submitSection.style.display = 'block';
            updateLeaderboard();
        } catch (error) {
            console.error('Помилка перевірки авторизації:', error.message);
            localStorage.removeItem('authToken');
            updateAuthButtons(false);
        }
    }

    // Решта функцій залишаються незмінними, крім URL у fetch-запитах!
    // ================================================================
  
    function updateAuthButtons(isLoggedIn) {
        authButtons.forEach(button => {
            if (isLoggedIn) {
                button.textContent = "Вийти";
                button.removeEventListener('click', openLoginModal);
                button.addEventListener('click', logout);
            } else {
                button.textContent = "Увійти";
                button.removeEventListener('click', logout);
                button.addEventListener('click', openLoginModal);
            }
        });
    }
  
    function openLoginModal() {
        loginModal.style.display = 'block';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
  
    function logout() {
        localStorage.removeItem('authToken');
        userNavElements.forEach(nav => nav.style.display = 'none');
        updateAuthButtons(false);
        submitSection.style.display = 'none';
        location.reload();
    }
  
    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = "none";
        registerForm.style.display = "block";
    });
  
    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = "none";
        loginForm.style.display = "block";
    });
  
    // Оновлені запити з API_BASE_URL
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
  
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, { // Змінено URL
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
  
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Помилка входу");
            }
  
            const { token, firstName, lastName } = await response.json();
            localStorage.setItem('authToken', token);
            location.reload();
        } catch (error) {
            alert(error.message);
        }
    });
  
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = document.getElementById('registerFirstName').value;
        const lastName = document.getElementById('registerLastName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
  
        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, { // Змінено URL
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email, password }),
            });
  
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Помилка реєстрації");
            }
  
            alert('Реєстрація успішна! Увійдіть.');
            registerForm.reset();
            switchToLogin.click();
        } catch (error) {
            alert(error.message);
        }
    });
  
    submitWasteBtn.addEventListener('click', () => {
        submitModal.style.display = 'block';
    });
  
    wasteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const weight = parseFloat(document.getElementById('weightInput').value);
  
        if (isNaN(weight) || weight <= 0) {
            alert("Будь ласка, введіть коректну вагу (число більше 0).");
            return;
        }
  
        try {
            const response = await fetch(`${API_BASE_URL}/api/submit`, { // Змінено URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ weight })
            });
  
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Помилка сервера");
            }
  
            const userData = await response.json();
            alert(`Дані збережено! Нова вага: ${userData.user.totalWeight} кг, бали: ${userData.user.totalPoints}`);
  
            submitModal.style.display = "none";
            updateLeaderboard();
        } catch (error) {
            alert(`Помилка: ${error.message}`);
        }
    });
  
    async function updateLeaderboard() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/leaderboard`); // Змінено URL
            const data = await response.json();
            leaderboardTable.innerHTML = '';
  
            data.forEach((user, index) => {
                const row = `<tr><td>${index + 1}</td><td>${user.firstName} ${user.lastName}</td><td>${user.totalWeight}</td><td>${user.totalPoints}</td></tr>`;
                leaderboardTable.innerHTML += row;
            });
        } catch (error) {
            console.error('Помилка завантаження рейтингу:', error);
        }
    }
});

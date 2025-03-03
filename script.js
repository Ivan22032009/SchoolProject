document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://schoolproject-1-kkzu.onrender.com';
    const authToken = localStorage.getItem('authToken');
    const cabinetLink = document.querySelector('.cabinetLink');
    const authButton = document.querySelector('.authButton');
    const userNav = document.querySelector('.userNav');
    const submitSection = document.getElementById('submitSection');
    const leaderboardTable = document.querySelector('.leaderboard-table tbody');

    document.getElementById('aboutHeader').addEventListener('click', function() {
        document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
      });

      document.getElementById('how-it-works').addEventListener('click', function() {
        document.getElementById('works').scrollIntoView({ behavior: 'smooth' });
      });
      document.getElementById('benefits').addEventListener('click', function() {
        document.getElementById('fits').scrollIntoView({ behavior: 'smooth' });
      });
      document.getElementById('cta').addEventListener('click', function() {
        document.getElementById('join').scrollIntoView({ behavior: 'smooth' });
      });
      
    // Функція для оновлення навігації
    const updateNavigation = (user) => {
        if (cabinetLink) cabinetLink.style.display = 'inline-block';
        if (authButton) authButton.textContent = 'Вийти';
        if (userNav) {
            userNav.style.display = 'inline-block';
            userNav.textContent = `${user.firstName} ${user.lastName}`;
        }
        if (submitSection) submitSection.style.display = 'block';
    };

    // Перевірка авторизації та завантаження даних
    if (authToken) {
        fetch(`${API_BASE_URL}/api/user`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        })
        .then(response => {
            if (response.ok) return response.json();
            throw new Error('Помилка автентифікації');
        })
        .then(user => {
            updateNavigation(user);
            loadLeaderboard();
        })
        .catch(error => {
            console.error('Помилка:', error);
            localStorage.removeItem('authToken');
        });
    }

    // Обробник виходу
    if (authButton) {
        authButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = 'index.html';
        });
    }

    // Завантаження рейтингу
    const loadLeaderboard = () => {
        fetch(`${API_BASE_URL}/api/leaderboard`)
            .then(response => response.json())
            .then(data => {
                leaderboardTable.innerHTML = data.map((user, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${user.firstName} ${user.lastName}</td>
                        <td>${user.totalWeight} кг</td>
                        <td>${user.totalPoints}</td>
                    </tr>
                `).join('');
            });
    };

    // Обробник кнопки "Я здав сміття"
    const submitWasteBtn = document.getElementById('submitWaste');
    const submitModal = document.getElementById('submitModal');
    const closeModal = document.querySelector('.close');

    if (submitWasteBtn) {
        submitWasteBtn.addEventListener('click', () => {
            submitModal.style.display = 'block';
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            submitModal.style.display = 'none';
        });
    }

    // Обробник форми здачі сміття
    document.getElementById('wasteForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const weightInput = document.getElementById('weightInput');
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/submit-waste`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ weight: parseFloat(weightInput.value) })
            });

            if (!response.ok) throw new Error('Помилка здачі сміття');
            
            submitModal.style.display = 'none';
            weightInput.value = '';
            loadLeaderboard();
            showSuccessMessage('Дані успішно надіслано!');
        } catch (error) {
            showErrorMessage(error.message);
        }
    });

    // Допоміжні функції
    const showSuccessMessage = (text) => {
        const message = document.createElement('div');
        message.className = 'success-message';
        message.textContent = text;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 3000);
    };

    const showErrorMessage = (text) => {
        alert(`Помилка: ${text}`);
    };

    // Закриття модалки при кліку поза нею
    window.onclick = (event) => {
        if (event.target === submitModal) {
            submitModal.style.display = 'none';
        }
    };
});
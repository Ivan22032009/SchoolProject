// script.js
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://schoolproject-1-kkzu.onrender.com'; // Додано
    const authToken = localStorage.getItem('authToken');
    
    if (authToken) {
        fetch(`${API_BASE_URL}/api/user`, { // Використовуємо змінну
            headers: { 'Authorization': `Bearer ${authToken}` }
        }).then(response => {
            if (response.ok) {
                // Оновлення інтерфейсу для авторизованого користувача
                document.querySelector('.userNav').style.display = 'inline-block';
                document.querySelector('.authButton').textContent = 'Вийти';
            }
        });
    }

    const authButton = document.querySelector('.authButton');
    if (authButton) { // Додаємо перевірку на наявність елемента
        authButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.reload();
        });
    }
});
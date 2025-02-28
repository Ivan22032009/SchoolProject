// script.js
document.addEventListener('DOMContentLoaded', () => {
    const authToken = localStorage.getItem('authToken');
    
    // Перевірка авторизації при завантаженні
    if (authToken) {
        fetch(`${API_BASE_URL}/api/user`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        }).then(response => {
            if (response.ok) {
                // Оновлення інтерфейсу для авторизованого користувача
                document.querySelector('.userNav').style.display = 'inline-block';
                document.querySelector('.authButton').textContent = 'Вийти';
            }
        });
    }

    // Обробка виходу
    document.querySelector('.authButton').addEventListener('click', () => {
        localStorage.removeItem('authToken');
        window.location.reload();
    });
});
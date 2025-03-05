const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://schoolproject-1-kkzu.onrender.com';
    let authToken = localStorage.getItem('authToken');

    // Обробка входу
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
    
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Помилка входу");
            }
    
            const { token } = await response.json();
            localStorage.setItem('authToken', token);
            window.location.href = 'index.html';
        } catch (error) {
            alert(error.message);
        }
    });

    // Обробка реєстрації
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = document.getElementById('registerFirstName').value;
        const lastName = document.getElementById('registerLastName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
    
        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email, password })
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Помилка реєстрації");
            }
    
            // Повідомлення без згадки про перевірку email
            alert('Реєстрація успішна!');
        } catch (error) {
            alert(error.message);
        }
    });
    
});

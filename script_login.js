const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// script_login.js
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://schoolproject-1-kkzu.onrender.com';
    let authToken = localStorage.getItem('authToken');

    // Обробка форми входу
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

            if (!response.ok) throw new Error("Помилка входу");
            
            const { token } = await response.json();
            localStorage.setItem('authToken', token);
            window.location.href = 'index.html'; // Перенаправлення після входу
        } catch (error) {
            alert(error.message);
        }
    });

    // Обробка форми реєстрації
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value;
        // ... інші поля форми ...

        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ /* дані форми */ })
            });

            if (!response.ok) throw new Error("Помилка реєстрації");
            
            alert('Реєстрація успішна!');
            window.location.href = 'index.html'; // Перенаправлення
        } catch (error) {
            alert(error.message);
        }
    });
});
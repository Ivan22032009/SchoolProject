document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://schoolproject-1-kkzu.onrender.com';
    const authToken = localStorage.getItem('authToken');
    const cabinetLink = document.querySelector('.cabinetLink');
    const authButton = document.querySelector('.authButton');
    
    if (authToken) {
        fetch(`${API_BASE_URL}/api/user`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        }).then(response => {
            if (response.ok) {
                // Відображаємо посилання на кабінет
                if(cabinetLink) cabinetLink.style.display = 'inline-block';
                if(authButton) authButton.textContent = 'Вийти';
            }
        });
    }

    if (authButton) {
        authButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = 'index.html';
        });
    }
});
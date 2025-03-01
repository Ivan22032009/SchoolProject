document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://schoolproject-1-kkzu.onrender.com';
    const authToken = localStorage.getItem('authToken');
    const cabinetLink = document.querySelector('.cabinetLink');
    const authButton = document.querySelector('.authButton');
    const userNav = document.querySelector('.userNav');
    
    if (authToken) {
        fetch(`${API_BASE_URL}/api/user`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        }).then(response => {
            if (response.ok) {
                return response.json();
            }
        }).then(user => {
            if(cabinetLink) cabinetLink.style.display = 'inline-block';
            if(authButton) authButton.textContent = 'Вийти';
            if(userNav) {
                userNav.style.display = 'inline-block';
                userNav.textContent = `${user.firstName} ${user.lastName}`;
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
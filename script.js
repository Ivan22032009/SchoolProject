document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://schoolproject-1-kkzu.onrender.com';
    const authToken = localStorage.getItem('authToken');
    
    if (authToken) {
        fetch(`${API_BASE_URL}/api/user`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        }).then(response => {
            if (response.ok) {
                document.querySelector('.userNav').style.display = 'inline-block';
                document.querySelector('.authButton').textContent = 'Вийти';
            }
        });
    }

    const authButton = document.querySelector('.authButton');
    if (authButton) {
        authButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.reload();
        });
    }
});
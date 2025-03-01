document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://schoolproject-1-kkzu.onrender.com';
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
        window.location.href = 'login.html';
    }

    // Завантаження інформації профілю
    fetch(`${API_BASE_URL}/api/user`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(response => response.json())
    .then(user => {
        document.getElementById('firstName').value = user.firstName;
        document.getElementById('lastName').value = user.lastName;
        if(user.avatar) {
            document.getElementById('userAvatar').src = user.avatar;
        }
    });

    // Оновлення профілю
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updatedData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/update-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) throw new Error('Помилка оновлення');
            alert('Профіль оновлено!');
        } catch (error) {
            alert(error.message);
        }
    });

    // Зміна паролю
    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if(newPassword !== confirmPassword) {
            alert('Паролі не співпадають');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ newPassword })
            });

            if (!response.ok) throw new Error('Помилка зміни паролю');
            alert('Пароль змінено!');
        } catch (error) {
            alert(error.message);
        }
    });

    // Завантаження аватара
    document.getElementById('avatarInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/upload-avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}'
                },
                body: formData
            });

            const data = await response.json();
            document.getElementById('userAvatar').src = data.avatarUrl;
        } catch (error) {
            alert('Помилка завантаження');
        }
    });
});
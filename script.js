document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://ваш-сервер.com'; // ЗАМІНІТЬ НА СПРАВЖНІЙ URL
    const authToken = localStorage.getItem('authToken');
    const cabinetLink = document.querySelector('.cabinetLink');
    const authButton = document.querySelector('.authButton');
    const userNav = document.querySelector('.userNav');
    const submitSection = document.getElementById('submitSection');
    const leaderboardTable = document.querySelector('.leaderboard-table tbody');
    
    let collageInterval = null;
    let sliderInterval = null;

    // Ініціалізація слайдерів
    function initSliders() {
        if (collageInterval) clearInterval(collageInterval);
        if (sliderInterval) clearInterval(sliderInterval);

        if (window.innerWidth > 1320) {
            const cards = document.querySelectorAll('.desktop-collage .card');
            if (!cards.length) return;

            let currentIndex = 0;
            collageInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % cards.length;
                const radio = document.getElementById(`c${currentIndex + 1}`);
                if (radio) radio.checked = true;
            }, 5000);

        } else {
            const slides = document.querySelectorAll('.mobile-slider .item');
            const dotsContainer = document.querySelector('.mobile-slider .dots');
            if (!slides.length || !dotsContainer) return;

            dotsContainer.innerHTML = '';
            slides.forEach((_, i) => {
                const dot = document.createElement('li');
                dot.addEventListener('click', () => goToSlide(i));
                dotsContainer.appendChild(dot);
            });

            const nextBtn = document.getElementById('next');
            const prevBtn = document.getElementById('prev');
            if (nextBtn && prevBtn) {
                nextBtn.addEventListener('click', () => goToSlide((currentSlide + 1) % slides.length));
                prevBtn.addEventListener('click', () => goToSlide((currentSlide - 1 + slides.length) % slides.length));
            }

            let currentSlide = 0;
            function goToSlide(index) {
                currentSlide = index;
                const list = document.querySelector('.mobile-slider .list');
                if (list) list.style.transform = `translateX(-${index * 100}%)`;
                
                const dots = dotsContainer.querySelectorAll('li');
                dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
            }

            sliderInterval = setInterval(() => goToSlide((currentSlide + 1) % slides.length), 5000);
        }
    }

    // Прокрутка до секцій
    function setupScrollListeners() {
        const aboutHeader = document.getElementById('aboutHeader');
        if (aboutHeader) {
            aboutHeader.addEventListener('click', () => {
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    // Оновлення навігації
    function updateNavigation(user) {
        if (cabinetLink) cabinetLink.style.display = 'inline-block';
        if (authButton) authButton.textContent = 'Вийти';
        if (userNav) {
            userNav.style.display = 'inline-block';
            userNav.textContent = `${user.firstName} ${user.lastName}`;
        }
        if (submitSection) submitSection.style.display = 'block';
    }

    // Завантаження рейтингу
    async function loadLeaderboard() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/leaderboard`);
            const data = await response.json();
            if (leaderboardTable) {
                leaderboardTable.innerHTML = data.map(sub => `
                    <tr>
                        <td>${sub.firstName} ${sub.lastName}</td>
                        <td><img src="${API_BASE_URL}/uploads/${sub.photo}" alt="Фото" width="100"></td>
                        <td>${sub.points}</td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Помилка завантаження рейтингу:', error);
        }
    }

    // Обробник відправки фото
    function handlePhotoSubmit() {
        const form = document.getElementById('wasteForm');
        const submitModal = document.getElementById('submitModal');
        const closeBtn = document.querySelector('.close');

        if (!form || !submitModal || !closeBtn) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const photoInput = document.getElementById('photoInput');
            if (!photoInput) return;

            const file = photoInput.files[0];
            if (!file) {
                showErrorMessage('Будь ласка, виберіть фото.');
                return;
            }

            const formData = new FormData();
            formData.append('photo', file);

            try {
                const response = await fetch(`${API_BASE_URL}/api/submit-photo`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${authToken}` },
                    body: formData
                });

                if (!response.ok) throw new Error('Помилка надсилання');
                
                submitModal.style.display = 'none';
                photoInput.value = '';
                loadLeaderboard();
                showSuccessMessage('Фото успішно надіслано!');
            } catch (error) {
                showErrorMessage(error.message);
            }
        });

        closeBtn.addEventListener('click', () => submitModal.style.display = 'none');
        window.addEventListener('click', (e) => e.target === submitModal && (submitModal.style.display = 'none'));
    }

    // Допоміжні функції
    function showSuccessMessage(text) {
        const msg = document.createElement('div');
        msg.className = 'success-message';
        msg.textContent = text;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
    }

    function showErrorMessage(text) {
        const msg = document.createElement('div');
        msg.className = 'error-message';
        msg.textContent = text;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
    }

    // Ініціалізація
    initSliders();
    setupScrollListeners();
    window.addEventListener('resize', initSliders);

    if (authToken) {
        fetch(`${API_BASE_URL}/api/user`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        })
        .then(response => response.ok ? response.json() : Promise.reject())
        .then(user => updateNavigation(user))
        .catch(() => localStorage.removeItem('authToken'))
        .finally(loadLeaderboard);
    }

    if (authButton) {
        authButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            window.location.href = 'index.html';
        });
    }

    handlePhotoSubmit();
});
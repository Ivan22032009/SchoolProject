document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://schoolproject-1-kkzu.onrender.com';
    const authToken = localStorage.getItem('authToken');
    const cabinetLink = document.querySelector('.cabinetLink');
    const authButton = document.querySelector('.authButton');
    const userNav = document.querySelector('.userNav');
    const submitSection = document.getElementById('submitSection');
    const leaderboardTable = document.querySelector('.leaderboard-table tbody');


    // Змінні для інтервалів, щоб можна було їх зупинити/перезапустити при ресайзі
    let collageInterval = null;
    let sliderInterval = null;

    function initSliders() {
        // Якщо вже були інтервали, обнуляємо, щоб не дублювати
        if (collageInterval) clearInterval(collageInterval);
        if (sliderInterval) clearInterval(sliderInterval);

        // Десктопний варіант (колаж)
        if (window.innerWidth > 1320) {
            const cards = document.querySelectorAll('.desktop-collage .card');
            // Клік залишається, як було
            cards.forEach((card, index) => {
                card.addEventListener('click', () => {
                    document.getElementById(`c${index + 1}`).checked = true;
                });
            });

            // Автоперемикання кожні 10 секунд
            let currentIndex = 0;
            collageInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % cards.length;
                document.getElementById(`c${currentIndex + 1}`).checked = true;
            }, 5000);

        // Мобільний варіант (слайдер)
        } else {
            const slides = Array.from(document.querySelectorAll('.mobile-slider .item'));
            const dotsContainer = document.querySelector('.mobile-slider .dots');
            let currentSlide = 0;

            // (Приклад із вашого коду) Ініціалізація точок
            dotsContainer.innerHTML = ''; // Очистимо, щоб не множилися при ресайзі
            slides.forEach((_, i) => {
                const dot = document.createElement('li');
                if (i === 0) dot.classList.add('active');
                dot.addEventListener('click', () => goToSlide(i));
                dotsContainer.appendChild(dot);
            });

            document.getElementById('next').addEventListener('click', () => {
                currentSlide = (currentSlide + 1) % slides.length;
                goToSlide(currentSlide);
            });

            document.getElementById('prev').addEventListener('click', () => {
                currentSlide = (currentSlide - 1 + slides.length) % slides.length;
                goToSlide(currentSlide);
            });

            function goToSlide(index) {
                currentSlide = index;
                const offset = -slides[index].offsetLeft;
                document.querySelector('.mobile-slider .list').style.transform = `translateX(${offset}px)`;
                // Оновлюємо активний dot
                const dots = dotsContainer.querySelectorAll('li');
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === index);
                });
            }

            // Автоперемикання кожні 10 секунд
            sliderInterval = setInterval(() => {
                currentSlide = (currentSlide + 1) % slides.length;
                goToSlide(currentSlide);
            }, 5000);
        }
    }

    // Запускаємо при завантаженні та при зміні розміру
    window.addEventListener('load', initSliders);
    window.addEventListener('resize', initSliders);
    
    // Ініціалізація при завантаженні та зміні розміру
    window.addEventListener('load', initSliders);
    window.addEventListener('resize', initSliders);

    const aboutHeader = document.getElementById('aboutHeader');
    if (aboutHeader) {
        aboutHeader.addEventListener('click', () => {
            const aboutSection = document.getElementById('about');
            aboutSection?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    const howItWorksBtn = document.getElementById('how-it-works');
    if (howItWorksBtn) {
        howItWorksBtn.addEventListener('click', function() {
            document.getElementById('works').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    const benefits = document.getElementById('benefits');
    if (benefits) {
        benefits.addEventListener('click', function() {
            document.getElementById('fits').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    const cta = document.getElementById('cta');
    if (cta) {
        cta.addEventListener('click', function() {
            document.getElementById('join').scrollIntoView({ behavior: 'smooth' });
        });
    }
      
    // Видалено функцію sendVerificationEmail, оскільки верифікація email більше не використовується

    // Функція для оновлення навігації
    const updateNavigation = (user) => {
        if (cabinetLink) cabinetLink.style.display = 'inline-block';
        if (authButton) authButton.textContent = 'Вийти';
        if (userNav) {
            userNav.style.display = 'inline-block';
            userNav.textContent = `${user.firstName} ${user.lastName}`;
        }
        if (submitSection) submitSection.style.display = 'block'; // показуємо кнопку
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
                leaderboardTable.innerHTML = data.map((submission) => `
                    <tr>
                        <td>${submission.firstName} ${submission.lastName}</td>
                        <td><img src="${API_BASE_URL}/uploads/${submission.photo}" alt="Фото" width="100"></td>
                        <td>${submission.points}</td>
                    </tr>
                `).join('');
            });
    };

    // Завантажити лідерборд одразу
    loadLeaderboard();

    const chooseFileBtn = document.getElementById('chooseFileBtn');
    const photoInput = document.getElementById('photoInput');
  
    if (chooseFileBtn && photoInput) {
      chooseFileBtn.addEventListener('click', () => {
        photoInput.click();
      });
    }

    document.getElementById('wasteForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.getElementById('photoInput').files[0];
    
        if (!file) {
            alert('Будь ласка, виберіть фото.');
            return; // Остановить отправку
        }
    
        const formData = new FormData();
        formData.append('photo', file);
    
        try {
            const response = await fetch(`${API_BASE_URL}/api/submit-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: formData
            });
    
            if (!response.ok) throw new Error('Помилка надсилання фото');
            
            const result = await response.json();
            submitModal.style.display = 'none';
            photoInput.value = '';
            loadLeaderboard();
            showSuccessMessage('Фото успішно надіслано!');
        } catch (error) {
            showErrorMessage(error.message);
        }
    });
    

    // Обробник кнопки "Я здав сміття"
    const submitWasteBtn = document.getElementById('submitWaste');
    const submitModal = document.getElementById('submitModal');
    const closeModal = document.querySelector('.close');

    if (submitWasteBtn) {
        submitWasteBtn.addEventListener('click', () => {
            submitModal.style.display = 'flex';
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            submitModal.style.display = 'none';
        });
    }


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
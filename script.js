       // Модальні вікна
const loginModal = document.getElementById("loginModal");
const dashboardModal = document.getElementById("dashboardModal");
const loginBtn = document.getElementById("loginBtn");
const closeButtons = document.querySelectorAll(".close");

// Форми
const loginForm = document.getElementById("loginForm");
const recycleForm = document.getElementById("recycleForm");

// Статистика користувача
let userData = {
    email: "",
    totalWeight: 0,
    totalPoints: 0,
};

// Елементи профілю
const profileSection = document.getElementById("profileSection");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userTotalWeight = document.getElementById("userTotalWeight");
const userTotalPoints = document.getElementById("userTotalPoints");
const logoutBtn = document.getElementById("logoutBtn");

// Відкрити модальне вікно входу
loginBtn.addEventListener("click", () => {
    loginModal.style.display = "block";
});

// Закриття модальних вікон
closeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        loginModal.style.display = "none";
        dashboardModal.style.display = "none";
    });
});

// Вхід у систему
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (email && password) {
        userData.email = email;
        userData.totalWeight = 0; // Початкове значення
        userData.totalPoints = 0; // Початкове значення

        // Оновлення даних профілю
        userName.textContent = "Користувач"; // Можна замінити на реальне ім'я
        userEmail.textContent = userData.email;
        userTotalWeight.textContent = userData.totalWeight;
        userTotalPoints.textContent = userData.totalPoints;

        document.getElementById("loginSuccess").style.display = "block";

        setTimeout(() => {
            loginModal.style.display = "none";
            dashboardModal.style.display = "none";
            profileSection.style.display = "block"; // Показуємо профіль
        }, 1000);

        // Ховаємо кнопку входу
        loginBtn.style.display = "none";
    }
});

// Обробка форми додавання макулатури
recycleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const paperWeight = parseFloat(document.getElementById("paperWeight").value);
    const recyclePoint = document.getElementById("recyclePoint").value;

    if (paperWeight > 0) {
        userData.totalWeight += paperWeight;
        userData.totalPoints += paperWeight * 5; // Наприклад, 5 балів за 1 кг

        // Оновлення даних профілю
        userTotalWeight.textContent = userData.totalWeight;
        userTotalPoints.textContent = userData.totalPoints;

        document.getElementById("totalWeight").textContent = userData.totalWeight;
        document.getElementById("totalPoints").textContent = userData.totalPoints;

        // Додати дані до таблиці рейтингу
        const tableBody = document.querySelector(".leaderboard-table tbody");
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
            <td>—</td>
            <td>${userData.email}</td>
            <td>${paperWeight}</td>
            <td>${paperWeight * 5}</td>
        `;
        tableBody.appendChild(newRow);

        document.getElementById("recycleSuccess").style.display = "block";
        setTimeout(() => {
            document.getElementById("recycleSuccess").style.display = "none";
        }, 2000);

        // Очистити форму
        recycleForm.reset();
    }
});

// Вихід із системи
logoutBtn.addEventListener("click", () => {
    userData = {
        email: "",
        totalWeight: 0,
        totalPoints: 0,
    };
    profileSection.style.display = "none";
    loginBtn.style.display = "block";
});

// Закриття модальних вікон при кліку поза ними
window.addEventListener("click", (e) => {
    if (e.target === loginModal) loginModal.style.display = "none";
    if (e.target === dashboardModal) dashboardModal.style.display = "none";
});

document.addEventListener("DOMContentLoaded", function() {
    const map = L.map('map').setView([50.4501, 30.5234], 13); // Київ координати

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const points = [];
    const likedPoints = new Set(); // Set to track points liked by the current user

    let marker = null;
    map.on('mousemove', function(e) {
        if (marker) {
            marker.setLatLng(e.latlng);
        } else {
            marker = L.marker(e.latlng, { opacity: 0.5 }).addTo(map);
        }
    });

    map.on('mouseout', function() {
        if (marker) {
            map.removeLayer(marker);
            marker = null;
        }
    });

    function renderPoints() {
        const pointsList = document.getElementById("points");
        pointsList.innerHTML = "";
        points.forEach((point) => {
            const li = document.createElement("li");
            li.textContent = `${point.name} (${point.likes} лайків)`;
            const likeButton = document.createElement("button");
            likeButton.textContent = "Лайк";
            likeButton.disabled = likedPoints.has(point.id);
            likeButton.addEventListener("click", () => {
                if (!likedPoints.has(point.id)) {
                    point.likes++;
                    likedPoints.add(point.id);
                    renderPoints();
                }
            });
            li.appendChild(likeButton);
            pointsList.appendChild(li);
        });
    }

    document.getElementById("add-point").addEventListener("click", () => {
        const name = prompt("Введіть назву точки:");
        if (!name) return;
        const { lat, lng } = map.getCenter();
        const newPoint = { id: Date.now(), name, lat, lng, likes: 0 };
        points.push(newPoint);
        L.marker([lat, lng]).addTo(map)
            .bindPopup(`<b>${name}</b>`).openPopup();
        renderPoints();
    });

    // Registration and login system
    const users = {};
    let currentUser = null;

    const authModal = document.getElementById("auth-modal");
    const authForm = document.getElementById("auth-form");
    const closeModal = document.getElementById("close-modal");
    const welcomeMessage = document.getElementById("welcome-message");
    const logoutButton = document.getElementById("logout");
    const loginButton = document.getElementById("login");
    const registerButton = document.getElementById("register");

    function openModal(type) {
        document.getElementById("auth-title").textContent = type === "register" ? "Реєстрація" : "Увійти";
        authModal.style.display = "block";
        authForm.dataset.type = type;
    }

    function closeModalHandler() {
        authModal.style.display = "none";
    }

    function updateWelcomeMessage() {
        if (currentUser) {
            welcomeMessage.textContent = `Ви увійшли як: ${currentUser}`;
            logoutButton.style.display = "inline-block";
            loginButton.style.display = "none";
            registerButton.style.display = "none";
        } else {
            welcomeMessage.textContent = "";
            logoutButton.style.display = "none";
            loginButton.style.display = "inline-block";
            registerButton.style.display = "inline-block";
        }
    }

    document.getElementById("register").addEventListener("click", () => openModal("register"));
    document.getElementById("login").addEventListener("click", () => openModal("login"));
    logoutButton.addEventListener("click", () => {
        currentUser = null;
        updateWelcomeMessage();
        alert("Ви вийшли з системи.");
    });

    authForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const type = authForm.dataset.type;

        if (type === "register") {
            if (users[username]) {
                alert("Користувач вже існує!");
            } else {
                users[username] = password;
                alert("Реєстрація успішна!");
                closeModalHandler();
            }
        } else if (type === "login") {
            if (users[username] === password) {
                currentUser = username;
                alert(`Ласкаво просимо, ${username}!`);
                updateWelcomeMessage();
                closeModalHandler();
            } else {
                alert("Невірне ім'я користувача або пароль!");
            }
        }
    });

    closeModal.addEventListener("click", closeModalHandler);
    updateWelcomeMessage();
});
document.addEventListener('DOMContentLoaded', () => {
  const loginModal = document.getElementById("loginModal");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const switchToRegister = document.getElementById("switchToRegister");
  const switchToLogin = document.getElementById("switchToLogin");
  const userNavElements = document.querySelectorAll(".userNav");
  const authButtons = document.querySelectorAll(".authButton");
  let authToken = localStorage.getItem('authToken') || null;

  if (authToken) {
      checkAuthStatus();
  } else {
      updateAuthButtons(false);
  }

  async function checkAuthStatus() {
      try {
          const response = await fetch('http://localhost:5500/api/user', {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${authToken}` }
          });

          if (!response.ok) {
              throw new Error("Неавторизований користувач");
          }

          const user = await response.json();
          userNavElements.forEach(nav => {
              nav.textContent = `${user.firstName} ${user.lastName}`;
              nav.style.display = 'inline-block';
          });
          updateAuthButtons(true);
      } catch (error) {
          console.error(error.message);
          localStorage.removeItem('authToken');
          updateAuthButtons(false);
      }
  }

  function updateAuthButtons(isLoggedIn) {
      authButtons.forEach(button => {
          if (isLoggedIn) {
              button.textContent = "Вийти";
              button.removeEventListener('click', openLoginModal);
              button.addEventListener('click', logout);
          } else {
              button.textContent = "Увійти";
              button.removeEventListener('click', logout);
              button.addEventListener('click', openLoginModal);
          }
      });
  }

  function openLoginModal() {
      loginModal.style.display = 'block';
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
  }

  function logout() {
      localStorage.removeItem('authToken');
      userNavElements.forEach(nav => nav.style.display = 'none');
      updateAuthButtons(false);
      location.reload();
  }

  document.querySelectorAll('.loginBtn').forEach(btn => {
      btn.addEventListener('click', openLoginModal);
  });

  document.querySelector('.close').addEventListener('click', () => {
      loginModal.style.display = 'none';
  });

  switchToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
  });

  switchToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
  });

  loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;

      try {
          const response = await fetch('http://localhost:5500/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Помилка входу");
          }

          const { token, firstName, lastName } = await response.json();
          localStorage.setItem('authToken', token);
          userNavElements.forEach(nav => {
              nav.textContent = `${firstName} ${lastName}`;
              nav.style.display = 'inline-block';
          });
          updateAuthButtons(true);
          loginModal.style.display = 'none';
      } catch (error) {
          alert(error.message);
      }
  });

  registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const firstName = document.getElementById('registerFirstName').value;
      const lastName = document.getElementById('registerLastName').value;
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;

      try {
          const response = await fetch('http://localhost:5500/api/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ firstName, lastName, email, password }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Помилка реєстрації");
          }

          alert('Реєстрація успішна! Увійдіть.');
          registerForm.reset();
          switchToLogin.click();
      } catch (error) {
          alert(error.message);
      }
  });
});

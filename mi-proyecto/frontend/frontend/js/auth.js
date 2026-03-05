// js/auth.js
const TOKEN_KEY = 'mini_tienda_token';
const API_URL = 'http://localhost:3000/api';  // cámbialo según tu backend

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function isLoggedIn() {
  return !!getToken();
}

async function login(email, password) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.message || 'Error al iniciar sesión');
    
    setToken(data.token);
    window.location.href = 'index.html';
  } catch (err) {
    alert(err.message);
  }
}

async function register(email, password) {
  // Similar a login, pero POST a /auth/register
  // ...
}

function logout() {
  removeToken();
  window.location.href = 'login.html';
}

// Ejecutar en todas las páginas para actualizar navbar
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav-auth');
  if (!nav) return;

  if (isLoggedIn()) {
    nav.innerHTML = `
      <li><a href="sell.html">Vender</a></li>
      <li><a href="my-products.html">Mis productos</a></li>
      <li><a href="my-purchases.html">Mis compras</a></li>
      <li><a href="#" onclick="logout(); return false;">Cerrar sesión</a></li>
    `;
  } else {
    nav.innerHTML = `
      <li><a href="login.html">Iniciar sesión</a></li>
      <li><a href="register.html">Registrarse</a></li>
    `;
  }
});
// public/js/api.js
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  return data;
}

async function checkAuthStatus() {
  try {
    const data = await apiFetch('/api/auth/me');
    const nav = document.getElementById('nav-user');
    if (data.loggedIn) {
      nav.innerHTML = `
        <li>Hola, ${data.user.email}</li>
        <li><a href="/my-products">Mis productos</a></li>
        <li><a href="/my-purchases">Mis compras</a></li>
        <li><a href="/sell">Vender</a></li>
        <li><a href="#" onclick="logout()">Cerrar sesión</a></li>
      `;
    } else {
      nav.innerHTML = `
        <li><a href="/login">Iniciar sesión</a></li>
        <li><a href="/register">Registrarse</a></li>
      `;
      // Si estamos en página protegida → redirigir
      if (window.location.pathname.includes('/sell') ||
          window.location.pathname.includes('/my-')) {
        window.location.href = '/login';
      }
    }
    return data.loggedIn;
  } catch (err) {
    console.error('Error checking auth:', err);
    return false;
  }
}

async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  } catch (err) {
    alert('Error al cerrar sesión');
  }
}
// Añadir al carrito
async function addToCart(productId) {
  try {
    const data = await apiFetch('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId })
    });
    return data;
  } catch (err) {
    throw new Error(err.message || 'No se pudo añadir al carrito');
  }
}

// Obtener carrito
async function getCart() {
  return apiFetch('/api/cart');
}

async function removeFromCart(productId) {
  const res = await fetch(`/api/cart/${productId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar');
  return data;
}
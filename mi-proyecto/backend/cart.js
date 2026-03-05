// src/routes/cart.js
const express = require('express');
const router = express.Router();

const db = require('../db/sqlite');
const { requireLogin } = require('../middleware/auth');

// ────────────────────────────────────────────────
// POST /api/cart/add
// Añade un producto al carrito (en sesión)
// ────────────────────────────────────────────────
router.post('/add', requireLogin, async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'ID de producto requerido' });
  }

  try {
    // Verificamos que el producto existe (seguridad extra)
    const product = await db.getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Inicializamos el carrito si no existe
    if (!req.session.cart) {
      req.session.cart = [];
    }

    // Evitamos duplicados (solo añadimos si no está ya)
    if (!req.session.cart.includes(productId)) {
      req.session.cart.push(productId);
    }

    // Opcional: devolver el carrito actualizado + info básica
    const cartWithDetails = await getCartWithDetails(req.session.cart);

    res.json({
      message: 'Producto añadido al carrito',
      cart: cartWithDetails,
      cartCount: cartWithDetails.length
    });
  } catch (err) {
    console.error('Error añadiendo al carrito:', err);
    res.status(500).json({ error: 'Error al añadir al carrito' });
  }
});

// ────────────────────────────────────────────────
// GET /api/cart
// Obtiene el contenido del carrito con detalles
// ────────────────────────────────────────────────
router.get('/', requireLogin, async (req, res) => {
  try {
    if (!req.session.cart || req.session.cart.length === 0) {
      return res.json({
        cart: [],
        count: 0,
        total: '0.00'
      });
    }

    const cartItems = await getCartWithDetails(req.session.cart);

    const total = cartItems.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2);

    res.json({
      cart: cartItems,
      count: cartItems.length,
      total
    });
  } catch (err) {
    console.error('Error obteniendo carrito:', err);
    res.status(500).json({ error: 'Error al obtener el carrito' });
  }
});

// ────────────────────────────────────────────────
// Helper interno: obtiene detalles de productos del carrito
// ────────────────────────────────────────────────
async function getCartWithDetails(cartIds) {
  if (!cartIds || cartIds.length === 0) return [];

  const placeholders = cartIds.map(() => '?').join(',');
  const query = `
    SELECT id, name, description, price
    FROM products
    WHERE id IN (${placeholders})
  `;

  const products = await db.query(query, cartIds);

  // Mantenemos el orden original del carrito
  const ordered = cartIds.map(id => 
    products.find(p => p.id === parseInt(id)) || null
  ).filter(Boolean);

  return ordered.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    price: Number(p.price).toFixed(2)
  }));
}

module.exports = router;

// ────────────────────────────────────────────────
// DELETE /api/cart/:productId
// Elimina un producto específico del carrito
// ────────────────────────────────────────────────
router.delete('/:productId', requireLogin, (req, res) => {
    const { productId } = req.params;
  
    if (!req.session.cart || !req.session.cart.includes(productId)) {
      return res.status(404).json({
        error: 'El producto no está en el carrito'
      });
    }
  
    // Filtramos el array quitando el ID
    req.session.cart = req.session.cart.filter(id => id !== productId);
  
    res.json({
      message: 'Producto eliminado del carrito',
      cartCount: req.session.cart.length
    });
  });